import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { GiftCardsService } from './gift-cards.service';
import {
    CreateGiftCardDto,
    AssignPositionGiftCardDto,
} from './dto';

@Controller('gift-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GiftCardsController {
    constructor(private readonly giftCardsService: GiftCardsService) { }

    // ==================== User Endpoints ====================

    @Get('me')
    async getMyGiftCards(@CurrentUser() user: User) {
        return this.giftCardsService.getUserGiftCards(user.id);
    }

    @Patch(':id/reveal')
    async revealScratchCode(
        @Param('id') id: string,
        @CurrentUser() user: User,
    ) {
        return this.giftCardsService.revealScratchCode(id, user.id);
    }

    @Patch(':id/use')
    async markAsUsed(
        @Param('id') id: string,
        @CurrentUser() user: User,
    ) {
        return this.giftCardsService.markAsUsed(id, user.id);
    }

    // ==================== Admin Endpoints ====================

    @Post()
    @Roles(UserRole.ADMIN)
    async createGiftCard(@Body() dto: CreateGiftCardDto) {
        return this.giftCardsService.createGiftCard(dto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    async getAllGiftCards() {
        return this.giftCardsService.getAllGiftCards();
    }

    @Get('loyalty/streak')
    @Roles(UserRole.USER)
    async getUserLoyaltyStreak(@CurrentUser() user: User) {
        return this.giftCardsService.getUserLoyaltyStreak(user.id);
    }

    // @Post('vouchers/:voucherId/default')
    // @Roles(UserRole.ADMIN)
    // async assignDefaultGiftCard(
    //     @Param('voucherId') voucherId: string,
    //     @Body() dto: AssignPositionGiftCardDto,
    // ) {
    //     return this.giftCardsService.assignDefaultGiftCard(voucherId, dto);
    // }

    // @Post('vouchers/:voucherId/position')
    // @Roles(UserRole.ADMIN)
    // async assignPositionGiftCard(
    //     @Param('voucherId') voucherId: string,
    //     @Body() dto: AssignPositionGiftCardDto,
    // ) {
    //     return this.giftCardsService.assignPositionGiftCard(voucherId, dto);
    // }

    // @Get('vouchers/:voucherId/mappings')
    // @Roles(UserRole.ADMIN)
    // async getVoucherMappings(@Param('voucherId') voucherId: string) {
    //     return this.giftCardsService.getVoucherMappings(voucherId);
    // }
}
