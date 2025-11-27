import { Controller, Get, Query, UseGuards, Param, Patch, Body, Post, Delete } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "src/iam/auth/guards/jwt-auth.guard";
import { CurrentUser } from "src/common/decorators";
import { BaseResponseDto, PaginationDto } from "src/common/dto";
import { User } from "../users/entities/user.entity";
import { RegisterDeviceTokenDto } from "./dto/notifications.dto";

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
        return BaseResponseDto.success(notifications, 'Notifications read successfully')
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

    @Post('device-token')
    async registerDeviceToken(@CurrentUser() user: User, @Body() dto: RegisterDeviceTokenDto) {
        const token = await this.notificationsService.registerDeviceToken(user.id, dto);
        return BaseResponseDto.success(token, 'Device token registered successfully')
    }

    @Delete('device-token')
    async unregisterDeviceToken(@Body('token') token: string) {
        const result = await this.notificationsService.unregisterDeviceToken(token);
        return BaseResponseDto.success({ deactivated: result }, 'Device token unregistered successfully')
    }

    @Get('device-tokens')
    async getUserDeviceTokens(@CurrentUser() user: User) {
        const tokens = await this.notificationsService.getUserDeviceTokens(user.id);
        return BaseResponseDto.success(tokens, 'Device tokens retrieved successfully')
    }

}
