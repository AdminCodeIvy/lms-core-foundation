import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BulkUploadService } from '../services/bulkUploadService';
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
      ResponseHandler.success(res, result, 'Upload committed successfully');
    } catch (error) {
      next(error);
    }
  }

  async generateTemplate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType } = req.params;
      
      if (entityType !== 'customer' && entityType !== 'property' && entityType !== 'tax') {
        ResponseHandler.badRequest(res, 'Invalid entity type. Must be "customer", "property", or "tax"');
        return;
      }

      const template = await bulkUploadService.generateTemplate(entityType);
      ResponseHandler.success(res, template, 'Template generated');
    } catch (error) {
      next(error);
    }
  }
}
