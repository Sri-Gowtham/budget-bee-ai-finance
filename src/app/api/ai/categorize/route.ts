import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      // Fallback to rule-based categorization
      const category = ruleBasedCategorization(description);
      return NextResponse.json({ 
        categoryId: category,
        method: "rule-based",
      });
    }

    // Call OpenAI API for smart categorization
    const prompt = `Categorize the following transaction into one of these categories:
1 - Food & Dining
2 - Transportation
3 - Housing & Rent
4 - Utilities
5 - Shopping
6 - Entertainment
7 - Healthcare
8 - Income
9 - Other

Transaction description: "${description}"

Respond with ONLY the number (1-9) of the most appropriate category.`;

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
            content: "You are a transaction categorization assistant. Always respond with only a number between 1-9.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API request failed");
    }

    const data = await response.json();
    const categoryId = parseInt(data.choices[0].message.content.trim());

    if (isNaN(categoryId) || categoryId < 1 || categoryId > 9) {
      // Fallback if invalid response
      return NextResponse.json({
        categoryId: ruleBasedCategorization(description),
        method: "rule-based-fallback",
      });
    }

    return NextResponse.json({
      categoryId,
      method: "openai",
    });
  } catch (error) {
    console.error("Error categorizing transaction:", error);
    
    // Fallback to rule-based using empty description
    return NextResponse.json({
      categoryId: 9, // Default to "Other" on error
      method: "rule-based-error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function ruleBasedCategorization(description: string): number {
  const lowerDesc = description.toLowerCase();

  const categoryMapping: { [key: string]: number } = {
    // Food & Dining
    food: 1,
    restaurant: 1,
    cafe: 1,
    grocery: 1,
    groceries: 1,
    lunch: 1,
    dinner: 1,
    breakfast: 1,
    starbucks: 1,
    mcdonalds: 1,
    
    // Transportation
    uber: 2,
    lyft: 2,
    taxi: 2,
    gas: 2,
    fuel: 2,
    parking: 2,
    transport: 2,
    bus: 2,
    train: 2,
    
    // Housing
    rent: 3,
    mortgage: 3,
    apartment: 3,
    housing: 3,
    
    // Utilities
    electricity: 4,
    water: 4,
    internet: 4,
    phone: 4,
    utility: 4,
    utilities: 4,
    
    // Shopping
    amazon: 5,
    shopping: 5,
    clothes: 5,
    clothing: 5,
    store: 5,
    mall: 5,
    
    // Entertainment
    movie: 6,
    cinema: 6,
    netflix: 6,
    spotify: 6,
    entertainment: 6,
    game: 6,
    games: 6,
    
    // Healthcare
    doctor: 7,
    hospital: 7,
    pharmacy: 7,
    medical: 7,
    health: 7,
    healthcare: 7,
    
    // Income
    salary: 8,
    income: 8,
    paycheck: 8,
    payment: 8,
    deposit: 8,
  };

  for (const [keyword, categoryId] of Object.entries(categoryMapping)) {
    if (lowerDesc.includes(keyword)) {
      return categoryId;
    }
  }

  // Default to "Other"
  return 9;
}