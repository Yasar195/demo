import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';
import { StoreRepository } from '../../modules/store/repositories/store.repository';
import { SubscriptionStatus } from '@prisma/client';

/**
 * Guard to check if store has active subscription
 * Apply this guard to endpoints that require subscription
 * Blocks access if subscription status is not TRIAL or ACTIVE
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
    private readonly logger = new Logger(SubscriptionGuard.name);

    constructor(
        private readonly subscriptionsService: SubscriptionsService,
        private readonly storeRepository: StoreRepository,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return true; // Let auth guard handle this
        }

        // Get user's store
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id });
        if (!store) {
            return true; // No store yet, allow access to create store request
        }

        // Check subscription
        const subscription = await this.subscriptionsService.getStoreSubscription(store.id);

        if (!subscription) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'No subscription found. Please subscribe to a plan to access your store.',
                error: 'NO_SUBSCRIPTION',
            });
        }

        // Check if subscription is active
        const allowedStatuses: string[] = [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE];
        const currentStatus = subscription.status as string;

        if (!allowedStatuses.includes(currentStatus)) {
            const messages: Record<string, string> = {
                [SubscriptionStatus.PAYMENT_REQUIRED]: 'Your trial has ended. Please complete payment to continue.',
                [SubscriptionStatus.PAST_DUE]: 'Your payment is overdue. Please update your payment method.',
                [SubscriptionStatus.SUSPENDED]: 'Your subscription is suspended. Please complete payment to restore access.',
                [SubscriptionStatus.CANCELLED]: 'Your subscription has been cancelled. Please subscribe again to access your store.',
                [SubscriptionStatus.EXPIRED]: 'Your subscription has expired. Please renew to continue.',
                [SubscriptionStatus.INCOMPLETE]: 'Your subscription setup is incomplete. Please complete the payment process.',
            };

            throw new ForbiddenException({
                statusCode: 403,
                message: messages[subscription.status] || 'Subscription is not active',
                error: 'SUBSCRIPTION_INACTIVE',
                subscriptionStatus: subscription.status,
                trialEnd: subscription.trialEnd,
                gracePeriodEnd: subscription.gracePeriodEnd,
            });
        }

        // Subscription is active - allow access
        return true;
    }
}
