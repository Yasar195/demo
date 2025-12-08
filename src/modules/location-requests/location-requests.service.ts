import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { LocationRequestRepository } from './repositories';
import { CreateLocationRequestDto, QueryLocationRequestDto, ApproveLocationRequestDto, RejectLocationRequestDto } from './dto';
import { LocationRequest, LocationRequestStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StoreRepository } from '../store/repositories';

@Injectable()
export class LocationRequestsService {
    constructor(
        private readonly locationRequestRepository: LocationRequestRepository,
        private readonly storeRepository: StoreRepository,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Create a location request for expansion (vendor creates this)
     */
    async createLocationRequest(userId: string, dto: CreateLocationRequestDto): Promise<LocationRequest> {
        // Get vendor's store
        const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
        if (!store) {
            throw new BadRequestException('You must have a store before requesting new locations');
        }

        // Create location request
        const locationRequest = await this.locationRequestRepository.create({
            userId,
            storeId: store.id,
            ...dto,
            status: LocationRequestStatus.PENDING,
        });

        return locationRequest;
    }

    /**
     * Get user's own location requests
     */
    async getUserLocationRequests(userId: string, query: QueryLocationRequestDto): Promise<{
        data: LocationRequest[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        return this.locationRequestRepository.findByUserId(userId, page, limit);
    }

    /**
     * Get a specific location request
     */
    async getLocationRequestById(id: string, userId?: string, isAdmin: boolean = false): Promise<LocationRequest> {
        const request = await this.locationRequestRepository.findById(id);

        if (!request) {
            throw new NotFoundException('Location request not found');
        }

        // Check permissions
        if (!isAdmin && request.userId !== userId) {
            throw new ForbiddenException('You do not have permission to view this request');
        }

        return request;
    }

    /**
     * Update pending location request (vendor can update their own)
     */
    async updateLocationRequest(
        id: string,
        userId: string,
        dto: Partial<CreateLocationRequestDto>,
    ): Promise<LocationRequest> {
        const request = await this.locationRequestRepository.findById(id);

        if (!request) {
            throw new NotFoundException('Location request not found');
        }

        if (request.userId !== userId) {
            throw new ForbiddenException('You can only update your own requests');
        }

        if (request.status !== LocationRequestStatus.PENDING) {
            throw new BadRequestException('Can only update pending requests');
        }

        return this.locationRequestRepository.update(id, dto);
    }

    /**
     * Cancel location request (soft delete)
     */
    async cancelLocationRequest(id: string, userId: string): Promise<LocationRequest> {
        const request = await this.locationRequestRepository.findById(id);

        if (!request) {
            throw new NotFoundException('Location request not found');
        }

        if (request.userId !== userId) {
            throw new ForbiddenException('You can only cancel your own requests');
        }

        if (request.status !== LocationRequestStatus.PENDING) {
            throw new BadRequestException('Can only cancel pending requests');
        }

        return this.locationRequestRepository.update(id, {
            status: LocationRequestStatus.CANCELLED,
        });
    }

    /**
     * Get all location requests (Admin only)
     */
    async getAllLocationRequests(query: QueryLocationRequestDto): Promise<{
        data: LocationRequest[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        return this.locationRequestRepository.findWithFilters(page, limit, {
            status: query.status,
            storeId: query.storeId,
            city: query.city,
        });
    }

    /**
     * Approve location request and create actual location (Admin only)
     */
    async approveLocationRequest(
        id: string,
        adminId: string,
        dto: ApproveLocationRequestDto,
    ): Promise<LocationRequest> {
        const request = await this.locationRequestRepository.findById(id);

        if (!request) {
            throw new NotFoundException('Location request not found');
        }

        if (request.status !== LocationRequestStatus.PENDING) {
            throw new BadRequestException('Can only approve pending requests');
        }

        if (!request.storeId) {
            throw new BadRequestException('Location request must have a store');
        }

        // Update request status
        await this.locationRequestRepository.update(id, {
            status: LocationRequestStatus.APPROVED,
            reviewedById: adminId,
            reviewedAt: new Date(),
            adminComments: dto.adminComments,
        });

        // Create the actual location
        await this.prisma.storeLocation.create({
            data: {
                storeId: request.storeId,
                requestId: id,
                branchName: request.branchName || 'New Branch',
                isMainBranch: request.isMainBranch,
                latitude: request.latitude,
                longitude: request.longitude,
                address: request.address,
                city: request.city,
                state: request.state,
                country: request.country,
                postalCode: request.postalCode,
                phone: request.phone,
                email: request.email,
                operatingHours: request.operatingHours as any,
                image: request.image,
                isActive: true,
            },
        });

        const updatedRequest = await this.locationRequestRepository.findById(id);
        if (!updatedRequest) {
            throw new NotFoundException('Failed to retrieve updated location request');
        }

        return updatedRequest;
    }

    /**
     * Reject location request (Admin only)
     */
    async rejectLocationRequest(
        id: string,
        adminId: string,
        dto: RejectLocationRequestDto,
    ): Promise<LocationRequest> {
        const request = await this.locationRequestRepository.findById(id);

        if (!request) {
            throw new NotFoundException('Location request not found');
        }

        if (request.status !== LocationRequestStatus.PENDING) {
            throw new BadRequestException('Can only reject pending requests');
        }

        return this.locationRequestRepository.update(id, {
            status: LocationRequestStatus.REJECTED,
            reviewedById: adminId,
            reviewedAt: new Date(),
            adminComments: dto.adminComments,
        });
    }
}
