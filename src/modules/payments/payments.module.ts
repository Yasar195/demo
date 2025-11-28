import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentModule } from '../../integrations/payments/payment.module';
import { PaymentsRepository } from './repositories/payments.repository';

@Module({
    imports: [PaymentModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, PaymentsRepository],
    exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule { }
