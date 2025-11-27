import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
    Query,
    UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadResult } from 'src/integrations/s3';
import { JwtAuthGuard } from 'src/iam/auth/guards/jwt-auth.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Query('folder') folder?: string,
    ): Promise<UploadResult> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        return this.uploadsService.uploadFile(file, folder);
    }
}
