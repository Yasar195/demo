export interface SubscriptionHistory {
    id: string;
    subscriptionId: string;

    // Change tracking
    action: string;
    fromPlanId?: string;
    toPlanId?: string;
    fromStatus?: string;
    toStatus?: string;

    // Who made the change
    triggeredBy?: string;
    triggerReason?: string;

    // Additional context
    metadata?: any;

    createdAt: Date;
}
