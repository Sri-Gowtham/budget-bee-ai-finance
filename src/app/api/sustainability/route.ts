import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sustainabilityScores } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let conditions = [eq(sustainabilityScores.userId, user.id)];

    if (month) {
      const monthNum = parseInt(month);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json({ 
          error: 'Month must be an integer between 1 and 12',
          code: 'INVALID_MONTH' 
        }, { status: 400 });
      }
      conditions.push(eq(sustainabilityScores.month, monthNum));
    }

    if (year) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
        return NextResponse.json({ 
          error: 'Year must be a valid 4-digit integer',
          code: 'INVALID_YEAR' 
        }, { status: 400 });
      }
      conditions.push(eq(sustainabilityScores.year, yearNum));
    }

    const results = await db.select()
      .from(sustainabilityScores)
      .where(and(...conditions))
      .orderBy(desc(sustainabilityScores.year), desc(sustainabilityScores.month));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestBody = await request.json();

    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { month, year, sustainabilityScore, ecoFriendlySpending, carbonFootprint } = requestBody;

    if (month === undefined || month === null) {
      return NextResponse.json({ 
        error: "Month is required",
        code: "MISSING_MONTH" 
      }, { status: 400 });
    }

    if (year === undefined || year === null) {
      return NextResponse.json({ 
        error: "Year is required",
        code: "MISSING_YEAR" 
      }, { status: 400 });
    }

    if (sustainabilityScore === undefined || sustainabilityScore === null) {
      return NextResponse.json({ 
        error: "Sustainability score is required",
        code: "MISSING_SUSTAINABILITY_SCORE" 
      }, { status: 400 });
    }

    if (ecoFriendlySpending === undefined || ecoFriendlySpending === null) {
      return NextResponse.json({ 
        error: "Eco-friendly spending is required",
        code: "MISSING_ECO_FRIENDLY_SPENDING" 
      }, { status: 400 });
    }

    const monthNum = typeof month === 'number' ? month : parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ 
        error: "Month must be an integer between 1 and 12",
        code: "INVALID_MONTH" 
      }, { status: 400 });
    }

    const yearNum = typeof year === 'number' ? year : parseInt(year);
    if (isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
      return NextResponse.json({ 
        error: "Year must be a valid 4-digit integer",
        code: "INVALID_YEAR" 
      }, { status: 400 });
    }

    const scoreNum = typeof sustainabilityScore === 'number' ? sustainabilityScore : parseFloat(sustainabilityScore);
    if (isNaN(scoreNum)) {
      return NextResponse.json({ 
        error: "Sustainability score must be a valid number",
        code: "INVALID_SUSTAINABILITY_SCORE" 
      }, { status: 400 });
    }

    const spendingNum = typeof ecoFriendlySpending === 'number' ? ecoFriendlySpending : parseFloat(ecoFriendlySpending);
    if (isNaN(spendingNum)) {
      return NextResponse.json({ 
        error: "Eco-friendly spending must be a valid number",
        code: "INVALID_ECO_FRIENDLY_SPENDING" 
      }, { status: 400 });
    }

    const insertData = {
      userId: user.id,
      month: monthNum,
      year: yearNum,
      sustainabilityScore: scoreNum,
      ecoFriendlySpending: spendingNum,
      carbonFootprint: carbonFootprint || null,
      createdAt: new Date().toISOString()
    };

    const newScore = await db.insert(sustainabilityScores)
      .values(insertData)
      .returning();

    return NextResponse.json(newScore[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}