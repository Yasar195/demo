import { Injectable } from "@nestjs/common";
import { Cart } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { PrismaRepository } from "src/database/repositories";

@Injectable()
export class CartRepository extends PrismaRepository<Cart> {
    constructor(prisma: PrismaService) {
        super(prisma, 'cart');
    }

    async findByUserAndVoucher(userId: string, voucherId: string) {
        return this.findOneByCondition({ userId, voucherId } as Partial<Cart>);
    }

    async findUserCartById(userId: string, cartId: string, include?: any) {
        return this.findOneByCondition({ id: cartId, userId } as Partial<Cart>, include);
    }

    async findUserCartItems(
        userId: string,
        page: number,
        limit: number,
        include?: any,
    ) {
        return this.findWithPagination(page, limit, { userId } as Partial<Cart>, { createdAt: 'desc' }, include);
    }
}
