import { Injectable, NotFoundException, HttpException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../../integrations/redis/redis.service';
import { BaseService } from '../../core/abstracts/base.service';
import { User } from '@prisma/client';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPassword } from '../../common/utils/crypto.utils';
import { UserRole } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService extends BaseService<User> {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly redisService: RedisService,
    ) {
        super(usersRepository);
    }

    /**
     * Find all users with pagination and sorting
     */
    async findAllPaginated(pagination?: PaginationDto): Promise<{ data: User[]; total: number; page: number; totalPages: number }> {
        try {
            const cacheKey = `users:all:${JSON.stringify(pagination || {})}`;
            const cachedData = await this.redisService.get(cacheKey);

            if (cachedData) {
                this.logger.log(`Cache hit for ${cacheKey}`);
                return JSON.parse(cachedData);
            }

            this.logger.log(`Cache miss for ${cacheKey}`);

            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sortBy;
            const sortOrder: 'asc' | 'desc' = pagination?.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

            const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'role', 'lastLogin'] as const;
            type SortField = typeof allowedSortFields[number];

            const resolvedSortBy: SortField = allowedSortFields.includes(sortBy as SortField)
                ? sortBy as SortField
                : 'createdAt';

            const orderBy: Record<string, 'asc' | 'desc'> = {
                [resolvedSortBy]: sortBy ? sortOrder : 'desc',
            };

            const result = await this.usersRepository.findWithPagination(page, limit, {}, orderBy);

            await this.redisService.set(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour

            return result;
        } catch (error) {
            this.handleError('findAllPaginated', error);
        }
    }

    /**
     * Find user by ID with caching
     */
    async findById(id: string): Promise<User | null> {
        try {
            const cacheKey = `users:${id}`;
            const cachedUser = await this.redisService.get(cacheKey);

            if (cachedUser) {
                this.logger.log(`Cache hit for ${cacheKey}`);
                return JSON.parse(cachedUser);
            }

            this.logger.log(`Cache miss for ${cacheKey}`);

            const user = await this.usersRepository.findById(id);
            if (user) {
                await this.redisService.set(cacheKey, JSON.stringify(user), 3600); // Cache for 1 hour
            }

            return user;
        } catch (error) {
            this.handleError('findById', error);
        }
    }

    /**
     * Create a new user
     */
    async createUser(dto: CreateUserDto): Promise<User> {
        try {
            const exists = await this.usersRepository.emailExists(dto.email);
            if (exists) {
                throw new BadRequestException('Email already exists');
            }

            const hashedPassword = hashPassword(dto.password);

            const user = await this.usersRepository.create({
                ...dto,
                password: hashedPassword,
            } as Partial<User>);

            // Invalidate all pagination caches
            await this.redisService.reset('users:all:*');

            return user;
        } catch (error) {
            this.handleError('createUser', error);
        }
    }

    /**
     * Update user
     */
    async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
        try {
            const user = await this.usersRepository.findById(id);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const updateData: Partial<User> = { ...dto } as Partial<User>;
            if (dto.password) {
                updateData.password = hashPassword(dto.password);
            }

            const updated = await this.usersRepository.update(id, updateData);
            if (!updated) {
                throw new NotFoundException('User not found');
            }

            // Invalidate specific user cache and all pagination caches
            await Promise.all([
                this.redisService.del(`users:${id}`),
                this.redisService.reset('users:all:*'),
            ]);

            return updated;
        } catch (error) {
            this.handleError('updateUser', error);
        }
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        try {
            return await this.usersRepository.findByEmail(email);
        } catch (error) {
            this.handleError('findByEmail', error);
        }
    }

    /**
     * Find users by role
     */
    async findByRole(role: UserRole): Promise<User[]> {
        try {
            return await this.usersRepository.findByRole(role);
        } catch (error) {
            this.handleError('findByRole', error);
        }
    }

    /**
     * Delete user (soft delete)
     */
    async deleteUser(id: string): Promise<boolean> {
        try {
            const user = await this.usersRepository.findById(id);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const deleted = await this.usersRepository.softDelete(id);

            if (deleted) {
                // Invalidate specific user cache and all pagination caches
                await Promise.all([
                    this.redisService.del(`users:${id}`),
                    this.redisService.reset('users:all:*'),
                ]);
            }

            return deleted;
        } catch (error) {
            this.handleError('deleteUser', error);
        }
    }

    /**
     * Upsert a user from an OAuth provider (e.g., Google)
     */
    async upsertOAuthUser(params: {
        provider: string;
        providerId: string;
        email: string;
        name: string;
        avatarUrl?: string;
        role?: UserRole;
    }): Promise<User> {
        try {
            const { provider, providerId, email, name, avatarUrl, role } = params;
            const lastLogin = new Date();

            const existingByProvider = await this.usersRepository.findByProvider(provider, providerId);
            if (existingByProvider) {
                const updated = await this.usersRepository.update(existingByProvider.id, {
                    email,
                    name,
                    avatarUrl,
                    lastLogin,
                } as Partial<User>);

                if (updated) {
                    return updated;
                }
            }

            const existingByEmail = await this.usersRepository.findByEmail(email);
            if (existingByEmail) {
                const updated = await this.usersRepository.update(existingByEmail.id, {
                    provider,
                    providerId,
                    name,
                    avatarUrl,
                    lastLogin,
                    password: null,
                } as Partial<User>);

                if (updated) {
                    return updated;
                }
            }

            return await this.usersRepository.create({
                email,
                name,
                avatarUrl,
                provider,
                providerId,
                role: role || UserRole.USER,
                password: null,
                lastLogin,
            } as Partial<User>);
        } catch (error) {
            this.handleError('upsertOAuthUser', error);
        }
    }

    private handleError(context: string, error: unknown): never {
        this.logger.error(`UsersService.${context} failed`, error as Error);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException('Internal server error');
    }
    /**
     * Update refresh token
     */
    async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
        try {
            await this.usersRepository.updateRefreshToken(userId, refreshToken);
        } catch (error) {
            this.handleError('updateRefreshToken', error);
        }
    }
}
