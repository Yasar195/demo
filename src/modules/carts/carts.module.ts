import { Module } from '@nestjs/common';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { CartRepository } from './repositories/cart.repository';
import { VouchersRepository } from '../vouchers/repositories/vouchers.repository';

@Module({
    controllers: [CartsController],
    providers: [CartsService, CartRepository, VouchersRepository],
    exports: [CartsService],
})
export class CartsModule { }
