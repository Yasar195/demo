import { IRepository } from '../interfaces/repository.interface';

export abstract class BaseService<T> {
    constructor(protected readonly repository: IRepository<T>) { }

    async findAll(): Promise<T[]> {
        return this.repository.findAll();
    }

    async findById(id: string): Promise<T | null> {
        return this.repository.findById(id);
    }

    async create(entity: Partial<T>): Promise<T> {
        return this.repository.create(entity);
    }

    async update(id: string, entity: Partial<T>): Promise<T | null> {
        return this.repository.update(id, entity);
    }

    async delete(id: string): Promise<boolean> {
        return this.repository.delete(id);
    }

    async findByCondition(condition: Partial<T>): Promise<T[]> {
        return this.repository.findByCondition(condition);
    }

    async findOneByCondition(condition: Partial<T>): Promise<T | null> {
        return this.repository.findOneByCondition(condition);
    }
}
