import { Injectable } from "@nestjs/common";
import { Notification, NotificationRecipient } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { PrismaRepository } from "src/database/repositories";

@Injectable()
export class NotificationsRepository extends PrismaRepository<NotificationRecipient> {
    constructor(prisma: PrismaService) {
        super(prisma, 'notificationRecipient');
    }

    /**
     * Override base queries to avoid soft-delete filtering
     */
    // async findAll(): Promise<Notification[]> {
    //     return this.prisma.notification.findMany({
    //         orderBy: { createdAt: 'desc' },
    //     });
    // }

    // async findById(id: string): Promise<Notification | null> {
    //     return this.prisma..findUnique({
    //         where: { id },
    //     });
    // }

    // async findByCondition(condition: Partial<Notification>): Promise<Notification[]> {
    //     return this.prisma.notification.findMany({
    //         where: { ...condition },
    //     });
    // }

    // async findOneByCondition(condition: Partial<Notification>): Promise<Notification | null> {
    //     return this.prisma.notification.findFirst({
    //         where: { ...condition },
    //     });
    // }

    /**
     * Find notifications by recipient (current user)
     */
    async findByUserId(userId: string): Promise<NotificationRecipient[]> {
        return this.findByCondition({ userId } as Partial<NotificationRecipient>);
    }
}
