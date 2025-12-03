import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { StoreSubscription } from '../entities';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class StoreSubscriptionRepository extends PrismaRepository<StoreSubscription> {
    constructor(prisma: PrismaService) {
        super(prisma, 'storeSubscription');
    }

    async findByStoreId(storeId: string): Promise<StoreSubscription | null> {
        return this.prisma.storeSubscription.findUnique({
            where: { storeId },
            include: {
                plan: true,
            },
        }) as any;
    }

    async findActiveSubscription(storeId: string): Promise<StoreSubscription | null> {
        return this.prisma.storeSubscription.findFirst({
            where: {
                storeId,
                status: {
                    in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
                },
            },
            include: {
                plan: true,
            },
        }) as any;
    }

    async findSubscriptionsDueForRenewal(date: Date): Promise<StoreSubscription[]> {
        return this.prisma.storeSubscription.findMany({
            where: {
                nextBillingDate: {
                    lte: date,
                },
                status: SubscriptionStatus.ACTIVE,
                autoRenew: true,
            },
            include: {
                plan: true,
                store: true,
            },
        }) as any;
    }

    async findTrialsEndingOn(date: Date): Promise<StoreSubscription[]> {
        return this.prisma.storeSubscription.findMany({
            where: {
                status: SubscriptionStatus.TRIAL,
                trialEnd: {
                    lte: date,
                },
            },
            include: {
                plan: true,
                store: {
                    include: {
                        owner: true,
                    },
                },
            },
        }) as any;
    }
}
