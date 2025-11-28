import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum QrCodeFormat {
    DATA_URL = 'data_url',
    BUFFER = 'buffer',
    PNG = 'png',
}

export enum ErrorCorrectionLevel {
    LOW = 'L',
    MEDIUM = 'M',
    QUARTILE = 'Q',
    HIGH = 'H',
}

export class GenerateQrCodeDto {
    @IsString()
    @IsNotEmpty()
    text: string;

    @IsEnum(QrCodeFormat)
    @IsOptional()
    format?: QrCodeFormat = QrCodeFormat.DATA_URL;

    @IsEnum(ErrorCorrectionLevel)
    @IsOptional()
    errorCorrectionLevel?: ErrorCorrectionLevel = ErrorCorrectionLevel.MEDIUM;

    @IsNumber()
    @Min(1)
    @Max(40)
    @IsOptional()
    version?: number;

    @IsNumber()
    @Min(1)
    @IsOptional()
    width?: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    margin?: number;

    @IsString()
    @IsOptional()
    color?: string;

    @IsString()
    @IsOptional()
    backgroundColor?: string;
}
