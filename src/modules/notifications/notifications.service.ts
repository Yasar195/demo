import { HttpException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { Notification, NotificationRecipient } from "@prisma/client";
import { BaseService } from "src/core/abstracts";
import { NotificationsRepository } from "./repositories/notifications.repository";
import { PaginationDto } from "src/common/dto";

@Injectable()
export class NotificationsService extends BaseService<NotificationRecipient> {

    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly notificationsRepository: NotificationsRepository) {
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
            return this.notificationsRepository.findWithPagination(page, limit, { userId }, orderBy);
        } catch (error) {
            this.handleError('findAllPaginated', error);
        }
    }


    private handleError(context: string, error: unknown): never {
        this.logger.error(`UsersService.${context} failed`, error as Error);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException('Internal server error');
    }
}
