import { useEffect } from 'react';
import { Spinner } from '@/shared/ui';

/** The API serves docs/ (docsify) to signed-in staff here; same origin, so the cookie goes along. */
export const DOCS_URL = '/api/admin/docs/';

/**
 * Not a screen: the sidebar opens the docs in a new tab. This route is where sign-in returns to when
 * the docs were opened signed out, and hands over to the docs page itself.
 */
export function DocsRedirect() {
  useEffect(() => window.location.replace(DOCS_URL), []);
  return <Spinner label="Opening the docs…" />;
}
