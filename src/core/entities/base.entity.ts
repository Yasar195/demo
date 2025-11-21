export abstract class BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;

    constructor() {
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}
