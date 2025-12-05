import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { Review, Prisma } from '@prisma/client';

@Injectable()
export class ReviewsRepository extends PrismaRepository<Review> {
    constructor(prisma: PrismaService) {
        super(prisma, 'review');
    }

    /**
     * Find reviews by location ID with optional category filter
     */
    async findByLocationId(
        locationId: string,
        options?: {
            category?: string;
            skip?: number;
            take?: number;
        }
    ) {
        const where: Prisma.ReviewWhereInput = {
            locationId,
            deletedAt: null,
        };

        if (options?.category) {
            where.category = options.category as any;
        }

        return this.model.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: options?.skip,
            take: options?.take,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    }

    /**
     * Find user's review for a specific location and category
     */
    async findUserReviewForLocationAndCategory(
        userId: string,
        locationId: string,
        category: string
    ) {
        return this.model.findUnique({
            where: {
                userId_locationId_category: {
                    userId,
                    locationId,
                    category: category as any,
                },
            },
        });
    }

    /**
     * Count reviews for a location with optional category filter
     */
    async countByLocationId(locationId: string, category?: string): Promise<number> {
        const where: Prisma.ReviewWhereInput = {
            locationId,
            deletedAt: null,
        };

        if (category) {
            where.category = category as any;
        }

        return this.model.count({ where });
    }

    /**
     * Get category averages for a location
     */
    async getLocationAverages(locationId: string) {
        const reviews = await this.model.groupBy({
            by: ['category'],
            where: {
                locationId,
                deletedAt: null,
            },
            _avg: {
                rating: true,
            },
        });

        const averages: Record<string, number> = {};

        reviews.forEach((r) => {
            averages[r.category] = Number((r._avg.rating || 0).toFixed(1));
        });

        return averages;
    }

    /**
     * Get overall average rating for a location
     */
    async getOverallAverage(locationId: string): Promise<number> {
        const result = await this.model.aggregate({
            where: {
                locationId,
                deletedAt: null,
            },
            _avg: {
                rating: true,
            },
        });

        return Number((result._avg.rating || 0).toFixed(1));
    }
}
