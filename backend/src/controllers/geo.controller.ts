import { Request, Response } from "express";
import { pgPool } from "../config/pgPool";

type QE = string | undefined;

const d = (s?: QE) => (s && s.trim() !== "" ? s : undefined);

export const choroplethStates = async (req: Request, res: Response) => {
  const { start, end, category, metric } = req.query as {
    start?: string; end?: string; category?: string; metric?: "orders" | "delivery_days" | "freight";
  };
  const pars: any[] = [];
  const has = (v?: any) => (v !== undefined && v !== null);

  // Base orders within date range
  const q = `
    WITH base AS (
      SELECT o.order_id,
             o.order_purchase_timestamp,
             o.order_delivered_customer_date,
             c.customer_state AS state
      FROM orders o
      JOIN customers c USING (customer_id)
      WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
        AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
    ),
    -- limit orders by category if provided
    filtered AS (
      SELECT DISTINCT b.order_id
      FROM base b
      LEFT JOIN order_items oi ON oi.order_id = b.order_id
      LEFT JOIN products p ON p.product_id = oi.product_id
      WHERE ($3::text IS NULL OR p.product_category_name = $3)
    ),
    freight AS (
      SELECT oi.order_id, SUM(oi.freight_value) AS freight
      FROM order_items oi
      GROUP BY oi.order_id
    )
    SELECT
      b.state,
      COUNT(*)                AS orders,
      AVG(EXTRACT(EPOCH FROM (b.order_delivered_customer_date - b.order_purchase_timestamp))/86400.0) AS avg_delivery_days,
      COALESCE(SUM(f.freight), 0) AS total_freight
    FROM base b
    JOIN filtered f2 ON f2.order_id = b.order_id
    LEFT JOIN freight f ON f.order_id = b.order_id
    GROUP BY b.state
    ORDER BY orders DESC;
  `;

  pars.push(d(start) ?? null);
  pars.push(d(end) ?? null);
  pars.push(d(category) ?? null);

  const { rows } = await pgPool.query(q, pars);

  // Sesuaikan field 'value' sesuai metric yang diminta (default: orders)
  const m = (metric as string) || "orders";
  const data = rows.map((r: any) => ({
    state: r.state,
    value:
      m === "freight" ? Number(r.total_freight) :
      m === "delivery_days" ? Number(r.avg_delivery_days) :
      Number(r.orders),
    orders: Number(r.orders),
    avg_delivery_days: r.avg_delivery_days ? Number(r.avg_delivery_days) : null,
    total_freight: Number(r.total_freight)
  }));

  res.json({ data });
};

export const customerPoints = async (req: Request, res: Response) => {
  const { start, end, category, limit } = req.query as {
    start?: string; end?: string; category?: string; limit?: string;
  };
  const nLimit = Math.max(100, Math.min(Number(limit || 2000), 10000));

  const q = `
    SELECT
      cz.lat, cz.lng,
      c.customer_city AS city,
      c.customer_state AS state,
      COUNT(DISTINCT o.order_id) AS orders_count
    FROM orders o
    JOIN customers c USING (customer_id)
    LEFT JOIN mv_zip_centroids cz ON cz.zip = c.customer_zip_code_prefix
    LEFT JOIN order_items oi USING (order_id)
    LEFT JOIN products p ON p.product_id = oi.product_id
    WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
      AND ($3::text IS NULL OR p.product_category_name = $3)
      AND cz.lat IS NOT NULL AND cz.lng IS NOT NULL
    GROUP BY cz.lat, cz.lng, c.customer_city, c.customer_state
    ORDER BY orders_count DESC
    LIMIT $4;
  `;
  const { rows } = await pgPool.query(q, [d(start) ?? null, d(end) ?? null, d(category) ?? null, nLimit]);
  res.json({ data: rows });
};

export const flowsSellerToCustomer = async (req: Request, res: Response) => {
  const { start, end, category, minCount } = req.query as {
    start?: string; end?: string; category?: string; minCount?: string;
  };
  const nMin = Math.max(10, Math.min(Number(minCount || 50), 1000));

  const q = `
    WITH sell AS (
      SELECT s.seller_id, s.seller_city, s.seller_state, m.lat, m.lng
      FROM sellers s
      LEFT JOIN mv_city_centroids m
        ON m.city = lower(s.seller_city) AND m.state = s.seller_state
    ),
    cust AS (
      SELECT c.customer_id, c.customer_city, c.customer_state, m.lat, m.lng
      FROM customers c
      LEFT JOIN mv_city_centroids m
        ON m.city = lower(c.customer_city) AND m.state = c.customer_state
    )
    SELECT
      s.seller_city   AS from_city,
      s.seller_state  AS from_state,
      s.lat           AS from_lat,
      s.lng           AS from_lng,
      c.customer_city AS to_city,
      c.customer_state AS to_state,
      c.lat           AS to_lat,
      c.lng           AS to_lng,
      COUNT(DISTINCT o.order_id) AS cnt,
      AVG(oi.freight_value) AS avg_freight,
      AVG(EXTRACT(EPOCH FROM (o.order_delivered_customer_date - o.order_purchase_timestamp))/86400.0) AS avg_delivery_days
    FROM orders o
    JOIN order_items oi USING (order_id)
    LEFT JOIN products p ON p.product_id = oi.product_id
    JOIN sell s ON s.seller_id = oi.seller_id
    JOIN cust c ON c.customer_id = o.customer_id
    WHERE ($1::date IS NULL OR o.order_purchase_timestamp::date >= $1)
      AND ($2::date IS NULL OR o.order_purchase_timestamp::date <= $2)
      AND ($3::text IS NULL OR p.product_category_name = $3)
      AND s.lat IS NOT NULL AND s.lng IS NOT NULL
      AND c.lat IS NOT NULL AND c.lng IS NOT NULL
    GROUP BY 1,2,3,4,5,6,7,8
    HAVING COUNT(DISTINCT o.order_id) >= $4
    ORDER BY cnt DESC
    LIMIT 1000;
  `;
  const { rows } = await pgPool.query(q, [d(start) ?? null, d(end) ?? null, d(category) ?? null, nMin]);
  res.json({ data: rows });
};
