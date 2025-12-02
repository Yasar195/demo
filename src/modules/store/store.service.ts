import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    HttpException,
    Logger,
} from '@nestjs/common';
import { RedisService } from '../../integrations/redis/redis.service';
import { StoreRequestRepository, StoreRepository } from './repositories';
import { StoreRequest, Store } from './entities';
import { CreateStoreRequestDto, UpdateStoreRequestDto, ApproveStoreRequestDto, RejectStoreRequestDto, QueryStoreRequestDto, VendorDashboardStatsDto, VoucherStatsDto, RevenueStatsDto, StoreInfoDto } from './dto';
import { StoreRequestStatus, UserRole, PaymentStatus } from '@prisma/client';
import { UsersRepository } from '../users/repositories';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from 'src/common/dto';
import { PrismaService } from '../../database/prisma.service';
import { PaymentsRepository } from '../payments/repositories/payments.repository';
import { VouchersRepository } from '../vouchers/repositories/vouchers.repository';
import { VoucherRequestRepository } from '../vouchers/repositories/voucher-request.repository';

@Injectable()
export class StoreService {
    private readonly logger = new Logger(StoreService.name);

    constructor(
        private readonly storeRequestRepository: StoreRequestRepository,
        private readonly storeRepository: StoreRepository,
        private readonly userRepository: UsersRepository,
        private readonly notificationService: NotificationsService,
        private readonly prisma: PrismaService,
        private readonly paymentsRepository: PaymentsRepository,
        private readonly vouchersRepository: VouchersRepository,
        private readonly voucherRequestRepository: VoucherRequestRepository,
        private readonly redisService: RedisService,
    ) { }

    /**
     * Create a new store request
     */
    async createStoreRequest(userId: string, dto: CreateStoreRequestDto): Promise<StoreRequest> {
        try {
            // Check if user already has a store
            const existingStore = await this.storeRepository.findOneByCondition({ ownerId: userId });
            if (existingStore) {
                throw new BadRequestException('You already have a store');
            }

            // Check if user has a pending request
            const hasPending = await this.storeRequestRepository.hasPendingRequest(userId);
            if (hasPending) {
                throw new BadRequestException('You already have a pending store request');
            }

            // Check if user has an approved request
            const hasApproved = await this.storeRequestRepository.hasApprovedStore(userId);
            if (hasApproved) {
                throw new BadRequestException('Your store request has been approved. A store should exist for your account.');
            }

            const user = await this.userRepository.findById(userId);

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const admins = await this.userRepository.findByCondition({ role: UserRole.ADMIN });

            await this.notificationService.createNotification({
                title: 'New Store Request',
                message: `User ${user.name} has requested a new store`,
                userIds: admins.map((admin) => admin.id),
            });

            const request = await this.storeRequestRepository.create({
                userId,
                ...dto,
                status: StoreRequestStatus.PENDING,
            } as Partial<StoreRequest>);

            // Invalidate user store requests and all store requests (admin view)
            await Promise.all([
                this.redisService.reset(`store_requests:user:${userId}:*`),
                this.redisService.reset('store_requests:all:*'),
            ]);

            return request;
        } catch (error) {
            this.handleError('createStoreRequest', error);
        }
    }

    /**
     * Get user's own store requests
     */
    async getUserStoreRequests(userId: string, pagination: PaginationDto): Promise<{ data: StoreRequest[]; total: number; page: number; totalPages: number }> {
        try {
            const cacheKey = `store_requests:user:${userId}:${JSON.stringify(pagination || {})}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sortBy;
            const sortOrder: 'asc' | 'desc' = pagination?.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

            const allowedSortFields = ['createdAt', 'updatedAt'] as const;
            type SortField = typeof allowedSortFields[number];

            const resolvedSortBy: SortField = allowedSortFields.includes(sortBy as SortField)
                ? sortBy as SortField
                : 'createdAt';

            const orderBy: Record<string, 'asc' | 'desc'> = {
                [resolvedSortBy]: sortBy ? sortOrder : 'desc',
            };
            const result = await this.storeRequestRepository.findWithPagination(page, limit, { userId }, orderBy);

            await this.redisService.set(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour

            return result;
        } catch (error) {
            this.handleError('getUserStoreRequests', error);
        }
    }

    /**
     * Get a specific store request by ID
     */
    async getStoreRequestById(id: string, userId?: string, isAdmin = false): Promise<StoreRequest> {
        try {
            const cacheKey = `store_requests:${id}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                const request = JSON.parse(cachedData);
                // If not admin, check if the request belongs to the user
                if (!isAdmin && userId && request.userId !== userId) {
                    throw new ForbiddenException('You do not have permission to view this store request');
                }
                return request;
            }

            const request = await this.storeRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Store request not found');
            }

