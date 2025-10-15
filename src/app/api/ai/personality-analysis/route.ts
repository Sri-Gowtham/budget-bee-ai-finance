import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, budgets, financialPersonality, categories } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface TransactionPattern {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  avgTransactionSize: number;
  smallTransactionCount: number;
  largeTransactionCount: number;
  categoryBreakdown: Record<string, number>;
  monthlyConsistency: number;
  luxurySpending: number;
  necessitySpending: number;
  investmentSpending: number;
}

interface PersonalityAnalysis {
  personalityType: 'saver' | 'spender' | 'planner' | 'investor' | 'risk-taker';
  confidence: number;
  traits: string[];
  monthlyAnalysis: {
    month: string;
    insights: string[];
    strengths: string[];
    areasForImprovement: string[];
  };
}

const LUXURY_CATEGORIES = ['entertainment', 'dining', 'shopping', 'travel', 'luxury'];
const NECESSITY_CATEGORIES = ['groceries', 'utilities', 'housing', 'transportation', 'healthcare'];
const INVESTMENT_CATEGORIES = ['investment', 'savings', 'retirement'];

async function fetchTransactionPatterns(userId: string): Promise<TransactionPattern | null> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

  const userTransactions = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      categoryId: transactions.categoryId,
      date: transactions.date,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, sixMonthsAgoStr)
      )
    )
    .orderBy(desc(transactions.date));

  if (userTransactions.length < 10) {
    return null;
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  let smallTransactionCount = 0;
  let largeTransactionCount = 0;
  const categoryBreakdown: Record<string, number> = {};
  let luxurySpending = 0;
  let necessitySpending = 0;
  let investmentSpending = 0;

  const monthlyExpenses: Record<string, number> = {};

  for (const transaction of userTransactions) {
    const amount = Math.abs(transaction.amount);

    if (transaction.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpenses += amount;

      // Small vs large transactions (threshold: median transaction size)
      if (amount < 50) {
        smallTransactionCount++;
      } else if (amount > 500) {
        largeTransactionCount++;
      }

      // Category breakdown
      const categoryName = transaction.categoryName?.toLowerCase() || 'other';
      categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + amount;

      // Luxury vs necessity vs investment
      if (LUXURY_CATEGORIES.some(cat => categoryName.includes(cat))) {
        luxurySpending += amount;
      } else if (NECESSITY_CATEGORIES.some(cat => categoryName.includes(cat))) {
        necessitySpending += amount;
      } else if (INVESTMENT_CATEGORIES.some(cat => categoryName.includes(cat))) {
        investmentSpending += amount;
      }

      // Monthly consistency
      const month = transaction.date.substring(0, 7);
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + amount;
    }
  }

  // Calculate monthly consistency (lower variance = more consistent)
  const monthlyValues = Object.values(monthlyExpenses);
  const avgMonthly = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
  const variance = monthlyValues.reduce((sum, val) => sum + Math.pow(val - avgMonthly, 2), 0) / monthlyValues.length;
  const stdDev = Math.sqrt(variance);
  const monthlyConsistency = avgMonthly > 0 ? Math.max(0, 1 - (stdDev / avgMonthly)) : 0;

  return {
    totalTransactions: userTransactions.length,
    totalIncome,
    totalExpenses,
    avgTransactionSize: totalExpenses / userTransactions.filter(t => t.type === 'expense').length,
    smallTransactionCount,
    largeTransactionCount,
    categoryBreakdown,
    monthlyConsistency,
    luxurySpending,
    necessitySpending,
    investmentSpending,
  };
}

