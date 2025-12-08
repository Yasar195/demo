import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './repositories';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../integrations/redis/redis.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
    imports: [DatabaseModule, RedisModule, ReviewsModule],
    controllers: [LocationsController],
    providers: [LocationsService, LocationsRepository],
})
export class LocationsModule { }
