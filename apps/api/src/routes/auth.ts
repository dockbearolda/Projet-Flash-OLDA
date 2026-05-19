import { Hono } from 'hono';
import { z } from 'zod';
import { getCookie } from 'hono/cookie';
import { login, logout, setSessionCookie, clearSessionCookie, SESSION_COOKIE } from '../auth.js';

const LoginSchema = z.object({ password: z.string().min(1) });

export const authRoute = new Hono()
  .post('/login', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body' }, 400);
    }
    const token = await login(parsed.data.password);
    if (!token) {
      return c.json({ error: 'Invalid password' }, 401);
    }
    setSessionCookie(c, token);
    return c.json({ ok: true });
  })
  .post('/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    await logout(token);
    clearSessionCookie(c);
    return c.json({ ok: true });
  })
  .get('/me', (c) => {
    return c.json({ authenticated: true });
  });
