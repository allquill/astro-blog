import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { ContentService, type AuthorDto, type AuthorInputDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { slugify } from '@/shared/format';
import { Empty, ErrorBox, Field, Modal, PageHeader, Spinner } from '@/shared/ui';
import { thumbUrl } from '../editor/markdoc';
import { SOCIAL_NETWORKS } from '../editor/options';
import { ImageField } from '../media/MediaPicker';

type Link = AuthorInputDto['links'][number];

/** Editable list of social links (network + URL); also used by Site settings. */
export function SocialLinksEditor({ value, onChange }: { value: Link[]; onChange: (v: Link[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((l, i) => (
        <div key={i} className="flex gap-2">
          <select className="input w-36" value={l.network} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, network: e.target.value as Link['network'] } : x)))}>
            {Object.entries(SOCIAL_NETWORKS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input className="input" type="url" placeholder="https://…" value={l.url} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <button type="button" className="btn-icon" aria-label="Remove link" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="size-4" /></button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, { network: 'github', url: '' }])}><Plus className="size-4" /> Add link</button>
    </div>
  );
}

function AuthorForm({ author, onDone }: { author: AuthorDto | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<AuthorInputDto>(
    author
      ? { slug: author.slug, name: author.name, role: author.role, bio: author.bio, avatarId: author.avatarId, links: author.links as Link[] }
      : { slug: '', name: '', role: '', bio: '', avatarId: null, links: [] },
  );
  const save = useMutation({
    mutationFn: () => (author ? ContentService.contentControllerUpdateAuthor({ id: author.id, requestBody: f }) : ContentService.contentControllerCreateAuthor({ requestBody: f })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['authors'] });
      onDone();
    },
  });
  const errs = fieldErrors(save.error);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" error={errs.name}>
        <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: author ? f.slug : slugify(e.target.value) })} autoFocus />
      </Field>
      <Field label="Slug" hint={author ? "Can't change: posts and the author's page use it." : `The author page: /authors/${f.slug || '…'}/`} error={errs.slug}>
        <input className="input font-mono text-xs" value={f.slug} disabled={!!author} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} />
      </Field>
      <Field label="Role" hint="e.g. Staff engineer" error={errs.role}>
        <input className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
      </Field>
      <Field label="Bio" error={errs.bio}>
        <textarea className="input min-h-24" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
      </Field>
      <Field label="Photo" error={errs.avatarId}>
        <ImageField round value={f.avatarId} onChange={(id) => setF({ ...f, avatarId: id })} />
      </Field>
      <Field label="Links" error={errs.links}>
        <SocialLinksEditor value={f.links} onChange={(links) => setF({ ...f, links })} />
      </Field>
      <ErrorBox error={Object.keys(errs).length ? null : save.error} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={save.isPending || !f.name.trim()}>{author ? 'Save' : 'Create author'}</button>
      </div>
    </form>
  );
}

export function AuthorsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AuthorDto | 'new' | null>(null);
  const authors = useQuery({ queryKey: ['authors'], queryFn: () => ContentService.contentControllerListAuthors() });
  const remove = useMutation({
    mutationFn: (id: number) => ContentService.contentControllerRemoveAuthor({ id }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['authors'] }),
  });
  return (
    <>
      <PageHeader
        title="Authors"
        subtitle="Who writes the posts: shown on each post and on an author page."
        actions={<button type="button" className="btn-primary" onClick={() => setEditing('new')}><Plus className="size-4" /> New author</button>}
      />
      <ErrorBox error={authors.error || remove.error} className="mb-4" />
      {authors.isLoading && <Spinner />}
      {authors.data && !authors.data.length && <Empty>No authors yet. Posts need one to be published.</Empty>}
      {authors.data && authors.data.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {authors.data.map((a) => (
            <li key={a.id} className="card flex gap-3 p-4">
              {a.avatarId ? <img src={thumbUrl(a.avatarId)} alt="" className="size-14 shrink-0 rounded-full object-cover" /> : <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">{a.name.slice(0, 1)}</span>}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-slate-500">{a.role || '—'} · {a.posts} post{a.posts === 1 ? '' : 's'}</p>
                {a.bio && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{a.bio}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" className="btn-icon" aria-label={`Edit ${a.name}`} onClick={() => setEditing(a)}><Pencil className="size-4" /></button>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-icon-danger"
                    aria-label={`Delete ${a.name}`}
                    disabled={a.posts > 0 || remove.isPending}
                    title={a.posts > 0 ? 'Has posts' : 'Delete'}
                    onClick={() => window.confirm(`Delete the author “${a.name}”?`) && remove.mutate(a.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New author' : 'Edit author'}>
        {editing !== null && <AuthorForm author={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
