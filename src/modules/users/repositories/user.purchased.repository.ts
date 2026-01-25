import { Injectable } from "@nestjs/common";
import { UserPurchasedVoucher } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { PrismaRepository } from "src/database/repositories";

@Injectable()
export class UserPurchasedRepository extends PrismaRepository<UserPurchasedVoucher>{
    
    constructor(prisma: PrismaService) {
        super(prisma, 'userPurchasedVoucher');
    }

}
