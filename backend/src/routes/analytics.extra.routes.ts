import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  slaSummary,
  statusFunnel,
  revenueMonthly,
  paymentsMix,
  reviewsSummary,
  basketSize,
  freightScatter,
  leadtimeBreakdown,
  purchaseHeatmap,
  sellersPareto,
} from "../controllers/analytics.extra.controller";

const r = Router();
r.use(auth);

r.get("/sla", slaSummary);
r.get("/funnel", statusFunnel);
r.get("/revenue/monthly", revenueMonthly);
r.get("/payments/mix", paymentsMix);
r.get("/reviews/summary", reviewsSummary);
r.get("/basket/size", basketSize);
r.get("/freight/scatter", freightScatter);
r.get("/leadtime/breakdown", leadtimeBreakdown);
r.get("/purchase/heatmap", purchaseHeatmap);
r.get("/sellers/pareto", sellersPareto);

export default r;
