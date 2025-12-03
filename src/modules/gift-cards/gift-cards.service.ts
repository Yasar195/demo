import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { BaseService } from '../../core/abstracts';
import {
    GiftCardRepository,
    // VoucherGiftCardMappingRepository,
    UserGiftCardRepository,
} from './repositories';
import { GiftCard, VoucherGiftCardMapping, UserGiftCard } from './entities';
import { CreateGiftCardDto, AssignPositionGiftCardDto } from './dto';
import { OrdersRepository } from '../orders/repositories';

@Injectable()
export class GiftCardsService extends BaseService<GiftCard> {
    private readonly logger = new Logger(GiftCardsService.name);

    constructor(
        private readonly giftCardRepository: GiftCardRepository,
        // private readonly mappingRepository: VoucherGiftCardMappingRepository,
        private readonly userGiftCardRepository: UserGiftCardRepository,
        private readonly ordersRepository: OrdersRepository,
    ) {
        super(giftCardRepository);
    }

    /**
     * Admin: Create a new gift card
     */
    async createGiftCard(dto: CreateGiftCardDto): Promise<GiftCard> {
        try {
            // Check if code already exists
            const existing = await this.giftCardRepository.findByCode(dto.code);
            if (existing) {
                throw new BadRequestException('Gift card code already exists');
            }

            const giftCard = await this.giftCardRepository.create({
                code: dto.code,
                isRealCard: dto.isRealCard,
                title: dto.title,
                description: dto.description,
                value: dto.value,
                imageUrl: dto.imageUrl,
                expiresAt: new Date(dto.expiresAt),
            } as Partial<GiftCard>);

            this.logger.log(`Gift card created: ${giftCard.id} - ${giftCard.title}`);
            return giftCard;
        } catch (error) {
            this.handleError('createGiftCard', error);
        }
    }

    /**
     * Admin: Assign default gift card to voucher (given to ALL buyers)
     */
    // async assignDefaultGiftCard(voucherId: string, dto: AssignPositionGiftCardDto): Promise<VoucherGiftCardMapping> {
    //     try {
    //         // Check if default already exists
    //         const existing = await this.mappingRepository.getDefaultMapping(voucherId);
    //         if (existing) {
    //             throw new BadRequestException('Voucher already has a default gift card. Remove it first.');
    //         }

    //         const mapping = await this.mappingRepository.create({
    //             voucherId,
    //             giftCardId: dto.giftCardId,
    //             isDefault: true,
    //             position: dto.position,
    //             isDelivered: false,
    //         } as Partial<VoucherGiftCardMapping>);

    //         this.logger.log(`Default gift card assigned to voucher ${voucherId}`);
    //         return mapping;
    //     } catch (error) {
    //         this.handleError('assignDefaultGiftCard', error);
    //     }
    // }

    /**
     * Admin: Assign real gift card to specific position
     */
    // async assignPositionGiftCard(voucherId: string, dto: AssignPositionGiftCardDto): Promise<VoucherGiftCardMapping> {
    //     try {
    //         // Check if position already has a gift card
    //         const existing = await this.mappingRepository.getPositionMapping(voucherId, dto.position);
    //         if (existing) {
    //             throw new BadRequestException(`Position ${dto.position} already has a gift card assigned.`);
    //         }

    //         const mapping = await this.mappingRepository.create({
    //             voucherId,
    //             giftCardId: dto.giftCardId,
    //             isDefault: false,
    //             position: dto.position,
    //             isDelivered: false,
    //         } as Partial<VoucherGiftCardMapping>);

    //         this.logger.log(`Gift card assigned to voucher ${voucherId} position ${dto.position}`);
    //         return mapping;
    //     } catch (error) {
    //         this.handleError('assignPositionGiftCard', error);
    //     }
    // }

    /**
     * Admin: Get all gift card mappings for a voucher
     */
    // async getVoucherMappings(voucherId: string): Promise<{
    //     default: VoucherGiftCardMapping | null;
    //     positionMappings: VoucherGiftCardMapping[];
    // }> {
    //     try {
    //         return await this.mappingRepository.getVoucherMappings(voucherId);
    //     } catch (error) {
    //         this.handleError('getVoucherMappings', error);
    //     }
    // }

