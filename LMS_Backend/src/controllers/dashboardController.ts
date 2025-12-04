import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DashboardService } from '../services/dashboardService';
import { ResponseHandler } from '../utils/response';

const dashboardService = new DashboardService();

export class DashboardController {
  async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getDashboardStats();
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getTaxStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const data = await dashboardService.getTaxStats(year);
      ResponseHandler.success(res, data);
    } catch (error) {
      next(error);
    }
  }
}