function analyzePersonalityRuleBased(patterns: TransactionPattern, hasBudgets: boolean): PersonalityAnalysis {
  const savingsRate = patterns.totalIncome > 0 
    ? (patterns.totalIncome - patterns.totalExpenses) / patterns.totalIncome 
    : 0;
  
  const luxuryRatio = patterns.totalExpenses > 0
    ? patterns.luxurySpending / patterns.totalExpenses
    : 0;

  const investmentRatio = patterns.totalExpenses > 0
    ? patterns.investmentSpending / patterns.totalExpenses
    : 0;

  const impulseRatio = patterns.totalTransactions > 0
    ? patterns.smallTransactionCount / patterns.totalTransactions
    : 0;

  const riskIndicator = patterns.totalTransactions > 0
    ? patterns.largeTransactionCount / patterns.totalTransactions
    : 0;

  // Personality type detection with confidence scoring
  const scores = {
    saver: 0,
    spender: 0,
    planner: 0,
    investor: 0,
    'risk-taker': 0,
  };

  // SAVER scoring
  if (savingsRate > 0.20) scores.saver += 0.4;
  if (luxuryRatio < 0.15) scores.saver += 0.3;
  if (patterns.monthlyConsistency > 0.7) scores.saver += 0.3;

  // SPENDER scoring
  if (savingsRate < 0.10) scores.spender += 0.4;
  if (luxuryRatio > 0.30) scores.spender += 0.3;
  if (impulseRatio > 0.5) scores.spender += 0.3;

  // PLANNER scoring
  if (hasBudgets) scores.planner += 0.4;
  if (patterns.monthlyConsistency > 0.6) scores.planner += 0.3;
  if (savingsRate >= 0.10 && savingsRate <= 0.25) scores.planner += 0.3;

  // INVESTOR scoring
  if (investmentRatio > 0.15) scores.investor += 0.5;
  if (savingsRate > 0.15) scores.investor += 0.3;
  if (patterns.largeTransactionCount > 3) scores.investor += 0.2;

  // RISK-TAKER scoring
  if (riskIndicator > 0.2) scores['risk-taker'] += 0.4;
  if (patterns.monthlyConsistency < 0.5) scores['risk-taker'] += 0.3;
  if (investmentRatio > 0.10) scores['risk-taker'] += 0.3;

  // Determine primary personality type
  const personalityType = Object.entries(scores).reduce((a, b) => 
    b[1] > a[1] ? b : a
  )[0] as PersonalityAnalysis['personalityType'];

  const confidence = Math.min(scores[personalityType], 1.0);

  // Extract traits based on patterns
  const traits: string[] = [];
  if (impulseRatio > 0.5) traits.push('impulsive');
  if (patterns.monthlyConsistency > 0.7) traits.push('disciplined');
  if (savingsRate > 0.20) traits.push('frugal');
  if (luxuryRatio > 0.25) traits.push('generous');
  if (riskIndicator < 0.1) traits.push('cautious');
  if (riskIndicator > 0.2) traits.push('adventurous');
  if (hasBudgets) traits.push('organized');
  if (investmentRatio > 0.15) traits.push('forward-thinking');

  // Generate monthly insights
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const insights: string[] = [];
  const strengths: string[] = [];
  const areasForImprovement: string[] = [];

  if (savingsRate > 0.15) {
    strengths.push('Strong savings discipline');
  } else {
    areasForImprovement.push('Consider increasing your savings rate');
  }

  if (patterns.monthlyConsistency > 0.7) {
    strengths.push('Consistent spending patterns');
  } else {
    areasForImprovement.push('Work on maintaining consistent spending habits');
  }

  if (luxuryRatio < 0.20) {
    strengths.push('Controlled discretionary spending');
  } else if (luxuryRatio > 0.40) {
    areasForImprovement.push('High luxury spending - consider rebalancing');
  }

  insights.push(`Your ${personalityType} personality shows ${confidence > 0.7 ? 'strong' : 'moderate'} financial patterns`);
  insights.push(`Savings rate: ${(savingsRate * 100).toFixed(1)}%`);
  insights.push(`Monthly spending consistency: ${(patterns.monthlyConsistency * 100).toFixed(1)}%`);

  return {
    personalityType,
    confidence: Math.round(confidence * 100) / 100,
    traits,
    monthlyAnalysis: {
      month: currentMonth,
      insights,
      strengths,
      areasForImprovement,
    },
  };
}

