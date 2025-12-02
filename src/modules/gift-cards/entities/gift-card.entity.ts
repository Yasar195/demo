export class GiftCard {
    id: string;
    code: string;
    isRealCard: boolean;

    // Gift card details
    title: string;
    description: string | null;
    value: number | null;
    imageUrl: string | null;

    // Validity
    expiresAt: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
