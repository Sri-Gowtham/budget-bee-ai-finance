import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const categoryId = searchParams.get("categoryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Build WHERE conditions array
    const conditions = [eq(transactions.userId, userId)];

    if (categoryId) {
      conditions.push(eq(transactions.categoryId, parseInt(categoryId)));
    }

    if (type) {
      conditions.push(eq(transactions.type, type));
    }

    if (startDate) {
      conditions.push(gte(transactions.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(transactions.date, endDate));
    }

    const result = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        type: transactions.type,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        amount: transactions.amount,
        date: transactions.date,
        description: transactions.description,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactions.date));

    return NextResponse.json({ transactions: result }, { status: 200 });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions: " + error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, categoryId, amount, date, description } = body;

    if (!userId || !type || !categoryId || !amount || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await db
      .insert(transactions)
      .values({
        userId: userId,
        type,
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount),
        date,
        description: description || "",
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ transaction: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction: " + error }, { status: 500 });
  }
}