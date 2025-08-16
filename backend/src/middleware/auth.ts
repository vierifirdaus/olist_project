// src/middleware/auth.ts
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload as LibJwtPayload, SignOptions } from 'jsonwebtoken';

type MyJwtPayload = { uid: string; email: string };

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('Missing env JWT_SECRET');

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '1d') as SignOptions['expiresIn'];

export const signToken = (payload: MyJwtPayload) => {
  const opts: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, opts);
};

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as LibJwtPayload & MyJwtPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};