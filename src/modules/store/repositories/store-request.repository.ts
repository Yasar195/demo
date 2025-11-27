import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { StoreRequest } from '../entities/store-request.entity';
import { StoreRequestStatus } from '@prisma/client';

@Injectable()
export class StoreRequestRepository extends PrismaRepository<StoreRequest> {
    constructor(prisma: PrismaService) {
        super(prisma, 'storeRequest');
    }

    /**
     * Find store requests by user ID
     */
    async findByUserId(userId: string): Promise<StoreRequest[]> {
        return this.findByCondition({ userId } as Partial<StoreRequest>);
    }

    /**
     * Find store requests by status
     */
    async findByStatus(status: StoreRequestStatus): Promise<StoreRequest[]> {
        return this.findByCondition({ status } as Partial<StoreRequest>);
    }

    /**
     * Find store requests by user ID and status
     */
    async findByUserIdAndStatus(userId: string, status: StoreRequestStatus): Promise<StoreRequest[]> {
        return this.findByCondition({ userId, status } as Partial<StoreRequest>);
    }

    /**
     * Find store requests with pagination and filters
     */
    async findWithFilters(
        page: number,
        limit: number,
        filters: {
            status?: StoreRequestStatus;
            userId?: string;
            searchTerm?: string;
        },
        orderBy?: Record<string, 'asc' | 'desc'>,
    ): Promise<{ data: StoreRequest[]; total: number; page: number; totalPages: number }> {
        const where: any = {};

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.userId) {
            where.userId = filters.userId;
        }

        if (filters.searchTerm) {
            where.OR = [
                { storeName: { contains: filters.searchTerm, mode: 'insensitive' } },
                { storeEmail: { contains: filters.searchTerm, mode: 'insensitive' } },
            ];
        }

        const include = {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            reviewedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        };

        return this.findWithPagination(page, limit, where, orderBy, include);
    }

    /**
     * Check if user has any pending request
     */
    async hasPendingRequest(userId: string): Promise<boolean> {
        const request = await this.findOneByCondition({
            userId,
            status: StoreRequestStatus.PENDING,
        } as Partial<StoreRequest>);
        return request !== null;
    }

    /**
     * Check if user has an approved store
     */
    async hasApprovedStore(userId: string): Promise<boolean> {
        const request = await this.findOneByCondition({
            userId,
            status: StoreRequestStatus.APPROVED,
        } as Partial<StoreRequest>);
        return request !== null;
    }
}
