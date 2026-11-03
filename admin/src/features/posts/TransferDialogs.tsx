import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileUp } from 'lucide-react';
import { ContentService, type ContentImportItemDto, type ContentImportResultDto, type ExportRequestDto } from '@/sdk';
import { Badge, Checkbox, ErrorBox, Field, Modal, Notice, type Tone } from '@/shared/ui';

const ACTION_TONE: Record<string, Tone> = { create: 'emerald', update: 'sky', skip: 'slate', error: 'rose' };
const ACTION_LABEL: Record<string, string> = { create: 'Create', update: 'Overwrite', skip: 'Skip', error: 'Error' };
const KIND_LABEL: Record<string, string> = { topic: 'Topics', author: 'Authors', post: 'Posts', page: 'Pages', site: 'Site settings', home: 'Home page' };

type Pickable = 'posts' | 'pages' | 'topics' | 'authors';
const KINDS: { key: NonNullable<ExportRequestDto['include']>[number]; label: string }[] = [
  { key: 'posts', label: 'Posts (Markdown with their images)' },
  { key: 'topics', label: 'Topics' },
  { key: 'authors', label: 'Authors (with avatars)' },
  { key: 'pages', label: 'Pages (about, privacy, …)' },
  { key: 'settings', label: 'Site settings and home page texts' },
];
const isPickable = (k: string): k is Pickable => k === 'posts' || k === 'pages' || k === 'topics' || k === 'authors';

type Option = { value: string; label: string; badge?: string };

