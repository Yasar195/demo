import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { JwtAuthGuard } from 'src/iam/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators';
import { User } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('intent')
    async createIntent(@CurrentUser() user: User, @Body() dto: CreatePaymentIntentDto) {
        const intent = await this.paymentsService.createPaymentIntent(dto, user.id);
        return BaseResponseDto.success(intent, 'Payment intent created successfully');
    }

    @Post('intent/:id/cancel')
    async cancelIntent(@Param('id') id: string) {
        const intent = await this.paymentsService.cancelPaymentIntent(id);
        return BaseResponseDto.success(intent, 'Payment intent cancelled successfully');
    }

    @Post('intent/:id/status')
    async getStatus(@Param('id') id: string) {
        const status = await this.paymentsService.getPaymentIntentStatus(id);
        return BaseResponseDto.success(status, 'Payment intent status retrieved successfully');
    }
}
