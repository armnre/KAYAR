import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { pool } from './db/index.js';

const cfg = loadConfig();
const app = await buildApp(cfg);

try {
  await app.listen({ port: cfg.API_PORT, host: cfg.API_HOST });
  app.log.info({ port: cfg.API_PORT }, 'kayar api ready');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    await pool.end();
  } catch (err) {
    app.log.error(err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (err) => app.log.error({ err }, 'unhandled rejection'));
