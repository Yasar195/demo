import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseService } from '../../core/abstracts/base.service';
import { VouchersRepository } from './repositories/vouchers.repository';
import { Voucher } from './entities/voucher.entity';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class VouchersService extends BaseService<Voucher> {
    constructor(private readonly vouchersRepository: VouchersRepository) {
        super(vouchersRepository);
    }

    /**
     * Find all vouchers with pagination and sorting
     */
    async findAllPaginated(pagination?: PaginationDto): Promise<{ data: Voucher[]; total: number; page: number; totalPages: number }> {
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

        return this.vouchersRepository.findWithPagination(page, limit, {}, orderBy);
    }

    /**
     * Create a new voucher
     */
    async createVoucher(dto: CreateVoucherDto): Promise<Voucher> {
        const exists = await this.vouchersRepository.codeExists(dto.code);
        if (exists) {
            throw new ConflictException('Voucher code already exists');
        }

        return this.vouchersRepository.create({
            ...dto,
            expiresAt: new Date(dto.expiresAt),
        } as Partial<Voucher>);
    }

    /**
     * Update voucher
     */
    async updateVoucher(id: string, dto: UpdateVoucherDto): Promise<Voucher> {
        const voucher = await this.vouchersRepository.findById(id);
        if (!voucher) {
            throw new NotFoundException('Voucher not found');
        }

        if (dto.code && dto.code !== voucher.code) {
            const codeTaken = await this.vouchersRepository.codeExists(dto.code);
            if (codeTaken) {
                throw new ConflictException('Voucher code already exists');
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
    }

    /**
     * Delete voucher (soft delete)
     */
    async deleteVoucher(id: string): Promise<boolean> {
        const voucher = await this.vouchersRepository.findById(id);
        if (!voucher) {
            throw new NotFoundException('Voucher not found');
        }

        return this.vouchersRepository.softDelete(id);
    }

    /**
     * Find voucher by code
     */
    async findByCode(code: string): Promise<Voucher | null> {
        return this.vouchersRepository.findByCode(code);
    }
}
