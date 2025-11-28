import { Injectable } from "@nestjs/common";
import { NotificationRecipient } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { PrismaRepository } from "src/database/repositories";
import { NotificationDto } from "../dto/notifications.dto";
import { FirebaseService } from "src/integrations/firebase";
import { DeviceTokenRepository } from "./device-token.repository";

@Injectable()
export class NotificationsRepository extends PrismaRepository<NotificationRecipient> {
    constructor(
        prisma: PrismaService,
        private readonly firebaseService: FirebaseService,
        private readonly deviceTokenRepository: DeviceTokenRepository,
    ) {
        super(prisma, 'notificationRecipient');
    }

    async findByUserId(userId: string): Promise<NotificationRecipient[]> {
        return this.findByCondition({ userId } as Partial<NotificationRecipient>);
    }

    async createNotification(data: NotificationDto): Promise<{ id: string; createdAt: Date }> {
        // Create notification in database
        const notification = await this.prisma.notification.create({
            data: {
                title: data.title,
                message: data.message,
            }
        })

        // Create notification recipients
        await this.prisma.notificationRecipient.createMany({
            data: data.userIds.map(userId => ({
                notificationId: notification.id,
                userId,
            }))
        })

        // Send push notifications to all recipients
        await this.sendPushNotifications(data.userIds, {
            title: data.title,
            body: data.message,
            data: {
                notificationId: notification.id,
                type: 'notification',
            }
        });

        return { id: notification.id, createdAt: notification.createdAt };
    }

    private async sendPushNotifications(
        userIds: string[],
        payload: { title: string; body: string; data?: Record<string, string> }
    ): Promise<void> {
        try {
            // Get all active device tokens for these users
            const deviceTokens = await this.deviceTokenRepository.getActiveTokensForUsers(userIds);

            if (deviceTokens.length === 0) {
                return;
            }

            const tokens = deviceTokens.map(dt => dt.token);

            // Send push notifications via FCM
            const result = await this.firebaseService.sendToMultipleDevices(tokens, payload);

            // Deactivate invalid tokens
            if (result.invalidTokens.length > 0) {
                await this.deviceTokenRepository.deactivateInvalidTokens(result.invalidTokens);
            }
        } catch (error) {
            // Log error but don't fail the notification creation
            console.error('Failed to send push notifications:', error);
        }
    }

    async findById(id: string): Promise<NotificationRecipient | null> {
        return this.findOneByCondition({ id }, { notification: true });
    }

    async readNotifications(userId: string, id?: string): Promise<NotificationRecipient[] | null> {
        return this.updateMany({ userId, id, isRead: false }, { readAt: new Date(), isRead: true });
    }

    async getNotificationCount(userId: string): Promise<number> {
        return this.count({ userId, isRead: false });
    }
}
