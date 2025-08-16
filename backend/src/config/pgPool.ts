import { Pool } from 'pg';
import { env } from '../utils/env';

export const pgPool = new Pool({
  host: env('PG_HOST'),
  port: Number(env('PG_PORT')),
  user: env('PG_USER'),
  password: env('PG_PASSWORD'),
  database: env('PG_DATABASE'),
  max: 10
});
