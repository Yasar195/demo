import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { StoreRequestRepository, StoreRepository } from './repositories';

@Module({
    controllers: [StoreController],
    providers: [StoreService, StoreRequestRepository, StoreRepository],
    exports: [StoreService, StoreRequestRepository, StoreRepository],
})
export class StoreModule {}
