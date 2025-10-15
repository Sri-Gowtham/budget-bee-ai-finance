import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions, user } from '@/db/schema';
import { eq, and, gte, sql, between } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

interface UserMetrics {
  savingsRate: number;
  emergencyFundMonths: number;
  monthlySavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

interface Benchmarks {
  averageSavingsRate: number;
  recommendedSavingsRate: number;
  percentile: number;
}

interface Insight {
  type: string;
  message: string;
  recommendation: string;
}

export async function POST(request: NextRequest) {
  try {
    const authenticatedUser = await getCurrentUser(request);
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { incomeRange, age, location } = body;

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoString = sixMonthsAgo.toISOString().split('T')[0];

    // Fetch user's transactions from the last 6 months
    const userTransactions = await db.select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, authenticatedUser.id),
          gte(transactions.date, sixMonthsAgoString)
        )
      );

    if (userTransactions.length === 0) {
      return NextResponse.json({
        error: 'Insufficient transaction data. At least 6 months of transactions required.',
        code: 'INSUFFICIENT_DATA'
      }, { status: 400 });
    }

    // Calculate user's financial metrics
    const userMetrics = calculateUserMetrics(userTransactions);

    if (userMetrics.monthlyIncome === 0) {
      return NextResponse.json({
        error: 'No income transactions found. Unable to calculate savings rate.',
        code: 'NO_INCOME_DATA'
      }, { status: 400 });
    }

    // Get benchmark data from similar users
    const benchmarks = await calculateBenchmarks(
      authenticatedUser.id,
      incomeRange,
      sixMonthsAgoString,
      userMetrics
    );

    // Generate insights
    let insights: Insight[] = [];
    let method = 'rule-based';

    // Try OpenAI if available
    try {
      const openaiInsights = await generateOpenAIInsights(userMetrics, benchmarks);
      if (openaiInsights) {
        insights = openaiInsights;
        method = 'openai';
      } else {
        insights = generateRuleBasedInsights(userMetrics, benchmarks);
      }
    } catch (error) {
      console.error('OpenAI generation failed, falling back to rule-based:', error);
      insights = generateRuleBasedInsights(userMetrics, benchmarks);
    }

    return NextResponse.json({
      userMetrics: {
        savingsRate: parseFloat(userMetrics.savingsRate.toFixed(2)),
        emergencyFundMonths: parseFloat(userMetrics.emergencyFundMonths.toFixed(2)),
        monthlySavings: parseFloat(userMetrics.monthlySavings.toFixed(2))
      },
      benchmarks: {
        averageSavingsRate: parseFloat(benchmarks.averageSavingsRate.toFixed(2)),
        recommendedSavingsRate: parseFloat(benchmarks.recommendedSavingsRate.toFixed(2)),
        percentile: parseFloat(benchmarks.percentile.toFixed(0))
      },
      insights,
      method
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

function calculateUserMetrics(userTransactions: any[]): UserMetrics {
  let totalIncome = 0;
  let totalExpenses = 0;

  userTransactions.forEach(transaction => {
    if (transaction.type === 'income') {
      totalIncome += transaction.amount;
    } else if (transaction.type === 'expense') {
      totalExpenses += transaction.amount;
    }
  });

  // Calculate monthly averages (6 months of data)
  const monthlyIncome = totalIncome / 6;
  const monthlyExpenses = totalExpenses / 6;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Calculate current savings (accumulated over 6 months)
  const currentSavings = totalIncome - totalExpenses;
  const emergencyFundMonths = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0;

  return {
    savingsRate,
    emergencyFundMonths,
    monthlySavings,
    monthlyIncome,
    monthlyExpenses
  };
}

async function calculateBenchmarks(
  currentUserId: string,
  incomeRange: string | undefined,
  sixMonthsAgoString: string,
  userMetrics: UserMetrics
): Promise<Benchmarks> {
  const annualIncome = userMetrics.monthlyIncome * 12;

  // Determine income bracket
  let minIncome = 0;
  let maxIncome = 1000000000;
  let recommendedSavingsRate = 15;

  if (incomeRange) {
    const [min, max] = incomeRange.split('-').map(v => parseInt(v));
    minIncome = min;
    maxIncome = max;
  } else {
    // Infer from calculated annual income
    if (annualIncome < 30000) {
      minIncome = 0;
      maxIncome = 30000;
      recommendedSavingsRate = 7.5;
    } else if (annualIncome < 50000) {
      minIncome = 30000;
      maxIncome = 50000;
      recommendedSavingsRate = 12.5;
    } else if (annualIncome < 75000) {
      minIncome = 50000;
      maxIncome = 75000;
      recommendedSavingsRate = 17.5;
    } else if (annualIncome < 100000) {
      minIncome = 75000;
      maxIncome = 100000;
      recommendedSavingsRate = 22.5;
    } else {
      minIncome = 100000;
      maxIncome = 1000000000;
      recommendedSavingsRate = 27.5;
    }
  }

  // Set recommended savings rate based on income bracket
  if (minIncome < 30000) {
    recommendedSavingsRate = 7.5;
  } else if (minIncome < 50000) {
    recommendedSavingsRate = 12.5;
  } else if (minIncome < 75000) {
    recommendedSavingsRate = 17.5;
  } else if (minIncome < 100000) {
    recommendedSavingsRate = 22.5;
  } else {
    recommendedSavingsRate = 27.5;
  }

  try {
    // Fetch all users' transactions in similar income range (anonymized aggregation)
    const allUsersTransactions = await db.select({
      userId: transactions.userId,
      amount: transactions.amount,
      type: transactions.type
    })
    .from(transactions)
    .where(gte(transactions.date, sixMonthsAgoString));

    // Calculate savings rates for all users
    const userSavingsRates: { [userId: string]: number } = {};

    allUsersTransactions.forEach(transaction => {
      if (!userSavingsRates[transaction.userId]) {
        userSavingsRates[transaction.userId] = 0;
      }

      if (transaction.type === 'income') {
        userSavingsRates[transaction.userId] += transaction.amount;
      } else if (transaction.type === 'expense') {
        userSavingsRates[transaction.userId] -= transaction.amount;
      }
    });

    // Calculate savings rates and filter by income range
    const savingsRatesInRange: number[] = [];

    Object.entries(userSavingsRates).forEach(([userId, netSavings]) => {
      if (userId === currentUserId) return; // Exclude current user

      const userIncomeTransactions = allUsersTransactions.filter(
        t => t.userId === userId && t.type === 'income'
      );
      const totalIncome = userIncomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const monthlyIncome = totalIncome / 6;
      const annualIncome = monthlyIncome * 12;

      // Filter by income range
      if (annualIncome >= minIncome && annualIncome < maxIncome) {
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
        if (savingsRate >= -100 && savingsRate <= 100) { // Sanity check
          savingsRatesInRange.push(savingsRate);
        }
      }
    });

    // Calculate average savings rate
    let averageSavingsRate = recommendedSavingsRate;
    if (savingsRatesInRange.length > 0) {
      averageSavingsRate = savingsRatesInRange.reduce((sum, rate) => sum + rate, 0) / savingsRatesInRange.length;
    }

    // Calculate percentile
    let percentile = 50;
    if (savingsRatesInRange.length > 0) {
      const userSavingsRate = userMetrics.savingsRate;
      const betterThanCount = savingsRatesInRange.filter(rate => userSavingsRate > rate).length;
      percentile = (betterThanCount / savingsRatesInRange.length) * 100;
    } else {
      // Estimate percentile based on recommended rate
      if (userMetrics.savingsRate >= recommendedSavingsRate) {
        percentile = 65 + (userMetrics.savingsRate - recommendedSavingsRate) * 2;
      } else {
        percentile = 35 + (userMetrics.savingsRate / recommendedSavingsRate) * 30;
      }
      percentile = Math.max(1, Math.min(99, percentile));
    }

    return {
      averageSavingsRate,
      recommendedSavingsRate,
      percentile
    };

  } catch (error) {
    console.error('Error calculating benchmarks:', error);
    // Fallback to rule-based benchmarks
    let percentile = 50;
    if (userMetrics.savingsRate >= recommendedSavingsRate) {
      percentile = 65 + (userMetrics.savingsRate - recommendedSavingsRate) * 2;
    } else {
      percentile = 35 + (userMetrics.savingsRate / recommendedSavingsRate) * 30;
    }
    percentile = Math.max(1, Math.min(99, percentile));

    return {
      averageSavingsRate: recommendedSavingsRate,
      recommendedSavingsRate,
      percentile
    };
  }
}

function generateRuleBasedInsights(userMetrics: UserMetrics, benchmarks: Benchmarks): Insight[] {
  const insights: Insight[] = [];

  // Savings rate comparison
  if (userMetrics.savingsRate < benchmarks.recommendedSavingsRate) {
    const gap = benchmarks.recommendedSavingsRate - userMetrics.savingsRate;
    insights.push({
      type: 'savings_rate',
      message: `Your savings rate of ${userMetrics.savingsRate.toFixed(1)}% is below the recommended ${benchmarks.recommendedSavingsRate.toFixed(1)}% for your income bracket.`,
      recommendation: `Try to increase your savings by ${gap.toFixed(1)} percentage points. This could mean saving an additional $${(userMetrics.monthlyIncome * gap / 100).toFixed(2)} per month.`
    });
  } else {
    insights.push({
      type: 'savings_rate',
      message: `Excellent! Your savings rate of ${userMetrics.savingsRate.toFixed(1)}% exceeds the recommended ${benchmarks.recommendedSavingsRate.toFixed(1)}%.`,
      recommendation: `You're in the top ${(100 - benchmarks.percentile).toFixed(0)}% of savers. Consider investing your surplus savings for long-term growth.`
    });
  }

  // Emergency fund evaluation
  if (userMetrics.emergencyFundMonths < 3) {
    insights.push({
      type: 'emergency_fund',
      message: `Your emergency fund covers ${userMetrics.emergencyFundMonths.toFixed(1)} months of expenses, which is below the recommended 3-6 months.`,
      recommendation: `Prioritize building your emergency fund to at least 3 months of expenses ($${(userMetrics.monthlyExpenses * 3).toFixed(2)}). Consider automating monthly transfers to a high-yield savings account.`
    });
  } else if (userMetrics.emergencyFundMonths >= 6) {
    insights.push({
      type: 'emergency_fund',
      message: `Great job! Your emergency fund covers ${userMetrics.emergencyFundMonths.toFixed(1)} months of expenses, meeting the 3-6 month standard.`,
      recommendation: `Your emergency fund is well-established. Consider directing additional savings toward retirement accounts or investment opportunities.`
    });
  } else {
    insights.push({
      type: 'emergency_fund',
      message: `Your emergency fund covers ${userMetrics.emergencyFundMonths.toFixed(1)} months of expenses, which is within the recommended range.`,
      recommendation: `Continue building toward 6 months of expenses for optimal financial security. You're on the right track!`
    });
  }

  // Percentile insight
  if (benchmarks.percentile >= 75) {
    insights.push({
      type: 'performance',
      message: `You're performing exceptionally well, ranking in the top ${(100 - benchmarks.percentile).toFixed(0)}% of savers in your income bracket.`,
      recommendation: `Maintain your excellent habits and explore advanced wealth-building strategies like tax-advantaged investments or diversified portfolios.`
    });
  } else if (benchmarks.percentile <= 25) {
    insights.push({
      type: 'performance',
      message: `Your savings performance is in the lower quartile compared to peers in your income bracket.`,
      recommendation: `Review your budget to identify areas where you can reduce expenses. Small changes like meal planning or negotiating bills can make a significant impact.`
    });
  }

  return insights;
}

async function generateOpenAIInsights(userMetrics: UserMetrics, benchmarks: Benchmarks): Promise<Insight[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = `You are a financial advisor analyzing a user's savings performance against benchmarks.

User's Financial Metrics:
- Savings Rate: ${userMetrics.savingsRate.toFixed(1)}%
- Emergency Fund: ${userMetrics.emergencyFundMonths.toFixed(1)} months of expenses
- Monthly Income: $${userMetrics.monthlyIncome.toFixed(2)}
- Monthly Expenses: $${userMetrics.monthlyExpenses.toFixed(2)}
- Monthly Savings: $${userMetrics.monthlySavings.toFixed(2)}

Benchmarks:
- Average Savings Rate: ${benchmarks.averageSavingsRate.toFixed(1)}%
- Recommended Savings Rate: ${benchmarks.recommendedSavingsRate.toFixed(1)}%
- Performance Percentile: ${benchmarks.percentile.toFixed(0)}th percentile

Provide 2-3 actionable insights in JSON format as an array of objects with these fields:
- type: (savings_rate, emergency_fund, performance, or opportunity)
- message: A clear statement about their current situation
- recommendation: Specific, actionable advice

Focus on being encouraging, specific, and actionable.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful financial advisor providing personalized savings insights. Always respond with valid JSON arrays only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const insights = JSON.parse(jsonMatch[0]);
      return insights;
    }

    return null;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}