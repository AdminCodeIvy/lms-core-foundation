import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwtSecret: (process.env.JWT_SECRET || 'change-this-secret') as string,
  jwtExpiry: (process.env.JWT_EXPIRY || '7d') as string,
  jwtRefreshExpiry: (process.env.JWT_REFRESH_EXPIRY || '30d') as string,

  // CORS
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // AGO Integration
  agoApiUrl: process.env.AGO_API_URL || '',
  agoApiKey: process.env.AGO_API_KEY || '',
};

// Validate required environment variables
export const validateEnv = (): void => {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
