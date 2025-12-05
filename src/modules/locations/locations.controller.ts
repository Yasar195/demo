import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { QueryLocationsDto } from './dto';

@Controller('locations')
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    getAllLocations(@Query() query: QueryLocationsDto) {
        return this.locationsService.getAllLocations(query);
    }

    @Get(':id')
    getLocationById(@Param('id') id: string) {
        return this.locationsService.getLocationById(id);
    }
}
