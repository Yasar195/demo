import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_ADMIN, DEFAULT_SUBSCRIPTION_PLANS } from './data';

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Seed all initial data
     */
    async seedAll(): Promise<void> {
        this.logger.log('Starting seed process...');

        try {
            await this.seedAdmin();
            await this.seedSubscriptionPlans();

            this.logger.log('✅ Seed completed successfully');
        } catch (error) {
            this.logger.error('❌ Seed failed:', error);
            throw error;
        }
    }

    /**
     * Seed default admin user
     */
    async seedAdmin(): Promise<void> {
        try {
            const admin = await this.prisma.user.upsert({
                where: { email: DEFAULT_ADMIN.email },
                update: {}, // Don't update if exists
                create: DEFAULT_ADMIN,
            });

            if (admin.createdAt.getTime() === admin.updatedAt.getTime()) {
                this.logger.log(`✅ Admin user created: ${DEFAULT_ADMIN.email}`);
            } else {
                this.logger.log(`ℹ️  Admin user already exists: ${DEFAULT_ADMIN.email}`);
            }
        } catch (error) {
            this.logger.error('Failed to seed admin user:', error);
            throw error;
        }
    }

    /**
     * Seed subscription plans
     */
    async seedSubscriptionPlans(): Promise<void> {
        try {
            for (const planData of DEFAULT_SUBSCRIPTION_PLANS) {
                const plan = await this.prisma.subscriptionPlan.upsert({
                    where: { name: planData.name },
                    update: {
                        // Update pricing and features if needed
                        price: planData.price,
                        yearlyPrice: planData.yearlyPrice,
                        description: planData.description,
                        isActive: planData.isActive,
                        isVisible: planData.isVisible,
                    },
                    create: planData,
                });

                if (plan.createdAt.getTime() === plan.updatedAt.getTime()) {
                    this.logger.log(`✅ Subscription plan created: ${plan.name}`);
                } else {
                    this.logger.log(`ℹ️  Subscription plan updated: ${plan.name}`);
                }
            }
        } catch (error) {
            this.logger.error('Failed to seed subscription plans:', error);
            throw error;
        }
    }
}
