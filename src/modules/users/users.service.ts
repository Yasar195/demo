import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseService } from '../../core/abstracts/base.service';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPassword } from '../../common/utils/crypto.utils';

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
    async findByRole(role: string): Promise<User[]> {
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
}
