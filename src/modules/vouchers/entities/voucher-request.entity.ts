import { VoucherRequest as PrismaVoucherRequest, VoucherRequestStatus, VoucherCategory } from '@prisma/client';

export class VoucherRequest implements PrismaVoucherRequest {
    id: string;
    storeId: string;
    voucherName: string;
    voucherDescription: string | null;
    voucherFaceValue: number;
    voucherPrice: number;
    voucherCode: string;
    quantityTotal: number;
    expiresAt: Date;
    redemptionRules: string | null;
    category: VoucherCategory;
    image: string | null;
    highlightColor: string | null;
    additionalNotes: string | null;
    status: VoucherRequestStatus;
    reviewedById: string | null;
    reviewedAt: Date | null;
    adminComments: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
