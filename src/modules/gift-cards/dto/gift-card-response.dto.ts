export class GiftCardResponseDto {
    id: string;
    code: string;
    isRealCard: boolean;
    title: string;
    description?: string;
    value?: number;
    imageUrl?: string;
    expiresAt: Date;
    createdAt: Date;
}

export class UserGiftCardResponseDto {
    id: string;
    title: string;
    description?: string;
    value?: number;
    imageUrl?: string;
    scratchCode?: string;
    isRevealed: boolean;
    isUsed: boolean;
    deliveredAt: Date;
    expiresAt: Date;
    purchasePosition: number;
    fromVoucher: {
        id: string;
        name: string;
    };
}

export class VoucherGiftCardMappingsDto {
    default: GiftCardResponseDto | null;
    positionMappings: Array<{
        position: number;
        giftCard: GiftCardResponseDto;
        isDelivered: boolean;
    }>;
}
