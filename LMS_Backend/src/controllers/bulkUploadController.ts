import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BulkUploadService } from '../services/bulkUpload';
import { ResponseHandler } from '../utils/response';
import { logger } from '../utils/logger';

const bulkUploadService = new BulkUploadService();

export class BulkUploadController {
  async validateUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bulkUploadService.validateUpload(req.body, req.user!.id);
      logger.info(`Bulk upload validated: ${result.validRecords}/${result.totalRecords} valid by ${req.user!.email}`);
      ResponseHandler.success(res, result, 'Upload validated');
    } catch (error) {
      next(error);
    }
  }

  async commitUpload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bulkUploadService.commitUpload(req.body, req.user!.id);
      logger.info(`Bulk upload committed: ${result.successful} successful, ${result.failed} failed by ${req.user!.email}`);
      
      // Create audit log entry for bulk upload
      try {
        const { supabase } = require('../config/database');
        await supabase.from('audit_logs').insert({
          user_id: req.user!.id,
          action: 'BULK_UPLOAD',
          entity_type: req.body.entityType?.toUpperCase() || 'UNKNOWN',
          entity_id: null,
          details: {
            successful: result.successful,
            failed: result.failed,
            total_records: result.successful + result.failed,
            entity_type: req.body.entityType
          }
        });
      } catch (auditError) {
        logger.warn('Failed to create audit log for bulk upload:', auditError);
      }
      
      ResponseHandler.success(res, result, 'Upload committed successfully');
    } catch (error) {
      next(error);
    }
  }

  async generateTemplate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType } = req.params;
      const { customerType } = req.query;
      
      if (entityType !== 'customer' && entityType !== 'property' && entityType !== 'tax') {
        ResponseHandler.badRequest(res, 'Invalid entity type. Must be "customer", "property", or "tax"');
        return;
      }

      // Validate customer type if provided
      if (entityType === 'customer' && customerType && !['PERSON', 'BUSINESS', 'RENTAL'].includes(customerType as string)) {
        ResponseHandler.badRequest(res, 'Invalid customer type. Must be "PERSON", "BUSINESS", or "RENTAL"');
        return;
      }

      const template = await bulkUploadService.generateTemplate(
        entityType, 
        customerType as 'PERSON' | 'BUSINESS' | 'RENTAL'
      );
      ResponseHandler.success(res, template, 'Template generated');
    } catch (error) {
      next(error);
    }
  }
}
