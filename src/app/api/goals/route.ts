import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { goals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_STATUSES = ['active', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['high', 'medium', 'low'];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = db.select().from(goals).where(eq(goals.userId, user.id));

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { 
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
            code: 'INVALID_STATUS'
          },
          { status: 400 }
        );
      }
      query = db.select()
        .from(goals)
        .where(and(eq(goals.userId, user.id), eq(goals.status, status)));
    }

    const results = await query;
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
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        { 
          error: "User ID cannot be provided in request body",
          code: "USER_ID_NOT_ALLOWED" 
        },
        { status: 400 }
      );
    }

    const { title, targetAmount, currentAmount, deadline, category, status, priority } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    if (targetAmount === undefined || targetAmount === null) {
      return NextResponse.json(
        { error: 'Target amount is required', code: 'MISSING_TARGET_AMOUNT' },
        { status: 400 }
      );
    }

    if (typeof targetAmount !== 'number' || targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be a positive number', code: 'INVALID_TARGET_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { 
          error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
          code: 'INVALID_PRIORITY'
        },
        { status: 400 }
      );
    }

    // Validate currentAmount if provided
    if (currentAmount !== undefined && currentAmount !== null) {
      if (typeof currentAmount !== 'number' || currentAmount < 0) {
        return NextResponse.json(
          { error: 'Current amount must be a non-negative number', code: 'INVALID_CURRENT_AMOUNT' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    const newGoal = await db.insert(goals)
      .values({
        userId: user.id,
        title: title.trim(),
        targetAmount,
        currentAmount: currentAmount ?? 0,
        deadline: deadline || null,
        category: category ? category.trim() : null,
        status: status || 'active',
        priority: priority || 'medium',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newGoal[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        { 
          error: "User ID cannot be provided in request body",
          code: "USER_ID_NOT_ALLOWED" 
        },
        { status: 400 }
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await db.select()
      .from(goals)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .limit(1);

    if (existingGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'GOAL_NOT_FOUND' },
        { status: 404 }
      );
    }

    const { title, targetAmount, currentAmount, deadline, category, status, priority } = body;

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { 
          error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
          code: 'INVALID_PRIORITY'
        },
        { status: 400 }
      );
    }

    // Validate targetAmount if provided
    if (targetAmount !== undefined && targetAmount !== null) {
      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        return NextResponse.json(
          { error: 'Target amount must be a positive number', code: 'INVALID_TARGET_AMOUNT' },
          { status: 400 }
        );
      }
    }

    // Validate currentAmount if provided
    if (currentAmount !== undefined && currentAmount !== null) {
      if (typeof currentAmount !== 'number' || currentAmount < 0) {
        return NextResponse.json(
          { error: 'Current amount must be a non-negative number', code: 'INVALID_CURRENT_AMOUNT' },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (targetAmount !== undefined) updates.targetAmount = targetAmount;
    if (currentAmount !== undefined) updates.currentAmount = currentAmount;
    if (deadline !== undefined) updates.deadline = deadline;
    if (category !== undefined) updates.category = category ? category.trim() : null;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    const updatedGoal = await db.update(goals)
      .set(updates)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .returning();

    if (updatedGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'GOAL_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedGoal[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await db.select()
      .from(goals)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .limit(1);

    if (existingGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'GOAL_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deletedGoal = await db.delete(goals)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .returning();

    if (deletedGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'GOAL_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Goal deleted successfully',
        deleted: deletedGoal[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}