import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { FeedbackService } from '@/sdk';
import { ago } from '@/shared/format';
import { useUrlFilters } from '@/shared/url-filters';
import { Badge, Checkbox, Empty, ErrorBox, PageHeader, Pager, Spinner } from '@/shared/ui';
import { FEEDBACK_STATUSES, helpfulLabel, STATUS_TONE, type FeedbackStatus } from './labels';

const PAGE_SIZE = 50;

/** The feedback inbox. Bare votes are hidden unless asked for: they need no answer. */
export function FeedbackPage() {
  const f = useUrlFilters();
  const filters = {
    status: (f.get('status') || undefined) as FeedbackStatus | undefined,
    kind: (f.get('kind') || undefined) as 'post' | 'general' | undefined,
    post: f.get('post') || undefined,
    q: f.get('q') || undefined,
    withMessage: f.get('votes') !== '1',
  };
  const list = useQuery({
    queryKey: ['feedback', filters, f.page],
    queryFn: () => FeedbackService.adminFeedbackControllerList({ ...filters, page: f.page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Feedback" subtitle="Messages and “Was this helpful?” answers from readers." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <input className="input pl-8" placeholder="Search messages, names, e-mails" value={f.get('q')} onChange={(e) => f.set({ q: e.target.value })} />
        </label>
        <select className="input w-auto" value={f.get('status')} onChange={(e) => f.set({ status: e.target.value })} aria-label="Status">
          <option value="">Inbox (new + read)</option>
          {FEEDBACK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={f.get('kind')} onChange={(e) => f.set({ kind: e.target.value })} aria-label="Kind">
          <option value="">Posts and general</option>
          <option value="post">About a post</option>
          <option value="general">General</option>
        </select>
        <Checkbox checked={f.get('votes') === '1'} onChange={(v) => f.set({ votes: v })} label="Include votes without a message" />
        {filters.post && (
          <button type="button" className="btn-ghost" onClick={() => f.set({ post: '' })}>
            Post: {filters.post} ✕
          </button>
        )}
      </div>
      <ErrorBox error={list.error} className="mb-4" />
      {list.isLoading && <Spinner />}
      {list.data && !list.data.data.length && <Empty>Nothing here.</Empty>}
      {list.data && list.data.data.length > 0 && (
        <ul className="card divide-y divide-slate-100 dark:divide-white/5">
          {list.data.data.map((x) => (
            <li key={x.id}>
              <Link to={`/feedback/${x.id}`} className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {x.status === 'new' && <span className="size-2 rounded-full bg-brand-600" aria-label="New" />}
                  <span className="font-medium">{x.name || x.email || 'Anonymous reader'}</span>
                  <span className="text-slate-500">· {x.postTitle ?? (x.postSlug ? x.postSlug : 'General')}</span>
                  {helpfulLabel(x.helpful) && <Badge tone={x.helpful ? 'emerald' : 'amber'}>{helpfulLabel(x.helpful)}</Badge>}
                  {x.repliedAt && <Badge tone="sky">Replied</Badge>}
                  {x.status !== 'new' && x.status !== 'read' && <Badge tone={STATUS_TONE[x.status]}>{x.status}</Badge>}
                  <span className="ml-auto text-xs text-slate-500">{ago(x.createdAt)}</span>
                </div>
                {x.message && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{x.message}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.data && <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={(page) => f.set({ page })} />}
    </>
  );
}
