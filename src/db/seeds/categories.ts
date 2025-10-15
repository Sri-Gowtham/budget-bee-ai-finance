import { db } from '@/db';
import { categories } from '@/db/schema';

async function main() {
    const sampleCategories = [
        {
            name: 'Salary',
            icon: '💰',
            type: 'income',
        },
        {
            name: 'Freelance',
            icon: '💼',
            type: 'income',
        },
        {
            name: 'Investment',
            icon: '📈',
            type: 'income',
        },
        {
            name: 'Gift',
            icon: '🎁',
            type: 'income',
        },
        {
            name: 'Other Income',
            icon: '💵',
            type: 'income',
        },
        {
            name: 'Food & Dining',
            icon: '🍽️',
            type: 'expense',
        },
        {
            name: 'Groceries',
            icon: '🛒',
            type: 'expense',
        },
        {
            name: 'Transportation',
            icon: '🚗',
            type: 'expense',
        },
        {
            name: 'Entertainment',
            icon: '🎬',
            type: 'expense',
        },
        {
            name: 'Shopping',
            icon: '🛍️',
            type: 'expense',
        },
        {
            name: 'Bills & Utilities',
            icon: '💡',
            type: 'expense',
        },
        {
            name: 'Rent/Mortgage',
            icon: '🏠',
            type: 'expense',
        },
        {
            name: 'Healthcare',
            icon: '🏥',
            type: 'expense',
        },
        {
            name: 'Education',
            icon: '📚',
            type: 'expense',
        },
        {
            name: 'Travel',
            icon: '✈️',
            type: 'expense',
        },
        {
            name: 'Fitness',
            icon: '💪',
            type: 'expense',
        },
        {
            name: 'Subscriptions',
            icon: '📱',
            type: 'expense',
        },
        {
            name: 'Insurance',
            icon: '🛡️',
            type: 'expense',
        },
        {
            name: 'Personal Care',
            icon: '💅',
            type: 'expense',
        },
        {
            name: 'Other Expenses',
            icon: '📦',
            type: 'expense',
        },
    ];

    await db.insert(categories).values(sampleCategories);
    
    console.log('✅ Categories seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});