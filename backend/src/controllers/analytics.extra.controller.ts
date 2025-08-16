import { Request, Response } from "express";
import { pgPool } from "../config/pgPool";

// Helper ambil query param aman
const qstr = (v?: any) => (v === undefined || v === "" ? null : String(v));
const qint = (v?: any, def = 0) => (v === undefined || v === "" ? def : Number(v));

/** 1) SLA summary */
export async function slaSummary(req: Request, res: Response) {
  const { start, end } = req.query as any;
  const sql = `
    SELECT
      AVG( (o.order_delivered_customer_date <= o.order_estimated_delivery_date)::int )::float AS hit_rate,
      AVG( GREATEST(0, EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_estimated_delivery_date))/86400.0) )::float AS avg_late_days,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY GREATEST(0, EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_estimated_delivery_date))/86400.0))::float AS p50_late_days,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY GREATEST(0, EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_estimated_delivery_date))/86400.0))::float AS p90_late_days
    FROM orders o
    WHERE o.order_delivered_customer_date IS NOT NULL
      AND o.order_estimated_delivery_date IS NOT NULL
      AND ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2);
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end)]);
  res.json({ data: rows[0] || null });
}

/** 2) Status funnel */
export async function statusFunnel(req: Request, res: Response) {
  const { start, end } = req.query as any;
  const sql = `
    SELECT
      COUNT(*)::int AS purchased,
      COUNT(*) FILTER(WHERE o.order_approved_at IS NOT NULL)::int AS approved,
      COUNT(*) FILTER(WHERE o.order_delivered_carrier_date IS NOT NULL)::int AS shipped,
      COUNT(*) FILTER(WHERE o.order_delivered_customer_date IS NOT NULL)::int AS delivered,
      COUNT(*) FILTER(WHERE o.order_status='canceled')::int AS canceled
    FROM orders o
    WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2);
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end)]);
  res.json({ data: rows[0] || null });
}

/** 3) Revenue monthly (GMV & AOV) */
export async function revenueMonthly(req: Request, res: Response) {
  const { year } = req.query as any;
  const sql = `
    WITH orders_month AS (
      SELECT o.order_id, DATE_TRUNC('month', o.order_purchase_timestamp) AS m
      FROM orders o WHERE EXTRACT(YEAR FROM o.order_purchase_timestamp) = $1
    ),
    per_order AS (
      SELECT oi.order_id, SUM(oi.price)::float AS price_sum
      FROM order_items oi GROUP BY oi.order_id
    )
    SELECT TO_CHAR(m, 'YYYY-MM') AS month,
           SUM(po.price_sum)::float AS gmv,
           (SUM(po.price_sum) / NULLIF(COUNT(DISTINCT om.order_id),0))::float AS aov
    FROM orders_month om
    LEFT JOIN per_order po ON po.order_id = om.order_id
    GROUP BY month
    ORDER BY month;
  `;
  const { rows } = await pgPool.query(sql, [qint(year, 2017)]);
  res.json({ data: rows });
}

