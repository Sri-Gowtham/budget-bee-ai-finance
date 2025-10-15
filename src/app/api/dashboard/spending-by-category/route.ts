import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Get all transactions for current month
    const allTransactions = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        categoryId: transactions.categoryId,
        date: transactions.date,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    // Filter to current month
    const monthTransactions = allTransactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= firstDayOfMonth;
    });

    // Get all categories
    const allCategories = await db.select().from(categories);

    // Group by category
    const spendingByCategory = allCategories
      .filter((cat) => cat.type === "expense")
      .map((category) => {
        const categoryTransactions = monthTransactions.filter(
          (t) => t.categoryId === category.id && t.type === "expense"
        );
        const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        return {
          name: category.name,
          value: total,
          icon: category.icon,
          color: category.color,
        };
      })
      .filter((cat) => cat.value > 0)
      .sort((a, b) => b.value - a.value);

    return NextResponse.json(spendingByCategory);
  } catch (error) {
    console.error("Error fetching spending by category:", error);
    return NextResponse.json(
      { error: "Failed to fetch spending data: " + error },
      { status: 500 }
    );
  }
}