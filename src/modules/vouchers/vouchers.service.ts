import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseService } from '../../core/abstracts/base.service';
import { VouchersRepository } from './repositories/vouchers.repository';
import { Voucher } from './entities/voucher.entity';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';

@Injectable()
export class VouchersService extends BaseService<Voucher> {
    constructor(private readonly vouchersRepository: VouchersRepository) {
        super(vouchersRepository);
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
