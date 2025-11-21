import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { User } from '../entities/user.entity';

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
     * Find users by role
     */
    async findByRole(role: string): Promise<User[]> {
        return this.findByCondition({ role } as Partial<User>);
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user !== null;
    }
}
