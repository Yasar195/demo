import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './repositories';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../integrations/redis/redis.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StoreRepository } from '../store/repositories';

@Module({
    imports: [DatabaseModule, RedisModule, ReviewsModule, SubscriptionsModule],
    controllers: [LocationsController],
    providers: [LocationsService, LocationsRepository, StoreRepository],
})
export class LocationsModule { }
