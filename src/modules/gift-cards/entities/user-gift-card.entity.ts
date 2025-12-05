import { Prisma, UserGiftCard as PrismaUserGiftCard } from '@prisma/client';

export type UserGiftCard = PrismaUserGiftCard;

export type UserGiftCardWithGift = Prisma.UserGiftCardGetPayload<{
    include: {
        giftCard: true;
    };
}>;
