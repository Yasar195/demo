import { Injectable, NotFoundException, HttpException, InternalServerErrorException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { BaseService } from '../../core/abstracts/base.service';
import { VouchersRepository } from './repositories/vouchers.repository';
import { VoucherRequestRepository } from './repositories/voucher-request.repository';
import { Voucher } from './entities/voucher.entity';
import { VoucherRequest } from './entities/voucher-request.entity';
import { CreateVoucherDto, UpdateVoucherDto, CreateVoucherRequestDto, UpdateVoucherRequestDto, QueryVoucherRequestDto, ApproveVoucherRequestDto, RejectVoucherRequestDto } from './dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole, VoucherRequestStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersRepository } from '../users/repositories';
import { StoreRepository } from '../store/repositories';

@Injectable()
export class VouchersService extends BaseService<Voucher> {
    private readonly logger = new Logger(VouchersService.name);

    constructor(
        private readonly vouchersRepository: VouchersRepository,
        private readonly voucherRequestRepository: VoucherRequestRepository,
        private readonly storeRepository: StoreRepository,
        private readonly usersRepository: UsersRepository,
        private readonly notificationsService: NotificationsService,
    ) {
        super(vouchersRepository);
    }

    /**
     * Find all vouchers with pagination and sorting
     */
    async findAllPaginated(pagination?: PaginationDto): Promise<{ data: Voucher[]; total: number; page: number; totalPages: number }> {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sortBy;
            const sortOrder: 'asc' | 'desc' = pagination?.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

            const allowedSortFields = ['createdAt', 'updatedAt', 'code', 'discount', 'expiresAt', 'isVerified'] as const;
            type SortField = typeof allowedSortFields[number];

            const resolvedSortBy: SortField = allowedSortFields.includes(sortBy as SortField)
                ? sortBy as SortField
                : 'createdAt';

            const orderBy: Record<string, 'asc' | 'desc'> = {
                [resolvedSortBy]: sortBy ? sortOrder : 'desc',
            };

            return await this.vouchersRepository.findWithPagination(page, limit, {}, orderBy);
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

            return await this.vouchersRepository.create({
                ...dto,
                expiresAt: new Date(dto.expiresAt),
            } as Partial<Voucher>);
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

            return await this.vouchersRepository.softDelete(id);
        } catch (error) {
            this.handleError('deleteVoucher', error);
        }
    }

    /**
     * Find voucher by code
     */
    async findByCode(code: string): Promise<Voucher | null> {
        try {
            return await this.vouchersRepository.findByCode(code);
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
            const store = await this.storeRepository.findByOwnerId(userId);
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

            return await this.voucherRequestRepository.create({
                storeId: store.id,
                ...dto,
                expiresAt: new Date(dto.expiresAt),
                status: VoucherRequestStatus.PENDING,
            } as Partial<VoucherRequest>);
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
            const store = await this.storeRepository.findByOwnerId(userId);
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

            return await this.voucherRequestRepository.findWithPagination(page, limit, { storeId: store.id }, orderBy);
        } catch (error) {
            this.handleError('getUserVoucherRequests', error);
        }
    }

    /**
     * Get a specific voucher request by ID
     */
    async getVoucherRequestById(id: string, userId?: string, isAdmin = false): Promise<VoucherRequest> {
        try {
            const request = await this.voucherRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Voucher request not found');
            }

            // If not admin, check if the request belongs to the user's store
            if (!isAdmin && userId) {
                const store = await this.storeRepository.findByOwnerId(userId);
                if (!store || request.storeId !== store.id) {
                    throw new ForbiddenException('You do not have permission to view this voucher request');
                }
            }

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
            const store = await this.storeRepository.findByOwnerId(userId);
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
            const store = await this.storeRepository.findByOwnerId(userId);
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

            return await this.voucherRequestRepository.findWithFilters(page, limit, filters, orderBy);
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
                storeId: request.storeId,
                requestId: id,
                code: request.voucherCode,
                name: request.voucherName,
                description: request.voucherDescription,
                value: request.voucherValue,
                price: request.voucherPrice,
                discount: ((request.voucherValue - request.voucherPrice) / request.voucherValue) * 100,
                expiresAt: request.expiresAt,
                isVerified: true,
            } as Partial<Voucher>);

            // Get store and notify owner
            const store = await this.storeRepository.findById(request.storeId);
            if (store) {
                await this.notificationsService.createNotification({
                    title: 'Voucher Request Approved',
                    message: `Great news! Your voucher request "${request.voucherName}" has been approved and is now live.`,
                    userIds: [store.ownerId],
                });
            }

            this.logger.log(`Voucher created successfully for request ${id} by admin ${adminId}`);
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
            }

            this.logger.log(`Voucher request ${id} rejected by admin ${adminId}`);
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
