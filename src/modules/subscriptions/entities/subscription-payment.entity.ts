export interface SubscriptionPayment {
    id: string;
    subscriptionId: string;

    // Payment Details
    amount: number;
    currency: string;
    status: string;

    // Period covered
    periodStart: Date;
    periodEnd: Date;

    // Payment gateway
    paymentMethod?: string;
    transactionId?: string;
    paymentGatewayRef?: string;

    // Invoice
    invoiceNumber?: string;
    invoiceUrl?: string;

    // Refund
    refundedAmount?: number;
    refundedAt?: Date;
    refundReason?: string;

    // Metadata
    metadata?: any;

    // Dates
    paidAt?: Date;
    failedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
