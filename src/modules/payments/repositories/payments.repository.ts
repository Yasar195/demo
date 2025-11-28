import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Payment, Prisma } from '@prisma/client';

@Injectable()
export class PaymentsRepository extends PrismaRepository<Payment> {
    constructor(prisma: PrismaService) {
        super(prisma, 'payment');
    }

    async createPayment(data: Prisma.PaymentUncheckedCreateInput): Promise<Payment> {
        return this.model.create({
            data,
        });
    }

    async updateStatusByTransactionId(transactionId: string, status: any): Promise<Payment | null> {
        // We use updateMany because transactionId is unique but not the primary key, 
        // and Prisma's update requires a unique where clause. 
        // Ideally transactionId should be @unique in schema, which it is.
        // So we can use update if we find the record first or use update with where transactionId.

        return this.model.update({
            where: { transactionId },
            data: { status },
        });
    }
}
