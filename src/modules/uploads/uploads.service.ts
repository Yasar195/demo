import { Injectable, Logger } from '@nestjs/common';
import { S3Service, UploadResult } from 'src/integrations/s3';

@Injectable()
export class UploadsService {
    private readonly logger = new Logger(UploadsService.name);

    constructor(private readonly s3Service: S3Service) {}

    async uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
        try {
            const key = this.s3Service.generateUniqueKey(file.originalname, folder);

            const result = await this.s3Service.upload({
                buffer: file.buffer,
                key,
                contentType: file.mimetype,
                metadata: {
                    originalName: file.originalname,
                    size: file.size.toString(),
                },
            });

            this.logger.log(`File uploaded successfully: ${file.originalname} -> ${result.key}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to upload file: ${file.originalname}`, error);
            throw error;
        }
    }
}
