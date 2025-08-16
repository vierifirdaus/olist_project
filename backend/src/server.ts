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
    app.listen(Number(PORT), () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] failed to start:', err);
    process.exit(1);
  }
})();