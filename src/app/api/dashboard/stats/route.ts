import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, budgets } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get current month dates
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all transactions for the user
    const allTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    // Get current month transactions
    const monthTransactions = allTransactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth;
    });

    // Calculate total income
    const totalIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate total expenses
    const totalExpenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate balance
    const balance = totalIncome - totalExpenses;

    // Get total budget
    const userBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId));

    const totalBudget = userBudgets.reduce((sum, b) => sum + b.amount, 0);

    // Calculate budget usage percentage
    const budgetUsed = totalExpenses;
    const budgetPercentage = totalBudget > 0 ? (budgetUsed / totalBudget) * 100 : 0;

    // Count anomalies (fraud alerts)
    const anomalyCount = allTransactions.filter((t) => t.isAnomaly).length;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      balance,
      totalBudget,
      budgetUsed,
      budgetPercentage,
      anomalyCount,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats: " + error },
      { status: 500 }
    );
  }
}