import { Voucher as PrismaVoucher, VoucherCategory } from '@prisma/client';

export class Voucher implements PrismaVoucher {
    id: string;
    storeId: string;
    requestId: string | null;
    code: string;
    name: string;
    description: string | null;
    faceValue: number;
    sellingPrice: number;
    discount: number;
    quantityTotal: number;
    quantityAvailable: number;
    expiresAt: Date;
    redemptionRules: string | null;
    category: VoucherCategory;
    image: string | null;
    highlightColor: string | null;
    status: string | null;
    giftCardId: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
