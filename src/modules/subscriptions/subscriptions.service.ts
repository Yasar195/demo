import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import {
    SubscriptionPlanRepository,
    StoreSubscriptionRepository,
    SubscriptionPaymentRepository,
    SubscriptionHistoryRepository,
} from './repositories';
import { CreateSubscriptionDto, UpgradeDowngradeDto, CancelSubscriptionDto } from './dto';
import { SubscriptionPlan, StoreSubscription, SubscriptionHistory } from './entities';
import { SubscriptionStatus, SubscriptionAction, BillingPeriod, PaymentStatus, User } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { SseService } from '../sse/sse.service';
import { RedisService } from 'src/integrations/redis';

@Injectable()
export class SubscriptionsService {
    private readonly logger = new Logger(SubscriptionsService.name);

    constructor(
        private readonly planRepository: SubscriptionPlanRepository,
        private readonly subscriptionRepository: StoreSubscriptionRepository,
        private readonly paymentRepository: SubscriptionPaymentRepository,
        private readonly historyRepository: SubscriptionHistoryRepository,
        private readonly notificationService: NotificationsService,
        private readonly sseService: SseService,
        private readonly redisService: RedisService,
    ) { }

    /**
     * Get all active plans (Public)
     */
    async getAvailablePlans(user: User): Promise<SubscriptionPlan[]> {
        const cacheKey = `plans:all:${user.id}`;
        const cachedData = await this.redisService.get(cacheKey);

        if (cachedData) {
            return JSON.parse(cachedData);
        }

        const plans = await this.planRepository.getActivePlans();
        await this.redisService.set(cacheKey, JSON.stringify(plans), 60 * 60 * 24);
        return plans;
    }

    /**
     * Get all plans including inactive (Admin)
     */
    async getAllPlans(): Promise<SubscriptionPlan[]> {
        return this.planRepository.findByCondition({});
    }

    /**
     * Create a new plan (Admin)
     */
    async createPlan(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
        const plan = await this.planRepository.create(planData);
        await this.redisService.reset('plans:all:*');
        this.logger.log(`New subscription plan created: ${plan.name}`);
        return plan;
    }

    /**
     * Update a plan (Admin)
     */
    async updatePlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> {
        const plan = await this.planRepository.update(planId, updates);
        await this.redisService.reset('plans:all:*');
        this.logger.log(`Subscription plan updated: ${planId}`);
        return plan;
    }

    /**
     * Delete a plan (Admin)
     */
    async deletePlan(planId: string): Promise<void> {
        await this.planRepository.delete(planId);
        this.logger.log(`Subscription plan deleted: ${planId}`);
    }

    /**
     * Get store's subscription
     */
    async getStoreSubscription(storeId: string): Promise<StoreSubscription | null> {
        return this.subscriptionRepository.findByStoreId(storeId);
    }

    /**
     * Check if store has active subscription
     */
    async hasActiveSubscription(storeId: string): Promise<boolean> {
        const subscription = await this.subscriptionRepository.findActiveSubscription(storeId);
        return subscription !== null;
    }

