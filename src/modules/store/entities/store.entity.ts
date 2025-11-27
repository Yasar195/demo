export class Store {
    id: string;
    ownerId: string;
    requestId?: string;
    name: string;
    description?: string;
    logo?: string;
    website?: string;
    email?: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
