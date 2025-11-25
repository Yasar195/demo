import { BaseRepository } from '../../core/abstracts/base.repository';
import { PrismaService } from '../prisma.service';

export abstract class PrismaRepository<T> extends BaseRepository<T> {
    constructor(
        protected readonly prisma: PrismaService,
        protected readonly modelName: string,
    ) {
        super();
    }

    /**
     * Get Prisma delegate for the model
     */
    protected get model(): any {
        return this.prisma[this.modelName];
    }

    async findAll(): Promise<T[]> {
        return this.model.findMany({
            where: { deletedAt: null },
        });
    }

    async findById(id: string): Promise<T | null> {
        return this.model.findUnique({
            where: { id, deletedAt: null },
        });
    }

    async create(data: Partial<T>): Promise<T> {
        return this.model.create({
            data,
        });
    }

    async update(id: string, data: Partial<T>): Promise<T | null> {
        try {
            return await this.model.update({
                where: { id },
                data,
            });
        } catch (error) {
            // Record not found
            return null;
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.model.delete({
                where: { id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async findByCondition(condition: Partial<T>): Promise<T[]> {
        return this.model.findMany({
            where: {
                ...condition,
                deletedAt: null,
            },
        });
    }

    async findOneByCondition(condition: Partial<T>): Promise<T | null> {
        return this.model.findFirst({
            where: {
                ...condition,
                deletedAt: null,
            },
        });
    }

    /**
     * Soft delete - sets deletedAt timestamp
     * Override from BaseRepository to use Prisma
     */
    async softDelete(id: string): Promise<boolean> {
        try {
            await this.model.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Find with pagination
     */
    async findWithPagination(
        page: number = 1,
        limit: number = 10,
        where: any = {},
        orderBy?: Record<string, 'asc' | 'desc'>,
    ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.model.findMany({
                where: { ...where, deletedAt: null },
                skip,
                take: limit,
                orderBy,
            }),
            this.model.count({
                where: { ...where, deletedAt: null },
            }),
        ]);

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
}
