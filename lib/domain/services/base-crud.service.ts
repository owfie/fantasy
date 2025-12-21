/**
 * Base CRUD Service
 * Provides generic CRUD operations following SOLID principles
 * Can be extended for specific entity services
 */

import { UnitOfWork } from '../unit-of-work';
import { IRepository } from '../repositories/base.repository';

export interface IBaseCrudService<T, TInsert, TUpdate> {
  create(data: TInsert): Promise<T>;
  update(data: TUpdate): Promise<T>;
  deleteSoft(id: string): Promise<void>;
  deleteHard(id: string): Promise<void>;
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
}

/**
 * Base CRUD Service implementation
 * Provides reusable CRUD operations that can be extended
 */
export abstract class BaseCrudService<T, TInsert, TUpdate> implements IBaseCrudService<T, TInsert, TUpdate> {
  protected uow: UnitOfWork;
  protected repository: IRepository<T, TInsert, TUpdate>;

  constructor(uow: UnitOfWork, repository: IRepository<T, TInsert, TUpdate>) {
    this.uow = uow;
    this.repository = repository;
  }

  /**
   * Create a new entity
   */
  async create(data: TInsert): Promise<T> {
    return this.uow.execute(async () => {
      return await this.repository.create(data);
    });
  }

  /**
   * Update an existing entity
   */
  async update(data: TUpdate): Promise<T> {
    return this.uow.execute(async () => {
      // Verify entity exists
      const existing = await this.repository.findById((data as any).id);
      if (!existing) {
        throw new Error('Entity not found');
      }

      return await this.repository.update(data);
    });
  }

  /**
   * Soft delete - marks entity as inactive/deleted
   * Override in subclasses to implement soft delete logic
   */
  async deleteSoft(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const entity = await this.repository.findById(id);
      if (!entity) {
        throw new Error('Entity not found');
      }

      // Try to update with is_active = false or deleted_at
      // This is a generic implementation - subclasses should override
      const updateData = {
        id,
        is_active: false,
      } as TUpdate;

      await this.repository.update(updateData);
    });
  }

  /**
   * Hard delete - permanently removes entity
   * Override in subclasses to add validation (e.g., check for related entities)
   */
  async deleteHard(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const entity = await this.repository.findById(id);
      if (!entity) {
        throw new Error('Entity not found');
      }

      // Validate before hard delete (override in subclasses)
      await this.validateBeforeHardDelete(id);

      await this.repository.delete(id);
    });
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return await this.repository.findById(id);
  }

  /**
   * Find all entities with optional filter
   */
  async findAll(filter?: Partial<T>): Promise<T[]> {
    return await this.repository.findAll(filter);
  }

  /**
   * Validate before hard delete
   * Override in subclasses to add entity-specific validation
   */
  protected async validateBeforeHardDelete(id: string): Promise<void> {
    // Default: no validation
    // Subclasses should override to check for related entities, etc.
  }
}

