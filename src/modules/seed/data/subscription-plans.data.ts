import { BillingPeriod } from '@prisma/client';
import { Prisma } from '@prisma/client';

export const DEFAULT_SUBSCRIPTION_PLANS: Prisma.SubscriptionPlanCreateInput[] = [
    {
        name: 'BASIC',
        displayName: 'Basic Plan',
        description: 'Perfect for small businesses getting started with digital vouchers',
        price: new Prisma.Decimal(999),
        yearlyPrice: new Prisma.Decimal(9999),
        currency: 'INR',
        billingPeriod: BillingPeriod.MONTHLY,
        trialDays: 14,

        // Feature Limits
        maxVouchers: 10,
        maxLocations: 2,
        maxActiveVouchers: 5,

        // Features
        analyticsAccess: true,
        prioritySupport: false,
        customBranding: false,
        apiAccess: false,
        bulkVoucherUpload: false,
        advancedReporting: false,
        multiLocationSupport: true,

        // Status
        isActive: true,
        isVisible: true,
        sortOrder: 1,
    },
    {
        name: 'PREMIUM',
        displayName: 'Premium Plan',
        description: 'Advanced features for growing businesses with unlimited potential',
        price: new Prisma.Decimal(2999),
        yearlyPrice: new Prisma.Decimal(29999),
        currency: 'INR',
        billingPeriod: BillingPeriod.MONTHLY,
        trialDays: 14,

        // Feature Limits (null = unlimited)
        maxVouchers: null,
        maxLocations: null,
        maxActiveVouchers: null,

        // Features
        analyticsAccess: true,
        prioritySupport: true,
        customBranding: true,
        apiAccess: true,
        bulkVoucherUpload: true,
        advancedReporting: true,
        multiLocationSupport: true,

        // Status
        isActive: true,
        isVisible: true,
        sortOrder: 2,
    },
];
