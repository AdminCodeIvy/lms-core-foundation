/**
 * Customer Factory - Routes to appropriate customer handler
 */

import { BusinessCustomerHandler } from './BusinessCustomer';
import { PersonCustomerHandler } from './PersonCustomer';
import { MosqueHospitalCustomerHandler } from './MosqueHospitalCustomer';
import { GovernmentCustomerHandler } from './GovernmentCustomer';
import { NonProfitCustomerHandler } from './NonProfitCustomer';
import { ResidentialCustomerHandler } from './ResidentialCustomer';
import { RentalCustomerHandler } from './RentalCustomer';

import { CustomerType } from '../types';

export class CustomerFactory {
  /**
   * Detect customer type from data
   */
  static detectCustomerType(record: any): CustomerType {
    // Check for explicit customer_type field first
    if (record.customer_type) {
      return record.customer_type.toUpperCase();
    }

    // Auto-detect based on data fields
    if (record.business_name) {
      return 'BUSINESS';
    } else if (record.first_name || record.full_name || record.property_id) {
      return 'PERSON';
    } else if (record.full_department_name) {
      return 'GOVERNMENT';
    } else if (record.full_name || record.full_mosque_hospital_name || record['Full Mosque or Hospital Name']) {
      return 'MOSQUE_HOSPITAL';
    } else if (record.full_non_profit_name || record.ngo_name || record['NGO Name']) {
      return 'NON_PROFIT';
    } else if (record.property_id && (record.size || record.floor || record.file_number || record.address) && 
               !record.full_name && !record.ngo_name && !record.business_name) {
      return 'RESIDENTIAL';
    } else if (record.rental_name) {
      return 'RENTAL';
    }

    // Default to PERSON if unclear
    return 'PERSON';
  }

  /**
   * Get appropriate handler for customer type
   */
  static getHandler(customerType: CustomerType) {
    switch (customerType) {
      case 'BUSINESS':
        return BusinessCustomerHandler;
      case 'PERSON':
        return PersonCustomerHandler;
      case 'GOVERNMENT':
        return GovernmentCustomerHandler;
      case 'MOSQUE_HOSPITAL':
        return MosqueHospitalCustomerHandler;
      case 'NON_PROFIT':
        return NonProfitCustomerHandler;
      case 'RESIDENTIAL':
        return ResidentialCustomerHandler;
      case 'RENTAL':
        return RentalCustomerHandler;
      default:
        throw new Error(`Unknown customer type: ${customerType}`);
    }
  }

  /**
   * Validate customer record
   */
  static validate(record: any, errors: string[]): void {
    const customerType = this.detectCustomerType(record);
    const handler = this.getHandler(customerType);
    handler.validate(record, errors);
  }

  /**
   * Create customer record
   */
  static async create(record: any, userId: string): Promise<any> {
    const customerType = this.detectCustomerType(record);
    const handler = this.getHandler(customerType);
    return await handler.create(record, userId);
  }

  /**
   * Get template for customer type
   */
  static getTemplate(customerType?: CustomerType): { headers: string[]; example: Record<string, any> } {
    if (!customerType) {
      customerType = 'PERSON'; // Default
    }
    
    const handler = this.getHandler(customerType);
    return handler.getTemplate();
  }

  /**
   * Get all available customer types
   */
  static getAvailableTypes(): CustomerType[] {
    return ['PERSON', 'BUSINESS', 'GOVERNMENT', 'MOSQUE_HOSPITAL', 'NON_PROFIT', 'RESIDENTIAL', 'RENTAL']; // ALL IMPLEMENTED! 🎉
  }
}