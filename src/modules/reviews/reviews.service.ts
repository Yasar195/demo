import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsRepository } from './repositories';
import { CreateReviewDto, UpdateReviewDto, QueryReviewsDto } from './dto';
// import { Review, ReviewCategory } from './entities';
import { Review } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReviewsService {
    constructor(
        private readonly reviewsRepository: ReviewsRepository,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Create or update a review for a specific category
     */
    async createReview(userId: string, dto: CreateReviewDto): Promise<Review> {
        // Check if location exists
        const location = await this.prisma.storeLocation.findUnique({
            where: { id: dto.locationId },
        });

        if (!location) {
            throw new NotFoundException('Store location not found');
        }

        // Upsert review (create or update if exists)
        const review = await this.prisma.review.upsert({
            where: {
                userId_locationId_category: {
                    userId,
                    locationId: dto.locationId,
                    category: dto.category,
                },
            },
            update: {
                rating: dto.rating,
                comment: dto.comment,
            },
            create: {
                userId,
                locationId: dto.locationId,
                category: dto.category,
                rating: dto.rating,
                comment: dto.comment,
            },
        });

        return review;
    }

    /**
     * Get reviews for a location, optionally filtered by category
     */
    async getLocationReviews(query: QueryReviewsDto) {
        const { locationId, category, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            this.reviewsRepository.findByLocationId(locationId, {
                category,
                skip,
                take: limit,
            }),
            this.reviewsRepository.countByLocationId(locationId, category),
        ]);

        // Get averages for all categories
        const averages = await this.reviewsRepository.getLocationAverages(locationId);
        const overallAverage = await this.reviewsRepository.getOverallAverage(locationId);

        return {
            reviews,
            averages,
            overallAverage: Number(overallAverage.toFixed(1)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single review by ID
     */
    async getReviewById(id: string): Promise<Review> {
        const review = await this.reviewsRepository.findById(id);

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        return review;
    }

    /**
     * Update own review
     */
    // async updateReview(reviewId: string, userId: string, dto: UpdateReviewDto): Promise<Review> {
    //     const review = await this.reviewsRepository.findById(reviewId);

    //     if (!review) {
    //         throw new NotFoundException('Review not found');
    //     }

    //     if (review.userId !== userId) {
    //         throw new ForbiddenException('You can only update your own reviews');
    //     }

    //     const updated = await this.reviewsRepository.update(reviewId, dto);

    //     if (!updated) {
    //         throw new NotFoundException('Review not found');
    //     }

    //     return updated;
    // }

    /**
     * Delete own review
     */
    // async deleteReview(reviewId: string, userId: string): Promise<void> {
    //     const review = await this.reviewsRepository.findById(reviewId);

    //     if (!review) {
    //         throw new NotFoundException('Review not found');
    //     }

    //     if (review.userId !== userId) {
    //         throw new ForbiddenException('You can only delete your own reviews');
    //     }

    //     await this.reviewsRepository.delete(reviewId);
    // }

    /**
     * Get user's reviews for a location (all categories)
     */
    async getUserLocationReviews(userId: string, locationId: string): Promise<Review[]> {
        return this.prisma.review.findMany({
            where: {
                userId,
                locationId,
                deletedAt: null,
            },
            orderBy: {
                category: 'asc',
            },
        });
    }

    /**
     * Get location review averages by category (common function for other modules)
     */
    async getLocationReviewAverages(locationId: string) {
        const [categoryAverages, overallAverage, totalReviews] = await Promise.all([
            this.reviewsRepository.getLocationAverages(locationId),
            this.reviewsRepository.getOverallAverage(locationId),
            this.reviewsRepository.countByLocationId(locationId),
        ]);

        return {
            categoryAverages,
            overallAverage,
            totalReviews,
        };
    }
}
