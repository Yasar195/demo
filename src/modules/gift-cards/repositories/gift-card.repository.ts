import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { GiftCard } from '../entities/gift-card.entity';

@Injectable()
export class GiftCardRepository extends PrismaRepository<GiftCard> {
    constructor(prisma: PrismaService) {
        super(prisma, 'giftCard');
    }

    async findByCode(code: string): Promise<GiftCard | null> {
        return this.prisma.giftCard.findUnique({
            where: { code },
        });
    }

    async findActiveGiftCards(): Promise<GiftCard[]> {
        return this.prisma.giftCard.findMany({
            where: {
                deletedAt: null,
                expiresAt: {
                    gte: new Date(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
