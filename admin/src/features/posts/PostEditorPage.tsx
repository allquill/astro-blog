import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Eye, Lock, Mail, Rocket, Save, Trash2, Undo2 } from 'lucide-react';
import { ContentService, DigestsService, type PostDetailDto, type PostInputDto } from '@/sdk';
import { fieldErrors } from '@/shared/api';
import { useAuth } from '@/shared/auth-context';
import { ago, slugify } from '@/shared/format';
import { Badge, Checkbox, ErrorBox, Field, Notice, PageHeader, Spinner, StringListEditor } from '@/shared/ui';
import { MarkdocEditor } from '../editor/MarkdocEditor';
import { ImageField } from '../media/MediaPicker';
import { postExportUrl, STATUS_LABEL, STATUS_TONE } from './labels';

/** epoch ms ↔ the "YYYY-MM-DD" of a date input (dates are UTC midnight on the server). */
const toInput = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

const EMPTY: PostInputDto = {
  title: '', slug: '', excerpt: '', body: '', publishedDate: null, updatedDate: null, author: '', topics: [], tags: [],
  coverId: null, coverAlt: '', series: '', featured: false, canonicalUrl: '', repositoryUrl: '',
};

const fromPost = (p: PostDetailDto): PostInputDto => ({
  title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body, publishedDate: toInput(p.publishedDate) || null, updatedDate: toInput(p.updatedDate) || null,
  author: p.authorSlug, topics: p.topics, tags: p.tags, coverId: p.coverId, coverAlt: p.coverAlt, series: p.series, featured: p.featured, canonicalUrl: p.canonicalUrl, repositoryUrl: p.repositoryUrl,
});

const statusOf = (p: PostDetailDto) => (p.status === 'published' && (p.publishedDate ?? 0) > Date.now() ? 'scheduled' : p.status);

