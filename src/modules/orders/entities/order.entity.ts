import { UserPurchasedVoucher as PrismaUserPurchasedVoucher, VoucherRedemptionStatus } from '@prisma/client';

export class Order implements PrismaUserPurchasedVoucher {
    id: string;
    userId: string;
    voucherId: string;
    paymentId: string;
    instanceCode: string;
    qrCodeUrl: string | null;

    // Purchase details
    quantity: number;
    quantityUsed: number;
    purchasePrice: number;
    purchaseFaceValue: number;
    purchaseDiscount: number;

    // Status & expiry
    expiresAt: Date;
    status: VoucherRedemptionStatus;
    redeemedAt: Date | null;
    redeemedWith: string | null;

    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;

    // Optional relations (populated when included in query)
    voucher?: {
        id: string;
        name: string;
        code: string;
        [key: string]: any;
    };
    payment?: any;
}
