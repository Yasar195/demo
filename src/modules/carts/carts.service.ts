import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CartRepository } from './repositories/cart.repository';
import { VouchersRepository } from '../vouchers/repositories/vouchers.repository';
import { AddToCartDto } from './dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Cart } from '@prisma/client';
import { RedisService } from '../../integrations/redis/redis.service';

@Injectable()
export class CartsService {
    constructor(
        private readonly cartRepository: CartRepository,
        private readonly vouchersRepository: VouchersRepository,
        private readonly redisService: RedisService,
    ) { }

    /**
     * Add a voucher to the user's cart
     */
    async addToCart(userId: string, dto: AddToCartDto): Promise<Cart> {
        const voucher = await this.vouchersRepository.findById(dto.voucherId);

        if (!voucher) {
            throw new NotFoundException('Voucher not found');
        }

        if (!voucher.isActive) {
            throw new BadRequestException('Voucher is not active');
        }

        if (voucher.expiresAt < new Date()) {
            throw new BadRequestException('Voucher has expired');
        }

        const availableStock = await this.vouchersRepository.getAvailableStock(dto.voucherId);
        if (availableStock <= 0) {
            throw new BadRequestException('Voucher is out of stock');
        }

        const alreadyInCart = await this.cartRepository.findByUserAndVoucher(userId, dto.voucherId);
        if (alreadyInCart) {
            throw new BadRequestException('Voucher already in cart');
        }

        const cartItem = await this.cartRepository.create({
            userId,
            voucherId: dto.voucherId,
        } as Partial<Cart>);

        await this.redisService.reset(`cart:user:${userId}:*`);

        return cartItem;
    }

    /**
     * Get all cart items for a user with pagination
     */
    async getUserCart(
        userId: string,
        pagination?: PaginationDto,
    ): Promise<{ data: Cart[]; total: number; page: number; totalPages: number }> {
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 20;

        const cacheKey = `cart:user:${userId}:${page}:${limit}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.cartRepository.findUserCartItems(
            userId,
            page,
            limit,
            {
                voucher: {
                    include: {
                        store: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                            },
                        },
                    },
                },
            },
        );

        await this.redisService.set(cacheKey, JSON.stringify(result), 300);

        return result;
    }

    /**
     * Remove a cart item by cart ID
     */
    async removeFromCart(userId: string, cartId: string): Promise<boolean> {
        const cartItem = await this.cartRepository.findUserCartById(userId, cartId);

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        const deleted = await this.cartRepository.softDelete(cartId);

        if (deleted) {
            await this.redisService.reset(`cart:user:${userId}:*`);
        }

        return deleted;
    }

    /**
     * Remove a cart item by voucher ID (helper for clients without cart id)
     */
    async removeByVoucher(userId: string, voucherId: string): Promise<boolean> {
        const cartItem = await this.cartRepository.findByUserAndVoucher(userId, voucherId);

        if (!cartItem) {
            throw new NotFoundException('Cart item not found');
        }

        const deleted = await this.cartRepository.softDelete(cartItem.id);

        if (deleted) {
            await this.redisService.reset(`cart:user:${userId}:*`);
        }

        return deleted;
    }
}
