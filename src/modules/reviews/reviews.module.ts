import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './repositories';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [ReviewsController],
    providers: [ReviewsService, ReviewsRepository],
    exports: [ReviewsService],
})
export class ReviewsModule { }
