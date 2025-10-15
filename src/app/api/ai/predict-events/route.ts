import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, categories } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface EventPrediction {
  eventType: string;
  predictedDate: string;
  confidence: number;
  category: string;
  estimatedAmount: number;
  reasoning: string;
}

interface MonthlyPattern {
  month: number;
  totalSpending: number;
  categoryBreakdown: Record<string, number>;
  transactionCount: number;
}

interface SpendingPatterns {
  monthlyAverages: Record<string, number>;
  seasonalTrends: Record<string, number>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Calculate date 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().split('T')[0];

    // Fetch user's transactions from last 12 months with category information
    const userTransactions = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        categoryId: transactions.categoryId,
        description: transactions.description,
        date: transactions.date,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.date, startDate)
        )
      );

    if (userTransactions.length === 0) {
      return NextResponse.json({
        predictions: [],
        spendingPatterns: {
          monthlyAverages: {},
          seasonalTrends: {}
        },
        method: 'insufficient_data',
        message: 'Not enough transaction data for predictions'
      }, { status: 200 });
    }

    // Group transactions by month and analyze patterns
    const monthlyPatterns: Record<string, MonthlyPattern> = {};
    const categoryTotals: Record<string, number[]> = {};

    userTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const categoryName = transaction.categoryName || 'Uncategorized';

      if (!monthlyPatterns[monthKey]) {
        monthlyPatterns[monthKey] = {
          month: date.getMonth() + 1,
          totalSpending: 0,
          categoryBreakdown: {},
          transactionCount: 0
        };
      }

      monthlyPatterns[monthKey].totalSpending += transaction.amount;
      monthlyPatterns[monthKey].transactionCount += 1;
      monthlyPatterns[monthKey].categoryBreakdown[categoryName] = 
        (monthlyPatterns[monthKey].categoryBreakdown[categoryName] || 0) + transaction.amount;

      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = [];
      }
      categoryTotals[categoryName].push(transaction.amount);
    });

    // Calculate spending patterns
    const spendingPatterns = calculateSpendingPatterns(monthlyPatterns);

    // Check if OpenAI is configured
    const openaiKey = process.env.OPENAI_API_KEY;
    let predictions: EventPrediction[];
    let method: string;

    if (!openaiKey) {
      // Rule-based predictions
      predictions = generateRuleBasedPredictions(monthlyPatterns, categoryTotals);
      method = 'rule-based';
    } else {
      // OpenAI-based predictions
      try {
        predictions = await generateOpenAIPredictions(monthlyPatterns, categoryTotals, openaiKey);
        method = 'openai';
      } catch (error) {
        console.error('OpenAI prediction error, falling back to rule-based:', error);
        predictions = generateRuleBasedPredictions(monthlyPatterns, categoryTotals);
        method = 'rule-based';
      }
    }

    return NextResponse.json({
      predictions,
      spendingPatterns,
      method
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

function calculateSpendingPatterns(monthlyPatterns: Record<string, MonthlyPattern>): SpendingPatterns {
  const monthlyAverages: Record<string, number> = {};
  const seasonalTrends: Record<string, number> = {
    'Winter': 0,
    'Spring': 0,
    'Summer': 0,
    'Fall': 0
  };
  const seasonCounts: Record<string, number> = {
    'Winter': 0,
    'Spring': 0,
    'Summer': 0,
    'Fall': 0
  };

  Object.values(monthlyPatterns).forEach(pattern => {
    const month = pattern.month;
    monthlyAverages[month] = (monthlyAverages[month] || 0) + pattern.totalSpending;

    // Seasonal grouping
    let season: string;
    if (month === 12 || month === 1 || month === 2) season = 'Winter';
    else if (month >= 3 && month <= 5) season = 'Spring';
    else if (month >= 6 && month <= 8) season = 'Summer';
    else season = 'Fall';

    seasonalTrends[season] += pattern.totalSpending;
    seasonCounts[season] += 1;
  });

  // Average seasonal trends
  Object.keys(seasonalTrends).forEach(season => {
    if (seasonCounts[season] > 0) {
      seasonalTrends[season] = seasonalTrends[season] / seasonCounts[season];
    }
  });

  return { monthlyAverages, seasonalTrends };
}

function generateRuleBasedPredictions(
  monthlyPatterns: Record<string, MonthlyPattern>,
  categoryTotals: Record<string, number[]>
): EventPrediction[] {
  const predictions: EventPrediction[] = [];
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;

  // Calculate average spending by month
  const monthlyAverages: Record<number, number> = {};
  const monthCounts: Record<number, number> = {};

  Object.values(monthlyPatterns).forEach(pattern => {
    monthlyAverages[pattern.month] = (monthlyAverages[pattern.month] || 0) + pattern.totalSpending;
    monthCounts[pattern.month] = (monthCounts[pattern.month] || 0) + 1;
  });

  Object.keys(monthlyAverages).forEach(month => {
    const monthNum = parseInt(month);
    monthlyAverages[monthNum] = monthlyAverages[monthNum] / monthCounts[monthNum];
  });

  // 1. December spending spikes → Holiday season
  const decemberAvg = monthlyAverages[12] || 0;
  const overallAvg = Object.values(monthlyAverages).reduce((a, b) => a + b, 0) / Object.keys(monthlyAverages).length;
  
  if (decemberAvg > overallAvg * 1.3 || currentMonth >= 10) {
    const nextDecember = currentMonth > 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    predictions.push({
      eventType: 'Holiday Season',
      predictedDate: `${nextDecember}-12-15`,
      confidence: decemberAvg > overallAvg * 1.3 ? 0.85 : 0.65,
      category: 'Shopping',
      estimatedAmount: Math.round(decemberAvg || overallAvg * 1.5),
      reasoning: 'Historical data shows increased spending in December for holiday shopping and gifts'
    });
  }

  // 2. Travel category spikes → Potential vacation
  const travelCategories = ['Travel', 'Transportation', 'Hotels', 'Vacation'];
  let travelSpending = 0;
  let travelMonths: number[] = [];

  travelCategories.forEach(cat => {
    if (categoryTotals[cat]) {
      travelSpending += categoryTotals[cat].reduce((a, b) => a + b, 0);
    }
  });

  Object.values(monthlyPatterns).forEach(pattern => {
    let monthTravel = 0;
    travelCategories.forEach(cat => {
      if (pattern.categoryBreakdown[cat]) {
        monthTravel += pattern.categoryBreakdown[cat];
      }
    });
    if (monthTravel > 0) {
      travelMonths.push(pattern.month);
    }
  });

  if (travelSpending > overallAvg * 0.5 && travelMonths.length > 0) {
    const mostCommonMonth = travelMonths.sort((a, b) => 
      travelMonths.filter(m => m === b).length - travelMonths.filter(m => m === a).length
    )[0];
    
    const nextYear = mostCommonMonth <= currentMonth ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    predictions.push({
      eventType: 'Vacation/Travel',
      predictedDate: `${nextYear}-${String(mostCommonMonth).padStart(2, '0')}-15`,
      confidence: 0.72,
      category: 'Travel',
      estimatedAmount: Math.round(travelSpending / travelMonths.length),
      reasoning: `Historical travel patterns suggest vacation planning around ${getMonthName(mostCommonMonth)}`
    });
  }

  // 3. Gift category patterns → Birthday/anniversary patterns
  const giftCategories = ['Gifts', 'Gift', 'Celebrations'];
  let giftMonths: Record<number, number> = {};

  giftCategories.forEach(cat => {
    Object.values(monthlyPatterns).forEach(pattern => {
      if (pattern.categoryBreakdown[cat]) {
        giftMonths[pattern.month] = (giftMonths[pattern.month] || 0) + pattern.categoryBreakdown[cat];
      }
    });
  });

  Object.entries(giftMonths).forEach(([month, amount]) => {
    const monthNum = parseInt(month);
    if (amount > 0) {
      const nextYear = monthNum <= currentMonth ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
      predictions.push({
        eventType: 'Birthday/Anniversary',
        predictedDate: `${nextYear}-${String(monthNum).padStart(2, '0')}-15`,
        confidence: 0.68,
        category: 'Gifts',
        estimatedAmount: Math.round(amount),
        reasoning: `Recurring gift spending patterns detected in ${getMonthName(monthNum)}`
      });
    }
  });

  // 4. Back-to-school patterns (August/September) → Education expenses
  const educationCategories = ['Education', 'School', 'Books', 'Supplies'];
  let augustSeptSpending = 0;
  let hasEducationPattern = false;

  educationCategories.forEach(cat => {
    Object.values(monthlyPatterns).forEach(pattern => {
      if ((pattern.month === 8 || pattern.month === 9) && pattern.categoryBreakdown[cat]) {
        augustSeptSpending += pattern.categoryBreakdown[cat];
        hasEducationPattern = true;
      }
    });
  });

  if (hasEducationPattern || (monthlyAverages[8] || 0) > overallAvg * 1.2) {
    const nextYear = currentMonth >= 9 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    predictions.push({
      eventType: 'Back to School',
      predictedDate: `${nextYear}-08-20`,
      confidence: hasEducationPattern ? 0.78 : 0.60,
      category: 'Education',
      estimatedAmount: Math.round(augustSeptSpending || monthlyAverages[8] || overallAvg * 1.2),
      reasoning: 'Historical spending patterns indicate back-to-school expenses in late August'
    });
  }

  // 5. Major purchase patterns
  const expensiveTransactions = Object.values(monthlyPatterns).filter(
    pattern => pattern.totalSpending > overallAvg * 2
  );

  if (expensiveTransactions.length > 0) {
    const avgLargeExpense = expensiveTransactions.reduce((sum, p) => sum + p.totalSpending, 0) / expensiveTransactions.length;
    predictions.push({
      eventType: 'Major Purchase',
      predictedDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 15).toISOString().split('T')[0],
      confidence: 0.55,
      category: 'Shopping',
      estimatedAmount: Math.round(avgLargeExpense),
      reasoning: 'Historical data shows periodic large purchases, potentially for electronics, furniture, or home improvements'
    });
  }

  return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

async function generateOpenAIPredictions(
  monthlyPatterns: Record<string, MonthlyPattern>,
  categoryTotals: Record<string, number[]>,
  openaiKey: string
): Promise<EventPrediction[]> {
  const monthlyData = Object.entries(monthlyPatterns).map(([month, data]) => ({
    month,
    totalSpending: data.totalSpending,
    categoryBreakdown: data.categoryBreakdown,
    transactionCount: data.transactionCount
  }));

  const categoryAverages = Object.entries(categoryTotals).reduce((acc, [cat, amounts]) => {
    acc[cat] = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    return acc;
  }, {} as Record<string, number>);

  const prompt = `You are a financial analyst specializing in predicting life events from spending patterns.

Analyze the following 12-month spending data and predict upcoming life events:

Monthly Spending Patterns:
${JSON.stringify(monthlyData, null, 2)}

Category Averages:
${JSON.stringify(categoryAverages, null, 2)}

Based on this data, predict upcoming life events such as:
- Birthdays (recurring gift spending)
- Holidays (December spending spikes)
- Vacations/Travel (travel category increases)
- Weddings (formal wear, gifts, travel)
- Major purchases (electronics, furniture, home improvement)
- Back-to-school (August/September education spending)
- Moving/Relocation (increased spending on home goods)

For each prediction, provide:
1. eventType: Clear event name
2. predictedDate: Estimated date in YYYY-MM-DD format
3. confidence: Float between 0 and 1 (how confident you are)
4. category: Primary spending category
5. estimatedAmount: Expected spending amount
6. reasoning: Brief explanation of why you predict this event

Return ONLY a valid JSON array of predictions, no other text:
[{"eventType": "...", "predictedDate": "2024-12-15", "confidence": 0.85, "category": "...", "estimatedAmount": 500, "reasoning": "..."}]

Provide 3-6 predictions maximum, ordered by confidence.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst that predicts life events from spending patterns. Always respond with valid JSON arrays only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 700
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '[]';
  
  // Extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  const predictions: EventPrediction[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  // Validate and sanitize predictions
  return predictions.filter(p => 
    p.eventType && 
    p.predictedDate && 
    typeof p.confidence === 'number' && 
    p.confidence >= 0 && 
    p.confidence <= 1
  ).slice(0, 6);
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}