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
}
