import { Injectable, NotFoundException, HttpException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { BaseService } from '../../core/abstracts/base.service';
import { VouchersRepository } from './repositories/vouchers.repository';
import { Voucher } from './entities/voucher.entity';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class VouchersService extends BaseService<Voucher> {
    private readonly logger = new Logger(VouchersService.name);

    constructor(private readonly vouchersRepository: VouchersRepository) {
        super(vouchersRepository);
    }

    /**
     * Find all vouchers with pagination and sorting
     */
    async findAllPaginated(pagination?: PaginationDto): Promise<{ data: Voucher[]; total: number; page: number; totalPages: number }> {
        try {
            const page = pagination?.page ?? 1;
            const limit = pagination?.limit ?? 10;
            const sortBy = pagination?.sortBy;
            const sortOrder: 'asc' | 'desc' = pagination?.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

            const allowedSortFields = ['createdAt', 'updatedAt', 'code', 'discount', 'expiresAt', 'isVerified'] as const;
            type SortField = typeof allowedSortFields[number];

            const resolvedSortBy: SortField = allowedSortFields.includes(sortBy as SortField)
                ? sortBy as SortField
                : 'createdAt';

            const orderBy: Record<string, 'asc' | 'desc'> = {
                [resolvedSortBy]: sortBy ? sortOrder : 'desc',
            };

            return await this.vouchersRepository.findWithPagination(page, limit, {}, orderBy);
        } catch (error) {
            this.handleError('findAllPaginated', error);
        }
    }

    /**
     * Create a new voucher
     */
    async createVoucher(dto: CreateVoucherDto): Promise<Voucher> {
        try {
            const exists = await this.vouchersRepository.codeExists(dto.code);
            if (exists) {
                throw new BadRequestException('Voucher code already exists');
            }

            return await this.vouchersRepository.create({
                ...dto,
                expiresAt: new Date(dto.expiresAt),
            } as Partial<Voucher>);
        } catch (error) {
            this.handleError('createVoucher', error);
        }
    }

    /**
     * Update voucher
     */
    async updateVoucher(id: string, dto: UpdateVoucherDto): Promise<Voucher> {
        try {
            const voucher = await this.vouchersRepository.findById(id);
            if (!voucher) {
                throw new NotFoundException('Voucher not found');
            }

            if (dto.code && dto.code !== voucher.code) {
                const codeTaken = await this.vouchersRepository.codeExists(dto.code);
                if (codeTaken) {
                    throw new BadRequestException('Voucher code already exists');
                }
            }

            const updateData: Partial<Voucher> = { ...dto } as Partial<Voucher>;
            if (dto.expiresAt) {
                updateData.expiresAt = new Date(dto.expiresAt);
            }

            const updated = await this.vouchersRepository.update(id, updateData);
            if (!updated) {
                throw new NotFoundException('Voucher not found');
            }

            return updated;
        } catch (error) {
            this.handleError('updateVoucher', error);
        }
    }

    /**
     * Delete voucher (soft delete)
     */
    async deleteVoucher(id: string): Promise<boolean> {
        try {
            const voucher = await this.vouchersRepository.findById(id);
            if (!voucher) {
                throw new NotFoundException('Voucher not found');
            }

            return await this.vouchersRepository.softDelete(id);
        } catch (error) {
            this.handleError('deleteVoucher', error);
        }
    }

    /**
     * Find voucher by code
     */
    async findByCode(code: string): Promise<Voucher | null> {
        try {
            return await this.vouchersRepository.findByCode(code);
        } catch (error) {
            this.handleError('findByCode', error);
        }
    }

    private handleError(context: string, error: unknown): never {
        this.logger.error(`VouchersService.${context} failed`, error as Error);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException('Internal server error');
    }
}
