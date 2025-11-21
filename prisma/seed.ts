import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Example: Create a default admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@sustify.com' },
        update: {},
        create: {
            email: 'admin@sustify.com',
            name: 'Admin User',
            password: 'hashed_password_here', // In production, use proper hashing
            role: 'admin',
        },
    });

    console.log('Created admin user:', admin);

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
