import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FileText, Heart, MessageSquare, Share2, UserCheck, UserMinus, Clock } from 'lucide-react';
import { DashboardService } from '@/sdk';
import { fmtDate, num } from '@/shared/format';
import { ErrorBox, Notice, PageHeader, Spinner } from '@/shared/ui';
import { NETWORK_LABEL } from '@/features/posts/labels';
import { BarList, ColumnChart } from './charts';

function Stat({ label, value, icon, to, tone }: { label: string; value: ReactNode; icon: ReactNode; to?: string; tone?: 'alert' }) {
  const body = (
    <div className={`card flex items-start justify-between p-4 ${to ? 'transition hover:ring-brand-600' : ''}`}>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`mt-1 text-3xl font-semibold tabular-nums ${tone === 'alert' ? 'text-rose-600 dark:text-rose-400' : ''}`}>{value}</p>
      </div>
      <span className="text-slate-400">{icon}</span>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </div>
  );
}

export function DashboardPage() {
  const { data, error, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => DashboardService.dashboardControllerGet(), refetchInterval: 60_000 });
  const fb = data?.feedback;
  const votes = fb ? fb.helpful + fb.notHelpful : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Readers, subscribers and feedback at a glance. Page views and traffic are in Google Analytics. Numbers refresh every minute."
      />
      <ErrorBox error={error} />
      {isLoading && <Spinner />}
      {data && (
        <div className="space-y-6">
          {data.feedUnavailable && (
            <Notice tone="warning">
              The API can't read the site's <code>feed.json</code>, so post titles are missing. Start the website (or set SITE_FEED_URL on the server).
            </Notice>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Active subscribers" value={num(data.subscribers.active)} icon={<UserCheck className="size-5" />} to="/subscribers?status=active" />
            <Stat label="Awaiting confirmation" value={num(data.subscribers.pending)} icon={<Clock className="size-5" />} to="/subscribers?status=pending" />
            <Stat label="New feedback" value={num(fb!.new)} tone={fb!.new ? 'alert' : undefined} icon={<MessageSquare className="size-5" />} to="/feedback?status=new" />
            <Stat
              label="Found posts helpful"
              value={votes ? `${Math.round((fb!.helpful / votes) * 100)}%` : '—'}
              icon={<MessageSquare className="size-5" />}
              to="/posts"
            />
            <Stat label="Posts" value={num(data.posts)} icon={<FileText className="size-5" />} to="/posts" />
            <Stat label="Likes" value={num(data.likes)} icon={<Heart className="size-5" />} to="/posts" />
            <Stat label="Share clicks" value={num(data.shares)} icon={<Share2 className="size-5" />} to="/posts" />
            <Stat label="Unsubscribed" value={num(data.subscribers.unsubscribed)} icon={<UserMinus className="size-5" />} to="/subscribers?status=unsubscribed" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="New subscribers per week">
              <ColumnChart title="Confirmed subscriptions per week, last 12 weeks" data={data.subscribersPerWeek.map((d) => ({ ...d, label: `Week of ${fmtDate(d.key)}` }))} />
            </Panel>
            <Panel title="Likes per day">
              <ColumnChart title="Likes per day, last 30 days" data={data.likesPerDay.map((d) => ({ ...d, label: fmtDate(d.key) }))} />
            </Panel>
            <Panel title="Feedback per day">
              <ColumnChart title="Feedback per day, last 30 days" data={data.feedbackPerDay.map((d) => ({ ...d, label: fmtDate(d.key) }))} />
            </Panel>
            <Panel title="Share clicks by network">
              <BarList title="Share clicks by network" data={data.sharesByNetwork.map((d) => ({ ...d, label: NETWORK_LABEL[d.key] ?? d.key }))} />
            </Panel>
            <Panel title="Top posts (likes + shares)" className="lg:col-span-2">
              <BarList title="Top posts by likes and shares" data={data.topPosts.map((p) => ({ key: p.slug, count: p.likes + p.shares, label: p.title }))} />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
