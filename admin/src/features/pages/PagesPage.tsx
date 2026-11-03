import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { ContentService, type PageDto, type PageInputDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { ago, slugify } from '@/shared/format';
import { Badge, Checkbox, Empty, ErrorBox, Field, Notice, PageHeader, Spinner } from '@/shared/ui';
import { MarkdocEditor } from '../editor/MarkdocEditor';

/** Stand-alone pages (about, privacy, terms…), served at /<slug>/. Saved = live. */
export function PagesPage() {
  const pages = useQuery({ queryKey: ['pages'], queryFn: () => ContentService.contentControllerListPages() });
  return (
    <>
      <PageHeader
        title="Pages"
        subtitle="About, privacy, terms and other stand-alone pages. Changes are live as soon as you save."
        actions={<Link className="btn-primary" to="/pages/new"><Plus className="size-4" /> New page</Link>}
      />
      <ErrorBox error={pages.error} className="mb-4" />
      {pages.isLoading && <Spinner />}
      {pages.data && !pages.data.length && <Empty>No pages yet.</Empty>}
      {pages.data && pages.data.length > 0 && (
        <div className="card divide-y divide-slate-100 dark:divide-white/5">
          {pages.data.map((p) => (
            <Link key={p.id} to={`/pages/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5">
              <span>
                <span className="font-medium">{p.title}</span> <span className="font-mono text-xs text-slate-500">/{p.slug}/</span>
                {p.description && <span className="block text-xs text-slate-500">{p.description}</span>}
              </span>
              <span className="flex gap-1">
                {p.showInHeader && <Badge>Header</Badge>}
                {p.showInFooter && <Badge>Footer</Badge>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

const toInput = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().slice(0, 10) : null);
const fromPage = (p: PageDto): PageInputDto => ({
  slug: p.slug, title: p.title, description: p.description, body: p.body, updatedDate: toInput(p.updatedDate), showInHeader: p.showInHeader, showInFooter: p.showInFooter,
});

function PageEditor({ page }: { page: PageDto | null }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<PageInputDto>(page ? fromPage(page) : { slug: '', title: '', description: '', body: '', updatedDate: null, showInHeader: false, showInFooter: true });
  const [saved, setSaved] = useState(JSON.stringify(f));
  const dirty = JSON.stringify(f) !== saved;
  const save = useMutation({
    mutationFn: () => (page ? ContentService.contentControllerUpdatePage({ id: page.id, requestBody: f }) : ContentService.contentControllerCreatePage({ requestBody: f })),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['pages'] });
      qc.setQueryData(['page', p.id], p);
      setSaved(JSON.stringify(fromPage(p)));
      setF(fromPage(p));
      if (!page) navigate(`/pages/${p.id}`, { replace: true });
    },
  });
  const remove = useMutation({
    mutationFn: () => ContentService.contentControllerRemovePage({ id: page!.id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pages'] });
      navigate('/pages', { replace: true });
    },
  });
  const errs = fieldErrors(save.error);
  const set = <K extends keyof PageInputDto>(k: K, v: PageInputDto[K]) => setF((cur) => ({ ...cur, [k]: v }));
  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><Link to="/pages" className="btn-icon" aria-label="All pages"><ArrowLeft className="size-5" /></Link>{page ? 'Edit page' : 'New page'}</span>}
        subtitle={dirty ? 'Unsaved changes' : page ? `Saved ${ago(page.updatedAt)}` : undefined}
        actions={
          <>
            {page && <a className="btn-secondary" href={page.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Open</a>}
            <button type="button" className="btn-primary" disabled={!dirty || save.isPending || !f.title.trim()} onClick={() => save.mutate()}>
              <Save className="size-4" /> {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      />
      {page && dirty && <div className="mb-4"><Notice tone="warning">Saving updates the live page right away.</Notice></div>}
      <ErrorBox error={Object.keys(errs).length ? null : save.error || remove.error} className="mb-4" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <Field label="Title" error={errs.title}>
            <input className="input text-lg font-semibold" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value, slug: page ? f.slug : slugify(e.target.value) })} autoFocus={!page} />
          </Field>
          <MarkdocEditor value={f.body} onChange={(v) => set('body', v)} error={errs.body} minHeight="22rem" />
        </div>
        <aside className="space-y-4">
          <div className="card space-y-4 p-4">
            <Field label="Slug" hint={`The URL: /${f.slug || '…'}/`} error={errs.slug}>
              <input className="input font-mono text-xs" value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} />
            </Field>
            <Field label="Description" hint="Under the title and in search results." error={errs.description}>
              <textarea className="input min-h-20" value={f.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label="Last updated" hint="Optional, e.g. for a privacy policy." error={errs.updatedDate}>
              <input className="input" type="date" value={f.updatedDate ?? ''} onChange={(e) => set('updatedDate', e.target.value || null)} />
            </Field>
            <Checkbox checked={f.showInHeader} onChange={(v) => set('showInHeader', v)} label="Link in the header" />
            <Checkbox checked={f.showInFooter} onChange={(v) => set('showInFooter', v)} label="Link in the footer" />
          </div>
          {page && isAdmin && (
            <button type="button" className="btn-danger-ghost w-full justify-start" disabled={remove.isPending} onClick={() => window.confirm(`Delete the page “${page.title}”?`) && remove.mutate()}>
              <Trash2 className="size-4" /> Delete page
            </button>
          )}
        </aside>
      </div>
    </>
  );
}

export function PageEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const page = useQuery({ queryKey: ['page', Number(id)], queryFn: () => ContentService.contentControllerGetPage({ id: Number(id) }), enabled: !isNew, staleTime: Infinity });
  if (isNew) return <PageEditor key="new" page={null} />;
  if (page.isLoading) return <Spinner />;
  if (page.error || !page.data) return <ErrorBox error={page.error ?? new Error('There is no such page.')} />;
  return <PageEditor key={page.data.id} page={page.data} />;
}
