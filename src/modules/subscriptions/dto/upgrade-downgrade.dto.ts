import { IsString, IsOptional } from 'class-validator';

export class UpgradeDowngradeDto {
    @IsString()
    newPlanId: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
