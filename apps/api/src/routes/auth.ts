import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { getCookie } from 'hono/cookie';
import { login, logout, setSessionCookie, clearSessionCookie, SESSION_COOKIE } from '../auth.js';

const LoginSchema = z.object({ password: z.string().min(1) });

// Anti-brute-force du mot de passe partagé : N échecs par IP sur une fenêtre
// glissante. En mémoire — suffisant pour un service à replica unique.
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failsByIp = new Map<string, { count: number; first: number }>();

function clientIp(c: Context): string {
  const first = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  if (first) return first;
  return c.req.header('x-real-ip') ?? 'unknown';
}

function isBlocked(ip: string): number {
  const e = failsByIp.get(ip);
  if (!e) return 0;
  const now = Date.now();
  if (now - e.first > WINDOW_MS) {
    failsByIp.delete(ip);
    return 0;
  }
  return e.count >= MAX_FAILS ? Math.ceil((e.first + WINDOW_MS - now) / 1000) : 0;
}

function recordFail(ip: string): void {
  const now = Date.now();
  // Élagage opportuniste pour borner la mémoire face à une rotation d'IP.
  if (failsByIp.size > 1000) {
    for (const [k, v] of failsByIp) if (now - v.first > WINDOW_MS) failsByIp.delete(k);
  }
  const e = failsByIp.get(ip);
  if (!e || now - e.first > WINDOW_MS) {
    failsByIp.set(ip, { count: 1, first: now });
  } else {
    e.count += 1;
  }
}

export const authRoute = new Hono()
  .post('/login', async (c) => {
    const ip = clientIp(c);
    const retryAfter = isBlocked(ip);
    if (retryAfter > 0) {
      return c.json({ error: 'Trop de tentatives — réessayez plus tard.' }, 429, {
        'Retry-After': String(retryAfter),
      });
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid body' }, 400);
    }
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid body' }, 400);
    }
    const token = await login(parsed.data.password);
    if (!token) {
      recordFail(ip);
      return c.json({ error: 'Invalid password' }, 401);
    }
    failsByIp.delete(ip); // succès → on remet le compteur à zéro
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
