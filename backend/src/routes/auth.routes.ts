import { Router } from 'express';
import { login, me, register, logout } from '../controllers/auth.controller';
import { auth } from '../middleware/auth';

const r = Router();

r.post('/register', register);
r.post('/login', login);
r.post('/logout', logout);
r.get('/me', auth, me);

export default r;
