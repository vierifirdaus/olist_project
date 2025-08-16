import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(status).json({ message });
};
