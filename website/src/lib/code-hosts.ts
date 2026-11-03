// Links to code: a code block's "View on …" source and a post's repository button.

const HOSTS: Record<string, string> = { 'github.com': 'GitHub', 'gist.github.com': 'GitHub Gist', 'gitlab.com': 'GitLab', 'bitbucket.org': 'Bitbucket', 'codeberg.org': 'Codeberg' };

/** The link as a URL when it is http(s), else null (never render a javascript: or data: link). */
export function codeUrl(link: string | null | undefined): URL | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

/** The name of the site a link lands on: "GitHub", "GitLab", or the bare host name. */
export function codeHostName(url: URL): string {
  const host = url.hostname.replace(/^www\./, '');
  return HOSTS[host] ?? host;
}

/** GitHub and Gist links get the GitHub mark; anything else a generic code icon. */
export const codeHostIcon = (url: URL): 'github' | 'code' => (url.hostname.replace(/^www\./, '').endsWith('github.com') ? 'github' : 'code');
