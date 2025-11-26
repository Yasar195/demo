import { Injectable } from "@nestjs/common";
import { Notification, NotificationRecipient } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { PrismaRepository } from "src/database/repositories";
import { NotificationDto } from "../dto/notifications.dto";

@Injectable()
export class RecipientRepository extends PrismaRepository<NotificationRecipient> {
    constructor(prisma: PrismaService) {
        super(prisma, 'notificationRecipient');
    }

    async findByUserId(userId: string): Promise<NotificationRecipient[]> {
        return this.findByCondition({ userId } as Partial<NotificationRecipient>);
    }

    async createNotification(data: NotificationDto): Promise<void> {
        const notification = await this.prisma.notification.create({
            data: {
                title: data.title,
                message: data.message,
            }
        })

        await this.prisma.notificationRecipient.createMany({
            data: data.userIds.map(userId => ({
                notificationId: notification.id,
                userId,
            }))
        })
    }

    async findById(id: string): Promise<NotificationRecipient | null> {
        return this.findOneByCondition({ id }, { notification: true });
    }
}
