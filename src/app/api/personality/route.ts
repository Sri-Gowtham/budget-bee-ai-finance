import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { financialPersonality } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_PERSONALITY_TYPES = ['saver', 'spender', 'planner', 'investor', 'risk-taker'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: "userId is required",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    const record = await db.select()
      .from(financialPersonality)
      .where(eq(financialPersonality.userId, userId))
      .limit(1);

    if (record.length === 0) {
      return NextResponse.json({ 
        error: 'Financial personality profile not found',
        code: "PROFILE_NOT_FOUND" 
      }, { status: 404 });
    }

    return NextResponse.json(record[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, personalityType, confidence, traits, monthlyAnalysis } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ 
        error: "userId is required",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    if (!personalityType) {
      return NextResponse.json({ 
        error: "personalityType is required",
        code: "MISSING_PERSONALITY_TYPE" 
      }, { status: 400 });
    }

    if (confidence === undefined || confidence === null) {
      return NextResponse.json({ 
        error: "confidence is required",
        code: "MISSING_CONFIDENCE" 
      }, { status: 400 });
    }

    // Validate personalityType
    if (!VALID_PERSONALITY_TYPES.includes(personalityType)) {
      return NextResponse.json({ 
        error: `personalityType must be one of: ${VALID_PERSONALITY_TYPES.join(', ')}`,
        code: "INVALID_PERSONALITY_TYPE" 
      }, { status: 400 });
    }

    // Validate confidence is a number between 0 and 1
    const confidenceNum = parseFloat(confidence);
    if (isNaN(confidenceNum) || confidenceNum < 0 || confidenceNum > 1) {
      return NextResponse.json({ 
        error: "confidence must be a number between 0 and 1",
        code: "INVALID_CONFIDENCE" 
      }, { status: 400 });
    }

    // Check if profile exists for this user
    const existingProfile = await db.select()
      .from(financialPersonality)
      .where(eq(financialPersonality.userId, userId))
      .limit(1);

    const now = new Date().toISOString();
    
    const profileData = {
      userId,
      personalityType,
      confidence: confidenceNum,
      traits: traits || null,
      monthlyAnalysis: monthlyAnalysis || null,
      lastUpdated: now,
    };

    if (existingProfile.length > 0) {
      // Update existing profile
      const updated = await db.update(financialPersonality)
        .set(profileData)
        .where(eq(financialPersonality.userId, userId))
        .returning();

      return NextResponse.json(updated[0], { status: 200 });
    } else {
      // Create new profile
      const newProfile = await db.insert(financialPersonality)
        .values(profileData)
        .returning();

      return NextResponse.json(newProfile[0], { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}