import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { SubscriptionPayment } from '../entities';

@Injectable()
export class SubscriptionPaymentRepository extends PrismaRepository<SubscriptionPayment> {
    constructor(prisma: PrismaService) {
        super(prisma, 'subscriptionPayment');
    }

    async findBySubscriptionId(subscriptionId: string): Promise<SubscriptionPayment[]> {
        return this.prisma.subscriptionPayment.findMany({
            where: { subscriptionId },
            orderBy: {
                createdAt: 'desc',
            },
        }) as any;
    }

    async findByTransactionId(transactionId: string): Promise<SubscriptionPayment | null> {
        return this.prisma.subscriptionPayment.findUnique({
            where: { transactionId },
        }) as any;
    }
}
