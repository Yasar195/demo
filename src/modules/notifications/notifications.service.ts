import { HttpException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { NotificationRecipient } from "@prisma/client";
import { BaseService } from "src/core/abstracts";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { DeviceTokenRepository } from "./repositories/device-token.repository";
import { PaginationDto } from "src/common/dto";
import { RegisterDeviceTokenDto } from "./dto/notifications.dto";
import { SseService } from "../sse/sse.service";

@Injectable()
export class NotificationsService extends BaseService<NotificationRecipient> {

    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly notificationsRepository: NotificationsRepository,
        private readonly deviceTokenRepository: DeviceTokenRepository,
        private readonly sseService: SseService,
    ) {
        super(notificationsRepository);
    }

    async findByUserId(userId: string, pagination: PaginationDto): Promise<{ data: NotificationRecipient[]; total: number; page: number; totalPages: number }> {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sortBy;
            const sortOrder: 'asc' | 'desc' = pagination?.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

            const allowedSortFields = ['createdAt'] as const;
            type SortField = typeof allowedSortFields[number];

            const resolvedSortBy: SortField = allowedSortFields.includes(sortBy as SortField)
                ? sortBy as SortField
                : 'createdAt';

            const orderBy: Record<string, 'asc' | 'desc'> = {
                [resolvedSortBy]: sortBy ? sortOrder : 'desc',
            };
            return this.notificationsRepository.findWithPagination(page, limit, { userId }, orderBy, { notification: true });
        } catch (error) {
            this.handleError('findAllPaginated', error);
        }
    }

    async createNotification(data: { title: string; message: string; userIds: string[]; metadata?: any }): Promise<void> {
        try {
            const notification = await this.notificationsRepository.createNotification(data);

            // Send SSE events to each user
            for (const userId of data.userIds) {
                this.sseService.sendToUser(userId, 'notification', {
                    id: notification.id,
                    title: data.title,
                    message: data.message,
                    metadata: data.metadata,
                    createdAt: notification.createdAt,
                });
            }

            this.logger.log(`Notification created and SSE events sent to ${data.userIds.length} users`);
        } catch (error) {
            this.handleError('createNotification', error);
        }
    }


    async findById(id: string): Promise<NotificationRecipient | null> {
        try {
            return await this.notificationsRepository.findById(id);
        } catch (error) {
            this.handleError('createNotification', error);
        }
    }

    async readNotifications(userId: string, id?: string): Promise<NotificationRecipient[] | null> {
        try {
            return await this.notificationsRepository.readNotifications(userId, id);
        } catch (error) {
            this.handleError('createNotification', error);
        }
    }

    async getUnreadCount(userId: string): Promise<number> {
        try {
            return await this.notificationsRepository.getNotificationCount(userId);
        } catch (error) {
            this.handleError('createNotification', error);
        }
    }

    async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto): Promise<any> {
        try {
            return await this.deviceTokenRepository.registerToken(
                userId,
                dto.token,
                dto.platform,
                dto.deviceId
            );
        } catch (error) {
            this.handleError('registerDeviceToken', error);
        }
    }

    async unregisterDeviceToken(token: string): Promise<boolean> {
        try {
            return await this.deviceTokenRepository.deactivateToken(token);
        } catch (error) {
            this.handleError('unregisterDeviceToken', error);
        }
    }

    async getUserDeviceTokens(userId: string): Promise<any[]> {
        try {
            return await this.deviceTokenRepository.findByUserId(userId);
        } catch (error) {
            this.handleError('getUserDeviceTokens', error);
        }
    }

    private handleError(context: string, error: unknown): never {
        this.logger.error(`NotificaitonService.${context} failed`, error as Error);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException('Internal server error');
    }
}
