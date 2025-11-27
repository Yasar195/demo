import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { StoreRequestRepository, StoreRepository } from './repositories';
import { UsersRepository } from '../users/repositories';
import { NotificationsService } from '../notifications/notifications.service';
import { DeviceTokenRepository, NotificationsRepository } from '../notifications/repositories';

@Module({
    controllers: [StoreController],
    providers: [StoreService, StoreRequestRepository, StoreRepository, UsersRepository, NotificationsRepository, NotificationsService, DeviceTokenRepository],
    exports: [StoreService, StoreRequestRepository, StoreRepository],
})
export class StoreModule { }
