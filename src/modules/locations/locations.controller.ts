import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { QueryLocationsDto } from './dto';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('locations')
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    getAllLocations(@Query() query: QueryLocationsDto) {
        return this.locationsService.getAllLocations(query);
    }

    @Get('my')
    @UseGuards(JwtAuthGuard, SubscriptionGuard)
    getMyLocations(@CurrentUser() user: User, @Query() query: QueryLocationsDto) {
        return this.locationsService.getMyLocations(user.id, query);
    }

    @Get(':id')
    getLocationById(@Param('id') id: string) {
        return this.locationsService.getLocationById(id);
    }
}
