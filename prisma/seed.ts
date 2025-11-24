import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/common/utils/crypto.utils';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Example: Create a default admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@sustify.com' },
        update: {},
        create: {
            email: 'admin@sustify.com',
            name: 'System Admin',
            password: hashPassword('Admin@123'),
            role: UserRole.ADMIN,
            provider: 'local',
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
