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

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      throw new AppError('Invalid email or password', 401);
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

      if (error || !user || !user.is_active) {
        throw new AppError('Invalid refresh token', 401);
      }

      const payload = {
        userId: decoded.userId,
        email: decoded.email,
        role: user.role,
      };

      const token = JwtUtil.generateToken(payload);

      return { token };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }
}
