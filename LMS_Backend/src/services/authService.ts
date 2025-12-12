import { supabase } from '../config/database';
import bcrypt from 'bcryptjs';
import { JwtUtil } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
  };
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    let authData: any;

    try {
      // Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Check if it's a network error vs auth error
        if (authError.message?.includes('fetch failed') || 
            authError.message?.includes('timeout') ||
            authError.message?.includes('network')) {
          throw new AppError('Connection error. Please check your internet connection and try again.', 503);
        }
        throw new AppError('Invalid email or password', 401);
      }

      if (!data.user) {
        throw new AppError('Invalid email or password', 401);
      }

      authData = data;
    } catch (error: any) {
      // Handle network timeouts and connection errors
      if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || 
          error.message?.includes('fetch failed') ||
          error.message?.includes('timeout')) {
        throw new AppError('Connection timeout. Please check your internet connection and try again.', 503);
      }
      
      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error;
      }
      
      // Generic network error
      throw new AppError('Connection error. Please try again.', 503);
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, full_name, role, is_active')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new AppError('User profile not found', 404);
    }

    if (!profile.is_active) {
      throw new AppError('Account is deactivated', 403);
    }

    // Generate JWT tokens
    const payload = {
      userId: profile.id,
      email: authData.user.email!,
      role: profile.role,
    };

    const token = JwtUtil.generateToken(payload);
    const refreshToken = JwtUtil.generateRefreshToken(payload);

    return {
      token,
      refreshToken,
      user: {
        id: profile.id,
        email: authData.user.email!,
        fullName: profile.full_name,
        role: profile.role,
        isActive: profile.is_active,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    // Supabase handles session cleanup
    await supabase.auth.signOut();
  }

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, role, is_active, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new AppError('User not found', 404);
    }

    return data;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      throw new AppError('Failed to send reset password email', 500);
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      const decoded = JwtUtil.verifyToken(refreshToken);
      
      // Verify user still exists and is active
      const { data: user, error } = await supabase
        .from('users')
        .select('id, role, is_active')
        .eq('id', decoded.userId)
        .single();

      if (error) {
        // Check if it's a network error
        if (error.message?.includes('fetch failed') || 
            error.message?.includes('timeout') ||
            error.code === 'UND_ERR_CONNECT_TIMEOUT') {
          throw new AppError('Connection error during token refresh. Please try again.', 503);
        }
        throw new AppError('Invalid refresh token', 401);
      }

      if (!user || !user.is_active) {
        throw new AppError('Invalid refresh token', 401);
      }

      const payload = {
        userId: decoded.userId,
        email: decoded.email,
        role: user.role,
      };

      const token = JwtUtil.generateToken(payload);

      return { token };
    } catch (error: any) {
      // Handle network errors gracefully
      if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || 
          error.message?.includes('fetch failed') ||
          error.message?.includes('timeout')) {
        throw new AppError('Connection timeout during token refresh. Please try again.', 503);
      }
      
      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Invalid refresh token', 401);
    }
  }
}
