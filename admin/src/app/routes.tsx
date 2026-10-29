import { createBrowserRouter, type RouteObject } from 'react-router';
import { Shell } from './Shell';
import { NotFoundPage } from './NotFoundPage';
import { AccountPage } from '@/features/auth/AccountPage';
import { InvitePage } from '@/features/auth/InvitePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DigestDetailPage } from '@/features/digests/DigestDetailPage';
import { DigestsPage } from '@/features/digests/DigestsPage';
import { DocsRedirect } from '@/features/docs/DocsPage';
import { FeedbackDetailPage } from '@/features/feedback/FeedbackDetailPage';
import { FeedbackPage } from '@/features/feedback/FeedbackPage';
import { PostsPage } from '@/features/posts/PostsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SubscribersPage } from '@/features/subscribers/SubscribersPage';
import { UsersPage } from '@/features/users/UsersPage';

/** Every route of the app, as data. Add a screen here — never a stray <Route>. */
const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/invite', element: <InvitePage /> },
  {
    element: <Shell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'posts', element: <PostsPage /> },
      { path: 'subscribers', element: <SubscribersPage /> },
      { path: 'feedback', element: <FeedbackPage /> },
      { path: 'feedback/:id', element: <FeedbackDetailPage /> },
      { path: 'digests', element: <DigestsPage /> },
      { path: 'digests/:id', element: <DigestDetailPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'settings', element: <SettingsPage /> },
      // The docs open in a new tab (sidebar link); this is only the return target after signing in.
      { path: 'docs', element: <DocsRedirect /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
