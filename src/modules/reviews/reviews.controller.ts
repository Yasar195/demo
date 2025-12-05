import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, QueryReviewsDto } from './dto';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    createReview(@CurrentUser() user: User, @Body() createReviewDto: CreateReviewDto) {
        return this.reviewsService.createReview(user.id, createReviewDto);
    }

    @Get()
    getLocationReviews(@Query() query: QueryReviewsDto) {
        return this.reviewsService.getLocationReviews(query);
    }

    @Get('my/:locationId')
    @UseGuards(JwtAuthGuard)
    getMyReviews(@CurrentUser() user: User, @Param('locationId') locationId: string) {
        return this.reviewsService.getUserLocationReviews(user.id, locationId);
    }

    @Get(':id')
    getReview(@Param('id') id: string) {
        return this.reviewsService.getReviewById(id);
    }

    // @Patch(':id')
    // @UseGuards(JwtAuthGuard)
    // updateReview(
    //     @Param('id') id: string,
    //     @CurrentUser() user: User,
    //     @Body() updateReviewDto: UpdateReviewDto,
    // ) {
    //     return this.reviewsService.updateReview(id, user.id, updateReviewDto);
    // }

    // @Delete(':id')
    // @UseGuards(JwtAuthGuard)
    // deleteReview(@Param('id') id: string, @CurrentUser() user: User) {
    //     return this.reviewsService.deleteReview(id, user.id);
    // }
}
