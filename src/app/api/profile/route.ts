import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID' 
        },
        { status: 400 }
      );
    }

    const userProfile = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json(userProfile[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID' 
        },
        { status: 400 }
      );
    }

    const existingUser = await db.select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate read-only fields are not included
    if ('id' in body || 'email' in body || 'emailVerified' in body || 'createdAt' in body) {
      return NextResponse.json(
        { 
          error: 'Cannot update id, email, emailVerified, or createdAt fields',
          code: 'READONLY_FIELD_UPDATE_ATTEMPTED' 
        },
        { status: 400 }
      );
    }

    // Validate username uniqueness if provided
    if (body.username !== undefined) {
      if (typeof body.username !== 'string') {
        return NextResponse.json(
          { 
            error: 'Username must be a string',
            code: 'INVALID_USERNAME_TYPE' 
          },
          { status: 400 }
        );
      }

      const trimmedUsername = body.username.trim();
      
      if (trimmedUsername) {
        // Check if username exists for a different user
        const usernameConflict = await db.select()
          .from(user)
          .where(and(
            eq(user.username, trimmedUsername),
            ne(user.id, userId)
          ))
          .limit(1);

        if (usernameConflict.length > 0) {
          return NextResponse.json(
            { 
              error: 'Username already exists',
              code: 'USERNAME_CONFLICT' 
            },
            { status: 400 }
          );
        }

        body.username = trimmedUsername;
      }
    }

    // Validate dateOfBirth format if provided
    if (body.dateOfBirth !== undefined && body.dateOfBirth !== null) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.dateOfBirth)) {
        return NextResponse.json(
          { 
            error: 'Date of birth must be in YYYY-MM-DD format',
            code: 'INVALID_DATE_FORMAT' 
          },
          { status: 400 }
        );
      }

      // Validate it's a valid date
      const parsedDate = new Date(body.dateOfBirth);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { 
            error: 'Invalid date of birth',
            code: 'INVALID_DATE' 
          },
          { status: 400 }
        );
      }
    }

    // Validate themeMode if provided
    if (body.themeMode !== undefined) {
      const validThemeModes = ['light', 'dark', 'auto'];
      if (!validThemeModes.includes(body.themeMode)) {
        return NextResponse.json(
          { 
            error: 'Theme mode must be one of: light, dark, auto',
            code: 'INVALID_THEME_MODE' 
          },
          { status: 400 }
        );
      }
    }

    // Validate notificationPreferences if provided
    if (body.notificationPreferences !== undefined && body.notificationPreferences !== null) {
      if (typeof body.notificationPreferences !== 'object' || Array.isArray(body.notificationPreferences)) {
        return NextResponse.json(
          { 
            error: 'Notification preferences must be an object',
            code: 'INVALID_NOTIFICATION_PREFERENCES' 
          },
          { status: 400 }
        );
      }
    }

    // Validate accessibilityOptions if provided
    if (body.accessibilityOptions !== undefined && body.accessibilityOptions !== null) {
      if (typeof body.accessibilityOptions !== 'object' || Array.isArray(body.accessibilityOptions)) {
        return NextResponse.json(
          { 
            error: 'Accessibility options must be an object',
            code: 'INVALID_ACCESSIBILITY_OPTIONS' 
          },
          { status: 400 }
        );
      }

      // Validate accessibilityOptions structure (only fontSize and voiceAssist allowed)
      const validKeys = ['fontSize', 'voiceAssist'];
      const providedKeys = Object.keys(body.accessibilityOptions);
      const hasInvalidKeys = providedKeys.some(key => !validKeys.includes(key));
      
      if (hasInvalidKeys) {
        return NextResponse.json(
          { 
            error: 'Accessibility options can only contain fontSize and voiceAssist fields',
            code: 'INVALID_ACCESSIBILITY_OPTIONS_STRUCTURE' 
          },
          { status: 400 }
        );
      }
    }

    // Trim string fields
    const updates: any = {};
    
    if (body.name !== undefined) updates.name = typeof body.name === 'string' ? body.name.trim() : body.name;
    if (body.username !== undefined) updates.username = body.username;
    if (body.phoneNumber !== undefined) updates.phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : body.phoneNumber;
    if (body.dateOfBirth !== undefined) updates.dateOfBirth = body.dateOfBirth;
    if (body.country !== undefined) updates.country = typeof body.country === 'string' ? body.country.trim() : body.country;
    if (body.city !== undefined) updates.city = typeof body.city === 'string' ? body.city.trim() : body.city;
    if (body.region !== undefined) updates.region = typeof body.region === 'string' ? body.region.trim() : body.region;
    if (body.languagePreference !== undefined) updates.languagePreference = body.languagePreference;
    if (body.timezone !== undefined) updates.timezone = body.timezone;
    if (body.themeMode !== undefined) updates.themeMode = body.themeMode;
    if (body.image !== undefined) updates.image = body.image;
    if (body.notificationPreferences !== undefined) updates.notificationPreferences = body.notificationPreferences;
    if (body.accessibilityOptions !== undefined) updates.accessibilityOptions = body.accessibilityOptions;

    // Always update updatedAt timestamp
    updates.updatedAt = new Date();

    const updatedUser = await db.update(user)
      .set(updates)
      .where(eq(user.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update user profile',
          code: 'UPDATE_FAILED' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedUser[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error 
      },
      { status: 500 }
    );
  }
}