import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Store } from '../entities/store.entity';

@Injectable()
export class StoreRepository extends PrismaRepository<Store> {
    constructor(prisma: PrismaService) {
        super(prisma, 'store');
    }

    /**
     * Find store by owner ID
     */
    async findByOwnerId(ownerId: string): Promise<Store | null> {
        return this.findOneByCondition({ ownerId } as Partial<Store>);
    }

    /**
     * Find store by request ID
     */
    async findByRequestId(requestId: string): Promise<Store | null> {
        return this.findOneByCondition({ requestId } as Partial<Store>);
    }

    /**
     * Check if user already has a store
     */
    async hasStore(ownerId: string): Promise<boolean> {
        const store = await this.findByOwnerId(ownerId);
        return store !== null;
    }
}
