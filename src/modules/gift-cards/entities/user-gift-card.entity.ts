export class UserGiftCard {
    id: string;
    userId: string;
    giftCardId: string;
    userPurchasedVoucherId: string;

    // Delivery details
    purchasePosition: number;
    scratchCode: string | null;
    isRevealed: boolean;

    // Status
    isUsed: boolean;
    usedAt: Date | null;

    // Timestamps
    deliveredAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
