export class VoucherGiftCardMapping {
    id: string;
    voucherId: string;
    giftCardId: string;

    // Position mapping
    position?: number | null;
    isDefault: boolean;

    // Tracking
    isDelivered: boolean;

    createdAt: Date;
    updatedAt: Date;
}
