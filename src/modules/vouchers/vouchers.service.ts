import { Injectable, NotFoundException, HttpException, InternalServerErrorException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { BaseService } from '../../core/abstracts/base.service';
import { VouchersRepository } from './repositories/vouchers.repository';
import { VoucherRequestRepository } from './repositories/voucher-request.repository';
import { Voucher } from './entities/voucher.entity';
import { VoucherRequest } from './entities/voucher-request.entity';
import { CreateVoucherDto, UpdateVoucherDto, CreateVoucherRequestDto, UpdateVoucherRequestDto, QueryVoucherRequestDto, ApproveVoucherRequestDto, RejectVoucherRequestDto, QueryVoucherDto, VoucherOrderBy } from './dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole, VoucherRequestStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersRepository } from '../users/repositories';
import { StoreRepository } from '../store/repositories';
import { SseService } from '../sse/sse.service';
import { RedisService } from '../../integrations/redis/redis.service';

@Injectable()
export class VouchersService extends BaseService<Voucher> {
    private readonly logger = new Logger(VouchersService.name);

    constructor(
        private readonly vouchersRepository: VouchersRepository,
        private readonly voucherRequestRepository: VoucherRequestRepository,
        private readonly storeRepository: StoreRepository,
        private readonly usersRepository: UsersRepository,
        private readonly notificationsService: NotificationsService,
        private readonly sseService: SseService,
        private readonly redisService: RedisService,
    ) {
        super(vouchersRepository);
    }

    /**
     * Find all vouchers with pagination and sorting
     */
    async findAllPaginated(query?: QueryVoucherDto): Promise<{ data: Voucher[]; total: number; page: number; totalPages: number }> {
        try {
            const cacheKey = `vouchers:all:${JSON.stringify(query || {})}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }
            const page = query?.page ?? 1;
            const limit = query?.limit ?? 10;
            const orderBy = query?.orderBy ?? VoucherOrderBy.NEWEST;
            const activeOnly = query?.activeOnly ?? false;
            const category = query?.category;
            const locationId = query?.locationId;

            // Build filters
            const filters: any = {};
            if (activeOnly) {
                filters.isActive = true;
                filters.expiresAt = { gt: new Date() };
            }
            if (category) {
                filters.category = category;
            }
            if (locationId) {
                filters.locationId = locationId;
            }

            // Handle ordering based on the orderBy enum
            let result;
            // Handle ordering based on the orderBy enum
            switch (orderBy) {
                case VoucherOrderBy.LOWEST_QUANTITY:
                    result = await this.vouchersRepository.findWithPagination(page, limit, filters, { quantityAvailable: 'asc' });
                    break;

                case VoucherOrderBy.EXPIRING_SOON:
                    result = await this.vouchersRepository.findWithPagination(page, limit, filters, { expiresAt: 'asc' });
                    break;

                case VoucherOrderBy.HIGHEST_DISCOUNT:
                    result = await this.vouchersRepository.findWithPagination(page, limit, filters, { discount: 'desc' });
                    break;

                case VoucherOrderBy.LOWEST_PRICE:
                    result = await this.vouchersRepository.findWithPagination(page, limit, filters, { sellingPrice: 'asc' });
                    break;

                case VoucherOrderBy.OLDEST:
                    result = await this.vouchersRepository.findWithPagination(page, limit, filters, { createdAt: 'asc' });
                    break;

                case VoucherOrderBy.SELLING_FAST:
                    result = await this.vouchersRepository.findWithSellingFastOrder(page, limit, filters);
                    break;

                case VoucherOrderBy.NEWEST:
                default:
                    result = await this.vouchersRepository.findWithPagination(page, limit, filters, { createdAt: 'desc' });
                    break;
            }

            await this.redisService.set(cacheKey, JSON.stringify(result), 300); // Cache for 5 minutes

            return result;
        } catch (error) {
            this.handleError('findAllPaginated', error);
        }
    }
    /**
     * Create a new voucher
     */
    async createVoucher(dto: CreateVoucherDto): Promise<Voucher> {
        try {
            const exists = await this.vouchersRepository.codeExists(dto.code);
            if (exists) {
                throw new BadRequestException('Voucher code already exists');
            }

            const voucher = await this.vouchersRepository.create({
                ...dto,
                expiresAt: new Date(dto.expiresAt),
            } as Partial<Voucher>);

            // Invalidate all vouchers cache
            await this.redisService.reset('vouchers:all:*');

            return voucher;
        } catch (error) {
            this.handleError('createVoucher', error);
        }
    }

    /**
     * Update voucher
     */
    async updateVoucher(id: string, dto: UpdateVoucherDto): Promise<Voucher> {
        try {
            const voucher = await this.vouchersRepository.findById(id);
            if (!voucher) {
                throw new NotFoundException('Voucher not found');
            }

            if (dto.code && dto.code !== voucher.code) {
                const codeTaken = await this.vouchersRepository.codeExists(dto.code);
                if (codeTaken) {
                    throw new BadRequestException('Voucher code already exists');
                }
            }

            const updateData: Partial<Voucher> = { ...dto } as Partial<Voucher>;
            if (dto.expiresAt) {
                updateData.expiresAt = new Date(dto.expiresAt);
            }

            const updated = await this.vouchersRepository.update(id, updateData);
            if (!updated) {
                throw new NotFoundException('Voucher not found');
            }

            return updated;
        } catch (error) {
            this.handleError('updateVoucher', error);
        }
    }

    /**
     * Delete voucher (soft delete)
     */
    async deleteVoucher(id: string): Promise<boolean> {
        try {
            const voucher = await this.vouchersRepository.findById(id);
            if (!voucher) {
                throw new NotFoundException('Voucher not found');
            }

            const deleted = await this.vouchersRepository.softDelete(id);

            if (deleted) {
                // Invalidate all vouchers cache and specific voucher code cache
                await Promise.all([
                    this.redisService.reset('vouchers:all:*'),
                    this.redisService.del(`vouchers:code:${voucher.code}`),
                ]);
            }

            return deleted;
        } catch (error) {
            this.handleError('deleteVoucher', error);
        }
    }

    /**
     * Find voucher by code
     */
    async findByCode(code: string): Promise<Voucher | null> {
        try {
            const cacheKey = `vouchers:code:${code}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const voucher = await this.vouchersRepository.findByCode(code);

            if (voucher) {
                await this.redisService.set(cacheKey, JSON.stringify(voucher), 3600); // Cache for 1 hour
            }

            return voucher;
        } catch (error) {
            this.handleError('findByCode', error);
        }
    }

    // ==================== Voucher Request Methods ====================

    /**
     * Create a new voucher request (Store owner only)
     */
    async createVoucherRequest(userId: string, dto: CreateVoucherRequestDto): Promise<VoucherRequest> {
        try {
            // Check if user has a store
            const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
            if (!store) {
                throw new BadRequestException('You must have an approved store to create voucher requests');
            }

            // Check if voucher code already exists
            const codeExists = await this.vouchersRepository.codeExists(dto.voucherCode);
            if (codeExists) {
                throw new BadRequestException('Voucher code already exists');
            }

            const user = await this.usersRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Get all admins for notification
            const admins = await this.usersRepository.findByCondition({ role: UserRole.ADMIN });

            // Send notification to admins
            await this.notificationsService.createNotification({
                title: 'New Voucher Request',
                message: `Store "${store.name}" has requested a new voucher: ${dto.voucherName}`,
                userIds: admins.map((admin) => admin.id),
            });

            const request = await this.voucherRequestRepository.create({
                storeId: store.id,
                ...dto,
                expiresAt: new Date(dto.expiresAt),
                status: VoucherRequestStatus.PENDING,
            } as Partial<VoucherRequest>);

            // Invalidate user voucher requests and all voucher requests
            await Promise.all([
                this.redisService.reset(`voucher_requests:user:${userId}:*`),
                this.redisService.reset('voucher_requests:all:*'),
            ]);

            return request;
        } catch (error) {
            this.handleError('createVoucherRequest', error);
        }
    }

    /**
     * Get user's voucher requests (Store owner)
     */
    async getUserVoucherRequests(userId: string, pagination: PaginationDto): Promise<{ data: VoucherRequest[]; total: number; page: number; totalPages: number }> {
        try {
            // Check if user has a store
            const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
            if (!store) {
                throw new BadRequestException('You must have an approved store to view voucher requests');
            }

            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sortBy ?? 'createdAt';
            const sortOrder: 'asc' | 'desc' = pagination?.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

            const orderBy: Record<string, 'asc' | 'desc'> = {
                [sortBy]: sortOrder,
            };

            const cacheKey = `voucher_requests:user:${userId}:${JSON.stringify(pagination || {})}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const result = await this.voucherRequestRepository.findWithPagination(page, limit, { storeId: store.id }, orderBy);

            await this.redisService.set(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour

            return result;
        } catch (error) {
            this.handleError('getUserVoucherRequests', error);
        }
    }

    /**
     * Get a specific voucher request by ID
     */
    async getVoucherRequestById(id: string, userId?: string, isAdmin = false): Promise<VoucherRequest> {
        try {
            const cacheKey = `voucher_requests:${id}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                const request = JSON.parse(cachedData);
                // If not admin, check if the request belongs to the user's store
                if (!isAdmin && userId) {
                    const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
                    if (!store || request.storeId !== store.id) {
                        throw new ForbiddenException('You do not have permission to view this voucher request');
                    }
                }
                return request;
            }

            const request = await this.voucherRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Voucher request not found');
            }

            // If not admin, check if the request belongs to the user's store
            if (!isAdmin && userId) {
                const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
                if (!store || request.storeId !== store.id) {
                    throw new ForbiddenException('You do not have permission to view this voucher request');
                }
            }

            await this.redisService.set(cacheKey, JSON.stringify(request), 3600); // Cache for 1 hour

            return request;
        } catch (error) {
            this.handleError('getVoucherRequestById', error);
        }
    }

    /**
     * Update a voucher request (only allowed for PENDING requests by the store owner)
     */
    async updateVoucherRequest(id: string, userId: string, dto: UpdateVoucherRequestDto): Promise<VoucherRequest> {
        try {
            const request = await this.voucherRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Voucher request not found');
            }

            // Check store ownership
            const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
            if (!store || request.storeId !== store.id) {
                throw new ForbiddenException('You do not have permission to update this voucher request');
            }

            // Check if request is in PENDING status
            if (request.status !== VoucherRequestStatus.PENDING) {
                throw new BadRequestException('You can only update pending voucher requests');
            }

            // Check if new voucher code is unique
            if (dto.voucherCode && dto.voucherCode !== request.voucherCode) {
                const codeExists = await this.vouchersRepository.codeExists(dto.voucherCode);
                if (codeExists) {
                    throw new BadRequestException('Voucher code already exists');
                }
            }

            const updateData: Partial<VoucherRequest> = { ...dto } as Partial<VoucherRequest>;
            if (dto.expiresAt) {
                updateData.expiresAt = new Date(dto.expiresAt);
            }

            const updated = await this.voucherRequestRepository.update(id, updateData);
            if (!updated) {
                throw new NotFoundException('Failed to update voucher request');
            }

            // Notify admins about update
            const admins = await this.usersRepository.findByCondition({ role: UserRole.ADMIN });
            await this.notificationsService.createNotification({
                title: 'Voucher Request Updated',
                message: `Store "${store.name}" has updated their voucher request: ${request.voucherName}`,
                userIds: admins.map((admin) => admin.id),
            });

            return updated;
        } catch (error) {
            this.handleError('updateVoucherRequest', error);
        }
    }

    /**
     * Cancel a voucher request (only allowed for PENDING requests by the store owner)
     */
    async cancelVoucherRequest(id: string, userId: string): Promise<boolean> {
        try {
            const request = await this.voucherRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Voucher request not found');
            }

            // Check store ownership
            const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
            if (!store || request.storeId !== store.id) {
                throw new ForbiddenException('You do not have permission to cancel this voucher request');
            }

            // Check if request is in PENDING status
            if (request.status !== VoucherRequestStatus.PENDING) {
                throw new BadRequestException('You can only cancel pending voucher requests');
            }

            await this.voucherRequestRepository.update(id, {
                status: VoucherRequestStatus.CANCELLED,
            } as Partial<VoucherRequest>);

            // Invalidate specific request cache, user requests, and all requests
            await Promise.all([
                this.redisService.del(`voucher_requests:${id}`),
                this.redisService.reset(`voucher_requests:user:${userId}:*`),
                this.redisService.reset('voucher_requests:all:*'),
            ]);

            return true;
        } catch (error) {
            this.handleError('cancelVoucherRequest', error);
        }
    }

    /**
     * Get all voucher requests with filters (Admin only)
     */
    async getAllVoucherRequests(query: QueryVoucherRequestDto): Promise<{
        data: VoucherRequest[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        try {
            const cacheKey = `voucher_requests:all:${JSON.stringify(query)}`;
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
                storeId: query.storeId,
                searchTerm: query.searchTerm,
            };

            const orderBy = {
                [sortBy]: sortOrder,
            };

            const result = await this.voucherRequestRepository.findWithFilters(page, limit, filters, orderBy);

            await this.redisService.set(cacheKey, JSON.stringify(result), 300); // Cache for 5 minutes

            return result;
        } catch (error) {
            this.handleError('getAllVoucherRequests', error);
        }
    }

    /**
     * Approve a voucher request and create the voucher (Admin only)
     */
    async approveVoucherRequest(id: string, adminId: string, dto: ApproveVoucherRequestDto): Promise<Voucher> {
        try {
            const request = await this.voucherRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Voucher request not found');
            }

            // Check if request is in PENDING status
            if (request.status !== VoucherRequestStatus.PENDING) {
                throw new BadRequestException('Only pending voucher requests can be approved');
            }

            // Check if voucher code is still unique
            const codeExists = await this.vouchersRepository.codeExists(request.voucherCode);
            if (codeExists) {
                throw new BadRequestException('Voucher code already exists. The store must update their request.');
            }

            // Update request status
            await this.voucherRequestRepository.update(id, {
                status: VoucherRequestStatus.APPROVED,
                reviewedById: adminId,
                reviewedAt: new Date(),
                adminComments: dto.adminComments,
            } as Partial<VoucherRequest>);

            // Create the voucher
            const voucher = await this.vouchersRepository.create({
                locationId: request.storeId, // TODO: VoucherRequest needs locationId field
                requestId: id,
                code: request.voucherCode,
                name: request.voucherName,
                description: request.voucherDescription,
                faceValue: request.voucherFaceValue,
                sellingPrice: request.voucherPrice,
                discount: ((request.voucherFaceValue - request.voucherPrice) / request.voucherFaceValue) * 100,
                quantityTotal: request.quantityTotal,
                quantityAvailable: request.quantityTotal,
                expiresAt: request.expiresAt,
                redemptionRules: request.redemptionRules,
                category: request.category,
                image: request.image,
                highlightColor: request.highlightColor,
                isVerified: true,
                isActive: true,
            } as Partial<Voucher>);

            // Get store and notify owner
            const store = await this.storeRepository.findById(request.storeId);
            if (store) {
                await this.notificationsService.createNotification({
                    title: 'Voucher Request Approved',
                    message: `Great news! Your voucher request "${request.voucherName}" has been approved and is now live.`,
                    userIds: [store.ownerId],
                });

                // Send SSE event
                this.sseService.sendToUser(store.ownerId, 'voucher_request_approved', {
                    requestId: id,
                    voucherName: request.voucherName,
                    voucher: {
                        id: voucher.id,
                        code: voucher.code,
                        name: voucher.name,
                    },
                });
            }

            this.logger.log(`Voucher created successfully for request ${id} by admin ${adminId}`);

            // Invalidate specific request cache, user requests, all requests, and all vouchers
            const storeOwnerId = store ? store.ownerId : null;
            await Promise.all([
                this.redisService.del(`voucher_requests:${id}`),
                storeOwnerId ? this.redisService.reset(`voucher_requests:user:${storeOwnerId}:*`) : Promise.resolve(),
                this.redisService.reset('voucher_requests:all:*'),
                this.redisService.reset('vouchers:all:*'),
            ]);

            return voucher;
        } catch (error) {
            this.handleError('approveVoucherRequest', error);
        }
    }

    /**
     * Reject a voucher request (Admin only)
     */
    async rejectVoucherRequest(id: string, adminId: string, dto: RejectVoucherRequestDto): Promise<VoucherRequest> {
        try {
            const request = await this.voucherRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Voucher request not found');
            }

            // Check if request is in PENDING status
            if (request.status !== VoucherRequestStatus.PENDING) {
                throw new BadRequestException('Only pending voucher requests can be rejected');
            }

            const updated = await this.voucherRequestRepository.update(id, {
                status: VoucherRequestStatus.REJECTED,
                reviewedById: adminId,
                reviewedAt: new Date(),
                adminComments: dto.adminComments,
            } as Partial<VoucherRequest>);

            if (!updated) {
                throw new NotFoundException('Failed to update voucher request');
            }

            // Get store and notify owner
            const store = await this.storeRepository.findById(request.storeId);
            if (store) {
                await this.notificationsService.createNotification({
                    title: 'Voucher Request Rejected',
                    message: `We regret to inform you that your voucher request "${request.voucherName}" has been rejected. ${dto.adminComments ? 'Reason: ' + dto.adminComments : 'Please review the admin comments for details.'}`,
                    userIds: [store.ownerId],
                });

                // Send SSE event
                this.sseService.sendToUser(store.ownerId, 'voucher_request_rejected', {
                    requestId: id,
                    voucherName: request.voucherName,
                    adminComments: dto.adminComments,
                });
            }

            this.logger.log(`Voucher request ${id} rejected by admin ${adminId}`);

            // Invalidate specific request cache, user requests, and all requests
            const storeOwnerId = store ? store.ownerId : null;
            await Promise.all([
                this.redisService.del(`voucher_requests:${id}`),
                storeOwnerId ? this.redisService.reset(`voucher_requests:user:${storeOwnerId}:*`) : Promise.resolve(),
                this.redisService.reset('voucher_requests:all:*'),
            ]);

            return updated;
        } catch (error) {
            this.handleError('rejectVoucherRequest', error);
        }
    }

    private handleError(context: string, error: unknown): never {
        this.logger.error(`VouchersService.${context} failed`, error as Error);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException('Internal server error');
    }
}
