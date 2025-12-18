import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { StoreLocation, Prisma } from '@prisma/client';
import { VoucherOrderBy, LocationOrderBy } from '../dto';

@Injectable()
export class LocationsRepository extends PrismaRepository<StoreLocation> {
    constructor(prisma: PrismaService) {
        super(prisma, 'storeLocation');
    }

    /**
     * Find all locations with optional filters
     */
    async findAllWithStore(options?: {
        city?: string;
        storeId?: string;
        activeOnly?: boolean;
        includeVouchers?: boolean;
        voucherOrderBy?: VoucherOrderBy;
        orderBy?: LocationOrderBy;
        skip?: number;
        take?: number;
    }) {
        const where: Prisma.StoreLocationWhereInput = {
            deletedAt: null,
        };

        if (options?.activeOnly) {
            where.isActive = true;
        }

        if (options?.city) {
            where.city = {
                contains: options.city,
                mode: 'insensitive',
            };
        }

        if (options?.storeId) {
            where.storeId = options.storeId;
        }

        const include: any = {
            store: true,
        };

        if (options?.includeVouchers) {
            include.vouchers = {
                where: {
                    isActive: true,
                    deletedAt: null,
                    expiresAt: { gt: new Date() },
                },
                orderBy: this.getVoucherOrderBy(options.voucherOrderBy),
            };
        }

        return this.model.findMany({
            where,
            include,
            skip: options?.skip,
            take: options?.take,
            orderBy: this.getLocationOrderBy(options?.orderBy),
        });
    }

    /**
     * Find location by ID with store and optional vouchers
     */
    async findByIdWithStore(id: string, includeVouchers = true) {
        const include: any = {
            store: true,
        };

        if (includeVouchers) {
            include.vouchers = {
                where: {
                    isActive: true,
                    deletedAt: null,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: 'desc' },
            };
        }

        return this.model.findUnique({
            where: { id },
            include,
        });
    }

    /**
     * Count locations with filters
     */
    async countLocations(options?: {
        city?: string;
        storeId?: string;
        activeOnly?: boolean;
    }): Promise<number> {
        const where: Prisma.StoreLocationWhereInput = {
            deletedAt: null,
        };

        if (options?.activeOnly) {
            where.isActive = true;
        }

        if (options?.city) {
            where.city = {
                contains: options.city,
                mode: 'insensitive',
            };
        }

        if (options?.storeId) {
            where.storeId = options.storeId;
        }

        return this.model.count({ where });
    }

    /**
     * Get voucher order by clause based on enum
     */
    private getVoucherOrderBy(orderBy?: VoucherOrderBy) {
        switch (orderBy) {
            case VoucherOrderBy.OLDEST:
                return { createdAt: 'asc' as const };
            case VoucherOrderBy.LOWEST_QUANTITY:
                return { quantityAvailable: 'asc' as const };
            case VoucherOrderBy.EXPIRING_SOON:
                return { expiresAt: 'asc' as const };
            case VoucherOrderBy.HIGHEST_DISCOUNT:
                return { discount: 'desc' as const };
            case VoucherOrderBy.LOWEST_PRICE:
                return { sellingPrice: 'asc' as const };
            case VoucherOrderBy.SELLING_FAST:
                // For selling fast, we'd need a calculated field
                // For now, default to newest
                return { createdAt: 'desc' as const };
            case VoucherOrderBy.NEWEST:
            default:
                return { createdAt: 'desc' as const };
        }
    }

    /**
     * Get location order by clause based on enum
     */
    private getLocationOrderBy(orderBy?: LocationOrderBy) {
        switch (orderBy) {
            case LocationOrderBy.OLDEST:
                return { createdAt: 'asc' as const };
            case LocationOrderBy.NEWEST:
            default:
                return { createdAt: 'desc' as const };
        }
    }
}
