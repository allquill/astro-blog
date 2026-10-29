// Browser calls to the API (server/), same origin: /api is proxied by nginx (Docker) or by the Vite
// dev server (astro.config.mjs). Every widget works, or degrades to a plain form post, without it.

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error?: string; errors?: Record<string, string> };

export async function api<T = object>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/public${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: { accept: 'application/json', ...(init.body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult<T>;
    if (!res.ok) return { ok: false, error: 'error' in data ? data.error : undefined, errors: 'errors' in data ? data.errors : undefined };
    return { ...data, ok: true } as ApiResult<T>;
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}

/** First readable message of a failed call. */
export const failure = (r: { error?: string; errors?: Record<string, string> }) =>
  (r.errors && Object.values(r.errors)[0]) || r.error || 'Something went wrong. Please try again.';

/** localStorage that never throws (private mode, blocked storage). */
export const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {}
  },
};
