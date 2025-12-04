import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ActivityLogService } from '../services/activityLogService';
import { ResponseHandler } from '../utils/response';

const activityLogService = new ActivityLogService();

export class ActivityLogController {
  async getActivityLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        action: req.query.action as string,
        userId: req.query.userId as string,
      };

      const result = await activityLogService.getActivityLogs(filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getActivityLogsByEntity(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await activityLogService.getActivityLogsByEntity(entityType, entityId, filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}
