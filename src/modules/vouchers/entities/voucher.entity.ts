import { BaseEntity } from '../../../core/entities/base.entity';

export class Voucher extends BaseEntity {
    storeId: string;
    requestId: string | null;
    code: string;
    name: string;
    description: string | null;
    value: number;
    price: number;
    discount: number;
    expiresAt: Date;
    giftCardId?: string | null;
    isVerified: boolean;
}
