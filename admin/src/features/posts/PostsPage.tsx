import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Download, ExternalLink, FileDown, FileUp, Mail, Plus, Search } from 'lucide-react';
import { ContentService, DigestsService, type PostSummaryDto } from '@/sdk';
import { useAuth } from '@/shared/auth-context';
import { fmtDate, num } from '@/shared/format';
import { useUrlFilters } from '@/shared/url-filters';
import { Badge, Empty, ErrorBox, PageHeader, Pager, Spinner } from '@/shared/ui';
import { thumbUrl } from '../editor/markdoc';
import { postExportUrl, STATUS_LABEL, STATUS_TONE } from './labels';
import { ExportDialog, ImportDialog } from './TransferDialogs';

const PAGE_SIZE = 50;

/** Every post, drafts included, with the numbers counted here. Publishing is instant: no site build. */
export function PostsPage() {
  const { isAdmin } = useAuth();
  const f = useUrlFilters();
  const navigate = useNavigate();
  const q = f.get('q');
  const status = f.get('status');
  const [dialog, setDialog] = useState<'import' | 'export' | null>(null);
  const posts = useQuery({
    queryKey: ['content-posts', q, status, f.page],
    queryFn: () => ContentService.contentControllerListPosts({ q: q || undefined, status: (status || undefined) as 'draft' | 'published' | 'scheduled' | undefined, page: f.page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => ContentService.contentControllerListTopics() });
  const topicName = useMemo(() => new Map((topics.data ?? []).map((t) => [t.slug, t.name])), [topics.data]);
  const announce = useMutation({
    mutationFn: (postSlug: string) => DigestsService.digestsControllerCreate({ requestBody: { postSlug } }),
    onSuccess: (d) => navigate(`/digests/${d.id}`),
  });

  return (
    <>
      <PageHeader
        title="Posts"
        subtitle="Write, preview and publish posts here. Published posts are on the site within seconds."
        actions={
          <>
            {isAdmin && (
              <>
                <button type="button" className="btn-secondary" onClick={() => setDialog('import')}><FileUp className="size-4" /> Import</button>
                <button type="button" className="btn-secondary" onClick={() => setDialog('export')}><FileDown className="size-4" /> Export all</button>
              </>
            )}
            <Link className="btn-primary" to="/posts/new"><Plus className="size-4" /> New post</Link>
          </>
        }
      />
      <ErrorBox error={posts.error || announce.error} className="mb-4" />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <input className="input pl-8" placeholder="Search titles and slugs" value={q} onChange={(e) => f.set({ q: e.target.value })} />
        </label>
        <select className="input w-auto" value={status} onChange={(e) => f.set({ status: e.target.value })} aria-label="Status">
          <option value="">All posts</option>
          <option value="draft">Drafts</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
      </div>
      {posts.isLoading && <Spinner />}
      {posts.data && !posts.data.data.length && <Empty>No posts{q || status ? ' match these filters' : ' yet. Write the first one.'}</Empty>}
      {posts.data && posts.data.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[56rem]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="th">Post</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
                <th className="th text-right">Likes</th>
                <th className="th text-right">Shares</th>
                <th className="th text-right">Messages</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {posts.data.data.map((p: PostSummaryDto) => (
                <tr key={p.id}>
                  <td className="td">
                    <div className="flex items-start gap-3">
                      {p.coverId ? <img src={thumbUrl(p.coverId)} alt="" className="h-10 w-16 shrink-0 rounded object-cover" /> : <span className="h-10 w-16 shrink-0 rounded bg-slate-100 dark:bg-white/5" />}
                      <div>
                        <Link to={`/posts/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.featured && <Badge tone="violet">Featured</Badge>}
                          {p.topics.map((t) => <Badge key={t} tone="brand">{topicName.get(t) ?? t}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="td"><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status] ?? p.status}</Badge></td>
                  <td className="td whitespace-nowrap text-slate-500">{fmtDate(p.publishedDate)}</td>
                  <td className="td text-right tabular-nums">{num(p.likes)}</td>
                  <td className="td text-right tabular-nums">{num(p.shares)}</td>
                  <td className="td text-right tabular-nums">
                    {p.messages ? <Link className="text-brand-700 hover:underline dark:text-brand-300" to={`/feedback?post=${p.slug}&status=`}>{p.messages}</Link> : '0'}
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {p.status === 'published' && (
                        <a className="btn-icon" href={p.url} target="_blank" rel="noreferrer" aria-label={`Open ${p.title}`} title="Open on the site">
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                      <a className="btn-icon" href={postExportUrl(p.id)} download aria-label={`Export ${p.title}`} title="Export (Markdown + images)">
                        <Download className="size-4" />
                      </a>
                      {p.status === 'published' && (
                        <button type="button" className="btn-ghost" disabled={announce.isPending} onClick={() => announce.mutate(p.slug)} title="Draft a new-post e-mail">
                          <Mail className="size-4" /> E-mail
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {posts.data && <Pager page={f.page} pageSize={PAGE_SIZE} total={posts.data.total} onPage={(p) => f.set({ page: p })} />}
      <ImportDialog open={dialog === 'import'} onClose={() => setDialog(null)} />
      <ExportDialog open={dialog === 'export'} onClose={() => setDialog(null)} />
    </>
  );
}
