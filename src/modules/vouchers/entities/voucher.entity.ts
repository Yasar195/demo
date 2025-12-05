import { Voucher as PrismaVoucher, Prisma } from '@prisma/client';

export type Voucher = PrismaVoucher;

export type VoucherWithStore = Prisma.VoucherGetPayload<{
    include: {
        store: true;
    };
}>;
