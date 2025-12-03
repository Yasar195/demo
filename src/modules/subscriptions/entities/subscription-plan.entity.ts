export interface SubscriptionPlan {
    id: string;
    name: string;
    displayName: string;
    description?: string;

    // Pricing
    price: number;
    yearlyPrice?: number;
    currency: string;

    // Billing
    billingPeriod: string;
    trialDays: number;

    // Feature Limits
    maxVouchers?: number;
    maxLocations?: number;
    maxActiveVouchers?: number;

    // Features
    analyticsAccess: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    bulkVoucherUpload: boolean;
    advancedReporting: boolean;
    multiLocationSupport: boolean;

    // Status
    isActive: boolean;
    isVisible: boolean;

    // Metadata
    sortOrder: number;
    features?: any;

    createdAt: Date;
    updatedAt: Date;
}
