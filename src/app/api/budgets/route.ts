import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const period = searchParams.get("period");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get budgets with category information
    const userBudgets = await db
      .select({
        id: budgets.id,
        userId: budgets.userId,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        amount: budgets.amount,
        period: budgets.period,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        createdAt: budgets.createdAt,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(
        period
          ? and(eq(budgets.userId, userId), eq(budgets.period, period))
          : eq(budgets.userId, userId)
      );

    // Calculate actual spending for each budget
    const enrichedBudgets = await Promise.all(
      userBudgets.map(async (budget) => {
        if (!budget.startDate || !budget.endDate) {
          return {
            ...budget,
            spent: 0,
            percentage: 0,
            remaining: budget.amount,
            status: "good",
          };
        }

        const [result] = await db
          .select({
            total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, budget.userId),
              eq(transactions.categoryId, budget.categoryId),
              eq(transactions.type, "expense"),
              gte(transactions.date, budget.startDate),
              lte(transactions.date, budget.endDate)
            )
          );

        const actualSpent = result?.total || 0;
        const percentage = budget.amount > 0 ? (actualSpent / budget.amount) * 100 : 0;
        const remaining = budget.amount - actualSpent;

        return {
          ...budget,
          spent: actualSpent,
          percentage: Math.min(percentage, 100),
          remaining,
          status:
            percentage >= 100
              ? "exceeded"
              : percentage >= 80
              ? "warning"
              : "good",
        };
      })
    );

    return NextResponse.json({ budgets: enrichedBudgets }, { status: 200 });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json({ error: "Failed to fetch budgets: " + error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, categoryId, amount, period, startDate, endDate } = body;

    if (!userId || !categoryId || !amount || !period) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if budget already exists for this category and period
    const existing = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, parseInt(categoryId)),
          eq(budgets.period, period)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Budget already exists for this category and period" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(budgets)
      .values({
        userId: userId,
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount),
        period,
        startDate: startDate || null,
        endDate: endDate || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ budget: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json({ error: "Failed to create budget: " + error }, { status: 500 });
  }
}