    /**
     * Subscribe to a plan
     * - Free plans: activated immediately
     * - Paid plans: requires paymentId and starts with trial or active status
     */
    async subscribe(storeId: string, userId: string, dto: CreateSubscriptionDto): Promise<StoreSubscription> {
        // Check if already has subscription
        const existing = await this.subscriptionRepository.findByStoreId(storeId);
        if (existing) {
            throw new BadRequestException('Store already has a subscription');
        }

        // Get plan
        const plan = await this.planRepository.findById(dto.planId as string);
        if (!plan || !plan.isActive) {
            throw new NotFoundException('Plan not found or inactive');
        }

        const price = dto.billingPeriod === BillingPeriod.YEARLY ? plan.yearlyPrice : plan.price;
        const isPaidPlan = price && Number(price) > 0;

        // Validate payment for paid plans
        if (isPaidPlan && !dto.paymentId) {
            throw new BadRequestException('Payment ID is required for paid plans');
        }

        // Calculate dates
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

        // Determine subscription status
        // Free plans: activate immediately
        // Paid plans with payment: activate immediately
        // Paid plans without payment (shouldn't happen due to validation): start trial
        const status = !isPaidPlan || dto.paymentId
            ? SubscriptionStatus.ACTIVE
            : SubscriptionStatus.TRIAL;

        const subscriptionAction = !isPaidPlan
            ? SubscriptionAction.CREATED
            : dto.paymentId
                ? SubscriptionAction.PAYMENT_SUCCEEDED
                : SubscriptionAction.TRIAL_STARTED;

        // Create subscription
        const subscriptionData: Partial<StoreSubscription> = {
            storeId,
            planId: plan.id,
            status,
            billingPeriod: dto.billingPeriod,
            startDate: now,
            currentPeriodStart: now,
            subscribedPrice: price || new (await import('@prisma/client')).Prisma.Decimal(0),
            subscribedCurrency: plan.currency,
            autoRenew: true,
        };

        // Set period end and trial dates based on plan type
        if (!isPaidPlan) {
            // Free plan: set a very long period (e.g., 10 years)
            const forever = new Date(now);
            forever.setFullYear(forever.getFullYear() + 10);
            subscriptionData.currentPeriodEnd = forever;
            subscriptionData.nextBillingDate = null;
        } else if (dto.paymentId) {
            // Paid plan with payment: calculate next billing
            const nextBilling = new Date(now);
            if (dto.billingPeriod === BillingPeriod.YEARLY) {
                nextBilling.setFullYear(nextBilling.getFullYear() + 1);
            } else if (dto.billingPeriod === BillingPeriod.QUARTERLY) {
                nextBilling.setMonth(nextBilling.getMonth() + 3);
            } else {
                nextBilling.setMonth(nextBilling.getMonth() + 1);
            }
            subscriptionData.currentPeriodEnd = nextBilling;
            subscriptionData.nextBillingDate = nextBilling;
        } else {
            // Trial period
            subscriptionData.currentPeriodEnd = trialEnd;
            subscriptionData.trialStart = now;
            subscriptionData.trialEnd = trialEnd;
            subscriptionData.nextBillingDate = trialEnd;
        }

        const subscription = await this.subscriptionRepository.create(subscriptionData);

        // Create history
        await this.historyRepository.create({
            subscriptionId: subscription.id,
            action: subscriptionAction,
            toPlanId: plan.id,
            toStatus: status,
            triggeredBy: userId,
        } as Partial<SubscriptionHistory>);

        // Create payment record if paymentId provided
        if (dto.paymentId && isPaidPlan) {
            await this.paymentRepository.create({
                subscriptionId: subscription.id,
                amount: price,
                currency: plan.currency,
                status: PaymentStatus.COMPLETED,
                periodStart: now,
                periodEnd: subscriptionData.currentPeriodEnd,
                paymentMethod: 'RAZORPAY', // Or get from dto
                transactionId: dto.paymentId,
                paidAt: now,
            });
        }

        // Send notification
        const notificationMessage = !isPaidPlan
            ? `Your free ${plan.displayName} plan has been activated!`
            : dto.paymentId
                ? `Your ${plan.displayName} subscription is now active!`
                : `Your ${plan.displayName} trial has started. Enjoy ${plan.trialDays} days free!`;

        await this.notificationService.createNotification({
            title: !isPaidPlan ? 'Free Plan Activated' : dto.paymentId ? 'Subscription Activated' : 'Trial Started',
            message: notificationMessage,
            userIds: [userId],
        });

        this.logger.log(
            `Subscription created for store ${storeId}: ${!isPaidPlan ? 'FREE' : dto.paymentId ? 'PAID' : 'TRIAL'}`
        );
        return subscription;
    }

