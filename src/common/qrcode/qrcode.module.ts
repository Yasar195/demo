import { Module } from '@nestjs/common';
import { QrCodeService } from './qrcode.service';

@Module({
    controllers: [],
    providers: [QrCodeService],
    exports: [QrCodeService],
})
export class QrCodeModule { }
