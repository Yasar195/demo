import { Injectable, NotFoundException } from '@nestjs/common';
import { LocationsRepository } from './repositories';
import { QueryLocationsDto } from './dto';
import { StoreLocation } from '@prisma/client';

@Injectable()
export class LocationsService {
    constructor(private readonly locationsRepository: LocationsRepository) { }

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
            includeVouchers = true,
            voucherOrderBy,
        } = query;

        const skip = (page - 1) * limit;

        const [locations, total] = await Promise.all([
            this.locationsRepository.findAllWithStore({
                city,
                storeId,
                activeOnly,
                includeVouchers,
                voucherOrderBy,
                skip,
                take: limit,
            }),
            this.locationsRepository.countLocations({
                city,
                storeId,
                activeOnly,
            }),
        ]);

        return {
            locations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
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