/** A filterable checklist of items of one kind. */
function ItemPicker({ options, value, onChange }: { options: Option[]; value: string[]; onChange: (v: string[]) => void }) {
  const [filter, setFilter] = useState('');
  const shown = options.filter((o) => `${o.label} ${o.value}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const chosen = new Set(value);
  return (
    <div className="mt-2 ml-6 space-y-2 rounded-lg p-3 ring-1 ring-slate-200 dark:ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs flex-1" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button type="button" className="btn-ghost" onClick={() => onChange([...new Set([...value, ...shown.map((o) => o.value)])])}>Select all</button>
        <button type="button" className="btn-ghost" onClick={() => onChange(value.filter((v) => !shown.some((o) => o.value === v)))}>Select none</button>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {shown.map((o) => (
          <div key={o.value}>
            <Checkbox
              checked={chosen.has(o.value)}
              onChange={(on) => onChange(on ? [...value, o.value] : value.filter((v) => v !== o.value))}
              label={
                <span className="flex items-center gap-2">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-slate-500">{o.value}</span>
                  {o.badge && <Badge tone="amber">{o.badge}</Badge>}
                </span>
              }
            />
          </div>
        ))}
        {!shown.length && <p className="text-sm text-slate-500">Nothing matches.</p>}
      </div>
    </div>
  );
}

/** Saves a POST response as a file: the generated client reads binary responses as text. */
async function downloadExport(body: ExportRequestDto) {
  const res = await fetch('/api/admin/content/export', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const m = Array.isArray(err?.message) ? err.message.join(' ') : err?.message;
    throw new Error(m || `Export failed (${res.status})`);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'blog-export.zip';
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export: a .zip of Markdown + YAML + images, the same format Import reads. Each kind is exported
 * whole, or narrowed to chosen items.
 */
export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [include, setInclude] = useState<string[]>(KINDS.map((k) => k.key));
  const [published, setPublished] = useState(false);
  const [withDeps, setWithDeps] = useState(true);
  // null = every item of that kind; an array = only those.
  const [picked, setPicked] = useState<Record<Pickable, string[] | null>>({ posts: null, pages: null, topics: null, authors: null });
  const catalog = useQuery({ queryKey: ['export-items'], queryFn: () => ContentService.contentControllerExportItems(), enabled: open });

  const options = useMemo<Record<Pickable, Option[]>>(() => {
    const c = catalog.data;
    return {
      posts: (c?.posts ?? []).filter((p) => !published || p.status === 'published').map((p) => ({ value: p.slug, label: p.title, badge: p.status === 'published' ? undefined : 'Draft' })),
      pages: (c?.pages ?? []).map((p) => ({ value: p.slug, label: p.title })),
      topics: (c?.topics ?? []).map((t) => ({ value: t.slug, label: t.name })),
      authors: (c?.authors ?? []).map((a) => ({ value: a.slug, label: a.name })),
    };
  }, [catalog.data, published]);

  const count = (k: Pickable) => {
    const all = options[k].map((o) => o.value);
    const chosen = picked[k];
    return chosen === null ? all.length : chosen.filter((s) => all.includes(s)).length;
  };
  const summary = include
    .filter(isPickable)
    .map((k) => `${count(k)} ${k}`)
    .concat(include.includes('settings') ? ['settings'] : [])
    .join(', ');

  const run = useMutation({
    mutationFn: () => {
      const body: ExportRequestDto = { include: include as ExportRequestDto['include'], status: published ? 'published' : 'all', withDependencies: withDeps };
      for (const k of ['posts', 'pages', 'topics', 'authors'] as const) if (picked[k] !== null) body[k] = picked[k]!;
      return downloadExport(body);
    },
    onSuccess: () => onClose(),
  });
  const close = () => {
    run.reset();
    onClose();
  };
  const toggleKind = (k: string, on: boolean) => setInclude(on ? [...include, k] : include.filter((x) => x !== k));

  return (
    <Modal open={open} onClose={close} title="Export content" wide>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A .zip with one folder per post (<code>posts/&lt;slug&gt;/index.md</code> and its <code>assets/</code>), plus topics, authors, pages and
          settings as YAML. Use it as a backup, to move content to another blog, or to edit posts in any Markdown editor and import them back.
        </p>
        <ErrorBox error={catalog.error} />
        <div className="space-y-2">
          {KINDS.map((k) => {
            const on = include.includes(k.key);
            const pk = isPickable(k.key) ? k.key : null;
            return (
              <div key={k.key}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Checkbox checked={on} label={k.label} onChange={(v) => toggleKind(k.key, v)} />
                  {pk && on && (
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {picked[pk] === null ? `All ${options[pk].length}` : `${count(pk)} of ${options[pk].length} chosen`}
                      {picked[pk] === null ? (
                        <button type="button" className="btn-ghost" disabled={!catalog.data} onClick={() => setPicked({ ...picked, [pk]: options[pk].map((o) => o.value) })}>Choose…</button>
                      ) : (
                        <button type="button" className="btn-ghost" onClick={() => setPicked({ ...picked, [pk]: null })}>Export all</button>
                      )}
                    </span>
                  )}
                </div>
                {pk && on && picked[pk] !== null && <ItemPicker options={options[pk]} value={picked[pk]} onChange={(v) => setPicked({ ...picked, [pk]: v })} />}
              </div>
            );
          })}
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-white/5">
          <Checkbox checked={published} onChange={setPublished} label="Published posts only (leave out drafts)" />
          <Checkbox checked={withDeps} onChange={setWithDeps} label="Include the topics and authors the exported posts use" />
        </div>
        {catalog.data && include.length > 0 && <p className="text-sm text-slate-600 dark:text-slate-400">Will export: {summary}{withDeps && include.includes('posts') ? ', plus the topics and authors those posts use' : ''}.</p>}
        <ErrorBox error={run.error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!include.length || run.isPending} onClick={() => run.mutate()}>
            <Download className="size-4" /> {run.isPending ? 'Preparing…' : 'Download .zip'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const keyOf = (i: ContentImportItemDto) => `${i.kind}:${i.slug}`;
const selectable = (i: ContentImportItemDto) => i.action === 'create' || i.action === 'update';

type Selection = { selected: Set<string>; onToggle: (items: ContentImportItemDto[], on: boolean) => void };

function ResultTable({ result, selection }: { result: ContentImportResultDto; selection?: Selection }) {
  const count = (a: string) => result.items.filter((i) => i.action === a).length;
  const pickable = result.items.filter(selectable);
  const all = selection && pickable.length > 0 && pickable.every((i) => selection.selected.has(i.source));
  const kinds = [...new Set(pickable.map((i) => i.kind))];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        {(['create', 'update', 'skip', 'error'] as const).map((a) => (
          <Badge key={a} tone={ACTION_TONE[a]}>{ACTION_LABEL[a]}: {count(a)}</Badge>
        ))}
      </div>
      {selection && kinds.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {kinds.map((k) => {
            const of = pickable.filter((i) => i.kind === k);
            const n = of.filter((i) => selection.selected.has(i.source)).length;
            return <Checkbox key={k} checked={n === of.length} label={`${KIND_LABEL[k] ?? k} (${n}/${of.length})`} onChange={(on) => selection.onToggle(of, on)} />;
          })}
        </div>
      )}
      <div className="max-h-80 overflow-y-auto rounded-lg ring-1 ring-slate-200 dark:ring-white/10">
        <table className="w-full">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr>
              {selection && (
                <th className="th w-8">
                  <input type="checkbox" aria-label="Select everything" className="size-4 rounded accent-brand-700" checked={!!all} disabled={!pickable.length} onChange={(e) => selection.onToggle(pickable, e.target.checked)} />
                </th>
              )}
              <th className="th">What</th><th className="th">Action</th><th className="th">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {result.items.map((i) => (
              <tr key={`${i.kind}:${i.slug}:${i.source}`}>
                {selection && (
                  <td className="td">
                    {selectable(i) && (
                      <input type="checkbox" aria-label={`Import ${i.kind} ${i.slug}`} className="size-4 rounded accent-brand-700" checked={selection.selected.has(i.source)} onChange={(e) => selection.onToggle([i], e.target.checked)} />
                    )}
                  </td>
                )}
                <td className="td"><span className="text-slate-500">{i.kind}</span> <span className="font-medium">{i.slug}</span></td>
                <td className="td"><Badge tone={ACTION_TONE[i.action]}>{ACTION_LABEL[i.action]}</Badge></td>
                <td className="td text-xs text-slate-600 dark:text-slate-400">
                  {[...i.messages, ...(i.needs.length ? [`Needs ${i.needs.map((n) => n.replace(':', ' ')).join(', ')} from this file`] : [])].join(' · ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Import a .zip export (or one .md post): first a dry run that changes nothing and lists what would
 * happen, then the real import of the rows left ticked, with the same options.
 */
export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [asDraft, setAsDraft] = useState(false);
  const [plan, setPlan] = useState<ContentImportResultDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [done, setDone] = useState<ContentImportResultDto | null>(null);
  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      ContentService.contentControllerImport({
        formData: { file: file!, ...(dryRun ? {} : { only: JSON.stringify([...selected]) }) },
        dryRun,
        onConflict: overwrite ? 'overwrite' : 'skip',
        asDraft,
      }),
    onSuccess: (r) => {
      if (r.dryRun) {
        setPlan(r);
        setSelected(new Set(r.items.filter(selectable).map((i) => i.source)));
        setNote('');
      } else {
        setDone(r);
        for (const k of ['content-posts', 'topics', 'authors', 'pages', 'media', 'site', 'home', 'posts', 'export-items']) void qc.invalidateQueries({ queryKey: [k] });
      }
    },
  });
  const clearPlan = () => {
    setPlan(null);
    setSelected(new Set());
    setNote('');
  };
  const reset = () => {
    setFile(null);
    clearPlan();
    setDone(null);
    run.reset();
  };
  const close = () => {
    reset();
    onClose();
  };
  const check = (e: FormEvent) => {
    e.preventDefault();
    clearPlan();
    run.mutate(true);
  };

  /** Ticking a post ticks what it needs from the file; unticking a topic or author unticks the posts that need it. */
  const toggle = (items: ContentImportItemDto[], on: boolean) => {
    if (!plan) return;
    const next = new Set(selected);
    const byKey = new Map(plan.items.filter(selectable).map((i) => [keyOf(i), i]));
    const extra: string[] = [];
    if (on) {
      for (const i of items) {
        next.add(i.source);
        for (const n of i.needs) {
          const dep = byKey.get(n);
          if (dep && !next.has(dep.source)) {
            next.add(dep.source);
            extra.push(`${dep.kind} ${dep.slug}`);
          }
        }
      }
      setNote(extra.length ? `Also selected, because the chosen posts need them: ${extra.join(', ')}.` : '');
    } else {
      const removed = new Set(items.map(keyOf));
      for (const i of items) next.delete(i.source);
      for (const p of plan.items) {
        if (next.has(p.source) && p.needs.some((n) => removed.has(n))) {
          next.delete(p.source);
          extra.push(`${p.kind} ${p.slug}`);
        }
      }
      setNote(extra.length ? `Also left out, because they need what you unticked: ${extra.join(', ')}.` : '');
    }
    setSelected(next);
  };

  const n = selected.size;
  return (
    <Modal open={open} onClose={close} title="Import content" wide>
      {done ? (
        <div className="space-y-4">
          <Notice tone={done.items.some((i) => i.action === 'error') ? 'warning' : 'success'}>Import finished. Each item was imported completely or not at all.</Notice>
          <ResultTable result={done} />
          <div className="flex justify-end"><button type="button" className="btn-primary" onClick={close}>Done</button></div>
        </div>
      ) : (
        <form onSubmit={check} className="space-y-4">
          <Field label="File" hint="A .zip made by Export (or any zip with posts/<slug>/index.md and assets/), or a single .md post with front matter.">
            <input
              type="file"
              accept=".zip,.md,.mdoc,application/zip,text/markdown"
              className="input-file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                clearPlan();
              }}
            />
          </Field>
          <div className="space-y-2">
            <Checkbox checked={overwrite} onChange={(v) => { setOverwrite(v); clearPlan(); }} label="Overwrite posts, topics, authors, pages and settings that already exist (otherwise they are skipped)" />
            <Checkbox checked={asDraft} onChange={(v) => { setAsDraft(v); clearPlan(); }} label="Import every post as a draft" />
          </div>
          <ErrorBox error={run.error} />
          {plan && (
            <>
              <Notice tone="info">Dry run: nothing has changed yet. Untick anything you don't want, then import the rest.</Notice>
              <ResultTable result={plan} selection={{ selected, onToggle: toggle }} />
              {note && <p className="text-sm text-slate-600 dark:text-slate-400">{note}</p>}
            </>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
            <button type="submit" className={plan ? 'btn-secondary' : 'btn-primary'} disabled={!file || run.isPending}>
              {run.isPending && run.variables ? 'Checking…' : plan ? 'Check again' : 'Check'}
            </button>
            {plan && (
              <button type="button" className="btn-primary" disabled={!n || run.isPending} onClick={() => run.mutate(false)}>
                <FileUp className="size-4" /> {run.isPending ? 'Importing…' : `Import ${n} selected`}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
