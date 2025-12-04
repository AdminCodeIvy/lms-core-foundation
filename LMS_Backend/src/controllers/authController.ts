import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AuthService } from '../services/authService';
import { ResponseHandler } from '../utils/response';
import { logger } from '../utils/logger';

const authService = new AuthService();

export class AuthController {
  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      logger.info(`User logged in: ${email}`);
      ResponseHandler.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logout(req.user.id);
        logger.info(`User logged out: ${req.user.email}`);
      }

      ResponseHandler.success(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
      }

      const profile = await authService.getProfile(req.user.id);
      ResponseHandler.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await authService.resetPassword(email);

      ResponseHandler.success(res, null, 'Password reset email sent');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);

      ResponseHandler.success(res, result, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
      }

      ResponseHandler.success(res, { user: req.user });
    } catch (error) {
      next(error);
    }
  }
}
