import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationCleanupService } from './reservation-cleanup.service';
import { PaymentsModule } from '../payments/payments.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        PaymentsModule,
        VouchersModule,
    ],
    providers: [ReservationCleanupService],
    exports: [ReservationCleanupService],
})
export class SchedulerModule { }
