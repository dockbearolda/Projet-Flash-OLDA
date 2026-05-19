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

export async function checkAuth(): Promise<boolean> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  return res.ok;
}
