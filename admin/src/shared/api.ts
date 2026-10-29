import { QueryClient } from '@tanstack/react-query';
import { ApiError, OpenAPI } from '@/sdk';

// The generated client (src/sdk, `pnpm run sdk`) talks to the same origin: the admin cookie is
// HttpOnly and scoped to /api, so all we need is to send credentials.
OpenAPI.BASE = '';
OpenAPI.WITH_CREDENTIALS = true;
OpenAPI.CREDENTIALS = 'include';

/** Called on any 401 so the app can drop back to the login page. */
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 2,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
    },
  },
});
queryClient.getQueryCache().subscribe((ev) => {
  if (ev.type === 'updated' && ev.action.type === 'error' && isUnauthorized(ev.action.error)) onUnauthorized();
});
queryClient.getMutationCache().subscribe((ev) => {
  if (ev.type === 'updated' && ev.action.type === 'error' && isUnauthorized(ev.action.error)) onUnauthorized();
});

type ErrorBody = { message?: string | string[]; error?: string; errors?: Record<string, string> };

/** A readable message for any error the API (or the network) produced. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const b = (e.body ?? {}) as ErrorBody;
    if (b.errors && Object.keys(b.errors).length) return Object.values(b.errors).join(' ');
    const m = Array.isArray(b.message) ? b.message.join(' ') : b.message;
    return m || b.error || `${e.status} ${e.statusText}`;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

/** Per-field messages from a validation error ({ errors: { field: message } }). */
export function fieldErrors(e: unknown): Record<string, string> {
  return e instanceof ApiError ? (((e.body ?? {}) as ErrorBody).errors ?? {}) : {};
}

/** Builds a query string, leaving out empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
}