function Editor({ post }: { post: PostDetailDto | null }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<PostInputDto>(post ? fromPost(post) : EMPTY);
  const [saved, setSaved] = useState<PostInputDto>(post ? fromPost(post) : EMPTY);
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const authors = useQuery({ queryKey: ['authors'], queryFn: () => ContentService.contentControllerListAuthors() });
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => ContentService.contentControllerListTopics() });
  const set = <K extends keyof PostInputDto>(k: K, v: PostInputDto[K]) => setF((cur) => ({ ...cur, [k]: v }));

  // Set just before navigating away on purpose (after creating or deleting), so the unsaved-changes
  // prompt stays out of the way.
  const leaving = useRef(false);

  /** Takes the saved post as the new baseline; keeps edits typed while an (auto)save was on its way. */
  const afterSave = useCallback(
    (p: PostDetailDto, sent?: PostInputDto) => {
      qc.setQueryData(['post', p.id], p);
      void qc.invalidateQueries({ queryKey: ['content-posts'] });
      const next = fromPost(p);
      setSaved(next);
      setF((cur) => (!sent || JSON.stringify(cur) === JSON.stringify(sent) ? next : cur));
      if (!post) {
        leaving.current = true;
        navigate(`/posts/${p.id}`, { replace: true });
      }
    },
    [qc, post, navigate],
  );

  const save = useMutation({
    mutationFn: (body: PostInputDto) =>
      post ? ContentService.contentControllerUpdatePost({ id: post.id, requestBody: body }) : ContentService.contentControllerCreatePost({ requestBody: body }),
    onSuccess: (p, sent) => afterSave(p, sent),
  });
  const publish = useMutation({
    mutationFn: async () => {
      const id = post ? (dirty ? (await ContentService.contentControllerUpdatePost({ id: post.id, requestBody: f })).id : post.id) : (await ContentService.contentControllerCreatePost({ requestBody: f })).id;
      return ContentService.contentControllerPublish({ id });
    },
    onSuccess: (p) => afterSave(p),
  });
  const unpublish = useMutation({ mutationFn: () => ContentService.contentControllerUnpublish({ id: post!.id }), onSuccess: (p) => afterSave(p) });
  const remove = useMutation({
    mutationFn: () => ContentService.contentControllerRemovePost({ id: post!.id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['content-posts'] });
      leaving.current = true;
      navigate('/posts', { replace: true });
    },
  });
  const preview = useMutation({
    mutationFn: async () => {
      if (dirty) await save.mutateAsync(f);
      return ContentService.contentControllerPreviewLink({ id: post!.id });
    },
    onSuccess: (l) => window.open(l.url, '_blank', 'noopener'),
  });
  const announce = useMutation({
    mutationFn: () => DigestsService.digestsControllerCreate({ requestBody: { postSlug: post!.slug } }),
    onSuccess: (d) => navigate(`/digests/${d.id}`),
  });

  const status = post ? statusOf(post) : 'draft';
  const live = post?.status === 'published';
  const busy = save.isPending || publish.isPending || unpublish.isPending;

  // Drafts save themselves a few seconds after the last change; a published post changes on the site
  // only when you press Save.
  const { mutate: saveNow, isPending: saving } = save;
  useEffect(() => {
    if (!post || live || !dirty || saving || !f.title.trim()) return;
    const t = setTimeout(() => saveNow(f), 3000);
    return () => clearTimeout(t);
  }, [f, post, live, dirty, saving, saveNow]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !busy) saveNow(f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, busy, f, saveNow]);

  // Don't lose edits on reload or navigation.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave without saving?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  const errs = { ...fieldErrors(save.error), ...fieldErrors(publish.error) };
  const lastError = save.error || publish.error || unpublish.error || remove.error || preview.error || announce.error;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link to="/posts" className="btn-icon" aria-label="All posts"><ArrowLeft className="size-5" /></Link>
            {post ? 'Edit post' : 'New post'}
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
          </span>
        }
        subtitle={
          dirty ? 'Unsaved changes' : post ? `Saved ${ago(post.updatedAt)}${post.updatedBy ? ` by ${post.updatedBy}` : ''}${live ? '' : ' · drafts save automatically'}` : 'Give it a title to start.'
        }
        actions={
          <>
            {post && (
              <button type="button" className="btn-secondary" onClick={() => preview.mutate()} disabled={preview.isPending} title="Open a preview of the saved post (valid for 2 hours)">
                <Eye className="size-4" /> Preview
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => save.mutate(f)} disabled={!dirty || busy || !f.title.trim()}>
              <Save className="size-4" /> {save.isPending ? 'Saving…' : live ? 'Save changes' : 'Save draft'}
            </button>
            {live ? (
              <button type="button" className="btn-secondary" onClick={() => unpublish.mutate()} disabled={busy}>
                <Undo2 className="size-4" /> Unpublish
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => publish.mutate()} disabled={busy || !f.title.trim()}>
                <Rocket className="size-4" /> {publish.isPending ? 'Publishing…' : f.publishedDate && f.publishedDate > today ? 'Schedule' : 'Publish'}
              </button>
            )}
          </>
        }
      />
      {live && dirty && <div className="mb-4"><Notice tone="warning">This post is live: saving changes updates the site right away.</Notice></div>}
      {status === 'scheduled' && post?.publishedDate && <div className="mb-4"><Notice>Scheduled: it appears on the site on {new Date(post.publishedDate).toUTCString().slice(0, 16)} (UTC).</Notice></div>}
      <ErrorBox error={lastError} className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <Field label="Title" error={errs.title}>
            <input
              className="input text-lg font-semibold"
              value={f.title}
              onChange={(e) => {
                const title = e.target.value;
                setF((cur) => ({ ...cur, title, slug: slugTouched || post?.slugLocked ? cur.slug : slugify(title) }));
              }}
              autoFocus={!post}
            />
          </Field>
          <MarkdocEditor value={f.body} onChange={(v) => set('body', v)} error={errs.body} />
          <Field label="Excerpt" hint="One or two sentences under the title, in lists, feeds, search results and the new-post e-mail." error={errs.excerpt}>
            <textarea className="input min-h-20" value={f.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
          </Field>
        </div>

        <aside className="space-y-4">
          <div className="card space-y-4 p-4">
            <Field
              label={<span className="flex items-center gap-1">Slug {post?.slugLocked && <Lock className="size-3.5 text-slate-400" />}</span>}
              hint={post?.slugLocked ? 'Locked: published posts keep their URL (likes, feedback and subscribers use it).' : `The URL: /blog/${f.slug || '…'}/`}
              error={errs.slug}
            >
              <input
                className="input font-mono text-xs"
                value={f.slug ?? ''}
                disabled={post?.slugLocked}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value.toLowerCase());
                }}
              />
            </Field>
            <Field label="Date" hint="Shown on the post. A future date schedules it (UTC). Empty = the day you publish." error={errs.publishedDate}>
              <input className="input" type="date" value={f.publishedDate ?? ''} onChange={(e) => set('publishedDate', e.target.value || null)} />
            </Field>
            <Field label="Updated on" hint="Optional “Updated” date." error={errs.updatedDate}>
              <input className="input" type="date" value={f.updatedDate ?? ''} onChange={(e) => set('updatedDate', e.target.value || null)} />
            </Field>
            <Field label="Author" error={errs.author} hint={authors.data && !authors.data.length ? <Link className="underline" to="/authors">Add an author first</Link> : undefined}>
              <select className="input" value={f.author} onChange={(e) => set('author', e.target.value)}>
                <option value="">Choose…</option>
                {authors.data?.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="card space-y-3 p-4">
            <p className="label">Topics</p>
            {topics.data?.length ? (
              <div className="flex flex-col items-start gap-1.5">
                {topics.data.map((t) => (
                  <Checkbox key={t.slug} checked={f.topics.includes(t.slug)} label={t.name} onChange={(on) => set('topics', on ? [...f.topics, t.slug] : f.topics.filter((x) => x !== t.slug))} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500"><Link className="underline" to="/topics">Create topics</Link> to group posts.</p>
            )}
            {errs.topics && <p className="text-xs text-rose-600">{errs.topics}</p>}
            <Field label="Tags" hint="Free-form keywords; each gets a /tags/ page." error={errs.tags}>
              <StringListEditor value={f.tags} onChange={(v) => set('tags', v)} placeholder="e.g. Performance" />
            </Field>
          </div>

          <div className="card space-y-3 p-4">
            <p className="label">Cover image</p>
            <ImageField value={f.coverId} onChange={(id, item) => setF((cur) => ({ ...cur, coverId: id, coverAlt: id ? cur.coverAlt || item?.alt || '' : '' }))} />
            {errs.coverId && <p className="text-xs text-rose-600">{errs.coverId}</p>}
            {f.coverId && (
              <Field label="Cover alt text" error={errs.coverAlt}>
                <input className="input" value={f.coverAlt} onChange={(e) => set('coverAlt', e.target.value)} />
              </Field>
            )}
          </div>

          <div className="card space-y-4 p-4">
            <Field label="Series" hint="Posts with the same series name are linked to each other." error={errs.series}>
              <input className="input" value={f.series} onChange={(e) => set('series', e.target.value)} />
            </Field>
            <Checkbox checked={f.featured} onChange={(v) => set('featured', v)} label="Featured on the home page" />
            <Field label="Repository link" hint="Optional. The code behind the post (GitHub, GitLab, …), shown as a button under the title." error={errs.repositoryUrl}>
              <input className="input" type="url" value={f.repositoryUrl} onChange={(e) => set('repositoryUrl', e.target.value)} placeholder="https://github.com/owner/repo" />
            </Field>
            <Field label="Canonical URL" hint="Only when the post was first published elsewhere." error={errs.canonicalUrl}>
              <input className="input" type="url" value={f.canonicalUrl} onChange={(e) => set('canonicalUrl', e.target.value)} placeholder="https://…" />
            </Field>
          </div>

          {post && (
            <div className="card space-y-2 p-4">
              {live && <a className="btn-ghost w-full justify-start" href={post.url} target="_blank" rel="noreferrer"><Eye className="size-4" /> Open on the site</a>}
              {live && status === 'published' && (
                <button type="button" className="btn-ghost w-full justify-start" onClick={() => announce.mutate()} disabled={announce.isPending}>
                  <Mail className="size-4" /> Draft a new-post e-mail
                </button>
              )}
              <a className="btn-ghost w-full justify-start" href={postExportUrl(post.id)} download><Download className="size-4" /> Export (Markdown + images)</a>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-danger-ghost w-full justify-start"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete “${post.title}”? ${live ? 'It disappears from the site; its likes and feedback stay but no longer belong to a post. ' : ''}This can't be undone.`)) remove.mutate();
                  }}
                >
                  <Trash2 className="size-4" /> Delete post
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export function PostEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const post = useQuery({
    queryKey: ['post', Number(id)],
    queryFn: () => ContentService.contentControllerGetPost({ id: Number(id) }),
    enabled: !isNew,
    staleTime: Infinity,
  });
  if (isNew) return <Editor key="new" post={null} />;
  if (post.isLoading) return <Spinner />;
  if (post.error || !post.data) return <ErrorBox error={post.error ?? new Error('There is no such post.')} />;
  return <Editor key={post.data.id} post={post.data} />;
}
