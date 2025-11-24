import { BaseEntity } from '../../../core/entities/base.entity';

export class User extends BaseEntity {
    email: string;
    name: string;
    password?: string | null;
    provider: string;
    providerId?: string | null;
    avatarUrl?: string | null;
    lastLogin?: Date | null;
    role: string;
}
