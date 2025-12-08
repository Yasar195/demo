import { IsString, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateLocationRequestDto {
    @IsOptional()
    @IsString()
    branchName?: string;

    @IsOptional()
    @IsBoolean()
    isMainBranch?: boolean = false;

    @IsNumber()
    latitude: number;

    @IsNumber()
    longitude: number;

    @IsString()
    address: string;

    @IsString()
    city: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsString()
    country: string;

    @IsOptional()
    @IsString()
    postalCode?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsObject()
    operatingHours?: any;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsString()
    additionalNotes?: string;
}
