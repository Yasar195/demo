import { Cart as PrismaCart } from '@prisma/client';

export class Cart implements PrismaCart {
    id: string;
    userId: string;
    voucherId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;

    // Optional relation payload populated when querying with voucher details
    voucher?: {
        id: string;
        name: string;
        code: string;
        sellingPrice: number;
        faceValue: number;
        discount: number;
        image: string | null;
        expiresAt: Date;
        isActive: boolean;
        store?: {
            id: string;
            name: string;
            logo: string | null;
        } | null;
    } | null;
}
