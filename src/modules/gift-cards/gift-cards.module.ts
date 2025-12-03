import { Module } from '@nestjs/common';
import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';
import {
    GiftCardRepository,
    UserGiftCardRepository,
} from './repositories';
import { OrdersRepository } from '../orders/repositories';

@Module({
    controllers: [GiftCardsController],
    providers: [
        GiftCardsService,
        GiftCardRepository,
        UserGiftCardRepository,
        OrdersRepository
    ],
    exports: [GiftCardsService], // Export for use in OrdersService
})
export class GiftCardsModule { }
