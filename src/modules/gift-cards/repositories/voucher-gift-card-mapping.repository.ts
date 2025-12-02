import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { VoucherGiftCardMapping } from '../entities/voucher-gift-card-mapping.entity';

@Injectable()
export class VoucherGiftCardMappingRepository extends PrismaRepository<VoucherGiftCardMapping> {
    constructor(prisma: PrismaService) {
        super(prisma, 'voucherGiftCardMapping');
    }

    async getDefaultMapping(voucherId: string): Promise<VoucherGiftCardMapping | null> {
        return this.prisma.voucherGiftCardMapping.findFirst({
            where: {
                voucherId,
                isDefault: true,
            },
            include: {
                giftCard: true,
            },
        }) as any;
    }

    async getPositionMapping(voucherId: string, position: number): Promise<VoucherGiftCardMapping | null> {
        return this.prisma.voucherGiftCardMapping.findFirst({
            where: {
                voucherId,
                position,
                isDefault: false,
            },
            include: {
                giftCard: true,
            },
        }) as any;
    }

    async getVoucherMappings(voucherId: string): Promise<{
        default: VoucherGiftCardMapping | null;
        positionMappings: VoucherGiftCardMapping[];
    }> {
        const [defaultMapping, positionMappings] = await Promise.all([
            this.getDefaultMapping(voucherId),
            this.prisma.voucherGiftCardMapping.findMany({
                where: {
                    voucherId,
                    isDefault: false,
                },
                include: {
                    giftCard: true,
                },
                orderBy: {
                    position: 'asc',
                },
            }) as any,
        ]);

        return {
            default: defaultMapping,
            positionMappings,
        };
    }

    async markAsDelivered(mappingId: string): Promise<VoucherGiftCardMapping> {
        return this.prisma.voucherGiftCardMapping.update({
            where: { id: mappingId },
            data: { isDelivered: true },
        });
    }
}
