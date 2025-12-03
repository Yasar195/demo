import { IsString, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    cancelImmediately?: boolean = false; // If false, cancels at period end
}
