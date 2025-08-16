import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import User from '../models/user.model';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../middleware/auth';
import { env } from '../utils/env';

export const register = async (req: Request, res: Response) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'email, name, password required' });
  }
  const exists = await User.findOne({ where: { email } });
  if (exists) return res.status(StatusCodes.CONFLICT).json({ message: 'Email already used' });

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, name, passwordHash });
  return res.status(StatusCodes.CREATED).json({ id: user.id, email: user.email, name: user.name });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'email & password required' });

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });

  const token = signToken({ uid: user.id, email: user.email });

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: env('COOKIE_SECURE', 'false') === 'true',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });

  return res.json({ id: user.id, email: user.email, name: user.name });
};

export const me = async (req: Request, res: Response) => {
  const authUser = (req as any).user as { uid: string };
  const user = await User.findByPk(authUser.uid, { attributes: ['id', 'email', 'name'] });
  return res.json(user);
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie('access_token', { path: '/' });
  return res.status(StatusCodes.NO_CONTENT).send();
};
