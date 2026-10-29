import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, Mail, Pencil, RefreshCw, Search } from 'lucide-react';
import { DashboardService, DigestsService } from '@/sdk';
import { fmtDate, num } from '@/shared/format';
import { useUrlFilters } from '@/shared/url-filters';
import { Badge, Empty, ErrorBox, Notice, PageHeader, Spinner } from '@/shared/ui';
import { editPostUrl, KEYSTATIC_URL } from './labels';

type Sort = 'published' | 'likes' | 'shares' | 'helpful';

/** Posts are written in Keystatic; this lists what the site published, with the numbers kept here. */
export function PostsPage() {
  const f = useUrlFilters();
  const navigate = useNavigate();
  const q = f.get('q');
  const topic = f.get('topic');
  const sort = f.get('sort', 'published') as Sort;
  const posts = useQuery({ queryKey: ['posts'], queryFn: () => DashboardService.dashboardControllerPosts() });
  const announce = useMutation({
    mutationFn: (postSlug: string) => DigestsService.digestsControllerCreate({ requestBody: { postSlug } }),
    onSuccess: (d) => navigate(`/digests/${d.id}`),
  });

  const topicName = useMemo(() => new Map((posts.data?.topics ?? []).map((t) => [t.slug, t.name])), [posts.data]);
  const rows = useMemo(() => {
    const needle = q.toLowerCase();
    const list = (posts.data?.data ?? []).filter((p) => (!topic || p.topics.includes(topic)) && (!needle || p.title.toLowerCase().includes(needle) || p.slug.includes(needle)));
    const helpful = (p: (typeof list)[number]) => (p.helpful + p.notHelpful ? p.helpful / (p.helpful + p.notHelpful) : -1);
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      published: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
      likes: (a, b) => b.likes - a.likes,
      shares: (a, b) => b.shares - a.shares,
      helpful: (a, b) => helpful(b) - helpful(a),
    };
    return [...list].sort(by[sort]);
  }, [posts.data, q, topic, sort]);

  return (
    <>
      <PageHeader
        title="Posts"
        subtitle={<>Posts and topics are written in Keystatic and published with the site. Likes, shares and feedback are counted here.</>}
        actions={
          <>
            {KEYSTATIC_URL && (
              <a className="btn-secondary" href={`${KEYSTATIC_URL.replace(/\/$/, '')}/collection/posts/create`} target="_blank" rel="noreferrer">
                <Pencil className="size-4" /> Write a post
              </a>
            )}
            <button type="button" className="btn-ghost" onClick={() => void posts.refetch()} disabled={posts.isFetching}>
              <RefreshCw className={`size-4 ${posts.isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </>
        }
      />
      <ErrorBox error={posts.error || announce.error} className="mb-4" />
      {posts.data?.feedUnavailable && (
        <div className="mb-4">
          <Notice tone="warning">
            The site feed (<code>{posts.data.feedUrl}</code>) could not be read. Start or rebuild the website, then refresh.
          </Notice>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <input className="input pl-8" placeholder="Search titles" value={q} onChange={(e) => f.set({ q: e.target.value })} />
        </label>
        <select className="input w-auto" value={topic} onChange={(e) => f.set({ topic: e.target.value })} aria-label="Topic">
          <option value="">All topics</option>
          {posts.data?.topics.map((t) => <option key={t.slug} value={t.slug}>{t.name} ({t.posts})</option>)}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => f.set({ sort: e.target.value === 'published' ? '' : e.target.value })} aria-label="Sort">
          <option value="published">Newest first</option>
          <option value="likes">Most liked</option>
          <option value="shares">Most shared</option>
          <option value="helpful">Most helpful</option>
        </select>
      </div>
      {posts.isLoading && <Spinner />}
      {posts.data && !rows.length && <Empty>No posts{q || topic ? ' match these filters' : ' yet'}.</Empty>}
      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[52rem]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="th">Post</th>
                <th className="th">Published</th>
                <th className="th text-right">Likes</th>
                <th className="th text-right">Shares</th>
                <th className="th text-right" title="Readers who answered 'Was this helpful?'">Helpful</th>
                <th className="th text-right">Messages</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {rows.map((p) => {
                const votes = p.helpful + p.notHelpful;
                const edit = editPostUrl(p.slug);
                return (
                  <tr key={p.slug}>
                    <td className="td">
                      <a href={p.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{p.title}</a>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.topics.map((t) => <Badge key={t} tone="brand">{topicName.get(t) ?? t}</Badge>)}
                      </div>
                    </td>
                    <td className="td whitespace-nowrap text-slate-500">{fmtDate(p.publishedAt)}</td>
                    <td className="td text-right tabular-nums">{num(p.likes)}</td>
                    <td className="td text-right tabular-nums">{num(p.shares)}</td>
                    <td className="td text-right tabular-nums" title={`${p.helpful} yes · ${p.notHelpful} no`}>
                      {votes ? `${Math.round((p.helpful / votes) * 100)}% of ${votes}` : '—'}
                    </td>
                    <td className="td text-right tabular-nums">
                      {p.messages ? <Link className="text-brand-700 hover:underline dark:text-brand-300" to={`/feedback?post=${p.slug}&status=`}>{p.messages}</Link> : '0'}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <a className="btn-ghost p-1.5" href={p.url} target="_blank" rel="noreferrer" aria-label={`Open ${p.title}`} title="Open on the site">
                          <ExternalLink className="size-4" />
                        </a>
                        {edit && (
                          <a className="btn-ghost p-1.5" href={edit} target="_blank" rel="noreferrer" aria-label={`Edit ${p.title}`} title="Edit in Keystatic">
                            <Pencil className="size-4" />
                          </a>
                        )}
                        <button type="button" className="btn-ghost" disabled={announce.isPending} onClick={() => announce.mutate(p.slug)} title="Draft a new-post e-mail">
                          <Mail className="size-4" /> E-mail
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
