import { Injectable } from "@nestjs/common";
import { DeviceToken } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { PrismaRepository } from "src/database/repositories";

@Injectable()
export class DeviceTokenRepository extends PrismaRepository<DeviceToken> {
    constructor(prisma: PrismaService) {
        super(prisma, 'deviceToken');
    }

    async findByUserId(userId: string): Promise<DeviceToken[]> {
        return this.findByCondition({ userId, isActive: true } as Partial<DeviceToken>);
    }

    async findByToken(token: string): Promise<DeviceToken | null> {
        return this.findOneByCondition({ token } as Partial<DeviceToken>);
    }

    async registerToken(userId: string, token: string, platform: string, deviceId?: string): Promise<DeviceToken | null> {
        // Check if token already exists
        const existing = await this.findByToken(token);

        if (existing) {
            // Update existing token
            return this.update(existing.id, {
                userId,
                platform,
                deviceId,
                isActive: true,
                lastUsed: new Date(),
            } as Partial<DeviceToken>);
        }

        // Create new token
        return this.create({
            userId,
            token,
            platform,
            deviceId,
            isActive: true,
        } as Partial<DeviceToken>);
    }

    async deactivateToken(token: string): Promise<boolean> {
        const existing = await this.findByToken(token);
        if (!existing) return false;

        await this.update(existing.id, { isActive: false } as Partial<DeviceToken>);
        return true;
    }

    async deactivateInvalidTokens(tokens: string[]): Promise<void> {
        await this.updateMany(
            { token: { in: tokens } },
            { isActive: false } as Partial<DeviceToken>
        );
    }

    async updateLastUsed(token: string): Promise<void> {
        const existing = await this.findByToken(token);
        if (existing) {
            await this.update(existing.id, { lastUsed: new Date() } as Partial<DeviceToken>);
        }
    }

    async getActiveTokensForUsers(userIds: string[]): Promise<DeviceToken[]> {
        return this.model.findMany({
            where: {
                userId: { in: userIds },
                isActive: true,
                deletedAt: null,
            },
        });
    }
}
