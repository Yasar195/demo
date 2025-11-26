import { Controller, Get, Query, UseGuards, Param, Patch, Body } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "src/iam/auth/guards/jwt-auth.guard";
import { CurrentUser } from "src/common/decorators";
import { BaseResponseDto, PaginationDto } from "src/common/dto";
import { User } from "../users/entities/user.entity";

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}
    
    @Get()
    async findAllNotifications(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
        const notifications = await this.notificationsService.findByUserId(user.id, pagination);
        return BaseResponseDto.success(notifications, 'Notifications retrieved successfully')
    }

    @Patch()
    async readNotifications(@CurrentUser() user: User, @Body("id") id: string) {
        const notifications = await this.notificationsService.readNotifications(user.id,id);
        console.log(notifications)
        return BaseResponseDto.success('Notifications read successfully')
    }

    @Get('/unread')
    async getUnreadCount(@CurrentUser() user: User) {
        const count = await this.notificationsService.getUnreadCount(user.id);
        return BaseResponseDto.success({ count }, 'Unread count retrieved successfully')
    }

    @Get(':id')
    async findNotificationById(@Param('id') id: string) {
        const notifications = await this.notificationsService.findById(id);
        return BaseResponseDto.success(notifications, 'Notifications retrieved successfully')
    }

}
