import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { SubscriptionHistory } from '../entities';

@Injectable()
export class SubscriptionHistoryRepository extends PrismaRepository<SubscriptionHistory> {
    constructor(prisma: PrismaService) {
        super(prisma, 'subscriptionHistory');
    }

    async findBySubscriptionId(subscriptionId: string): Promise<SubscriptionHistory[]> {
        return this.prisma.subscriptionHistory.findMany({
            where: { subscriptionId },
            orderBy: {
                createdAt: 'desc',
            },
        }) as any;
    }
}
