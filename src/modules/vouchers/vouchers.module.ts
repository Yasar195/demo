import { Module } from '@nestjs/common';
import { VoucherRequestController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { VouchersRepository } from './repositories/vouchers.repository';
import { VoucherRequestRepository } from './repositories/voucher-request.repository';
import { StoreRepository } from '../store/repositories';
import { UsersRepository } from '../users/repositories';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsRepository, DeviceTokenRepository } from '../notifications/repositories';

@Module({
    controllers: [VoucherRequestController],
    providers: [
        VouchersService,
        VouchersRepository,
        VoucherRequestRepository,
        StoreRepository,
        UsersRepository,
        NotificationsService,
        NotificationsRepository,
        DeviceTokenRepository,
    ],
    exports: [VouchersService],
})
export class VouchersModule { }