    /**
     * Upgrade plan
     */
    async upgradePlan(
        storeId: string,
        userId: string,
        dto: UpgradeDowngradeDto,
    ): Promise<StoreSubscription | null> {
        const subscription = await this.subscriptionRepository.findByStoreId(storeId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.TRIAL) {
            throw new BadRequestException('Cannot upgrade inactive subscription');
        }

        const newPlan = await this.planRepository.findById(dto.newPlanId);
        if (!newPlan || !newPlan.isActive) {
            throw new NotFoundException('New plan not found');
        }

        const oldPlanId = subscription.planId;
        const newPrice = subscription.billingPeriod === BillingPeriod.YEARLY ? newPlan.yearlyPrice : newPlan.price;

        // Update subscription
        const updated = await this.subscriptionRepository.update(subscription.id, {
            planId: newPlan.id,
            subscribedPrice: newPrice,
        } as Partial<StoreSubscription>);

        // Create history
        await this.historyRepository.create({
            subscriptionId: subscription.id,
            action: SubscriptionAction.UPGRADED,
            fromPlanId: oldPlanId,
            toPlanId: newPlan.id,
            triggeredBy: userId,
            triggerReason: dto.reason,
        } as Partial<SubscriptionHistory>);

        await this.redisService.reset(`plans:all:${userId}`);

        // Send notification and SSE
        await this.notificationService.createNotification({
            title: 'Plan Upgraded',
            message: `Your plan has been upgraded to ${newPlan.displayName}`,
            userIds: [userId],
        });

        this.sseService.sendToUser(userId, 'subscription_activated', {
            message: `Plan upgraded to ${newPlan.displayName}`,
        });

        this.logger.log(`Subscription ${subscription.id} upgraded to plan ${newPlan.id}`);
        return updated;
    }

