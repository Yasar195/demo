import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { SubscriptionPlan } from '../entities';

@Injectable()
export class SubscriptionPlanRepository extends PrismaRepository<SubscriptionPlan> {
    constructor(prisma: PrismaService) {
        super(prisma, 'subscriptionPlan');
    }

    async getActivePlans(): Promise<SubscriptionPlan[]> {
        return this.prisma.subscriptionPlan.findMany({
            where: {
                isActive: true,
                isVisible: true,
            },
            orderBy: {
                sortOrder: 'asc',
            },
        }) as any;
    }

    async getPlanByName(name: string): Promise<SubscriptionPlan | null> {
        return this.prisma.subscriptionPlan.findUnique({
            where: { name },
        }) as any;
    }
}
