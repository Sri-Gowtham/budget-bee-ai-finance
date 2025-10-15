import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, type, categoryId, amount, date, description } = body || {};
    const id = Number.parseInt(params.id, 10);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
    }

    if (!type || !categoryId || amount == null || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updateData = {
      type,
      categoryId: typeof categoryId === "string" ? Number.parseInt(categoryId, 10) : Number(categoryId),
      amount: typeof amount === "string" ? Number.parseFloat(amount) : Number(amount),
      date,
      description: description || "",
    } as Partial<typeof transactions.$inferInsert>;

    const whereClause = userId
      ? and(eq(transactions.id, id), eq(transactions.userId, userId))
      : eq(transactions.id, id);

    const updated = await db
      .update(transactions)
      .set(updateData)
      .where(whereClause)
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ transaction: updated[0] }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
    }

    // Optionally ensure ownership if userId is provided as query or header
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || undefined;
    const whereClause = userId
      ? and(eq(transactions.id, id), eq(transactions.userId, userId))
      : eq(transactions.id, id);

    const deleted = await db.delete(transactions).where(whereClause).returning();

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Transaction deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}