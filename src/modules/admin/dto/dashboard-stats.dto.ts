export class DashboardStatsDto {
    totalUsers: number;
    activeStores: number;
    totalRevenue: number;
    currency: string;
}

export class RevenueBreakdownDto {
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
}

export class DetailedDashboardStatsDto extends DashboardStatsDto {
    revenueBreakdown: RevenueBreakdownDto;
    totalPayments: number;
    completedPayments: number;
    pendingPayments: number;
    storeRequestsPending: number;
    voucherRequestsPending: number;
}
