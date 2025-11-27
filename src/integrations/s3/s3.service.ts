import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface UploadOptions {
    buffer: Buffer;
    key: string;
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
}

export interface UploadResult {
    key: string;
    url: string;
    bucket: string;
    etag?: string;
}

export interface SignedUrlOptions {
    expiresIn?: number; // in seconds, default 3600 (1 hour)
}

@Injectable()
export class S3Service implements OnModuleInit {
    private readonly logger = new Logger(S3Service.name);
    private s3Client: S3Client;
    private bucket: string;
    private region: string;
    private isConfigured = false;

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        try {
            const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
            const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
            this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
            this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'default-bucket';

            if (!accessKeyId || !secretAccessKey || !this.bucket) {
                this.logger.warn('AWS S3 credentials not configured. S3 upload will be disabled.');
                return;
            }

            this.s3Client = new S3Client({
                region: this.region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

            this.isConfigured = true;
            this.logger.log(`AWS S3 initialized successfully. Bucket: ${this.bucket}, Region: ${this.region}`);
        } catch (error) {
            this.logger.error('Failed to initialize AWS S3', error);
            this.isConfigured = false;
        }
    }

    /**
     * Upload a file to S3
     * @param options Upload options including buffer, key, and metadata
     * @returns Upload result with URL and key
     */
    async upload(options: UploadOptions): Promise<UploadResult> {
        if (!this.isConfigured) {
            throw new Error('S3 is not configured');
        }

        try {
            const { buffer, key, contentType, metadata, acl } = options;

            // Use multipart upload for files larger than 5MB
            if (buffer.length > 5 * 1024 * 1024) {
                const upload = new Upload({
                    client: this.s3Client,
                    params: {
                        Bucket: this.bucket,
                        Key: key,
                        Body: buffer,
                        ContentType: contentType,
                        Metadata: metadata,
                        ACL: acl,
                    },
                });

                const result = await upload.done();
                this.logger.log(`File uploaded successfully: ${key}`);

                return {
                    key,
                    url: this.getPublicUrl(key),
                    bucket: this.bucket,
                    etag: result.ETag,
                };
            }

            // Use regular put for smaller files
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                Metadata: metadata,
                ACL: acl,
            });

            const result = await this.s3Client.send(command);
            this.logger.log(`File uploaded successfully: ${key}`);

            return {
                key,
                url: this.getPublicUrl(key),
                bucket: this.bucket,
                etag: result.ETag,
            };
        } catch (error) {
            this.logger.error(`Failed to upload file: ${options.key}`, error);
            throw error;
        }
    }

    /**
     * Upload from stream (useful for large files)
     * @param stream Readable stream
     * @param key S3 key
     * @param contentType Content type
     * @returns Upload result
     */
    async uploadStream(
        stream: ReadableStream,
        key: string,
        contentType?: string,
    ): Promise<UploadResult> {
        if (!this.isConfigured) {
            throw new Error('S3 is not configured');
        }

        try {
            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: this.bucket,
                    Key: key,
                    Body: stream,
                    ContentType: contentType,
                },
            });

            const result = await upload.done();
            this.logger.log(`Stream uploaded successfully: ${key}`);

            return {
                key,
                url: this.getPublicUrl(key),
                bucket: this.bucket,
                etag: result.ETag,
            };
        } catch (error) {
            this.logger.error(`Failed to upload stream: ${key}`, error);
            throw error;
        }
    }

    /**
     * Delete a file from S3
     * @param key S3 key to delete
     * @returns true if successful
     */
    async delete(key: string): Promise<boolean> {
        if (!this.isConfigured) {
            throw new Error('S3 is not configured');
        }

        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.s3Client.send(command);
            this.logger.log(`File deleted successfully: ${key}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete file: ${key}`, error);
            throw error;
        }
    }

    /**
     * Delete multiple files from S3
     * @param keys Array of S3 keys to delete
     * @returns Number of files deleted
     */
    async deleteMany(keys: string[]): Promise<number> {
        if (!this.isConfigured) {
            throw new Error('S3 is not configured');
        }

        let deletedCount = 0;

        for (const key of keys) {
            try {
                await this.delete(key);
                deletedCount++;
            } catch (error) {
                this.logger.error(`Failed to delete file in batch: ${key}`, error);
            }
        }

        this.logger.log(`Deleted ${deletedCount} out of ${keys.length} files`);
        return deletedCount;
    }

    /**
     * Get a presigned URL for temporary access to a private file
     * @param key S3 key
     * @param options Signed URL options
     * @returns Presigned URL
     */
    async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
        if (!this.isConfigured) {
            throw new Error('S3 is not configured');
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            const url = await getSignedUrl(this.s3Client, command, {
                expiresIn: options?.expiresIn || 3600, // 1 hour default
            });

            this.logger.log(`Generated signed URL for: ${key}`);
            return url;
        } catch (error) {
            this.logger.error(`Failed to generate signed URL: ${key}`, error);
            throw error;
        }
    }

    /**
     * Check if a file exists in S3
     * @param key S3 key
     * @returns true if file exists
     */
    async exists(key: string): Promise<boolean> {
        if (!this.isConfigured) {
            throw new Error('S3 is not configured');
        }

        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw error;
        }
    }

    /**
     * List files in a folder/prefix
     * @param prefix Folder prefix
     * @param maxKeys Maximum number of keys to return
     * @returns Array of file keys
     */
    async listFiles(prefix?: string, maxKeys = 1000): Promise<string[]> {
        if (!this.isConfigured) {
            throw new Error('S3 is not configured');
        }

        try {
            const command = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
                MaxKeys: maxKeys,
            });

            const result = await this.s3Client.send(command);
            const keys = result.Contents?.map((obj) => obj.Key).filter((key): key is string => !!key) || [];

            this.logger.log(`Listed ${keys.length} files with prefix: ${prefix || 'root'}`);
            return keys;
        } catch (error) {
            this.logger.error(`Failed to list files with prefix: ${prefix}`, error);
            throw error;
        }
    }

    /**
     * Get public URL for a file (works only if bucket/file is public)
     * @param key S3 key
     * @returns Public URL
     */
    getPublicUrl(key: string): string {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    /**
     * Generate a unique file key with timestamp and random string
     * @param originalName Original filename
     * @param folder Optional folder path
     * @returns Unique S3 key
     */
    generateUniqueKey(originalName: string, folder?: string): string {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = originalName.split('.').pop();
        const nameWithoutExt = originalName.replace(`.${extension}`, '');
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        const filename = `${sanitizedName}-${timestamp}-${randomString}.${extension}`;

        return folder ? `${folder}/${filename}` : filename;
    }

    /**
     * Get the configured bucket name
     * @returns Bucket name
     */
    getBucket(): string {
        return this.bucket;
    }

    /**
     * Get the configured region
     * @returns AWS region
     */
    getRegion(): string {
        return this.region;
    }

    /**
     * Check if S3 is configured and ready
     * @returns true if configured
     */
    isReady(): boolean {
        return this.isConfigured;
    }
}
