import { BaseEntity } from '../../../core/entities/base.entity';

export class Voucher extends BaseEntity {
    code: string;
    discount: number;
    expiresAt: Date;
    giftCardId?: string | null;
    isVerified: boolean;
}
