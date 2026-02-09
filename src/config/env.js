export const PORT = process.env.PORT || 3000;
export const DB_URL = process.env.DB_URL;
export const JWT_SECRET = process.env.JWT_SECRET;

// Laravel Backend Configuration
export const LARAVEL_WEBHOOK_URL = process.env.LARAVEL_WEBHOOK_URL || 'http://localhost:8000/api/webhook/whatsapp';
export const LARAVEL_WEBHOOK_SECRET = process.env.LARAVEL_WEBHOOK_SECRET || '';
