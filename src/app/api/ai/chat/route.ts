import { db } from "@/db";
import { transactions, budgets, categories } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message, conversationHistory } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for OpenAI API key first
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Fetch user's financial data for context
    const [userTransactions, userBudgets, userCategories] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.date))
        .limit(50),
      db
        .select()
        .from(budgets)
        .where(eq(budgets.userId, userId)),
      db.select().from(categories),
    ]);

    // Calculate financial summary
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    
    const currentMonthTransactions = userTransactions.filter(t => 
      t.date && t.date.startsWith(currentMonth)
    );

    const totalIncome = currentMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate expenses by category
    const expensesByCategory: Record<string, number> = {};
    currentMonthTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        const cat = userCategories.find(c => c.id === t.categoryId)?.name || "Uncategorized";
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (t.amount || 0);
      });

    const topCategory = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)[0];

    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Prepare context for AI
    const financialContext = `
User's Financial Summary:
- Current Month Income: $${totalIncome.toFixed(2)}
- Current Month Expenses: $${totalExpenses.toFixed(2)}
- Net Balance: $${(totalIncome - totalExpenses).toFixed(2)}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Number of Transactions: ${currentMonthTransactions.length}
- Top Spending Category: ${topCategory ? `${topCategory[0]} ($${topCategory[1].toFixed(2)})` : "None"}
- Active Budgets: ${userBudgets.length}
- Recent Transactions: ${userTransactions.slice(0, 5).map(t => `${t.description || 'No description'} (${t.type === 'income' ? '+' : '-'}$${t.amount || 0})`).join(', ')}
`;

    // Build conversation context
    const conversationContext = conversationHistory && conversationHistory.length > 0
      ? conversationHistory
          .slice(-5)
          .map((msg: any) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n")
      : "No previous conversation";

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a specialized AI financial advisor for Budget Bee, focused EXCLUSIVELY on personal finance, money management, budgeting, investments, savings, and financial planning.

CRITICAL RULES:
1. ONLY answer questions about finance, money, budgeting, investments, savings, taxes, retirement planning, debt management, credit, financial markets, and related financial topics.
2. If a user asks about ANY non-financial topic (weather, sports, general knowledge, coding, health, etc.), politely decline and redirect them to financial topics.
3. Use the user's actual financial data provided below to give personalized, data-driven advice.
4. Always provide actionable, practical financial advice based on up-to-date financial best practices (as of October 2025).
5. Be conversational, friendly, and encouraging while maintaining professionalism.
6. Keep responses concise (2-4 sentences) unless detailed financial analysis is requested.
7. When discussing investments or financial strategies, always mention risks and encourage diversification.
8. Stay current with 2025 financial trends, inflation rates, market conditions, and economic factors.

${financialContext}

Example responses for non-financial questions:
- "I'm specialized in financial advice only. I can help you with budgeting, savings, investments, and money management. Is there anything about your finances you'd like to discuss?"
- "I'm your personal finance assistant and can only answer money-related questions. How about we talk about your spending habits or saving goals instead?"

Remember: You have access to the user's real financial data above. Use it to provide specific, personalized advice!`,
          },
          {
            role: "user",
            content: `Previous conversation:\n${conversationContext}\n\nCurrent question: ${message}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    
    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      throw new Error("Invalid response from OpenAI");
    }

    const aiResponse = openaiData.choices[0].message.content;

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Error in AI chat:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat message" },
      { status: 500 }
    );
  }
}