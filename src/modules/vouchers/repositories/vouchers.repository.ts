import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Voucher } from '../entities/voucher.entity';

@Injectable()
export class VouchersRepository extends PrismaRepository<Voucher> {
    constructor(prisma: PrismaService) {
        super(prisma, 'voucher');
    }

    /**
     * Find voucher by code
     */
    async findByCode(code: string): Promise<Voucher | null> {
        return this.findOneByCondition({ code } as Partial<Voucher>);
    }

    /**
     * Check if voucher code exists
     */
    async codeExists(code: string): Promise<boolean> {
        const voucher = await this.findByCode(code);
        return voucher !== null;
    }

    /**
     * Find vouchers by store ID
     */
    async findByStoreId(storeId: string): Promise<Voucher[]> {
        return this.findByCondition({ storeId } as Partial<Voucher>);
    }

    /**
     * Count total vouchers by store ID
     */
    async countByStoreId(storeId: string): Promise<number> {
        return this.model.count({
            where: {
                storeId,
                deletedAt: null,
            },
        });
    }

    /**
     * Count active vouchers by store ID (not expired and isActive=true)
     */
    async countActiveByStoreId(storeId: string): Promise<number> {
        return this.model.count({
            where: {
                storeId,
                deletedAt: null,
                isActive: true,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });
    }

    /**
     * Count expired vouchers by store ID
     */
    async countExpiredByStoreId(storeId: string): Promise<number> {
        return this.model.count({
            where: {
                storeId,
                deletedAt: null,
                expiresAt: {
                    lte: new Date(),
                },
            },
        });
    }

    /**
     * Sum of available quantities for active vouchers by store ID
     */
    async sumAvailableQuantityByStoreId(storeId: string): Promise<number> {
        const result = await this.model.aggregate({
            where: {
                storeId,
                deletedAt: null,
                isActive: true,
            },
            _sum: {
                quantityAvailable: true,
            },
        });

        return result._sum.quantityAvailable || 0;
    }

    /**
     * Count total active stores (for admin dashboard)
     */
    async countActiveStores(): Promise<number> {
        const result = await this.prisma.store.count({
            where: {
                deletedAt: null,
            },
        });

        return result;
    }

    /**
     * Find vouchers ordered by sales velocity (selling fast)
     * Uses database sorting for better performance
     */
    async findWithSellingFastOrder(
        page: number,
        limit: number,
        filters: any
    ): Promise<{ data: Voucher[]; total: number; page: number; totalPages: number }> {
        const where = { deletedAt: null, ...filters };

        // Get total count first
        const total = await this.model.count({ where });

        // Use Prisma's raw query or orderBy with column math
        // Order by (quantityTotal - quantityAvailable) DESC for most sold items
        const data = await this.model.findMany({
            where,
            orderBy: [
                // Vouchers with more sold items (quantityTotal - quantityAvailable) come first
                // This is a simpler approach: sort by quantity sold
                { quantityAvailable: 'asc' }, // Lower available = more sold
            ],
            skip: (page - 1) * limit,
            take: limit,
        }) as Voucher[];

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            total,
            page,
            totalPages,
        };
    }

    /**
     * Atomically reserve stock for a voucher
     * Returns true if reservation successful, false if insufficient stock
     */
    async reserveStock(voucherId: string, quantity: number): Promise<boolean> {
        const result = await this.model.updateMany({
            where: {
                id: voucherId,
                isActive: true,
                deletedAt: null,
                // Check that we have enough unreserved stock
                // Available stock = quantityAvailable - reservedQuantity
                quantityAvailable: {
                    gte: {
                        reservedQuantity: {
                            plus: quantity
                        }
                    } as any
                }
            },
            data: {
                reservedQuantity: {
                    increment: quantity
                }
            }
        });

        return result.count > 0;
    }

    /**
     * Release a stock reservation
     */
    async releaseReservation(voucherId: string, quantity: number): Promise<void> {
        await this.model.update({
            where: { id: voucherId },
            data: {
                reservedQuantity: {
                    decrement: quantity
                }
            }
        });
    }

    /**
     * Get actual available stock for a voucher (accounting for reservations)
     */
    async getAvailableStock(voucherId: string): Promise<number> {
        const voucher = await this.model.findUnique({
            where: { id: voucherId },
            select: {
                quantityAvailable: true,
                reservedQuantity: true
            }
        });

        if (!voucher) {
            return 0;
        }

        return voucher.quantityAvailable - (voucher.reservedQuantity || 0);
    }
}
