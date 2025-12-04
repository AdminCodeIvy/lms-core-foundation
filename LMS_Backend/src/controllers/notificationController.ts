import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import { ResponseHandler } from '../utils/response';

const notificationService = new NotificationService();

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      };

      const result = await notificationService.getNotifications(req.user!.id, filters);
      ResponseHandler.success(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await notificationService.getUnreadCount(req.user!.id);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await notificationService.markAsRead(req.user!.id, id);
      ResponseHandler.success(res, data, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await notificationService.markAllAsRead(req.user!.id);
      ResponseHandler.success(res, data, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
