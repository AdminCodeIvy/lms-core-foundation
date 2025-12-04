import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WorkflowService } from '../services/workflowService';
import { ResponseHandler } from '../utils/response';
import { logger } from '../utils/logger';

const workflowService = new WorkflowService();

export class WorkflowController {
  async getReviewQueue(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        entityType: req.query.entityType as 'customer' | 'property' | undefined,
        status: req.query.status as string,
      };

      const result = await workflowService.getReviewQueue(filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getReviewItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType, id } = req.params;
      
      if (entityType !== 'customer' && entityType !== 'property') {
        ResponseHandler.badRequest(res, 'Invalid entity type. Must be "customer" or "property"');
        return;
      }

      const data = await workflowService.getReviewItem(entityType, id);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async approveCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await workflowService.approveCustomer(id, req.user!.id);
      logger.info(`Customer approved: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Customer approved successfully');
    } catch (error) {
      next(error);
    }
  }

  async rejectCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { feedback } = req.body;

      if (!feedback) {
        ResponseHandler.badRequest(res, 'Rejection feedback is required');
        return;
      }

      const data = await workflowService.rejectCustomer(id, req.user!.id, feedback);
      logger.info(`Customer rejected: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Customer rejected');
    } catch (error) {
      next(error);
    }
  }

  async approveProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await workflowService.approveProperty(id, req.user!.id);
      logger.info(`Property approved: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Property approved successfully');
    } catch (error) {
      next(error);
    }
  }

  async rejectProperty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { feedback } = req.body;

      if (!feedback) {
        ResponseHandler.badRequest(res, 'Rejection feedback is required');
        return;
      }

      const data = await workflowService.rejectProperty(id, req.user!.id, feedback);
      logger.info(`Property rejected: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Property rejected');
    } catch (error) {
      next(error);
    }
  }
}