/** 4) Payment mix */
export async function paymentsMix(req: Request, res: Response) {
  const { start, end } = req.query as any;
  const sql = `
    SELECT op.payment_type,
           COUNT(*)::int AS count,
           AVG(op.payment_installments)::float AS avg_installments
    FROM order_payments op
    JOIN orders o USING (order_id)
    WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
    GROUP BY op.payment_type
    ORDER BY count DESC;
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end)]);
  res.json({ data: rows });
}

/** 5) Review summary (histogram + monthly avg) */
export async function reviewsSummary(req: Request, res: Response) {
  const { start, end } = req.query as any;
  const histSql = `
    SELECT review_score::int AS score, COUNT(*)::int AS count
    FROM order_reviews
    WHERE ($1::date IS NULL OR review_creation_date::date >= $1)
      AND ($2::date IS NULL OR review_creation_date::date <= $2)
    GROUP BY score ORDER BY score;
  `;
  const trendSql = `
    SELECT TO_CHAR(DATE_TRUNC('month', review_creation_date),'YYYY-MM') AS month,
           AVG(review_score)::float AS avg_score
    FROM order_reviews
    WHERE ($1::date IS NULL OR review_creation_date::date >= $1)
      AND ($2::date IS NULL OR review_creation_date::date <= $2)
    GROUP BY month ORDER BY month;
  `;
  const [hist, trend] = await Promise.all([
    pgPool.query(histSql, [qstr(start), qstr(end)]),
    pgPool.query(trendSql, [qstr(start), qstr(end)]),
  ]);
  res.json({ data: { histogram: hist.rows, trend: trend.rows } });
}

/** 6) Basket size (items per order) */
export async function basketSize(req: Request, res: Response) {
  const { start, end } = req.query as any;
  const sql = `
    SELECT items::int, COUNT(*)::int AS count
    FROM (
      SELECT o.order_id, COUNT(oi.order_item_id) AS items
      FROM orders o
      JOIN order_items oi USING(order_id)
      WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
        AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
      GROUP BY o.order_id
    ) t
    GROUP BY items ORDER BY items;
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end)]);
  res.json({ data: rows });
}

/** 7) Freight vs Price scatter (limited) */
export async function freightScatter(req: Request, res: Response) {
  const { start, end, limit } = req.query as any;
  const n = Math.min(Math.max(qint(limit, 1500), 100), 10000);
  const sql = `
    SELECT o.order_id,
           SUM(oi.price)::float   AS price,
           SUM(oi.freight_value)::float AS freight
    FROM orders o
    JOIN order_items oi USING(order_id)
    WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
    GROUP BY o.order_id
    ORDER BY o.order_id
    LIMIT $3;
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end), n]);
  res.json({ data: rows });
}

/** 8) Lead-time breakdown (avg days per stage) */
export async function leadtimeBreakdown(req: Request, res: Response) {
  const { start, end } = req.query as any;
  const sql = `
    SELECT
      AVG(EXTRACT(EPOCH FROM (o.order_approved_at - o.order_purchase_timestamp))/86400.0)::float AS purchase_to_approved,
      AVG(EXTRACT(EPOCH FROM (o.order_delivered_carrier_date - o.order_approved_at))/86400.0)::float AS approved_to_carrier,
      AVG(EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_delivered_carrier_date))/86400.0)::float AS carrier_to_customer
    FROM orders o
    WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2);
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end)]);
  res.json({ data: rows[0] || null });
}

/** 9) Purchase heatmap (DOW x HOUR) */
export async function purchaseHeatmap(req: Request, res: Response) {
  const { start, end } = req.query as any;
  const sql = `
    SELECT EXTRACT(DOW FROM o.order_purchase_timestamp)::int AS dow,
           EXTRACT(HOUR FROM o.order_purchase_timestamp)::int AS hr,
           COUNT(*)::int AS count
    FROM orders o
    WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
    GROUP BY 1,2
    ORDER BY 1,2;
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end)]);
  res.json({ data: rows });
}

/** 10) Sellers Pareto (Top N) */
export async function sellersPareto(req: Request, res: Response) {
  const { start, end, limit } = req.query as any;
  const n = Math.min(Math.max(qint(limit, 50), 10), 500);
  const sql = `
    WITH seller_gmv AS (
      SELECT oi.seller_id, SUM(oi.price)::float AS gmv
      FROM orders o
      JOIN order_items oi USING(order_id)
      WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
        AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
      GROUP BY oi.seller_id
    ),
    ranked AS (
      SELECT seller_id, gmv,
             SUM(gmv) OVER (ORDER BY gmv DESC) AS cum_gmv,
             SUM(gmv) OVER () AS total_gmv
      FROM seller_gmv
      ORDER BY gmv DESC
      LIMIT $3
    )
    SELECT seller_id, gmv, (cum_gmv/NULLIF(total_gmv,0))::float AS cum_share
    FROM ranked;
  `;
  const { rows } = await pgPool.query(sql, [qstr(start), qstr(end), n]);
  res.json({ data: rows });
}
