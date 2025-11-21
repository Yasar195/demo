import { IRepository } from '../interfaces/repository.interface';

export abstract class BaseRepository<T> implements IRepository<T> {
    abstract findAll(): Promise<T[]>;
    abstract findById(id: string): Promise<T | null>;
    abstract create(entity: Partial<T>): Promise<T>;
    abstract update(id: string, entity: Partial<T>): Promise<T | null>;
    abstract delete(id: string): Promise<boolean>;
    abstract findByCondition(condition: Partial<T>): Promise<T[]>;
    abstract findOneByCondition(condition: Partial<T>): Promise<T | null>;

    /**
     * Soft delete - sets deletedAt timestamp
     */
    async softDelete(id: string): Promise<boolean> {
        const entity = await this.update(id, { deletedAt: new Date() } as unknown as Partial<T>);
        return entity !== null;
    }

    /**
     * Check if entity exists by id
     */
    async exists(id: string): Promise<boolean> {
        const entity = await this.findById(id);
        return entity !== null;
    }
}
