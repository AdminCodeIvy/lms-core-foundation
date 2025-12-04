import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TaxService } from '../services/taxService';
import { ResponseHandler } from '../utils/response';
import { logger } from '../utils/logger';

const taxService = new TaxService();

export class TaxController {
  async getAssessments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        propertyId: req.query.propertyId as string,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        search: req.query.search as string,
      };

      const result = await taxService.getAssessments(filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await taxService.getAssessment(id);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async createAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await taxService.createAssessment(req.body, req.user!.id);
      logger.info(`Tax assessment created: ${data.assessment_number} by ${req.user!.email}`);
      ResponseHandler.created(res, data, 'Tax assessment created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await taxService.updateAssessment(id, req.body, req.user!.id);
      logger.info(`Tax assessment updated: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Tax assessment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await taxService.deleteAssessment(id, req.user!.id);
      logger.info(`Tax assessment deleted: ${id} by ${req.user!.email}`);
      ResponseHandler.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async archiveAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await taxService.archiveAssessment(id, req.user!.id);
      logger.info(`Tax assessment archived: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'Tax assessment archived successfully');
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await taxService.getPayments(id);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async createPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await taxService.createPayment(req.body, req.user!.id);
      logger.info(`Tax payment created: ${data.receipt_number} by ${req.user!.email}`);
      ResponseHandler.created(res, data, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTaxStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const data = await taxService.getTaxStats(year);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }
}
