import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsRepository } from '../payments/repositories/payments.repository';
import { VouchersRepository } from '../vouchers/repositories/vouchers.repository';

@Injectable()
export class ReservationCleanupService {
    private readonly logger = new Logger(ReservationCleanupService.name);

    constructor(
        private readonly paymentsRepository: PaymentsRepository,
        private readonly vouchersRepository: VouchersRepository,
    ) { }

    @Cron('0 */5 * * * *')
    async cleanupExpiredReservations(): Promise<void> {
        try {
            this.logger.log('Running reservation cleanup task...');

            const expiredPayments = await this.paymentsRepository.findExpiredReservations();

            if (expiredPayments.length === 0) {
                this.logger.log('No expired reservations found');
                return;
            }

            this.logger.log(`Found ${expiredPayments.length} expired reservations to clean up`);

            for (const payment of expiredPayments) {
                try {
                    // Type assertion since Prisma client hasn't been regenerated yet
                    const quantityReserved = (payment as any).quantityReserved;
                    const voucherId = payment.voucherId;

                    if (!voucherId || !quantityReserved) {
                        continue;
                    }

                    // Release the reservation from voucher
                    await this.vouchersRepository.releaseReservation(voucherId, quantityReserved);

                    // Clear reservation fields from payment
                    await this.paymentsRepository.clearReservation(payment.id);

                    this.logger.log(
                        `Released expired reservation: Payment ${payment.id}, Voucher ${voucherId}, Quantity ${quantityReserved}`
                    );
                } catch (error) {
                    this.logger.error(
                        `Failed to release reservation for payment ${payment.id}:`,
                        error
                    );
                    // Continue with next payment even if one fails
                }
            }

            this.logger.log('Reservation cleanup task completed');
        } catch (error) {
            this.logger.error('Reservation cleanup task failed:', error);
        }
    }
}
