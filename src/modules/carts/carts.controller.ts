import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    /**
     * Get current user's cart
     */
    @Get()
    async getCart(
        @CurrentUser() user: User,
        @Query() pagination: PaginationDto,
    ) {
        const result = await this.cartsService.getUserCart(user.id, pagination);
        return BaseResponseDto.success(result, 'Cart items retrieved successfully');
    }

    /**
     * Add a voucher to the cart
     */
    @Post()
    async addToCart(
        @CurrentUser() user: User,
        @Body() dto: AddToCartDto,
    ) {
        const cartItem = await this.cartsService.addToCart(user.id, dto);
        return BaseResponseDto.success(cartItem, 'Voucher added to cart');
    }

    /**
     * Remove a cart item by cart id
     */
    @Delete(':id')
    async removeFromCart(
        @CurrentUser() user: User,
        @Param('id') id: string,
    ) {
        await this.cartsService.removeFromCart(user.id, id);
        return BaseResponseDto.success(null, 'Cart item removed');
    }

    /**
     * Remove a cart item by voucher id
     */
    @Delete('voucher/:voucherId')
    async removeByVoucher(
        @CurrentUser() user: User,
        @Param('voucherId') voucherId: string,
    ) {
        await this.cartsService.removeByVoucher(user.id, voucherId);
        return BaseResponseDto.success(null, 'Cart item removed');
    }
}
