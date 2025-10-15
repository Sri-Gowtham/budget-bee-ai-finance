import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const allCategories = await db.select().from(categories);
    return NextResponse.json({ categories: allCategories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}