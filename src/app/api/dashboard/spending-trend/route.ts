import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get all transactions
    const allTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    // Get last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Group by day
    const dailyData: { [key: string]: number } = {};

    allTransactions
      .filter((t) => new Date(t.date) >= sevenDaysAgo && t.type === "expense")
      .forEach((t) => {
        const date = new Date(t.date).toISOString().split("T")[0];
        if (!dailyData[date]) {
          dailyData[date] = 0;
        }
        dailyData[date] += t.amount;
      });

    // Convert to array and sort by date
    const trendData = Object.entries(dailyData)
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: date,
        amount: amount,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
      .map(({ date, amount }) => ({ date, amount }));

    return NextResponse.json(trendData);
  } catch (error) {
    console.error("Error fetching spending trend:", error);
    return NextResponse.json(
      { error: "Failed to fetch spending trend: " + error },
      { status: 500 }
    );
  }
}