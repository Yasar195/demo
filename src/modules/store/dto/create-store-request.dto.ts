import { IsString, IsEmail, IsOptional, IsNotEmpty, IsObject, IsUrl, MinLength, IsPhoneNumber, IsNumber, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class InitialLocationDto {
    @IsString()
    @IsOptional()
    branchName?: string;

    @IsBoolean()
    @IsOptional()
    isMainBranch?: boolean = true;

    @IsNumber()
    @IsNotEmpty()
    latitude: number;

    @IsNumber()
    @IsNotEmpty()
    longitude: number;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsNotEmpty()
    country: string;

    @IsString()
    @IsOptional()
    postalCode?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsObject()
    @IsOptional()
    operatingHours?: Record<string, any>;
}

export class CreateStoreRequestDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    storeName: string;

    @IsString()
    @IsOptional()
    storeDescription?: string;

    @IsString()
    @IsOptional()
    @IsUrl()
    storeLogo?: string;

    @IsString()
    @IsOptional()
    @IsUrl()
    storeWebsite?: string;

    @IsEmail()
    @IsOptional()
    storeEmail?: string;

    @IsString()
    @IsOptional()
    storePhone?: string;

    @ValidateNested()
    @Type(() => InitialLocationDto)
    @IsNotEmpty()
    initialLocationData: InitialLocationDto;

    @IsObject()
    @IsOptional()
    businessDocuments?: Record<string, any>;

    @IsString()
    @IsOptional()
    additionalNotes?: string;
}
