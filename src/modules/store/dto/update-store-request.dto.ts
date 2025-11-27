import { IsString, IsEmail, IsOptional, IsObject, IsUrl, MinLength } from 'class-validator';

export class UpdateStoreRequestDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    storeName?: string;

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

    @IsObject()
    @IsOptional()
    initialLocationData?: {
        branchName?: string;
        isMainBranch?: boolean;
        latitude: number;
        longitude: number;
        address: string;
        city: string;
        state?: string;
        country: string;
        postalCode?: string;
        phone?: string;
        email?: string;
        operatingHours?: any;
    };

    @IsObject()
    @IsOptional()
    businessDocuments?: Record<string, any>;

    @IsString()
    @IsOptional()
    additionalNotes?: string;
}
