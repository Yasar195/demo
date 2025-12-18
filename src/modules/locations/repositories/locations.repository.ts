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
        latitude?: number;
        longitude?: number;
        skip?: number;
        take?: number;
    }) {
        // Handle NEAREST sorting with custom SQL
        if (options?.orderBy === LocationOrderBy.NEAREST && options.latitude && options.longitude) {
            const sortedIds = await this.findIdsOrderedByDistance(
                options.latitude,
                options.longitude,
                options
            );

            if (sortedIds.length === 0) {
                return [];
            }

            const where: Prisma.StoreLocationWhereInput = {
                id: { in: sortedIds },
            };

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

            const locations = await this.model.findMany({
                where,
                include,
            });

            // Sort locations in memory to match the distance order
            const locationMap = new Map(locations.map(l => [l.id, l]));
            return sortedIds
                .map(id => locationMap.get(id))
                .filter((loc): loc is StoreLocation => !!loc);
        }

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

    /**
     * Find IDs of locations ordered by distance
     */
    private async findIdsOrderedByDistance(
        lat: number,
        lon: number,
        options: {
            city?: string;
            storeId?: string;
            activeOnly?: boolean;
            skip?: number;
            take?: number;
        }
    ): Promise<string[]> {
        // Build conditions
        let whereClause = `sl."deletedAt" IS NULL AND s."deletedAt" IS NULL`;

        if (options.activeOnly) {
            whereClause += ` AND sl.is_active = true`;
        }

        if (options.city) {
            whereClause += ` AND sl.city ILIKE '%${options.city}%'`;
        }

        if (options.storeId) {
            whereClause += ` AND sl.store_id = '${options.storeId}'`;
        }

        // Haversine formula
        const query = `
            SELECT sl.id
            FROM store_locations sl
            JOIN stores s ON sl.store_id = s.id
            WHERE ${whereClause}
            ORDER BY (
                6371 * acos(
                    cos(radians(${lat})) * cos(radians(sl.latitude)) * 
                    cos(radians(sl.longitude) - radians(${lon})) + 
                    sin(radians(${lat})) * sin(radians(sl.latitude))
                )
            ) ASC
            LIMIT ${options.take || 20} OFFSET ${options.skip || 0}
        `;

        const result = await this.prisma.$queryRawUnsafe<{ id: string }[]>(query);
        return result.map((r: any) => r.id);
    }
}
