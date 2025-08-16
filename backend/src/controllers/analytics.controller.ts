import { Request, Response } from 'express';
import { pgPool } from '../config/pgPool';

export const deliveredDaily = async (req: Request, res: Response) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const params: any[] = [];
  let where = 'order_delivered_customer_date IS NOT NULL';

  if (start) { params.push(start); where += ` AND order_delivered_customer_date::date >= $${params.length}`; }
  if (end)   { params.push(end);   where += ` AND order_delivered_customer_date::date <= $${params.length}`; }

  const q = `
    SELECT DATE(order_delivered_customer_date) AS day, COUNT(*)::int AS delivered_count
    FROM orders
    WHERE ${where}
    GROUP BY 1
    ORDER BY 1
  `;
  const { rows } = await pgPool.query(q, params);
  res.json({ data: rows });
};

export const deliveredMonthly = async (req: Request, res: Response) => {
  const year = Number((req.query.year as string) ?? '2017');
  const q = `
    SELECT TO_CHAR(DATE_TRUNC('month', order_delivered_customer_date), 'YYYY-MM') AS month,
           COUNT(*)::int AS delivered_count
    FROM orders
    WHERE order_delivered_customer_date IS NOT NULL
      AND EXTRACT(YEAR FROM order_delivered_customer_date) = $1
    GROUP BY 1
    ORDER BY 1
  `;
  const { rows } = await pgPool.query(q, [year]);
  res.json({ data: rows });
};

export const statusDaily = async (req: Request, res: Response) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const params: any[] = [];
  let where = 'TRUE';
  if (start) { params.push(start); where += ` AND order_purchase_timestamp::date >= $${params.length}`; }
  if (end)   { params.push(end);   where += ` AND order_purchase_timestamp::date <= $${params.length}`; }

  const q = `
    SELECT DATE(order_purchase_timestamp) AS day,
           order_status,
           COUNT(*)::int AS count
    FROM orders
    WHERE ${where}
    GROUP BY 1,2
    ORDER BY 1,2
  `;
  const { rows } = await pgPool.query(q, params);
  res.json({ data: rows });
};

export const topCities = async (req: Request, res: Response) => {
  const limit = Number((req.query.limit as string) ?? '10');
  const { start, end } = req.query as { start?: string; end?: string };
  const params: any[] = [];
  let where = 'TRUE';
  // if (start) { params.push(start); where += ` AND o.order_purchase_timestamp::date >= $${params.length}`; }
  // if (end)   { params.push(end);   where += ` AND o.order_purchase_timestamp::date <= $${params.length}`; }

  const q = `
    SELECT
      customer_city,
      COUNT(DISTINCT customer_unique_id) AS orders_count
    FROM customers
    WHERE ${where}
    GROUP BY customer_city
    ORDER BY orders_count DESC
    LIMIT $${params.length + 1}
  `;
  const { rows } = await pgPool.query(q, [...params, limit]);
  res.json({ data: rows });
};

export const topCategories = async (req: Request, res: Response) => {
  const limit = Number((req.query.limit as string) ?? '10');
  const { start, end } = req.query as { start?: string; end?: string };
  const params: any[] = [];
  let where = 'TRUE';
  if (start) { params.push(start); where += ` AND o.order_purchase_timestamp::date >= $${params.length}`; }
  if (end)   { params.push(end);   where += ` AND o.order_purchase_timestamp::date <= $${params.length}`; }

  const q = `
    SELECT COALESCE(c.product_category_name_english, 'unknown') AS category,
           COUNT(*)::int AS items_count
    FROM order_items oi
    JOIN products p USING (product_id)
    JOIN orders o USING (order_id)
    INNER JOIN category_name_translation c ON p.product_category_name=c.product_category_name
    WHERE ${where}
    GROUP BY category
    ORDER BY items_count DESC
    LIMIT $${params.length + 1}
  `;
  const { rows } = await pgPool.query(q, [...params, limit]);
  res.json({ data: rows });
};
