import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { goals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const goal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .limit(1);

    if (goal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'GOAL_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(goal[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

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
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .limit(1);

    if (existingGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'GOAL_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Extract updatable fields
    const {
      title,
      targetAmount,
      currentAmount,
      deadline,
      category,
      status,
      priority,
    } = body;

    // Validate status if provided
    if (status && !['active', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        {
          error: 'Status must be one of: active, completed, cancelled',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        {
          error: 'Priority must be one of: high, medium, low',
          code: 'INVALID_PRIORITY',
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (targetAmount !== undefined) updates.targetAmount = targetAmount;
    if (currentAmount !== undefined) updates.currentAmount = currentAmount;
    if (deadline !== undefined) updates.deadline = deadline;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    const updated = await db
      .update(goals)
      .set(updates)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update goal', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .limit(1);

    if (existingGoal.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found', code: 'GOAL_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(goals)
      .where(and(eq(goals.id, parseInt(id)), eq(goals.userId, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete goal', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Goal deleted successfully',
        goal: deleted[0],
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