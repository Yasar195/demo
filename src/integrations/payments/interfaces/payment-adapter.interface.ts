export interface CreatePaymentIntentInput {
    /**
     * Amount in the smallest currency unit (e.g., cents).
     */
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
    id: string;
    clientSecret?: string | null;
    status: string;
    raw: unknown;
}

export interface PaymentAdapter {
    createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
    cancelPaymentIntent?(paymentIntentId: string): Promise<PaymentIntentResult>;
    getPaymentIntentStatus?(paymentIntentId: string): Promise<PaymentIntentResult>;
}