    /**
     * Deliver gift cards to user after voucher redemption
     * Called from OrdersService after successful redemption
     */
    // async deliverGiftCardsOnRedemption(
    //     userId: string,
    //     userPurchasedVoucherId: string,
    //     voucherId: string,
    //     purchasePosition: number,
    // ): Promise<UserGiftCard[]> {
    //     try {
    //         const deliveredCards: UserGiftCard[] = [];

    //         // 1. Deliver default gift card if exists
    //         const defaultMapping = await this.mappingRepository.getDefaultMapping(voucherId);
    //         if (defaultMapping) {
    //             const userGiftCard = await this.deliverGiftCard(
    //                 userId,
    //                 userPurchasedVoucherId,
    //                 (defaultMapping as any).giftCard,
    //                 purchasePosition,
    //             );
    //             deliveredCards.push(userGiftCard);
    //         }

    //         // 2. Deliver position-specific gift card if exists
    //         const positionMapping = await this.mappingRepository.getPositionMapping(voucherId, purchasePosition);
    //         if (positionMapping) {
    //             const userGiftCard = await this.deliverGiftCard(
    //                 userId,
    //                 userPurchasedVoucherId,
    //                 (positionMapping as any).giftCard,
    //                 purchasePosition,
    //             );
    //             deliveredCards.push(userGiftCard);

    //             // Mark position mapping as delivered
    //             await this.mappingRepository.markAsDelivered(positionMapping.id);
    //             this.logger.log(`Position ${purchasePosition} gift card delivered to user ${userId}`);
    //         }

    //         if (deliveredCards.length > 0) {
    //             this.logger.log(`Delivered ${deliveredCards.length} gift card(s) to user ${userId}`);
    //         }

    //         return deliveredCards;
    //     } catch (error) {
    //         this.logger.error('Failed to deliver gift cards', error);
    //         // Don't throw error - redemption should succeed even if gift card delivery fails
    //         return [];
    //     }
    // }

    /**
     * Helper: Deliver a single gift card to user
     */
    private async deliverGiftCard(
        userId: string,
        userPurchasedVoucherId: string,
        giftCard: GiftCard,
        purchasePosition: number,
    ): Promise<UserGiftCard> {
        return await this.userGiftCardRepository.create({
            userId,
            giftCardId: giftCard.id,
            userPurchasedVoucherId,
            purchasePosition,
            scratchCode: giftCard.isRealCard ? giftCard.code : null,
            isRevealed: false,
            isUsed: false,
            deliveredAt: new Date(),
            expiresAt: giftCard.expiresAt,
        } as Partial<UserGiftCard>);
    }

    async getUserLoyaltyStreak(userId: string): Promise<{ streak: number }> {
        try {
            const streak = await this.ordersRepository.count({ userId })
            return { streak };
        } catch (error) {
            this.handleError('getUserLoyaltyStreak', error);
        }
    }

    /**
     * User: Get my gift cards
     */
    async getUserGiftCards(userId: string): Promise<UserGiftCard[]> {
        try {
            return await this.userGiftCardRepository.findByUserId(userId);
        } catch (error) {
            this.handleError('getUserGiftCards', error);
        }
    }

    /**
     * User: Reveal scratch code
     */
    async revealScratchCode(id: string, userId: string): Promise<UserGiftCard> {
        try {
            return await this.userGiftCardRepository.revealScratchCode(id, userId);
        } catch (error) {
            this.handleError('revealScratchCode', error);
        }
    }

    /**
     * User: Mark gift card as used
     */
    async markAsUsed(id: string, userId: string): Promise<UserGiftCard> {
        try {
            // Verify ownership
            const giftCard = await this.userGiftCardRepository.findByCondition({
                userId,
                id,
            } as any);

            if (!giftCard) {
                throw new BadRequestException('Gift card not found');
            }

            return await this.userGiftCardRepository.markAsUsed(id);
        } catch (error) {
            this.handleError('markAsUsed', error);
        }
    }

    /**
     * Get all gift cards (admin)
     */
    async getAllGiftCards(): Promise<GiftCard[]> {
        try {
            return await this.giftCardRepository.findActiveGiftCards();
        } catch (error) {
            this.handleError('getAllGiftCards', error);
        }
    }

    private handleError(context: string, error: unknown): never {
        this.logger.error(`GiftCardsService.${context} failed`, error as Error);
        throw error;
    }
}
