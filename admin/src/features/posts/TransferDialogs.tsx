import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileUp } from 'lucide-react';
import { ContentService, type ContentImportResultDto } from '@/sdk';
import { qs } from '@/shared/api';
import { Badge, Checkbox, ErrorBox, Field, Modal, Notice, type Tone } from '@/shared/ui';

const ACTION_TONE: Record<string, Tone> = { create: 'emerald', update: 'sky', skip: 'slate', error: 'rose' };
const ACTION_LABEL: Record<string, string> = { create: 'Create', update: 'Overwrite', skip: 'Skip', error: 'Error' };

const KINDS = [
  { key: 'posts', label: 'Posts (Markdown with their images)' },
  { key: 'topics', label: 'Topics' },
  { key: 'authors', label: 'Authors (with avatars)' },
  { key: 'pages', label: 'Pages (about, privacy, …)' },
  { key: 'settings', label: 'Site settings and home page texts' },
];

/** Bulk export: a .zip of Markdown + YAML + images, the same format Import reads. */
export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [include, setInclude] = useState<string[]>(KINDS.map((k) => k.key));
  const [published, setPublished] = useState(false);
  const href = `/api/admin/content/export${qs({ include: include.join(','), status: published ? 'published' : 'all' })}`;
  return (
    <Modal open={open} onClose={onClose} title="Export content">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A .zip with one folder per post (<code>posts/&lt;slug&gt;/index.md</code> and its <code>assets/</code>), plus topics, authors, pages and
          settings as YAML. Use it as a backup, to move the blog to another server, or to edit posts in any Markdown editor and import them back.
        </p>
        <div className="space-y-2">
          {KINDS.map((k) => (
            <Checkbox key={k.key} checked={include.includes(k.key)} label={k.label} onChange={(on) => setInclude(on ? [...include, k.key] : include.filter((x) => x !== k.key))} />
          ))}
        </div>
        <Checkbox checked={published} onChange={setPublished} label="Published posts only (leave out drafts)" />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <a className={`btn-primary ${include.length ? '' : 'pointer-events-none opacity-50'}`} href={href} download onClick={() => setTimeout(onClose, 300)}>
            <Download className="size-4" /> Download .zip
          </a>
        </div>
      </div>
    </Modal>
  );
}

function ResultTable({ result }: { result: ContentImportResultDto }) {
  const count = (a: string) => result.items.filter((i) => i.action === a).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        {(['create', 'update', 'skip', 'error'] as const).map((a) => (
          <Badge key={a} tone={ACTION_TONE[a]}>{ACTION_LABEL[a]}: {count(a)}</Badge>
        ))}
      </div>
      <div className="max-h-80 overflow-y-auto rounded-lg ring-1 ring-slate-200 dark:ring-white/10">
        <table className="w-full">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr><th className="th">What</th><th className="th">Action</th><th className="th">Notes</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {result.items.map((i) => (
              <tr key={`${i.kind}:${i.slug}:${i.source}`}>
                <td className="td"><span className="text-slate-500">{i.kind}</span> <span className="font-medium">{i.slug}</span></td>
                <td className="td"><Badge tone={ACTION_TONE[i.action]}>{ACTION_LABEL[i.action]}</Badge></td>
                <td className="td text-xs text-slate-600 dark:text-slate-400">{i.messages.join(' · ') || '—'}</td>
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
 * happen, then the real import with the same options.
 */
export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [asDraft, setAsDraft] = useState(false);
  const [plan, setPlan] = useState<ContentImportResultDto | null>(null);
  const [done, setDone] = useState<ContentImportResultDto | null>(null);
  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      ContentService.contentControllerImport({ formData: { file: file! }, dryRun, onConflict: overwrite ? 'overwrite' : 'skip', asDraft }),
    onSuccess: (r) => {
      if (r.dryRun) setPlan(r);
      else {
        setDone(r);
        for (const k of ['content-posts', 'topics', 'authors', 'pages', 'media', 'site', 'home', 'posts']) void qc.invalidateQueries({ queryKey: [k] });
      }
    },
  });
  const reset = () => {
    setFile(null);
    setPlan(null);
    setDone(null);
    run.reset();
  };
  const close = () => {
    reset();
    onClose();
  };
  const check = (e: FormEvent) => {
    e.preventDefault();
    setPlan(null);
    run.mutate(true);
  };
  const changes = plan ? plan.items.filter((i) => i.action === 'create' || i.action === 'update').length : 0;
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
                setPlan(null);
              }}
            />
          </Field>
          <div className="space-y-2">
            <Checkbox checked={overwrite} onChange={(v) => { setOverwrite(v); setPlan(null); }} label="Overwrite posts, topics, authors, pages and settings that already exist (otherwise they are skipped)" />
            <Checkbox checked={asDraft} onChange={(v) => { setAsDraft(v); setPlan(null); }} label="Import every post as a draft" />
          </div>
          <ErrorBox error={run.error} />
          {plan && (
            <>
              <Notice tone="info">Dry run: nothing has changed yet. Check the list, then import.</Notice>
              <ResultTable result={plan} />
            </>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
            <button type="submit" className={plan ? 'btn-secondary' : 'btn-primary'} disabled={!file || run.isPending}>
              {run.isPending && run.variables ? 'Checking…' : plan ? 'Check again' : 'Check'}
            </button>
            {plan && (
              <button type="button" className="btn-primary" disabled={!changes || run.isPending} onClick={() => run.mutate(false)}>
                <FileUp className="size-4" /> {run.isPending ? 'Importing…' : `Import ${changes} item${changes === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
