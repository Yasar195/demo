import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DashboardStatsDto, DetailedDashboardStatsDto, RevenueBreakdownDto } from './dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private readonly prisma: PrismaService) { }

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
        return this.prisma.user.count({
            where: {
                deletedAt: null,
            },
        });
    }

    /**
     * Get count of active stores
     */
    private async getActiveStores(): Promise<number> {
        return this.prisma.store.count({
            where: {
                deletedAt: null,
            },
        });
    }

    /**
     * Get total revenue from completed payments
     */
    private async getTotalRevenue(): Promise<{ total: number; currency: string }> {
        const result = await this.prisma.payment.aggregate({
            where: {
                status: PaymentStatus.COMPLETED,
                deletedAt: null,
            },
            _sum: {
                amount: true,
            },
        });

        return {
            total: result._sum.amount || 0,
            currency: 'INR',
        };
    }

    /**
     * Get revenue breakdown by payment status
     */
    private async getRevenueBreakdown(): Promise<RevenueBreakdownDto> {
        const [completed, pending, failed, refunded] = await Promise.all([
            this.prisma.payment.aggregate({
                where: { status: PaymentStatus.COMPLETED, deletedAt: null },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: { status: PaymentStatus.PENDING, deletedAt: null },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: { status: PaymentStatus.FAILED, deletedAt: null },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: { status: PaymentStatus.REFUNDED, deletedAt: null },
                _sum: { amount: true },
            }),
        ]);

        return {
            completed: completed._sum.amount || 0,
            pending: pending._sum.amount || 0,
            failed: failed._sum.amount || 0,
            refunded: refunded._sum.amount || 0,
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
            this.prisma.payment.count({
                where: { deletedAt: null },
            }),
            this.prisma.payment.count({
                where: { status: PaymentStatus.COMPLETED, deletedAt: null },
            }),
            this.prisma.payment.count({
                where: { status: PaymentStatus.PENDING, deletedAt: null },
            }),
        ]);

        return { total, completed, pending };
    }

    /**
     * Get count of pending store requests
     */
    private async getPendingStoreRequests(): Promise<number> {
        return this.prisma.storeRequest.count({
            where: {
                status: 'PENDING',
                deletedAt: null,
            },
        });
    }

    /**
     * Get count of pending voucher requests
     */
    private async getPendingVoucherRequests(): Promise<number> {
        return this.prisma.voucherRequest.count({
            where: {
                status: 'PENDING',
                deletedAt: null,
            },
        });
    }
}