    /**
     * Downgrade plan (scheduled at period end)
     */
    async downgradePlan(
        storeId: string,
        userId: string,
        dto: UpgradeDowngradeDto,
    ): Promise<StoreSubscription> {
        const subscription = await this.subscriptionRepository.findByStoreId(storeId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        if (subscription.status !== SubscriptionStatus.ACTIVE) {
            throw new BadRequestException('Cannot downgrade inactive subscription');
        }

        const newPlan = await this.planRepository.findById(dto.newPlanId);
        if (!newPlan || !newPlan.isActive) {
            throw new NotFoundException('New plan not found');
        }

        // Create history - downgrade scheduled
        await this.historyRepository.create({
            subscriptionId: subscription.id,
            action: SubscriptionAction.DOWNGRADED,
            fromPlanId: subscription.planId,
            toPlanId: newPlan.id,
            triggeredBy: userId,
            triggerReason: dto.reason,
        } as Partial<SubscriptionHistory>);

        await this.redisService.reset(`plans:all:${userId}`);

        await this.notificationService.createNotification({
            title: 'Plan Downgrade Scheduled',
            message: `Your plan will be downgraded to ${newPlan.displayName} at the end of your billing period`,
            userIds: [userId],
        });

        this.logger.log(`Downgrade scheduled for subscription ${subscription.id}`);
        return subscription;
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(
        storeId: string,
        userId: string,
        dto: CancelSubscriptionDto,
    ): Promise<StoreSubscription | null> {
        const subscription = await this.subscriptionRepository.findByStoreId(storeId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        if (subscription.status === SubscriptionStatus.CANCELLED) {
            throw new BadRequestException('Subscription already cancelled');
        }

        const now = new Date();
        const updateData: Partial<StoreSubscription> = {
            cancelledAt: now,
        };

        if (dto.cancelImmediately) {
            // Cancel immediately
            updateData.status = SubscriptionStatus.CANCELLED;
            updateData.currentPeriodEnd = now;
        } else {
            // Cancel at period end
            updateData.cancelAtPeriodEnd = true;
            updateData.autoRenew = false;
        }

        const updated = await this.subscriptionRepository.update(subscription.id, updateData);

        // Create history
        await this.historyRepository.create({
            subscriptionId: subscription.id,
            action: SubscriptionAction.CANCELLED,
            fromStatus: subscription.status,
            toStatus: dto.cancelImmediately ? SubscriptionStatus.CANCELLED : subscription.status,
            triggeredBy: userId,
            triggerReason: dto.reason,
        } as Partial<SubscriptionHistory>);

        // Send notification and SSE
        const message = dto.cancelImmediately
            ? 'Your subscription has been cancelled'
            : 'Your subscription will be cancelled at the end of the billing period';

        await this.redisService.reset(`plans:all:${userId}`);

        await this.notificationService.createNotification({
            title: 'Subscription Cancelled',
            message,
            userIds: [userId],
        });

        this.sseService.sendToUser(userId, 'subscription_cancelled', { message });

        this.logger.log(`Subscription ${subscription.id} cancelled`);
        return updated;
    }

    /**
     * Reactivate cancelled subscription
     */
    async reactivateSubscription(storeId: string, userId: string): Promise<StoreSubscription | null> {
        const subscription = await this.subscriptionRepository.findByStoreId(storeId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        if (subscription.status !== SubscriptionStatus.CANCELLED || subscription.cancelAtPeriodEnd) {
            const updated = await this.subscriptionRepository.update(subscription.id, {
                cancelAtPeriodEnd: false,
                autoRenew: true,
            } as Partial<StoreSubscription>);

            await this.redisService.reset(`plans:all:${userId}`);

            await this.historyRepository.create({
                subscriptionId: subscription.id,
                action: SubscriptionAction.REACTIVATED,
                triggeredBy: userId,
            } as Partial<SubscriptionHistory>);

            await this.notificationService.createNotification({
                title: 'Subscription Reactivated',
                message: 'Your subscription has been reactivated',
                userIds: [userId],
            });

            return updated;
        }

        throw new BadRequestException('Cannot reactivate this subscription');
    }

    /**
     * Handle trial end - require payment
     */
    async handleTrialEnd(subscriptionId: string): Promise<void> {
        const subscription = await this.subscriptionRepository.findById(subscriptionId);
        if (!subscription || subscription.status !== SubscriptionStatus.TRIAL) {
            return;
        }

        // Change status to PAYMENT_REQUIRED
        await this.subscriptionRepository.update(subscriptionId, {
            status: SubscriptionStatus.PAYMENT_REQUIRED,
        } as Partial<StoreSubscription>);

        await this.historyRepository.create({
            subscriptionId,
            action: SubscriptionAction.TRIAL_ENDED,
            fromStatus: SubscriptionStatus.TRIAL,
            toStatus: SubscriptionStatus.PAYMENT_REQUIRED,
            triggeredBy: 'SYSTEM',
        } as Partial<SubscriptionHistory>);

        // Get store owner
        const sub = await this.subscriptionRepository.findById(subscriptionId);
        if (sub) {
            // Send notification and SSE
            await this.notificationService.createNotification({
                title: 'Trial Ended - Payment Required',
                message: 'Your trial has ended. Please complete payment to continue accessing your store.',
                userIds: [(sub as any).store?.ownerId],
            });

            this.sseService.sendToUser((sub as any).store?.ownerId, 'subscription_payment_required', {
                message: 'Trial ended. Payment required.',
            });
        }

        this.logger.log(`Trial ended for subscription ${subscriptionId}`);
    }

    /**
     * Handle payment success
     */
    async handlePaymentSuccess(subscriptionId: string, paymentId: string): Promise<void> {
        const subscription = await this.subscriptionRepository.findById(subscriptionId);
        if (!subscription) {
            return;
        }

        const now = new Date();
        const nextBilling = new Date(now);

        // Calculate next billing date based on period
        if (subscription.billingPeriod === BillingPeriod.YEARLY) {
            nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        } else if (subscription.billingPeriod === BillingPeriod.QUARTERLY) {
            nextBilling.setMonth(nextBilling.getMonth() + 3);
        } else {
            nextBilling.setMonth(nextBilling.getMonth() + 1);
        }

        // Activate subscription
        await this.subscriptionRepository.update(subscriptionId, {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: nextBilling,
            nextBillingDate: nextBilling,
            gracePeriodEnd: undefined,
        } as Partial<StoreSubscription>);

        await this.historyRepository.create({
            subscriptionId,
            action: SubscriptionAction.PAYMENT_SUCCEEDED,
            fromStatus: subscription.status,
            toStatus: SubscriptionStatus.ACTIVE,
            triggeredBy: 'SYSTEM',
        } as Partial<SubscriptionHistory>);

        // Send notification
        const sub = await this.subscriptionRepository.findById(subscriptionId);
        if (sub) {
            await this.notificationService.createNotification({
                title: 'Subscription Activated',
                message: 'Your payment was successful! Your subscription is now active.',
                userIds: [(sub as any).store?.ownerId],
            });

            this.sseService.sendToUser((sub as any).store?.ownerId, 'subscription_activated', {
                message: 'Subscription activated',
            });
        }

        this.logger.log(`Payment successful for subscription ${subscriptionId}`);
    }

    /**
     * Handle payment failure
     */
    async handlePaymentFailure(subscriptionId: string, paymentId: string): Promise<void> {
        const subscription = await this.subscriptionRepository.findById(subscriptionId);
        if (!subscription) {
            return;
        }

        const now = new Date();
        const gracePeriodEnd = new Date(now);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 48); // 48 hour grace period

        await this.subscriptionRepository.update(subscriptionId, {
            status: SubscriptionStatus.PAST_DUE,
            gracePeriodEnd,
        } as Partial<StoreSubscription>);

        await this.historyRepository.create({
            subscriptionId,
            action: SubscriptionAction.PAYMENT_FAILED,
            fromStatus: subscription.status,
            toStatus: SubscriptionStatus.PAST_DUE,
            triggeredBy: 'SYSTEM',
        } as Partial<SubscriptionHistory>);

        // Send notification
        const sub = await this.subscriptionRepository.findById(subscriptionId);
        if (sub) {
            await this.notificationService.createNotification({
                title: 'Payment Failed',
                message: 'Your payment failed. Please update payment method within 48 hours to avoid suspension.',
                userIds: [(sub as any).store?.ownerId],
            });

            this.sseService.sendToUser((sub as any).store?.ownerId, 'subscription_payment_failed', {
                message: 'Payment failed. Update payment method.',
            });
        }

        this.logger.warn(`Payment failed for subscription ${subscriptionId}`);
    }

    /**
     * Suspend subscription after grace period
     */
    async suspendSubscription(subscriptionId: string): Promise<void> {
        await this.subscriptionRepository.update(subscriptionId, {
            status: SubscriptionStatus.SUSPENDED,
        } as Partial<StoreSubscription>);

        await this.historyRepository.create({
            subscriptionId,
            action: SubscriptionAction.SUSPENDED,
            toStatus: SubscriptionStatus.SUSPENDED,
            triggeredBy: 'SYSTEM',
        } as Partial<SubscriptionHistory>);

        const sub = await this.subscriptionRepository.findById(subscriptionId);
        if (sub) {
            await this.notificationService.createNotification({
                title: 'Subscription Suspended',
                message: 'Your subscription has been suspended due to payment failure. Please complete payment to restore access.',
                userIds: [(sub as any).store?.ownerId],
            });

            this.sseService.sendToUser((sub as any).store?.ownerId, 'subscription_suspended', {
                message: 'Subscription suspended',
            });
        }

        this.logger.warn(`Subscription ${subscriptionId} suspended`);
    }
}
