import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import geoRoutes from './routes/geo.routes';
import metaRoutes from './routes/meta.routes';
import analyticsRoutes from './routes/analytics.routes';
import analyticsExtraRoutes from "./routes/analytics.extra.routes";
import { errorHandler } from './middleware/error';
import { env } from './utils/env';

const app: Application = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS
const CORS_ORIGIN = env('CORS_ORIGIN', 'http://localhost:5173');
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'olist-backend' });
});
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use("/api/analytics", analyticsExtraRoutes);
app.use('/api/geo',geoRoutes);
app.use('/api/meta', metaRoutes);

// error handler terakhir
app.use(errorHandler);

export default app;
