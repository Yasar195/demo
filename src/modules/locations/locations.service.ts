import { Injectable, NotFoundException } from '@nestjs/common';
import { LocationsRepository } from './repositories';
import { QueryLocationsDto } from './dto';
import { StoreLocation } from '@prisma/client';
import { RedisService } from '../../integrations/redis/redis.service';
import { ReviewsService } from '../reviews/reviews.service';
import { StoreRepository } from '../store/repositories';

@Injectable()
export class LocationsService {
    constructor(
        private readonly locationsRepository: LocationsRepository,
        private readonly redisService: RedisService,
        private readonly reviewsService: ReviewsService,
        private readonly storeRepository: StoreRepository,
    ) { }

    /**
     * Get all locations with store details and optional vouchers
     */
    async getAllLocations(query: QueryLocationsDto) {
        const {
            page = 1,
            limit = 20,
            city,
            storeId,
            activeOnly = true,
            includeVouchers = false,
            voucherOrderBy,
            orderBy,
            latitude,
            longitude,
        } = query;

        // Create cache key based on query parameters
        const cacheKey = `locations:all:${JSON.stringify(query)}`;
        const cachedData = await this.redisService.get(cacheKey);

        if (cachedData) {
            return JSON.parse(cachedData);
        }

        const skip = (page - 1) * limit;

        const [locations, total] = await Promise.all([
            this.locationsRepository.findAllWithStore({
                city,
                storeId,
                activeOnly,
                includeVouchers,
                voucherOrderBy,
                orderBy,
                latitude,
                longitude,
                skip,
                take: limit,
            }),
            this.locationsRepository.countLocations({
                city,
                storeId,
                activeOnly,
            }),
        ]);

        // Fetch review averages for each location
        const locationsWithReviews = await Promise.all(
            locations.map(async (location) => {
                const reviewStats = await this.reviewsService.getLocationReviewAverages(location.id);
                return {
                    ...location,
                    reviews: reviewStats,
                };
            })
        );

        const result = {
            locations: locationsWithReviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };

        // Cache for 5 minutes
        await this.redisService.set(cacheKey, JSON.stringify(result), 300);

        return result;
    }

    /**
     * Get current user's store locations (vendor-only)
     */
    async getMyLocations(userId: string, query: QueryLocationsDto) {
        const store = await this.storeRepository.findOneByCondition({ ownerId: userId });
        if (!store) {
            throw new NotFoundException('You do not have a store yet');
        }

        return this.getAllLocations({
            ...query,
            storeId: store.id,
        });
    }

    /**
     * Get location by ID with store details and vouchers
     */
    async getLocationById(
        id: string,
        includeVouchers = true
    ): Promise<StoreLocation> {
        const location = await this.locationsRepository.findByIdWithStore(id, includeVouchers);

        if (!location) {
            throw new NotFoundException('Location not found');
        }

        return location;
    }
}
