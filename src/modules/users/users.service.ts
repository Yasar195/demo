import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseService } from '../../core/abstracts/base.service';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPassword } from '../../common/utils/crypto.utils';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService extends BaseService<User> {
    constructor(private readonly usersRepository: UsersRepository) {
        super(usersRepository);
    }

    /**
     * Create a new user
     */
    async createUser(dto: CreateUserDto): Promise<User> {
        // Check if email already exists
        const exists = await this.usersRepository.emailExists(dto.email);
        if (exists) {
            throw new ConflictException('Email already exists');
        }

        // Hash password
        const hashedPassword = hashPassword(dto.password);

        // Create user
        return this.usersRepository.create({
            ...dto,
            password: hashedPassword,
        } as Partial<User>);
    }

    /**
     * Update user
     */
    async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Hash password if provided
        const updateData: Partial<User> = { ...dto } as Partial<User>;
        if (dto.password) {
            updateData.password = hashPassword(dto.password);
        }

        const updated = await this.usersRepository.update(id, updateData);
        if (!updated) {
            throw new NotFoundException('User not found');
        }

        return updated;
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findByEmail(email);
    }

    /**
     * Find users by role
     */
    async findByRole(role: UserRole): Promise<User[]> {
        return this.usersRepository.findByRole(role);
    }

    /**
     * Delete user (soft delete)
     */
    async deleteUser(id: string): Promise<boolean> {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.usersRepository.softDelete(id);
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

        return this.usersRepository.create({
            email,
            name,
            avatarUrl,
            provider,
            providerId,
            role: role || UserRole.USER,
            password: null,
            lastLogin,
        } as Partial<User>);
    }
}
