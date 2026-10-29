import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, ExternalLink, FileText, KeyRound, LayoutDashboard, LogOut, Mail, Menu, MessageSquare, Monitor, Moon, Settings, Sun, UserCheck, Users, X,
} from 'lucide-react';
import { DOCS_URL } from '@/features/docs/DocsPage';
import { DashboardService } from '@/sdk';
import { useAuth } from '@/shared/auth-context';
import { applyTheme, currentTheme, type Theme } from '@/shared/theme';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/posts', label: 'Posts', icon: FileText },
  { to: '/subscribers', label: 'Subscribers', icon: UserCheck },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare, badge: true },
  { to: '/digests', label: 'New-post e-mails', icon: Mail },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <button
      type="button"
      className="btn-ghost w-full justify-start"
      title={`Theme: ${theme} (click for ${next})`}
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
    >
      <Icon className="size-4" /> Theme: {theme}
    </button>
  );
}

/** Signed-in layout: sidebar (drawer on small screens) + page. Unauthenticated → /login. */
export function Shell() {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => DashboardService.dashboardControllerGet(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
    }`;

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 flex items-center gap-2 px-3 pt-2">
        <img src="/favicon.svg" alt="" className="size-7" />
        <span className="font-semibold">Astro Blog</span>
      </div>
      {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} className={link} onClick={() => setOpen(false)}>
          <n.icon className="size-4" /> {n.label}
          {n.badge && stats && stats.feedback.new > 0 && (
            <span className="ml-auto rounded-full bg-brand-700 px-1.5 text-xs text-white" title="New feedback">{stats.feedback.new}</span>
          )}
        </NavLink>
      ))}
      <a href={DOCS_URL} target="_blank" rel="noopener" className={link({ isActive: false })} onClick={() => setOpen(false)}>
        <BookOpen className="size-4" /> Docs
        <ExternalLink className="ml-auto size-3.5 text-slate-400" aria-label="Opens in a new tab" />
      </a>
      <div className="mt-auto space-y-1 border-t border-slate-200 pt-3 dark:border-white/10">
        <p className="px-3 pb-1 text-xs text-slate-500">
          Signed in as <strong>{user.username}</strong> ({user.role})
        </p>
        <NavLink to="/account" className={link} onClick={() => setOpen(false)}>
          <KeyRound className="size-4" /> Change password
        </NavLink>
        <ThemeToggle />
        <button type="button" className="btn-ghost w-full justify-start" onClick={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-white lg:block dark:border-white/10 dark:bg-slate-900">{sidebar}</aside>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 lg:hidden dark:border-white/10 dark:bg-slate-900">
        <span className="font-semibold">Astro Blog</span>
        <button type="button" className="btn-ghost" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-slate-900">
            <button type="button" className="btn-ghost absolute top-2 right-2" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
