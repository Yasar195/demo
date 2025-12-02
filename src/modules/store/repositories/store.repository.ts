import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Store } from '../entities/store.entity';

@Injectable()
export class StoreRepository extends PrismaRepository<Store> {
    constructor(prisma: PrismaService) {
        super(prisma, 'store');
    }
}
