import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt';
import { ResponseHandler } from '../utils/response';
import { supabase } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    isActive: boolean;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHandler.unauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.substring(7);
    const decoded = JwtUtil.verifyToken(token);

    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      ResponseHandler.unauthorized(res, 'User not found');
      return;
    }

    if (!user.is_active) {
      ResponseHandler.forbidden(res, 'Account is deactivated');
      return;
    }

    req.user = {
      id: user.id,
      email: decoded.email,
      role: user.role,
      fullName: user.full_name,
      isActive: user.is_active,
    };

    next();
  } catch (error: any) {
    ResponseHandler.unauthorized(res, error.message || 'Invalid token');
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseHandler.unauthorized(res);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      ResponseHandler.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};
