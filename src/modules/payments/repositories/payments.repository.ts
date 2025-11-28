import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Payment, Prisma, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsRepository extends PrismaRepository<Payment> {
    constructor(prisma: PrismaService) {
        super(prisma, 'payment');
    }

    async createPayment(data: Prisma.PaymentUncheckedCreateInput): Promise<Payment> {
        return this.model.create({
            data,
        });
    }

    async updateStatusByTransactionId(transactionId: string, status: any): Promise<Payment | null> {
        // We use updateMany because transactionId is unique but not the primary key,
        // and Prisma's update requires a unique where clause.
        // Ideally transactionId should be @unique in schema, which it is.
        // So we can use update if we find the record first or use update with where transactionId.

        return this.model.update({
            where: { transactionId },
            data: { status },
        });
    }

    /**
     * Count vouchers sold for a store (completed payments)
     */
    async countVouchersSoldByStore(storeId: string): Promise<number> {
        return this.model.count({
            where: {
                voucher: {
                    storeId,
                },
                status: PaymentStatus.COMPLETED,
                deletedAt: null,
            },
        });
    }

    /**
     * Get revenue stats by store ID
     */
    async getRevenueByStore(
        storeId: string,
        status?: PaymentStatus,
    ): Promise<number> {
        const where: any = {
            voucher: {
                storeId,
            },
            deletedAt: null,
        };

        if (status) {
            where.status = status;
        }

        const result = await this.model.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });

        return result._sum.amount || 0;
    }

    /**
     * Get total revenue for all stores (admin dashboard)
     */
    async getTotalRevenue(status?: PaymentStatus): Promise<number> {
        const where: any = {
            deletedAt: null,
        };

        if (status) {
            where.status = status;
        }

        const result = await this.model.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });

        return result._sum.amount || 0;
    }

    /**
     * Count payments by status
     */
    async countByStatus(status: PaymentStatus): Promise<number> {
        return this.model.count({
            where: {
                status,
                deletedAt: null,
            },
        });
    }

    /**
     * Count all payments (for admin dashboard)
     */
    async countAll(): Promise<number> {
        return this.model.count({
            where: {
                deletedAt: null,
            },
        });
    }
}
