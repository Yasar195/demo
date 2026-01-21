import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Query,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
    CreateSubscriptionDto,
    UpgradeDowngradeDto,
    CancelSubscriptionDto,
    SubscriptionQueryDto,
    CreatePlanDto,
    UpdatePlanDto,
} from './dto';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { UserRole } from '@prisma/client';
import { User } from '../users/entities/user.entity';
import { StoreRepository } from '../store/repositories/store.repository';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
    constructor(
        private readonly subscriptionsService: SubscriptionsService,
        private readonly storeRepository: StoreRepository,
    ) { }

    /**
     * Get available plans (Public - skip auth and subscription checks)
     */
    @Get('plans')
    async getPlans(@CurrentUser() user: User) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id }, { subscription: { select: { planId: true } } });
        const plans = await this.subscriptionsService.getAvailablePlans();
        if (store) {
            plans.forEach((plan: any) => {
                if (plan.id === (store as any).subscription.planId) {
                    plan.isSubscribed = true;
                } else {
                    plan.isSubscribed = false;
                }
            });
        }
        return BaseResponseDto.success(plans, 'Plans retrieved successfully');
    }

    /**
     * Get my subscription
     */
    @Get('my-subscription')
    async getMySubscription(@CurrentUser() user: User) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id });
        if (!store) {
            return BaseResponseDto.success(null, 'No store found');
        }

        const subscription = await this.subscriptionsService.getStoreSubscription(store.id);
        return BaseResponseDto.success(subscription, 'Subscription retrieved successfully');
    }

    /**
     * Subscribe to a plan (starts trial)
     */
    @Post('subscribe/:planId')
    async subscribe(
        @CurrentUser() user: User,
        @Param('planId') planId: string,
        @Body() dto: CreateSubscriptionDto,
    ) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id });
        if (!store) {
            return BaseResponseDto.error('No store found. Please create a store first.');
        }

        dto.planId = planId; // Use param value
        const subscription = await this.subscriptionsService.subscribe(store.id, user.id, dto);
        return BaseResponseDto.success(subscription, 'Trial started successfully');
    }

    /**
     * Upgrade plan
     */
    @Post('upgrade/:planId')
    async upgrade(
        @CurrentUser() user: User,
        @Param('planId') planId: string,
        @Body() dto: UpgradeDowngradeDto,
    ) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id });
        if (!store) {
            return BaseResponseDto.error('No store found');
        }

        dto.newPlanId = planId;
        const subscription = await this.subscriptionsService.upgradePlan(store.id, user.id, dto);
        return BaseResponseDto.success(subscription, 'Plan upgraded successfully');
    }

    /**
     * Downgrade plan
     */
    @Post('downgrade/:planId')
    async downgrade(
        @CurrentUser() user: User,
        @Param('planId') planId: string,
        @Body() dto: UpgradeDowngradeDto,
    ) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id });
        if (!store) {
            return BaseResponseDto.error('No store found');
        }

        dto.newPlanId = planId;
        const subscription = await this.subscriptionsService.downgradePlan(store.id, user.id, dto);
        return BaseResponseDto.success(subscription, 'Plan downgrade scheduled successfully');
    }

    /**
     * Cancel subscription
     */
    @Post('cancel')
    async cancel(@CurrentUser() user: User, @Body() dto: CancelSubscriptionDto) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id });
        if (!store) {
            return BaseResponseDto.error('No store found');
        }

        const subscription = await this.subscriptionsService.cancelSubscription(store.id, user.id, dto);
        return BaseResponseDto.success(subscription, 'Subscription cancelled successfully');
    }

    /**
     * Reactivate subscription
     */
    @Post('reactivate')
    async reactivate(@CurrentUser() user: User) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: user.id });
        if (!store) {
            return BaseResponseDto.error('No store found');
        }

        const subscription = await this.subscriptionsService.reactivateSubscription(store.id, user.id);
        return BaseResponseDto.success(subscription, 'Subscription reactivated successfully');
    }

    /**
     * Admin: Get all subscriptions
     */
    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllSubscriptions(@Query() query: SubscriptionQueryDto) {
        // Implementation would use subscriptionRepository with pagination
        return BaseResponseDto.success([], 'Subscriptions retrieved successfully');
    }

    /**
     * Admin: Get subscription by ID
     */
    @Get('admin/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getSubscriptionById(@Param('id') id: string) {
        // Implementation would get subscription details
        return BaseResponseDto.success(null, 'Subscription retrieved successfully');
    }

    /**
     * Admin: Suspend subscription
     */
    @Post('admin/:id/suspend')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async suspendSubscription(@Param('id') id: string) {
        await this.subscriptionsService.suspendSubscription(id);
        return BaseResponseDto.success(null, 'Subscription suspended successfully');
    }

    /**
     * Admin: Get all plans (including inactive)
     */
    @Get('admin/plans')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllPlans() {
        const plans = await this.subscriptionsService.getAllPlans();
        return BaseResponseDto.success(plans, 'Plans retrieved successfully');
    }

    /**
     * Admin: Create a new plan
     */
    @Post('admin/plans')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async createPlan(@Body() dto: CreatePlanDto) {
        const plan = await this.subscriptionsService.createPlan(dto as any);
        return BaseResponseDto.success(plan, 'Plan created successfully');
    }

    /**
     * Admin: Update a plan
     */
    @Put('admin/plans/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
        const plan = await this.subscriptionsService.updatePlan(id, dto as any);
        return BaseResponseDto.success(plan, 'Plan updated successfully');
    }

    /**
     * Admin: Delete a plan
     */
    @Delete('admin/plans/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async deletePlan(@Param('id') id: string) {
        await this.subscriptionsService.deletePlan(id);
        return BaseResponseDto.success(null, 'Plan deleted successfully');
    }
}
