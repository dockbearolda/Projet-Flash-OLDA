import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { prisma } from './db.js';

const COOKIE = 'df_session';
const TTL_DAYS = 30;

function appPassword(): string {
  const v = process.env.APP_PASSWORD;
  if (!v || v.length < 4) {
    throw new Error('APP_PASSWORD env var missing or too short');
  }
  return v;
}

let generatedSecret: string | undefined;
function sessionSecret(): string {
  const v = process.env.SESSION_SECRET;
  if (v && v.length >= 16) return v;
  // Fall back to an ephemeral secret so the app stays usable without manual
  // config. Sessions don't survive a restart in this mode — set SESSION_SECRET
  // for stable logins.
  if (!generatedSecret) {
    generatedSecret = randomBytes(32).toString('hex');
    console.warn('[auth] SESSION_SECRET not set — using a random secret (logins reset on restart)');
  }
  return generatedSecret;
}

function sign(token: string): string {
  return createHmac('sha256', sessionSecret()).update(token).digest('hex');
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function login(password: string): Promise<string | null> {
  if (!safeEq(password, appPassword())) return null;
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token: sign(token), expiresAt } });
  return token;
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.session.deleteMany({ where: { token: sign(rawToken) } }).catch(() => undefined);
}

export async function isValid(rawToken: string | undefined): Promise<boolean> {
  if (!rawToken) return false;
  const found = await prisma.session.findUnique({ where: { token: sign(rawToken) } });
  if (!found) return false;
  if (found.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: found.id } }).catch(() => undefined);
    return false;
  }
  return true;
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;
  if (path === '/api/health' || path === '/api/auth/login') return next();
  const token = getCookie(c, COOKIE);
  if (!(await isValid(token))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
});

export function setSessionCookie(
  c: Parameters<Parameters<typeof createMiddleware>[0]>[0],
  token: string,
): void {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(c: Parameters<Parameters<typeof createMiddleware>[0]>[0]): void {
  deleteCookie(c, COOKIE, { path: '/' });
}

export const SESSION_COOKIE = COOKIE;
