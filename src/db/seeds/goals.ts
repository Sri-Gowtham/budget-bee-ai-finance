import { db } from '@/db';
import { goals, user } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    // Query existing users
    const existingUsers = await db.select({ id: user.id }).from(user).limit(1);
    
    let userId: string;
    
    if (existingUsers.length === 0) {
        // Create a test user if none exists
        const testUser = {
            id: 'test-user-1',
            name: 'Test User',
            email: 'testuser@example.com',
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        await db.insert(user).values(testUser);
        userId = testUser.id;
        console.log('✅ Created test user');
    } else {
        userId = existingUsers[0].id;
        console.log('✅ Using existing user:', userId);
    }
    
    const now = new Date();
    const currentTimestamp = now.toISOString();
    
    // Calculate deadline dates
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    const twelveMonthsFromNow = new Date(now);
    twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);
    
    const twoMonthsFromNow = new Date(now);
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    
    const eightMonthsFromNow = new Date(now);
    eightMonthsFromNow.setMonth(eightMonthsFromNow.getMonth() + 8);
    
    const sampleGoals = [
        {
            userId: userId,
            title: 'Save for vacation',
            targetAmount: 3000,
            currentAmount: 1500,
            deadline: sixMonthsFromNow.toISOString(),
            category: 'Travel',
            status: 'active',
            priority: 'high',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            userId: userId,
            title: 'Emergency fund',
            targetAmount: 10000,
            currentAmount: 3000,
            deadline: twelveMonthsFromNow.toISOString(),
            category: 'Savings',
            status: 'active',
            priority: 'high',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            userId: userId,
            title: 'New laptop',
            targetAmount: 1500,
            currentAmount: 1200,
            deadline: twoMonthsFromNow.toISOString(),
            category: 'Technology',
            status: 'active',
            priority: 'medium',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            userId: userId,
            title: 'Pay off credit card',
            targetAmount: 2500,
            currentAmount: 1500,
            deadline: eightMonthsFromNow.toISOString(),
            category: 'Debt',
            status: 'active',
            priority: 'high',
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    await db.insert(goals).values(sampleGoals);
    
    console.log('✅ Goals seeder completed successfully');
    console.log(`✅ Created ${sampleGoals.length} goals for user ${userId}`);
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});