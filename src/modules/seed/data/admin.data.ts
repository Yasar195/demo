import { UserRole } from '@prisma/client';
import { hashPassword } from '../../../common/utils/crypto.utils';

export const DEFAULT_ADMIN = {
    email: 'admin@sustify.com',
    name: 'System Admin',
    password: hashPassword('Admin@123'),
    role: UserRole.ADMIN,
    provider: 'local',
};
