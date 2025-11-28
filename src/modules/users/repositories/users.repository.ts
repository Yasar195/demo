import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { User } from '../entities/user.entity';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersRepository extends PrismaRepository<User> {
    constructor(prisma: PrismaService) {
        super(prisma, 'user');
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.findOneByCondition({ email } as Partial<User>);
    }

    /**
     * Find user by OAuth provider and provider id
     */
    async findByProvider(provider: string, providerId: string): Promise<User | null> {
        return this.findOneByCondition({ provider, providerId } as Partial<User>);
    }

    /**
     * Find users by role
     */
    async findByRole(role: UserRole): Promise<User[]> {
        return this.findByCondition({ role } as Partial<User>);
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user !== null;
    }

    /**
     * Count total users (for admin dashboard)
     */
    async countTotal(): Promise<number> {
        return this.model.count({
            where: {
                deletedAt: null,
            },
        });
    }
    /**
     * Update refresh token
     */
    async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
        await this.model.update({
            where: { id: userId },
            data: { hashedRefreshToken: refreshToken },
        });
    }
}
