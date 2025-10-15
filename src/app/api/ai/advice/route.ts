import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, budgets, categories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch user's transaction history
    const userTransactions = await db
      .select({
        type: transactions.type,
        categoryName: categories.name,
        amount: transactions.amount,
        date: transactions.date,
        description: transactions.description,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(50);

    // Fetch user's budgets
    const userBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId));

    // Calculate spending summary
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = userTransactions
      .filter((t) => String(t.date).startsWith(currentMonth) && t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const monthlyIncome = userTransactions
      .filter((t) => String(t.date).startsWith(currentMonth) && t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Group expenses by category
    const categorySpending: { [key: string]: number } = {};
    userTransactions
      .filter((t) => String(t.date).startsWith(currentMonth) && t.type === "expense")
      .forEach((t) => {
        const cat = t.categoryName || "Other";
        categorySpending[cat] = (categorySpending[cat] || 0) + Number(t.amount || 0);
      });

    // Prepare context for OpenAI
    const context = {
      monthlyIncome,
      monthlyExpenses,
      netBalance: Number(monthlyIncome) - Number(monthlyExpenses),
      categorySpending,
      totalBudgets: userBudgets.reduce((sum, b: any) => sum + Number(b.limit || 0), 0),
      recentTransactions: userTransactions.slice(0, 10).map((t) => ({
        type: t.type,
        category: t.categoryName || "Other",
        amount: Number(t.amount || 0),
        date: String(t.date),
      })),
    };

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      // Fallback to rule-based advice if OpenAI is not configured
      return NextResponse.json({
        advice: generateRuleBasedAdvice(context),
        method: "rule-based",
      });
    }

    // Call OpenAI API
    const prompt = `You are a financial advisor. Based on the following user's financial data, provide 3-5 concise, actionable financial recommendations:

Monthly Income: $${Number(context.monthlyIncome).toFixed(2)}
Monthly Expenses: $${Number(context.monthlyExpenses).toFixed(2)}
Net Balance: $${Number(context.netBalance).toFixed(2)}

Category Spending:
${Object.entries(categorySpending)
  .map(([cat, amount]) => `- ${cat}: $${Number(amount).toFixed(2)}`)
  .join("\n")}

Recent Transactions (last 10):
${context.recentTransactions
  .map((t) => `- ${t.date}: ${t.type} - ${t.category} - $${Number(t.amount).toFixed(2)}`)
  .join("\n")}

Provide practical, personalized advice to help them improve their financial health. Format as a JSON array of objects with "title" and "description" fields.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful financial advisor. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content ?? "";

    // Try to parse JSON response
    let advice;
    try {
      advice = JSON.parse(aiResponse);
    } catch {
      // If parsing fails, use rule-based fallback
      advice = generateRuleBasedAdvice(context);
    }

    return NextResponse.json({
      advice,
      method: "openai",
      context,
    });
  } catch (error) {
    console.error("Error generating AI advice:", error);
    
    // Fallback to rule-based advice on error
    const fallbackContext = {
      monthlyIncome: 0,
      monthlyExpenses: 0,
      netBalance: 0,
      categorySpending: {},
      totalBudgets: 0,
      recentTransactions: [],
    };
    
    return NextResponse.json({
      advice: generateRuleBasedAdvice(fallbackContext),
      method: "rule-based-fallback",
      error: "Failed to generate AI advice, using fallback",
    });
  }
}

function generateRuleBasedAdvice(context: any) {
  const advice: Array<{ title: string; description: string; priority: "high" | "medium" | "low" }> = [];

  // Income vs Expenses
  if (Number(context.netBalance) < 0) {
    advice.push({
      title: "Spending Exceeds Income",
      description: `You're spending $${Math.abs(Number(context.netBalance)).toFixed(2)} more than you earn. Review your expenses and identify areas to cut back.`,
      priority: "high",
    });
  } else if (Number(context.netBalance) > 0) {
    const income = Number(context.monthlyIncome) || 0;
    const savingsRate = income > 0 ? (Number(context.netBalance) / income) * 100 : 0;
    if (savingsRate < 10) {
      advice.push({
        title: "Increase Savings Rate",
        description: `You're saving ${savingsRate.toFixed(1)}% of your income. Aim for at least 20% to build financial security.`,
        priority: "medium",
      });
    } else {
      advice.push({
        title: "Great Savings Rate!",
        description: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the good work!`,
        priority: "low",
      });
    }
  }

  // Category-specific advice
  const entries = Object.entries(context.categorySpending || {}) as Array<[string, number]>;
  const topCategory = entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0];

  if (topCategory) {
    const [category, amount] = topCategory;
    const expenses = Number(context.monthlyExpenses) || 0;
    const percentage = expenses > 0 ? (Number(amount) / expenses) * 100 : 0;
    
    if (percentage > 40) {
      advice.push({
        title: `High ${category} Spending`,
        description: `${category} represents ${percentage.toFixed(0)}% of your expenses ($${Number(amount).toFixed(2)}). Consider ways to reduce this category.`,
        priority: "high",
      });
    }
  }

  // Budget advice
  if ((Number(context.totalBudgets) || 0) === 0) {
    advice.push({
      title: "Set Up Budgets",
      description: "You haven't set any budgets yet. Create budgets for your main expense categories to track spending better.",
      priority: "medium",
    });
  }

  // Emergency fund recommendation
  if (Number(context.monthlyIncome) > 0) {
    const recommendedEmergencyFund = Number(context.monthlyExpenses) * 6;
    advice.push({
      title: "Build Emergency Fund",
      description: `Aim to save $${Number(recommendedEmergencyFund).toFixed(2)} (6 months of expenses) for financial security.`,
      priority: "medium",
    });
  }

  return advice;
}