            // If not admin, check if the request belongs to the user
            if (!isAdmin && userId && request.userId !== userId) {
                throw new ForbiddenException('You do not have permission to view this store request');
            }

            await this.redisService.set(cacheKey, JSON.stringify(request), 3600); // Cache for 1 hour

            return request;
        } catch (error) {
            this.handleError('getStoreRequestById', error);
        }
    }

    /**
     * Update a store request (only allowed for PENDING requests by the owner)
     */
    async updateStoreRequest(id: string, userId: string, dto: UpdateStoreRequestDto): Promise<StoreRequest> {
        try {
            const request = await this.storeRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Store request not found');
            }

            // Check ownership
            if (request.userId !== userId) {
                throw new ForbiddenException('You do not have permission to update this store request');
            }

            // Check if request is in PENDING status
            if (request.status !== StoreRequestStatus.PENDING) {
                throw new BadRequestException('You can only update pending store requests');
            }

            const updated = await this.storeRequestRepository.update(id, dto as Partial<StoreRequest>);
            if (!updated) {
                throw new NotFoundException('Failed to update store request');
            }

            const user = await this.userRepository.findById(userId);

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const admins = await this.userRepository.findByCondition({ role: UserRole.ADMIN });

            await this.notificationService.createNotification({
                title: 'Store Request Updated',
                message: `User ${user.name} has updated their store request`,
                userIds: admins.map((admin) => admin.id),
            });

            // Invalidate specific request cache, user requests, and all requests
            await Promise.all([
                this.redisService.del(`store_requests:${id}`),
                this.redisService.reset(`store_requests:user:${userId}:*`),
                this.redisService.reset('store_requests:all:*'),
            ]);

            return updated;
        } catch (error) {
            this.handleError('updateStoreRequest', error);
        }
    }

    /**
     * Cancel a store request (only allowed for PENDING requests by the owner)
     */
    async cancelStoreRequest(id: string, userId: string): Promise<boolean> {
        try {
            const request = await this.storeRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Store request not found');
            }

            // Check ownership
            if (request.userId !== userId) {
                throw new ForbiddenException('You do not have permission to cancel this store request');
            }

            // Check if request is in PENDING status
            if (request.status !== StoreRequestStatus.PENDING) {
                throw new BadRequestException('You can only cancel pending store requests');
            }

            await this.storeRequestRepository.update(id, {
                status: StoreRequestStatus.CANCELLED,
            } as Partial<StoreRequest>);

            // Invalidate specific request cache, user requests, and all requests
            await Promise.all([
                this.redisService.del(`store_requests:${id}`),
                this.redisService.reset(`store_requests:user:${userId}:*`),
                this.redisService.reset('store_requests:all:*'),
            ]);

            return true;
        } catch (error) {
            this.handleError('cancelStoreRequest', error);
        }
    }

    /**
     * Get all store requests with filters (Admin only)
     */
    async getAllStoreRequests(query: QueryStoreRequestDto): Promise<{
        data: StoreRequest[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        try {
            const cacheKey = `store_requests:all:${JSON.stringify(query)}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const page = query.page ?? 1;
            const limit = query.limit ?? 10;
            const sortBy = query.sortBy ?? 'createdAt';
            const sortOrder: 'asc' | 'desc' = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

            const filters = {
                status: query.status,
                userId: query.userId,
                searchTerm: query.searchTerm,
            };

            const orderBy = {
                [sortBy]: sortOrder,
            };

            const result = await this.storeRequestRepository.findWithFilters(page, limit, filters, orderBy);

            await this.redisService.set(cacheKey, JSON.stringify(result), 300); // Cache for 5 minutes

            return result;
        } catch (error) {
            this.handleError('getAllStoreRequests', error);
        }
    }

    /**
     * Approve a store request and create the store (Admin only)
     */
    async approveStoreRequest(id: string, adminId: string, dto: ApproveStoreRequestDto): Promise<Store> {
        try {
            const request = await this.storeRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Store request not found');
            }

            // Check if request is in PENDING status
            if (request.status !== StoreRequestStatus.PENDING) {
                throw new BadRequestException('Only pending store requests can be approved');
            }

            // Check if user already has a store
            const existingStore = await this.storeRepository.findOneByCondition({ ownerId: request.userId });
            if (existingStore) {
                throw new BadRequestException('User already has a store');
            }

            // Update request status
            await this.storeRequestRepository.update(id, {
                status: StoreRequestStatus.APPROVED,
                reviewedById: adminId,
                reviewedAt: new Date(),
                adminComments: dto.adminComments,
            } as Partial<StoreRequest>);

            // Create the store
            const store = await this.storeRepository.create({
                ownerId: request.userId,
                requestId: id,
                name: request.storeName,
                description: request.storeDescription,
                logo: request.storeLogo,
                website: request.storeWebsite,
                email: request.storeEmail,
                phone: request.storePhone,
            } as Partial<Store>);


            const user = await this.userRepository.findById(request.userId);

            if (!user) {
                throw new NotFoundException('User not found');
            }

            await this.notificationService.createNotification({
                title: 'New Store Request Approved',
                message: `Greetings ${user.name}!\n Your store request has been approved. You can now access your store.`,
                userIds: [user.id],
            });

            this.logger.log(`Store created successfully for request ${id} by admin ${adminId}`);

            // Invalidate specific request cache, user requests, all requests, and user store cache
            await Promise.all([
                this.redisService.del(`store_requests:${id}`),
                this.redisService.reset(`store_requests:user:${request.userId}:*`),
                this.redisService.reset('store_requests:all:*'),
                this.redisService.del(`stores:user:${request.userId}`),
            ]);

            return store;
        } catch (error) {
            this.handleError('approveStoreRequest', error);
        }
    }

    /**
     * Reject a store request (Admin only)
     */
    async rejectStoreRequest(id: string, adminId: string, dto: RejectStoreRequestDto): Promise<StoreRequest> {
        try {
            const request = await this.storeRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Store request not found');
            }

            // Check if request is in PENDING status
            if (request.status !== StoreRequestStatus.PENDING) {
                throw new BadRequestException('Only pending store requests can be rejected');
            }

            const updated = await this.storeRequestRepository.update(id, {
                status: StoreRequestStatus.REJECTED,
                reviewedById: adminId,
                reviewedAt: new Date(),
                adminComments: dto.adminComments,
            } as Partial<StoreRequest>);

            if (!updated) {
                throw new NotFoundException('Failed to update store request');
            }

            const user = await this.userRepository.findById(request.userId);

            if (!user) {
                throw new NotFoundException('User not found');
            }

            await this.notificationService.createNotification({
                title: 'New Store Request Rejected',
                message: `Hello ${user.name},\n We regret to inform you that your store request has been rejected. For more details, please check your store request page.`,
                userIds: [user.id],
            });

            this.logger.log(`Store request ${id} rejected by admin ${adminId}`);

            // Invalidate specific request cache, user requests, and all requests
            await Promise.all([
                this.redisService.del(`store_requests:${id}`),
                this.redisService.reset(`store_requests:user:${request.userId}:*`),
                this.redisService.reset('store_requests:all:*'),
            ]);

            return updated;
        } catch (error) {
            this.handleError('rejectStoreRequest', error);
        }
    }

    /**
     * Get user's store (if exists)
     */
    async getUserStore(userId: string): Promise<Store | null> {
        try {
            const cacheKey = `stores:user:${userId}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const store = await this.storeRepository.findOneByCondition({ ownerId: userId });

            if (store) {
                await this.redisService.set(cacheKey, JSON.stringify(store), 3600); // Cache for 1 hour
            }

            return store;
        } catch (error) {
            this.handleError('getUserStore', error);
        }
    }

    /**
     * Get vendor dashboard statistics
     */
    async getVendorDashboardStats(userId: string): Promise<VendorDashboardStatsDto> {
        try {
            const cacheKey = `stores:dashboard:${userId}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }

            // Get store
            const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
            if (!store) {
                throw new NotFoundException('You do not have a store yet');
            }

            // Fetch all stats in parallel
            const [storeInfo, voucherStats, revenueStats, pendingVoucherRequests] = await Promise.all([
                this.getStoreInfo(store.id),
                this.getVoucherStats(store.id),
                this.getRevenueStats(store.id),
                this.getPendingVoucherRequests(store.id),
            ]);

            const result = {
                store: storeInfo,
                voucherStats,
                revenueStats,
                pendingVoucherRequests,
            };

            await this.redisService.set(cacheKey, JSON.stringify(result), 300); // Cache for 5 minutes

            return result;
        } catch (error) {
            this.handleError('getVendorDashboardStats', error);
        }
    }

    /**
     * Get store information
     */
    private async getStoreInfo(storeId: string): Promise<StoreInfoDto> {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            include: {
                locations: {
                    where: { deletedAt: null },
                },
            },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        const activeLocations = store.locations.filter((loc) => loc.isActive).length;

        return {
            storeId: store.id,
            storeName: store.name,
            storeDescription: store.description,
            storeLogo: store.logo,
            totalLocations: store.locations.length,
            activeLocations,
        };
    }

    /**
     * Get voucher statistics for a store
     */
    private async getVoucherStats(storeId: string): Promise<VoucherStatsDto> {
        const [totalVouchers, activeVouchers, expiredVouchers, vouchersSold, totalQuantityAvailable] =
            await Promise.all([
                this.vouchersRepository.countByStoreId(storeId),
                this.vouchersRepository.countActiveByStoreId(storeId),
                this.vouchersRepository.countExpiredByStoreId(storeId),
                this.paymentsRepository.countVouchersSoldByStore(storeId),
                this.vouchersRepository.sumAvailableQuantityByStoreId(storeId),
            ]);

        return {
            totalVouchers,
            activeVouchers,
            expiredVouchers,
            vouchersSold,
            totalQuantityAvailable,
        };
    }

    /**
     * Get revenue statistics for a store
     */
    private async getRevenueStats(storeId: string): Promise<RevenueStatsDto> {
        const [completedRevenue, pendingRevenue] = await Promise.all([
            this.paymentsRepository.getRevenueByStore(storeId, PaymentStatus.COMPLETED),
            this.paymentsRepository.getRevenueByStore(storeId, PaymentStatus.PENDING),
        ]);

        return {
            totalRevenue: completedRevenue,
            completedRevenue,
            pendingRevenue,
            currency: 'INR',
        };
    }

    /**
     * Get count of pending voucher requests
     */
    private async getPendingVoucherRequests(storeId: string): Promise<number> {
        return this.voucherRequestRepository.countPendingByStoreId(storeId);
    }

    /**
     * Get trending stores with pagination
     * Sorted by total revenue and sales volume
     */
    async getTrendingStores(pagination: PaginationDto): Promise<{
        data: any[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;

            const orderBy = {
                vouchers: {
                    _count: 'desc' as const,
                },
            };

            const include = {
                owner: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        vouchers: {
                            where: {
                                deletedAt: null,
                                isActive: true,
                            },
                        },
                    },
                },
            };

            const cacheKey = `stores:trending:${JSON.stringify(pagination || {})}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const result = await this.storeRepository.findWithPagination(page, limit, {}, orderBy, include);

            await this.redisService.set(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour

            return result;

        } catch (error) {
            this.handleError('getTrendingStores', error);
        }
    }

    private handleError(context: string, error: unknown): never {
        this.logger.error(`StoreService.${context} failed`, error as Error);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException('Internal server error');
    }
}
