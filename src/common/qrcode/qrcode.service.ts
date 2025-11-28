import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { Writable } from 'stream';

@Injectable()
export class QrCodeService {
    private readonly logger = new Logger(QrCodeService.name);

    /**
     * Generates a QR code as a Data URL string.
     * @param text The text to encode.
     * @param options QRCode options.
     * @returns Promise resolving to the Data URL.
     */
    async generateQrCode(text: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string> {
        try {
            return await QRCode.toDataURL(text, options);
        } catch (error) {
            this.logger.error('Failed to generate QR code Data URL', error);
            throw error;
        }
    }

    /**
     * Generates a QR code as a Buffer.
     * @param text The text to encode.
     * @param options QRCode options.
     * @returns Promise resolving to the Buffer.
     */
    async generateQrCodeBuffer(text: string, options?: QRCode.QRCodeToBufferOptions): Promise<Buffer> {
        try {
            return await QRCode.toBuffer(text, options);
        } catch (error) {
            this.logger.error('Failed to generate QR code Buffer', error);
            throw error;
        }
    }

    /**
     * Writes a QR code to a writable stream.
     * @param stream The writable stream.
     * @param text The text to encode.
     * @param options QRCode options.
     */
    async generateQrCodeStream(stream: Writable, text: string, options?: QRCode.QRCodeRenderersOptions): Promise<void> {
        try {
            await QRCode.toFileStream(stream, text, options);
        } catch (error) {
            this.logger.error('Failed to generate QR code stream', error);
            throw error;
        }
    }
}
