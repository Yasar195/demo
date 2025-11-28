import { Module, Global } from '@nestjs/common';
import { QrCodeService } from './qrcode/qrcode.service';

@Global()
@Module({
    providers: [QrCodeService],
    exports: [QrCodeService],
})
export class CommonModule { }
