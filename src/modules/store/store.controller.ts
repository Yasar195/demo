import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import {
    CreateStoreRequestDto,
    UpdateStoreRequestDto,
    ApproveStoreRequestDto,
    RejectStoreRequestDto,
    QueryStoreRequestDto,
} from './dto';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { UserRole } from '@prisma/client';
import { User } from '../users/entities/user.entity';

@Controller('store-requests')
@UseGuards(JwtAuthGuard)
export class StoreController {
    constructor(private readonly storeService: StoreService) {}

    /**
     * Create a new store request (User)
     */
    @Post()
    async createStoreRequest(
        @CurrentUser() user: User,
        @Body() dto: CreateStoreRequestDto,
    ) {
        const request = await this.storeService.createStoreRequest(user.id, dto);
        return BaseResponseDto.success(request, 'Store request created successfully');
    }

    /**
     * Get user's own store requests (User)
     */
    @Get('my-requests')
    async getUserStoreRequests(@CurrentUser() user: User) {
        const requests = await this.storeService.getUserStoreRequests(user.id);
        return BaseResponseDto.success(requests, 'Store requests retrieved successfully');
    }

    /**
     * Get user's store (if exists)
     */
    @Get('my-store')
    async getUserStore(@CurrentUser() user: User) {
        const store = await this.storeService.getUserStore(user.id);
        return BaseResponseDto.success(store, 'Store retrieved successfully');
    }

    /**
     * Get all store requests with filters (Admin only)
     */
    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllStoreRequests(@Query() query: QueryStoreRequestDto) {
        const result = await this.storeService.getAllStoreRequests(query);
        return BaseResponseDto.success(result, 'Store requests retrieved successfully');
    }

    /**
     * Get a specific store request by ID
     */
    @Get(':id')
    async getStoreRequestById(
        @Param('id') id: string,
        @CurrentUser() user: User,
    ) {
        const isAdmin = user.role === UserRole.ADMIN;
        const request = await this.storeService.getStoreRequestById(id, user.id, isAdmin);
        return BaseResponseDto.success(request, 'Store request retrieved successfully');
    }

    /**
     * Update a store request (User, only PENDING)
     */
    @Put(':id')
    async updateStoreRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
        @Body() dto: UpdateStoreRequestDto,
    ) {
        const request = await this.storeService.updateStoreRequest(id, user.id, dto);
        return BaseResponseDto.success(request, 'Store request updated successfully');
    }

    /**
     * Cancel a store request (User, only PENDING)
     */
    @Delete(':id')
    async cancelStoreRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
    ) {
        await this.storeService.cancelStoreRequest(id, user.id);
        return BaseResponseDto.success(null, 'Store request cancelled successfully');
    }

    /**
     * Approve a store request (Admin only)
     */
    @Post(':id/approve')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async approveStoreRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
        @Body() dto: ApproveStoreRequestDto,
    ) {
        const store = await this.storeService.approveStoreRequest(id, user.id, dto);
        return BaseResponseDto.success(store, 'Store request approved and store created successfully');
    }

    /**
     * Reject a store request (Admin only)
     */
    @Post(':id/reject')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async rejectStoreRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
        @Body() dto: RejectStoreRequestDto,
    ) {
        const request = await this.storeService.rejectStoreRequest(id, user.id, dto);
        return BaseResponseDto.success(request, 'Store request rejected successfully');
    }
}
