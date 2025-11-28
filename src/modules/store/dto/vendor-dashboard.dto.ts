export class VoucherStatsDto {
    totalVouchers: number;
    activeVouchers: number;
    expiredVouchers: number;
    vouchersSold: number;
    totalQuantityAvailable: number;
}

export class RevenueStatsDto {
    totalRevenue: number;
    completedRevenue: number;
    pendingRevenue: number;
    currency: string;
}

export class StoreInfoDto {
    storeId: string;
    storeName: string;
    storeDescription: string | null;
    storeLogo: string | null;
    totalLocations: number;
    activeLocations: number;
}

export class VendorDashboardStatsDto {
    store: StoreInfoDto;
    voucherStats: VoucherStatsDto;
    revenueStats: RevenueStatsDto;
    pendingVoucherRequests: number;
}
