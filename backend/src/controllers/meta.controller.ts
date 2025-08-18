// backend/src/controllers/meta.controller.ts

import { Request, Response } from "express";
import { pgPool } from "../config/pgPool";

export const listCategories = async (_req: Request, res: Response) => {
  const q = `
    SELECT DISTINCT product_category_name AS category
    FROM products
    WHERE product_category_name IS NOT NULL
    ORDER BY 1;
  `;
  const { rows } = await pgPool.query(q);
  // Tambahkan tipe { category: string }
  res.json({ data: rows.map((r: { category: string }) => r.category) });
};

export const listStates = async (_req: Request, res: Response) => {
  const q = `
    SELECT DISTINCT customer_state AS state
    FROM customers
    WHERE customer_state IS NOT NULL
    ORDER BY 1;
  `;
  const { rows } = await pgPool.query(q);
  // Tambahkan tipe { state: string }
  res.json({ data: rows.map((r: { state: string }) => r.state) });
};