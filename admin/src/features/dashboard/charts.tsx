import { useState } from 'react';

// Tiny single-series charts (no chart library): one hue (brand-600, validated for both themes),
// ≤24px bars with a 4px rounded data end, 2px gaps, hover readout, and a visually-hidden table.

type Datum = { key: string; count: number; label?: string };

/** Columns over time (e.g. likes per day). */
export function ColumnChart({ data, height = 140, title }: { data: Datum[]; height?: number; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const h = hover === null ? null : data[hover];
  return (
    <figure>
      <div className="mb-2 flex h-5 items-baseline justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>max {max}</span>
        <span aria-live="polite">{h ? `${h.label ?? h.key}: ${h.count}` : 'Hover a bar for details'}</span>
      </div>
      <div className="relative flex items-end gap-[2px] border-b border-slate-200 dark:border-white/10" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={d.key}
            className="group flex h-full flex-1 cursor-default items-end justify-center"
            onMouseEnter={() => setHover(i)}
            title={`${d.label ?? d.key}: ${d.count}`}
          >
            <div
              className={`w-full max-w-6 rounded-t bg-teal-600 transition-opacity ${hover !== null && hover !== i ? 'opacity-50' : ''}`}
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{data[0]?.label ?? data[0]?.key}</span>
        <span>{data.at(-1)?.label ?? data.at(-1)?.key}</span>
      </div>
      <DataTable title={title} data={data} />
    </figure>
  );
}

/** Horizontal bars for categories (e.g. shares by network), largest first. */
export function BarList({ data, title }: { data: Datum[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (!data.length) return <p className="py-6 text-sm text-slate-500">Nothing yet.</p>;
  return (
    <figure>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.key} className="grid grid-cols-[minmax(0,12rem)_1fr_2.5rem] items-center gap-3 text-sm" title={`${d.label ?? d.key}: ${d.count}`}>
            <span className="truncate text-slate-700 dark:text-slate-300">{d.label ?? d.key}</span>
            <span className="h-4">
              <span className="block h-full rounded-r bg-teal-600" style={{ width: `${(d.count / max) * 100}%`, minWidth: d.count ? 2 : 0 }} />
            </span>
            <span className="text-right text-slate-600 tabular-nums dark:text-slate-300">{d.count}</span>
          </li>
        ))}
      </ul>
      <DataTable title={title} data={data} />
    </figure>
  );
}

function DataTable({ title, data }: { title: string; data: Datum[] }) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <tbody>
        {data.map((d) => (
          <tr key={d.key}>
            <th scope="row">{d.label ?? d.key}</th>
            <td>{d.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
