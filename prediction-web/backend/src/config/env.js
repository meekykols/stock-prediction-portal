import 'dotenv/config';

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(process.env.PORT || 5050),
  mongoUri: required('MONGO_URI'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS || 30),
  },
  clientUrls: (process.env.CLIENT_URLS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
  },
  // Public URL of the customer site (Paystack redirects here after checkout).
  appUrl: (process.env.APP_URL || (process.env.CLIENT_URLS || 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, ''),
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
    apiKey: process.env.ML_SERVICE_API_KEY || '',
  },
  apiFootballKey: process.env.API_FOOTBALL_KEY || '',
};
