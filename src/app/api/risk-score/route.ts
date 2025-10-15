import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { riskScores } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let query = db.select().from(riskScores).where(eq(riskScores.userId, user.id));

    const conditions = [eq(riskScores.userId, user.id)];

    if (month) {
      const monthInt = parseInt(month);
      if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
        return NextResponse.json(
          { error: 'Month must be an integer between 1 and 12', code: 'INVALID_MONTH' },
          { status: 400 }
        );
      }
      conditions.push(eq(riskScores.month, monthInt));
    }

    if (year) {
      const yearInt = parseInt(year);
      if (isNaN(yearInt) || yearInt < 1000 || yearInt > 9999) {
        return NextResponse.json(
          { error: 'Year must be a valid 4-digit integer', code: 'INVALID_YEAR' },
          { status: 400 }
        );
      }
      conditions.push(eq(riskScores.year, yearInt));
    }

    const results = await db
      .select()
      .from(riskScores)
      .where(and(...conditions))
      .orderBy(desc(riskScores.year), desc(riskScores.month));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    const {
      month,
      year,
      riskScore,
      incomeVolatility,
      debtRatio,
      spendingVolatility,
      emergencyFundMonths,
      recommendations,
    } = body;

    if (month === undefined || month === null) {
      return NextResponse.json(
        { error: 'Month is required', code: 'MISSING_MONTH' },
        { status: 400 }
      );
    }

    if (year === undefined || year === null) {
      return NextResponse.json(
        { error: 'Year is required', code: 'MISSING_YEAR' },
        { status: 400 }
      );
    }

    if (riskScore === undefined || riskScore === null) {
      return NextResponse.json(
        { error: 'Risk score is required', code: 'MISSING_RISK_SCORE' },
        { status: 400 }
      );
    }

    if (incomeVolatility === undefined || incomeVolatility === null) {
      return NextResponse.json(
        { error: 'Income volatility is required', code: 'MISSING_INCOME_VOLATILITY' },
        { status: 400 }
      );
    }

    if (debtRatio === undefined || debtRatio === null) {
      return NextResponse.json(
        { error: 'Debt ratio is required', code: 'MISSING_DEBT_RATIO' },
        { status: 400 }
      );
    }

    if (spendingVolatility === undefined || spendingVolatility === null) {
      return NextResponse.json(
        { error: 'Spending volatility is required', code: 'MISSING_SPENDING_VOLATILITY' },
        { status: 400 }
      );
    }

    if (emergencyFundMonths === undefined || emergencyFundMonths === null) {
      return NextResponse.json(
        { error: 'Emergency fund months is required', code: 'MISSING_EMERGENCY_FUND_MONTHS' },
        { status: 400 }
      );
    }

    const monthInt = parseInt(month);
    if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return NextResponse.json(
        { error: 'Month must be an integer between 1 and 12', code: 'INVALID_MONTH' },
        { status: 400 }
      );
    }

    const yearInt = parseInt(year);
    if (isNaN(yearInt) || yearInt < 1000 || yearInt > 9999) {
      return NextResponse.json(
        { error: 'Year must be a valid 4-digit integer', code: 'INVALID_YEAR' },
        { status: 400 }
      );
    }

    const riskScoreNum = parseFloat(riskScore);
    if (isNaN(riskScoreNum)) {
      return NextResponse.json(
        { error: 'Risk score must be a valid number', code: 'INVALID_RISK_SCORE' },
        { status: 400 }
      );
    }

    const incomeVolatilityNum = parseFloat(incomeVolatility);
    if (isNaN(incomeVolatilityNum)) {
      return NextResponse.json(
        { error: 'Income volatility must be a valid number', code: 'INVALID_INCOME_VOLATILITY' },
        { status: 400 }
      );
    }

    const debtRatioNum = parseFloat(debtRatio);
    if (isNaN(debtRatioNum)) {
      return NextResponse.json(
        { error: 'Debt ratio must be a valid number', code: 'INVALID_DEBT_RATIO' },
        { status: 400 }
      );
    }

    const spendingVolatilityNum = parseFloat(spendingVolatility);
    if (isNaN(spendingVolatilityNum)) {
      return NextResponse.json(
        { error: 'Spending volatility must be a valid number', code: 'INVALID_SPENDING_VOLATILITY' },
        { status: 400 }
      );
    }

    const emergencyFundMonthsNum = parseFloat(emergencyFundMonths);
    if (isNaN(emergencyFundMonthsNum)) {
      return NextResponse.json(
        { error: 'Emergency fund months must be a valid number', code: 'INVALID_EMERGENCY_FUND_MONTHS' },
        { status: 400 }
      );
    }

    const newRiskScore = await db
      .insert(riskScores)
      .values({
        userId: user.id,
        month: monthInt,
        year: yearInt,
        riskScore: riskScoreNum,
        incomeVolatility: incomeVolatilityNum,
        debtRatio: debtRatioNum,
        spendingVolatility: spendingVolatilityNum,
        emergencyFundMonths: emergencyFundMonthsNum,
        recommendations: recommendations || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newRiskScore[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}