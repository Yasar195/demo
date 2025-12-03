import { UserRole } from '@prisma/client';

export type SSEEventType =
    | 'notification'
    | 'voucher_created'
    | 'voucher_updated'
    | 'voucher_request_approved'
    | 'voucher_request_rejected'
    | 'voucher_request_created'
    | 'voucher_redeemed'
    | 'voucher_redemption_confirmed'
    | 'store_request_approved'
    | 'store_request_rejected'
    | 'gift_card_number'
    | 'heartbeat';

export interface SSEEvent {
    id: string;
    type: SSEEventType;
    timestamp: number;
    data: any;
    userId?: string; // Target specific user
    role?: UserRole; // Target all users with specific role
    instanceId?: string; // ID of the instance that created this event
}

export interface SSEClient {
    userId: string;
    role: UserRole;
    lastActivity: number;
}

export interface MessageEvent {
    data: string | object;
    id?: string;
    type?: string;
    retry?: number;
}

