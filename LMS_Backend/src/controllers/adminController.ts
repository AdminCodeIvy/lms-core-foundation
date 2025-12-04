import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AdminService } from '../services/adminService';
import { ResponseHandler } from '../utils/response';
import { logger } from '../utils/logger';

const adminService = new AdminService();

export class AdminController {
  async getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        role: req.query.role as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string,
      };

      const result = await adminService.getUsers(filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await adminService.getUser(id);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.createUser(req.body);
      logger.info(`User created: ${data.full_name} by ${req.user!.email}`);
      ResponseHandler.created(res, data, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await adminService.updateUser(id, req.body);
      logger.info(`User updated: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await adminService.deactivateUser(id);
      logger.info(`User deactivated: ${id} by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        userId: req.query.userId as string,
        action: req.query.action as string,
      };

      const result = await adminService.getAuditLogs(filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getAGOSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getAGOSettings();
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async updateAGOSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.updateAGOSettings(req.body);
      logger.info(`AGO settings updated by ${req.user!.email}`);
      ResponseHandler.success(res, data, 'AGO settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async testAGOConnection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.testAGOConnection();
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }
}
