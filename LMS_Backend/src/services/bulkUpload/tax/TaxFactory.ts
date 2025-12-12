/**
 * Tax Factory - Routes to appropriate tax handler
 */

import { TaxAssessmentHandler } from './TaxAssessmentHandler';
import { TaxPaymentHandler } from './TaxPaymentHandler';
import { getValue } from '../utils';

export type TaxType = 'TAX_ASSESSMENT' | 'TAX_PAYMENT';

export class TaxFactory {
  /**
   * Detect tax type from data
   */
  static detectTaxType(record: any): TaxType {
    // Check for explicit tax_type field first
    if (record.tax_type) {
      return record.tax_type.toUpperCase();
    }

    // Auto-detect based on data fields
    const hasAssessmentFields = record.assessed_amount || record.tax_year || record.assessment_date;
    const hasPaymentFields = record.payment_amount || record.payment_date || record.payment_method;

    if (hasPaymentFields) {
      return 'TAX_PAYMENT';
    } else if (hasAssessmentFields) {
      return 'TAX_ASSESSMENT';
    }

    // Default to assessment if unclear
    return 'TAX_ASSESSMENT';
  }

  /**
   * Get appropriate handler for tax type
   */
  static getHandler(taxType: TaxType) {
    switch (taxType) {
      case 'TAX_ASSESSMENT':
        return TaxAssessmentHandler;
      case 'TAX_PAYMENT':
        return TaxPaymentHandler;
      default:
        throw new Error(`Unknown tax type: ${taxType}`);
    }
  }

  /**
   * Validate tax record
   */
  static validate(record: any, errors: string[]): void {
    const taxType = this.detectTaxType(record);
    const handler = this.getHandler(taxType);
    handler.validate(record, errors);
  }

  /**
   * Create tax record
   */
  static async create(record: any, userId: string): Promise<any> {
    const taxType = this.detectTaxType(record);
    const handler = this.getHandler(taxType);
    return await handler.create(record, userId);
  }

  /**
   * Get template for tax type
   */
  static getTemplate(taxType?: TaxType): { headers: string[]; example: Record<string, any> } {
    if (!taxType) {
      taxType = 'TAX_ASSESSMENT'; // Default
    }
    
    const handler = this.getHandler(taxType);
    return handler.getTemplate();
  }

  /**
   * Get all available tax types
   */
  static getAvailableTypes(): TaxType[] {
    return ['TAX_ASSESSMENT', 'TAX_PAYMENT'];
  }
}