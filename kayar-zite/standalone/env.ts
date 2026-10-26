// Runs before any endpoint module is evaluated (imported first in server.ts)
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
if (PUBLIC_URL) {
  process.env.ZITE_APP_URL ||= PUBLIC_URL;
  process.env.KAYAR_UPLOAD_HOST ||= new URL(PUBLIC_URL).hostname;
}
export {};
