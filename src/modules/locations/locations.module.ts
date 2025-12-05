import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './repositories';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [LocationsController],
    providers: [LocationsService, LocationsRepository],
    exports: [LocationsService],
})
export class LocationsModule { }
