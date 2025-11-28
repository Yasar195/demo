import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { VoucherRequest } from '../entities/voucher-request.entity';
import { VoucherRequestStatus } from '@prisma/client';

@Injectable()
export class VoucherRequestRepository extends PrismaRepository<VoucherRequest> {
    constructor(prisma: PrismaService) {
        super(prisma, 'voucherRequest');
    }

    /**
     * Find voucher requests by store ID
     */
    async findByStoreId(storeId: string): Promise<VoucherRequest[]> {
        return this.findByCondition({ storeId } as Partial<VoucherRequest>);
    }

    /**
     * Check if store has a pending voucher request
     */
    async hasPendingRequest(storeId: string): Promise<boolean> {
        const request = await this.findOneByCondition({
            storeId,
            status: VoucherRequestStatus.PENDING,
        } as Partial<VoucherRequest>);
        return request !== null;
    }

    /**
     * Find with filters for admin queries
     */
    async findWithFilters(
        page: number,
        limit: number,
        filters: {
            status?: VoucherRequestStatus;
            storeId?: string;
            searchTerm?: string;
        },
        orderBy: Record<string, 'asc' | 'desc'>,
    ): Promise<{ data: VoucherRequest[]; total: number; page: number; totalPages: number }> {
        const where: any = { deletedAt: null };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.storeId) {
            where.storeId = filters.storeId;
        }

        if (filters.searchTerm) {
            where.OR = [
                { voucherName: { contains: filters.searchTerm, mode: 'insensitive' } },
                { voucherCode: { contains: filters.searchTerm, mode: 'insensitive' } },
                { voucherDescription: { contains: filters.searchTerm, mode: 'insensitive' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.voucherRequest.findMany({
                where,
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.voucherRequest.count({ where }),
        ]);

        return {
            data: data as VoucherRequest[],
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Count pending voucher requests by store ID
     */
    async countPendingByStoreId(storeId: string): Promise<number> {
        return this.model.count({
            where: {
                storeId,
                status: VoucherRequestStatus.PENDING,
                deletedAt: null,
            },
        });
    }

    /**
     * Count all pending voucher requests (for admin dashboard)
     */
    async countAllPending(): Promise<number> {
        return this.model.count({
            where: {
                status: VoucherRequestStatus.PENDING,
                deletedAt: null,
            },
        });
    }
}
