import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, LoaderCircle, X } from 'lucide-react';
import { errorMessage } from './api';

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-500" role="status">
      <LoaderCircle className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

/** Error box for a failed query or mutation; renders nothing when there is no error. */
export function ErrorBox({ error, className = '' }: { error: unknown; className?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className={`rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900 ${className}`}>
      {errorMessage(error)}
    </p>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' }) {
  const tones = {
    info: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
  };
  return <div className={`rounded-lg px-3 py-2 text-sm ring-1 ${tones[tone]}`}>{children}</div>;
}

export function Field({ label, hint, error, children, className = '' }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && !error && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 rounded accent-brand-700" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800',
  sky: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-900',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900',
  rose: 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900',
};
export type Tone = keyof typeof BADGE_TONES;

export function Badge({ tone = 'slate', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

/** A native <dialog> with a title bar; closes on Escape and on the X. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-xl bg-white p-0 text-slate-900 shadow-2xl ring-1 ring-slate-200 backdrop:bg-slate-950/50 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10">
            <h2 className="font-semibold">{title}</h2>
            <button type="button" className="btn-ghost p-1" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? 'Copied' : label}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

/** Editable list of short strings (issue types, plan features, notify addresses). */
export function StringListEditor({ value, onChange, placeholder, addLabel = 'Add' }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; addLabel?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-2.5 text-sm dark:bg-white/10">
              {v}
              <button type="button" className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-white/20" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className="input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-secondary" onClick={add} disabled={!draft.trim()}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

/** Previous / next for a paged list. */
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(total, page * pageSize)} of {total}
      </span>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="btn-secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
