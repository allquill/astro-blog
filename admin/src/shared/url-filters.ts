import { useSearchParams } from 'react-router';

/** List filters kept in the URL, so they survive reloads and can be linked (dashboard tiles). */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const get = (k: string, def = '') => params.get(k) ?? def;
  const set = (patch: Record<string, string | number | boolean>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      const s = typeof v === 'boolean' ? (v ? '1' : '') : String(v);
      if (s) next.set(k, s);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };
  return { get, set, page: Number(params.get('page') ?? 1) || 1 };
}
