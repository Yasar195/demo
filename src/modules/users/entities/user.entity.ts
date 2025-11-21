import { BaseEntity } from '../../../core/entities/base.entity';

export class User extends BaseEntity {
    email: string;
    name: string;
    password: string;
    role: string;
}
