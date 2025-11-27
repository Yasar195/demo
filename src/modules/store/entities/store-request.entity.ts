import { StoreRequestStatus } from '@prisma/client';

export class StoreRequest {
    id: string;
    userId: string;
    storeName: string;
    storeDescription?: string;
    storeLogo?: string;
    storeWebsite?: string;
    storeEmail?: string;
    storePhone?: string;
    initialLocationData?: any;
    businessDocuments?: any;
    additionalNotes?: string;
    status: StoreRequestStatus;
    reviewedById?: string;
    reviewedAt?: Date;
    adminComments?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
