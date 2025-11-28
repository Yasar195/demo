import { Injectable, Logger } from '@nestjs/common';
import { DashboardStatsDto, DetailedDashboardStatsDto, RevenueBreakdownDto } from './dto';
import { PaymentStatus } from '@prisma/client';
import { UsersRepository } from '../users/repositories/users.repository';
import { PaymentsRepository } from '../payments/repositories/payments.repository';
import { VouchersRepository } from '../vouchers/repositories/vouchers.repository';
import { VoucherRequestRepository } from '../vouchers/repositories/voucher-request.repository';
import { StoreRequestRepository } from '../store/repositories/store-request.repository';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly paymentsRepository: PaymentsRepository,
        private readonly vouchersRepository: VouchersRepository,
        private readonly voucherRequestRepository: VoucherRequestRepository,
        private readonly storeRequestRepository: StoreRequestRepository,
    ) { }

    /**
     * Get basic dashboard statistics
     */
    async getDashboardStats(): Promise<DashboardStatsDto> {
        try {
            const [totalUsers, activeStores, revenueData] = await Promise.all([
                this.getTotalUsers(),
                this.getActiveStores(),
                this.getTotalRevenue(),
            ]);

            return {
                totalUsers,
                activeStores,
                totalRevenue: revenueData.total,
                currency: revenueData.currency,
            };
        } catch (error) {
            this.logger.error('Failed to get dashboard stats', error);
            throw error;
        }
    }

    /**
     * Get detailed dashboard statistics with breakdowns
     */
    async getDetailedDashboardStats(): Promise<DetailedDashboardStatsDto> {
        try {
            const [
                totalUsers,
                activeStores,
                revenueData,
                revenueBreakdown,
                paymentStats,
                storeRequestsPending,
                voucherRequestsPending,
            ] = await Promise.all([
                this.getTotalUsers(),
                this.getActiveStores(),
                this.getTotalRevenue(),
                this.getRevenueBreakdown(),
                this.getPaymentStats(),
                this.getPendingStoreRequests(),
                this.getPendingVoucherRequests(),
            ]);

            return {
                totalUsers,
                activeStores,
                totalRevenue: revenueData.total,
                currency: revenueData.currency,
                revenueBreakdown,
                totalPayments: paymentStats.total,
                completedPayments: paymentStats.completed,
                pendingPayments: paymentStats.pending,
                storeRequestsPending,
                voucherRequestsPending,
            };
        } catch (error) {
            this.logger.error('Failed to get detailed dashboard stats', error);
            throw error;
        }
    }

    /**
     * Get total number of users
     */
    private async getTotalUsers(): Promise<number> {
        return this.usersRepository.countTotal();
    }

    /**
     * Get count of active stores
     */
    private async getActiveStores(): Promise<number> {
        return this.vouchersRepository.countActiveStores();
    }

    /**
     * Get total revenue from completed payments
     */
    private async getTotalRevenue(): Promise<{ total: number; currency: string }> {
        const total = await this.paymentsRepository.getTotalRevenue(PaymentStatus.COMPLETED);

        return {
            total,
            currency: 'INR',
        };
    }

    /**
     * Get revenue breakdown by payment status
     */
    private async getRevenueBreakdown(): Promise<RevenueBreakdownDto> {
        const [completed, pending, failed, refunded] = await Promise.all([
            this.paymentsRepository.getTotalRevenue(PaymentStatus.COMPLETED),
            this.paymentsRepository.getTotalRevenue(PaymentStatus.PENDING),
            this.paymentsRepository.getTotalRevenue(PaymentStatus.FAILED),
            this.paymentsRepository.getTotalRevenue(PaymentStatus.REFUNDED),
        ]);

        return {
            completed,
            pending,
            failed,
            refunded,
        };
    }

    /**
     * Get payment statistics
     */
    private async getPaymentStats(): Promise<{
        total: number;
        completed: number;
        pending: number;
    }> {
        const [total, completed, pending] = await Promise.all([
            this.paymentsRepository.countAll(),
            this.paymentsRepository.countByStatus(PaymentStatus.COMPLETED),
            this.paymentsRepository.countByStatus(PaymentStatus.PENDING),
        ]);

        return { total, completed, pending };
    }

    /**
     * Get count of pending store requests
     */
    private async getPendingStoreRequests(): Promise<number> {
        return this.storeRequestRepository.countAllPending();
    }

    /**
     * Get count of pending voucher requests
     */
    private async getPendingVoucherRequests(): Promise<number> {
        return this.voucherRequestRepository.countAllPending();
    }
}