async function analyzePersonalityWithOpenAI(
  patterns: TransactionPattern,
  hasBudgets: boolean
): Promise<PersonalityAnalysis> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const savingsRate = patterns.totalIncome > 0 
      ? ((patterns.totalIncome - patterns.totalExpenses) / patterns.totalIncome * 100).toFixed(1)
      : '0';

    const topCategories = Object.entries(patterns.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(', ');

    const prompt = `Analyze this user's financial personality based on 6 months of transaction data:

Transaction Summary:
- Total transactions: ${patterns.totalTransactions}
- Total income: $${patterns.totalIncome.toFixed(2)}
- Total expenses: $${patterns.totalExpenses.toFixed(2)}
- Average transaction: $${patterns.avgTransactionSize.toFixed(2)}
- Savings rate: ${savingsRate}%
- Has budgets: ${hasBudgets ? 'Yes' : 'No'}

Spending Patterns:
- Small transactions (<$50): ${patterns.smallTransactionCount}
- Large transactions (>$500): ${patterns.largeTransactionCount}
- Monthly consistency score: ${(patterns.monthlyConsistency * 100).toFixed(1)}%
- Luxury spending: $${patterns.luxurySpending.toFixed(2)}
- Necessity spending: $${patterns.necessitySpending.toFixed(2)}
- Investment spending: $${patterns.investmentSpending.toFixed(2)}

Top spending categories: ${topCategories}

Determine the user's primary financial personality type from: saver, spender, planner, investor, risk-taker

Provide:
1. Personality type (one word)
2. Confidence score (0.0-1.0)
3. List of traits (e.g., impulsive, disciplined, cautious, adventurous, frugal, generous)
4. Current month insights (3-4 observations)
5. Strengths (2-3 items)
6. Areas for improvement (2-3 items)

Respond in valid JSON format:
{
  "personalityType": "type",
  "confidence": 0.85,
  "traits": ["trait1", "trait2"],
  "insights": ["insight1", "insight2"],
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial psychology expert. Analyze spending patterns and provide personality insights in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(content);
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return {
      personalityType: analysis.personalityType,
      confidence: analysis.confidence,
      traits: analysis.traits,
      monthlyAnalysis: {
        month: currentMonth,
        insights: analysis.insights,
        strengths: analysis.strengths,
        areasForImprovement: analysis.areasForImprovement,
      },
    };
  } catch (error) {
    console.error('OpenAI analysis failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Fetch transaction patterns
    const patterns = await fetchTransactionPatterns(user.id);

    if (!patterns) {
      return NextResponse.json(
        {
          error: 'Insufficient transaction data. At least 10 transactions from the last 6 months are required.',
          code: 'INSUFFICIENT_DATA',
        },
        { status: 400 }
      );
    }

    // Check if user has budgets
    const userBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, user.id))
      .limit(1);

    const hasBudgets = userBudgets.length > 0;

    // Try OpenAI analysis first, fall back to rule-based
    let analysis: PersonalityAnalysis;
    let method: 'openai' | 'rule-based' = 'rule-based';

    try {
      analysis = await analyzePersonalityWithOpenAI(patterns, hasBudgets);
      method = 'openai';
    } catch (error) {
      console.log('OpenAI analysis unavailable, using rule-based analysis');
      analysis = analyzePersonalityRuleBased(patterns, hasBudgets);
    }

    // Check if personality profile exists
    const existingProfile = await db
      .select()
      .from(financialPersonality)
      .where(eq(financialPersonality.userId, user.id))
      .limit(1);

    const currentTimestamp = new Date().toISOString();

    let savedProfile;

    if (existingProfile.length > 0) {
      // Update existing profile
      savedProfile = await db
        .update(financialPersonality)
        .set({
          personalityType: analysis.personalityType,
          confidence: analysis.confidence,
          traits: analysis.traits,
          lastUpdated: currentTimestamp,
          monthlyAnalysis: analysis.monthlyAnalysis,
        })
        .where(eq(financialPersonality.userId, user.id))
        .returning();
    } else {
      // Create new profile
      savedProfile = await db
        .insert(financialPersonality)
        .values({
          userId: user.id,
          personalityType: analysis.personalityType,
          confidence: analysis.confidence,
          traits: analysis.traits,
          lastUpdated: currentTimestamp,
          monthlyAnalysis: analysis.monthlyAnalysis,
        })
        .returning();
    }

    // Calculate spending profile metrics
    const savingsRate = patterns.totalIncome > 0
      ? ((patterns.totalIncome - patterns.totalExpenses) / patterns.totalIncome * 100)
      : 0;

    const topCategories = Object.entries(patterns.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    const spendingProfile = {
      savingsRate: Math.round(savingsRate * 10) / 10,
      avgTransactionSize: Math.round(patterns.avgTransactionSize * 100) / 100,
      topCategories,
      patterns: {
        impulseRatio: Math.round((patterns.smallTransactionCount / patterns.totalTransactions) * 100) / 100,
        luxuryRatio: patterns.totalExpenses > 0
          ? Math.round((patterns.luxurySpending / patterns.totalExpenses) * 100) / 100
          : 0,
        consistencyScore: Math.round(patterns.monthlyConsistency * 100) / 100,
      },
    };

    return NextResponse.json(
      {
        personality: savedProfile[0],
        spendingProfile,
        method,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}