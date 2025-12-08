import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { LocationRequestsController } from './location-requests.controller';
import { LocationRequestsService } from './location-requests.service';
import { LocationRequestRepository } from './repositories';
import { StoreModule } from '../store/store.module';

@Module({
    imports: [DatabaseModule, StoreModule],
    controllers: [LocationRequestsController],
    providers: [LocationRequestsService, LocationRequestRepository],
    exports: [LocationRequestsService, LocationRequestRepository],
})
export class LocationRequestsModule { }
