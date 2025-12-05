import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
// import { UserGiftCard, UserGiftCardWithGift } from '../entities/user-gift-card.entity';
import { UserGiftCard } from '@prisma/client';

@Injectable()
export class UserGiftCardRepository extends PrismaRepository<UserGiftCard> {
    constructor(prisma: PrismaService) {
        super(prisma, 'userGiftCard');
    }

    async revealScratchCode(id: string, userId: string): Promise<UserGiftCard> {
        // Verify ownership first
        const userGiftCard = await this.prisma.userGiftCard.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!userGiftCard) {
            throw new Error('Gift card not found');
        }

        return this.prisma.userGiftCard.update({
            where: { id },
            data: { isRevealed: true },
        });
    }

    async markAsUsed(id: string): Promise<UserGiftCard> {
        return this.prisma.userGiftCard.update({
            where: { id },
            data: {
                isUsed: true,
                usedAt: new Date(),
            },
        });
    }
}
