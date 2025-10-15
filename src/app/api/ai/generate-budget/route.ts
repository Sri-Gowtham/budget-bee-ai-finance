import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, budgets, goals, categories } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface CategoryBudget {
  categoryId: number;
  categoryName: string;
  suggestedAmount: number;
  reasoning: string;
}

interface BudgetResponse {
  budgets: CategoryBudget[];
  summary: {
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    goalProgress: number;
  };
  method: 'openai' | 'rule-based';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const requestBody = await request.json();

    // Security: Reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Calculate date 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString();

    // Fetch user's transactions from last 3 months
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.date, threeMonthsAgoStr)
        )
      );

    // Fetch user's current budgets
    const userBudgets = await db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        amount: budgets.amount,
        period: budgets.period,
        categoryName: categories.name,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, user.id));

    // Fetch user's active goals
    const userGoals = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, user.id), eq(goals.status, 'active')));

    // Calculate monthly income average
    const incomeTransactions = userTransactions.filter(
      (t) => t.type === 'income'
    );
    const totalIncome = incomeTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const monthlyIncome = totalIncome / 3;

    // Calculate monthly expenses by category
    const expenseTransactions = userTransactions.filter(
      (t) => t.type === 'expense'
    );
    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const monthlyExpenses = totalExpenses / 3;

    const expensesByCategory = expenseTransactions.reduce(
      (acc, t) => {
        if (t.categoryId) {
          acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
        }
        return acc;
      },
      {} as Record<number, number>
    );

    // Calculate current savings rate
    const savingsRate =
      monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

    // Calculate goal progress
    const totalGoalTarget = userGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalGoalCurrent = userGoals.reduce(
      (sum, g) => sum + g.currentAmount,
      0
    );
    const goalProgress =
      totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

    // Fetch all categories for mapping
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

    const summary = {
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      goalProgress,
    };

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      // Rule-based budget recommendations (50/30/20 rule)
      const categoryBudgets: CategoryBudget[] = [];

      // 50% needs (essential expenses)
      const needsAmount = monthlyIncome * 0.5;
      const needsCategories = allCategories.filter(
        (c) => c.type === 'expense' && ['housing', 'food', 'utilities', 'transportation', 'healthcare'].includes(c.name.toLowerCase())
      );

      // 30% wants (discretionary spending)
      const wantsAmount = monthlyIncome * 0.3;
      const wantsCategories = allCategories.filter(
        (c) => c.type === 'expense' && ['entertainment', 'dining', 'shopping', 'hobbies'].includes(c.name.toLowerCase())
      );

      // 20% savings
      const savingsAmount = monthlyIncome * 0.2;

      // Get top spending categories from user's actual spending
      const topSpendingCategories = Object.entries(expensesByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([catId]) => parseInt(catId));

      // Allocate budgets based on top spending categories
      for (const categoryId of topSpendingCategories) {
        const category = allCategories.find((c) => c.id === categoryId);
        if (!category) continue;

        const currentSpending = expensesByCategory[categoryId] / 3;
        const isNeed = needsCategories.some((c) => c.id === categoryId);
        const isWant = wantsCategories.some((c) => c.id === categoryId);

        let suggestedAmount: number;
        let reasoning: string;

        if (isNeed) {
          suggestedAmount = Math.min(currentSpending * 1.1, needsAmount / needsCategories.length);
          reasoning = `Essential expense. Allocated from 50% needs budget. Based on your average spending of $${currentSpending.toFixed(2)}.`;
        } else if (isWant) {
          suggestedAmount = Math.min(currentSpending * 0.9, wantsAmount / wantsCategories.length);
          reasoning = `Discretionary spending. Allocated from 30% wants budget. Consider reducing from $${currentSpending.toFixed(2)}.`;
        } else {
          suggestedAmount = currentSpending * 0.95;
          reasoning = `Based on your current spending pattern of $${currentSpending.toFixed(2)}. Slight reduction recommended.`;
        }

        categoryBudgets.push({
          categoryId,
          categoryName: category.name,
          suggestedAmount: Math.round(suggestedAmount * 100) / 100,
          reasoning,
        });
      }

      // Add savings category if not already included
      const savingsCategory = allCategories.find((c) => c.name.toLowerCase() === 'savings');
      if (savingsCategory && !topSpendingCategories.includes(savingsCategory.id)) {
        categoryBudgets.push({
          categoryId: savingsCategory.id,
          categoryName: savingsCategory.name,
          suggestedAmount: Math.round(savingsAmount * 100) / 100,
          reasoning: `Recommended 20% of income for savings and investments. This will help you achieve your financial goals.`,
        });
      }

      const response: BudgetResponse = {
        budgets: categoryBudgets,
        summary,
        method: 'rule-based',
      };

      return NextResponse.json(response, { status: 200 });
    }

    // OpenAI-based budget recommendations
    try {
      // Build financial summary for prompt
      const financialSummary = {
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
        savingsRate: Math.round(savingsRate * 100) / 100,
        topSpendingCategories: Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([catId, amount]) => ({
            categoryId: parseInt(catId),
            categoryName: categoryMap.get(parseInt(catId)) || 'Unknown',
            monthlyAverage: Math.round((amount / 3) * 100) / 100,
          })),
        currentBudgets: userBudgets.map((b) => ({
          categoryName: b.categoryName,
          amount: b.amount,
          period: b.period,
        })),
        activeGoals: userGoals.map((g) => ({
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
          category: g.category,
          priority: g.priority,
        })),
      };

      const prompt = `You are a personal finance advisor. Analyze the following financial data and provide personalized budget recommendations.

Financial Summary:
- Monthly Income: $${financialSummary.monthlyIncome}
- Monthly Expenses: $${financialSummary.monthlyExpenses}
- Current Savings Rate: ${financialSummary.savingsRate}%

Top Spending Categories (last 3 months average):
${financialSummary.topSpendingCategories.map((c) => `- ${c.categoryName}: $${c.monthlyAverage}`).join('\n')}

Current Budgets:
${financialSummary.currentBudgets.length > 0 ? financialSummary.currentBudgets.map((b) => `- ${b.categoryName}: $${b.amount} (${b.period})`).join('\n') : 'No budgets set'}

Active Financial Goals:
${financialSummary.activeGoals.length > 0 ? financialSummary.activeGoals.map((g) => `- ${g.title}: $${g.currentAmount}/$${g.targetAmount} (Priority: ${g.priority}, Deadline: ${g.deadline || 'Not set'})`).join('\n') : 'No active goals'}

Based on this data, provide personalized monthly budget recommendations for the top 8-10 spending categories. Consider:
1. The user's income and current spending patterns
2. Their active financial goals and deadlines
3. Opportunities to optimize spending and increase savings
4. Goal-aligned budgeting advice

Return your response as a JSON array with the following structure:
[
  {
    "categoryId": number,
    "categoryName": "string",
    "suggestedAmount": number,
    "reasoning": "string (1-2 sentences explaining why this amount is recommended)"
  }
]

Use the exact category IDs and names from the spending categories provided above. Be specific and actionable in your reasoning.`;

      const openaiResponse = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful personal finance advisor. Provide budget recommendations in valid JSON format only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(
          `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      let parsedBudgets: CategoryBudget[];
      try {
        const parsedContent = JSON.parse(content);
        // Handle both direct array and object with budgets property
        parsedBudgets = Array.isArray(parsedContent)
          ? parsedContent
          : parsedContent.budgets || [];
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Validate and sanitize the budgets
      const validatedBudgets = parsedBudgets
        .filter(
          (b) =>
            b.categoryId &&
            b.categoryName &&
            typeof b.suggestedAmount === 'number' &&
            b.reasoning
        )
        .map((b) => ({
          categoryId: b.categoryId,
          categoryName: b.categoryName,
          suggestedAmount: Math.round(b.suggestedAmount * 100) / 100,
          reasoning: b.reasoning,
        }));

      const response: BudgetResponse = {
        budgets: validatedBudgets,
        summary,
        method: 'openai',
      };

      return NextResponse.json(response, { status: 200 });
    } catch (openaiError) {
      console.error('OpenAI processing error:', openaiError);
      // Fallback to rule-based if OpenAI fails
      const categoryBudgets: CategoryBudget[] = [];

      const needsAmount = monthlyIncome * 0.5;
      const wantsAmount = monthlyIncome * 0.3;
      const savingsAmount = monthlyIncome * 0.2;

      const topSpendingCategories = Object.entries(expensesByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([catId]) => parseInt(catId));

      for (const categoryId of topSpendingCategories) {
        const category = allCategories.find((c) => c.id === categoryId);
        if (!category) continue;

        const currentSpending = expensesByCategory[categoryId] / 3;
        const suggestedAmount = currentSpending * 0.95;

        categoryBudgets.push({
          categoryId,
          categoryName: category.name,
          suggestedAmount: Math.round(suggestedAmount * 100) / 100,
          reasoning: `Based on your current spending of $${currentSpending.toFixed(2)}. OpenAI unavailable, using rule-based recommendation.`,
        });
      }

      const savingsCategory = allCategories.find(
        (c) => c.name.toLowerCase() === 'savings'
      );
      if (
        savingsCategory &&
        !topSpendingCategories.includes(savingsCategory.id)
      ) {
        categoryBudgets.push({
          categoryId: savingsCategory.id,
          categoryName: savingsCategory.name,
          suggestedAmount: Math.round(savingsAmount * 100) / 100,
          reasoning: `Recommended 20% of income for savings. OpenAI unavailable.`,
        });
      }

      const response: BudgetResponse = {
        budgets: categoryBudgets,
        summary,
        method: 'rule-based',
      };

      return NextResponse.json(response, { status: 200 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}