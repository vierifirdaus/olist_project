import app from './app';
import { env } from './utils/env';
import sequelize from './config/sequelize';
import { ensureGeoMaterializedViews } from './config/bootstrap';

const PORT = env('PORT');

(async () => {
  try {
    await ensureGeoMaterializedViews();
    await sequelize.authenticate();
    await sequelize.sync(); // sync tabel users
    app.listen(5002, '0.0.0.0', () => {
      console.log(`[server] listening on http://0.0.0.0:${5002}`);
    });
  } catch (err) {
    console.error('[server] failed to start:', err);
    process.exit(1);
  }
})();