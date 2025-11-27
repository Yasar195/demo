import { VoucherRequest as PrismaVoucherRequest, VoucherRequestStatus } from '@prisma/client';

export class VoucherRequest implements PrismaVoucherRequest {
    id: string;
    storeId: string;
    voucherName: string;
    voucherDescription: string | null;
    voucherValue: number;
    voucherPrice: number;
    voucherCode: string;
    expiresAt: Date;
    additionalNotes: string | null;
    status: VoucherRequestStatus;
    reviewedById: string | null;
    reviewedAt: Date | null;
    adminComments: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
