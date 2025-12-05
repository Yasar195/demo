import { Prisma, UserPurchasedVoucher } from '@prisma/client';

export type { UserPurchasedVoucher };

export type UserPurchasedVoucherWithRelations = Prisma.UserPurchasedVoucherGetPayload<{
    include: {
        voucher: {
            include: {
                store: true;
            };
        };
        payment: true;
    };
}>;
