import { Module } from '@nestjs/common';
import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';
import {
    GiftCardRepository,
    VoucherGiftCardMappingRepository,
    UserGiftCardRepository,
} from './repositories';

@Module({
    controllers: [GiftCardsController],
    providers: [
        GiftCardsService,
        GiftCardRepository,
        VoucherGiftCardMappingRepository,
        UserGiftCardRepository,
    ],
    exports: [GiftCardsService], // Export for use in OrdersService
})
export class GiftCardsModule { }
