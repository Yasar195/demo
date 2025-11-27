import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    HttpException,
    Logger,
} from '@nestjs/common';
import { StoreRequestRepository, StoreRepository } from './repositories';
import { StoreRequest, Store } from './entities';
import { CreateStoreRequestDto, UpdateStoreRequestDto, ApproveStoreRequestDto, RejectStoreRequestDto, QueryStoreRequestDto } from './dto';
import { StoreRequestStatus, UserRole } from '@prisma/client';
import { UsersRepository } from '../users/repositories';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from 'src/common/dto';

@Injectable()
export class StoreService {
    private readonly logger = new Logger(StoreService.name);

    constructor(
        private readonly storeRequestRepository: StoreRequestRepository,
        private readonly storeRepository: StoreRepository,
        private readonly userRepository: UsersRepository,
        private readonly notificationService: NotificationsService
    ) { }

    /**
     * Create a new store request
     */
    async createStoreRequest(userId: string, dto: CreateStoreRequestDto): Promise<StoreRequest> {
        try {
            // Check if user already has a store
            const hasStore = await this.storeRepository.hasStore(userId);
            if (hasStore) {
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

            return await this.storeRequestRepository.create({
                userId,
                ...dto,
                status: StoreRequestStatus.PENDING,
            } as Partial<StoreRequest>);
        } catch (error) {
            this.handleError('createStoreRequest', error);
        }
    }

    /**
     * Get user's own store requests
     */
    async getUserStoreRequests(userId: string, pagination: PaginationDto): Promise<{ data: StoreRequest[]; total: number; page: number; totalPages: number }> {
        try {
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
            return await this.storeRequestRepository.findWithPagination(page, limit, { userId }, orderBy);
        } catch (error) {
            this.handleError('getUserStoreRequests', error);
        }
    }

    /**
     * Get a specific store request by ID
     */
    async getStoreRequestById(id: string, userId?: string, isAdmin = false): Promise<StoreRequest> {
        try {
            const request = await this.storeRequestRepository.findById(id);
            if (!request) {
                throw new NotFoundException('Store request not found');
            }

            // If not admin, check if the request belongs to the user
            if (!isAdmin && userId && request.userId !== userId) {
                throw new ForbiddenException('You do not have permission to view this store request');
            }

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

            return await this.storeRequestRepository.findWithFilters(page, limit, filters, orderBy);
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
            const hasStore = await this.storeRepository.hasStore(request.userId);
            if (hasStore) {
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
            return await this.storeRepository.findByOwnerId(userId);
        } catch (error) {
            this.handleError('getUserStore', error);
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
