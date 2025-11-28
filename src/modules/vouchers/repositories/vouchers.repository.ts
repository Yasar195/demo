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
}
