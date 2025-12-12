/**
 * Main Bulk Upload Service - Orchestrates all bulk upload operations
 */

import { AppError } from '../../middleware/errorHandler';
import { CustomerFactory } from './customers/CustomerFactory';
import { PropertyHandler } from './properties/PropertyHandler';
import { TaxFactory, TaxType } from './tax/TaxFactory';
import { BulkUploadData, ValidationResult, CommitResult, CustomerType } from './types';

export class BulkUploadService {
  /**
   * Validates bulk upload data before committing to database
   */
  async validateUpload(uploadData: BulkUploadData, userId: string): Promise<ValidationResult> {
    const { entityType, data } = uploadData;
    const errors: any[] = [];
    const validRecords: any[] = [];

    // Validate each record
    data.forEach((record, index) => {
      const recordErrors = this.validateRecord(entityType, record, index);
      
      if (recordErrors.length > 0) {
        errors.push({
          row: index + 1,
          errors: recordErrors,
          data: record,
        });
      } else {
        validRecords.push(record);
      }
    });

    return {
      totalRecords: data.length,
      validRecords: validRecords.length,
      invalidRecords: errors.length,
      errors,
      canCommit: validRecords.length > 0,
      validData: validRecords,
    };
  }

  /**
   * Commits validated bulk upload data to the database
   */
  async commitUpload(uploadData: any, userId: string): Promise<CommitResult> {
    const { entityType, validData } = uploadData;

    if (!validData || validData.length === 0) {
      throw new AppError('No valid records to commit', 400);
    }

    const results: CommitResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each valid record
    for (let i = 0; i < validData.length; i++) {
      try {
        console.log(`Processing record ${i + 1}/${validData.length}:`, JSON.stringify(validData[i]).substring(0, 100));
        await this.createRecord(entityType, validData[i], userId);
        results.successful++;
        console.log(`✓ Record ${i + 1} created successfully`);
      } catch (error: any) {
        console.error(`✗ Record ${i + 1} failed:`, error.message);
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: validData[i],
        });
      }
    }

    return results;
  }

  /**
   * Validates a single record based on entity type
   */
  private validateRecord(entityType: string, record: any, index: number): string[] {
    const errors: string[] = [];

    try {
      switch (entityType) {
        case 'customer':
          CustomerFactory.validate(record, errors);
          break;

        case 'property':
          PropertyHandler.validate(record, errors);
          break;

        case 'tax':
          // TODO: Implement tax validation
          errors.push('Tax validation not implemented yet');
          break;

        default:
          errors.push(`Unknown entity type: ${entityType}`);
      }
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
    }

    return errors;
  }

  /**
   * Creates a record based on entity type
   */
  private async createRecord(entityType: string, record: any, userId: string): Promise<any> {
    switch (entityType) {
      case 'customer':
        return await CustomerFactory.create(record, userId);

      case 'property':
        return await PropertyHandler.create(record, userId);

      case 'tax':
        // TODO: Implement tax creation
        throw new Error('Tax creation not implemented yet');

      default:
        throw new AppError('Invalid entity type', 400);
    }
  }

  /**
   * Generates template for bulk upload
   */
  async generateTemplate(entityType: string, customerType?: CustomerType): Promise<{ headers: string[]; example: Record<string, any> }> {
    switch (entityType) {
      case 'customer':
        return CustomerFactory.getTemplate(customerType);

      case 'property':
        return PropertyHandler.getTemplate();

      case 'tax':
        // TODO: Implement tax template
        return {
          headers: ['property_id', 'tax_year', 'assessed_amount', 'exemption_amount', 'due_date'],
          example: {
            property_id: 'uuid-here',
            tax_year: 2025,
            assessed_amount: 10000,
            exemption_amount: 0,
            due_date: '2025-12-31',
          },
        };

      default:
        throw new AppError('Invalid entity type', 400);
    }
  }

  /**
   * Get available customer types
   */
  getAvailableCustomerTypes(): CustomerType[] {
    return CustomerFactory.getAvailableTypes();
  }
}