export interface StoreSubscription {
    id: string;
    storeId: string;
    planId: string;

    // Subscription Status
    status: string;

    // Billing Period
    billingPeriod: string;

    // Dates
    startDate: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialStart?: Date;
    trialEnd?: Date;
    cancelledAt?: Date;
    cancelAtPeriodEnd: boolean;

    // Pricing snapshot
    subscribedPrice: number;
    subscribedCurrency: string;

    // Renewal
    autoRenew: boolean;
    nextBillingDate?: Date;

    // Grace period
    gracePeriodEnd?: Date;

    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
