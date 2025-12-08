import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { LocationRequest, LocationRequestStatus } from '@prisma/client';

@Injectable()
export class LocationRequestRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<LocationRequest>): Promise<LocationRequest> {
        return this.prisma.locationRequest.create({
            data: data as any,
        });
    }

    async findById(id: string): Promise<LocationRequest | null> {
        return this.prisma.locationRequest.findUnique({
            where: { id, deletedAt: null },
            include: {
                store: true,
                user: true,
                reviewedBy: true,
            },
        });
    }

    async findByUserId(userId: string, page: number, limit: number): Promise<{
        data: LocationRequest[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.locationRequest.findMany({
                where: { userId, deletedAt: null },
                include: {
                    store: true,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.locationRequest.count({
                where: { userId, deletedAt: null },
            }),
        ]);

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findWithFilters(
        page: number,
        limit: number,
        filters: {
            status?: LocationRequestStatus;
            storeId?: string;
            city?: string;
        },
    ): Promise<{
        data: LocationRequest[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const where: any = { deletedAt: null };

        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.storeId) {
            where.storeId = filters.storeId;
        }
        if (filters.city) {
            where.city = { contains: filters.city, mode: 'insensitive' };
        }

        const [data, total] = await Promise.all([
            this.prisma.locationRequest.findMany({
                where,
                include: {
                    store: true,
                    user: true,
                    reviewedBy: true,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.locationRequest.count({ where }),
        ]);

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, data: Partial<LocationRequest>): Promise<LocationRequest> {
        return this.prisma.locationRequest.update({
            where: { id },
            data: data as any,
        });
    }

    async delete(id: string): Promise<LocationRequest> {
        return this.prisma.locationRequest.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
}
