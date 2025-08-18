import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  deliveredDaily, deliveredMonthly, statusDaily, topCategories, topCities
} from '../controllers/analytics.controller';

const r = Router();
// r.use(auth); // semua butuh token

r.get('/delivered/daily', deliveredDaily);
r.get('/delivered/monthly', deliveredMonthly);
r.get('/status/daily', statusDaily);
r.get('/top-cities', topCities);
r.get('/top-categories', topCategories);

export default r;
