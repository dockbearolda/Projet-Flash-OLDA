interface LoginResponse {
  ok?: boolean;
  error?: string;
}

export async function loginRequest(password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = (await res.json()) as LoginResponse;
  if (!res.ok) {
    return { ok: false, error: data.error ?? 'Erreur inconnue' };
  }
  return { ok: true };
}

export async function logoutRequest(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}

export type AuthStatus = 'authenticated' | 'denied' | 'offline';

export async function checkAuth(): Promise<AuthStatus> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) return 'authenticated';
    if (res.status === 401) return 'denied';
    // 5xx, 502 proxy, 404 — API likely down: treat as offline
    return 'offline';
  } catch {
    // network unreachable (PWA offline, no API server, CORS)
    return 'offline';
  }
}
