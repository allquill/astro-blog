import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  Catch, Controller, Get, Header, Module, NotFoundException, Param, Res, UnauthorizedException, UseFilters,
  type ArgumentsHost, type ExceptionFilter,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Staff } from '../auth/guards';
import { AppConfig } from '../config/app-config.service';

const BASE = '/api/admin/docs/';

/** Sidebar order; any other guide in the folder follows, alphabetically. */
const ORDER = ['getting-started', 'content-guide', 'engagement', 'analytics', 'development', 'build-and-deploy', 'go-live-checklist'];

/** The browser files docsify needs, served from node_modules so the docs work offline and without a CDN. */
const ASSETS: Record<string, { file: string; type: string }> = {
  'docsify.js': { file: 'docsify/lib/docsify.min.js', type: 'application/javascript' },
  'search.js': { file: 'docsify/lib/plugins/search.min.js', type: 'application/javascript' },
  'light.css': { file: 'docsify/lib/themes/vue.css', type: 'text/css' },
  'dark.css': { file: 'docsify/lib/themes/dark.css', type: 'text/css' },
  'prism-bash.js': { file: 'prismjs/components/prism-bash.min.js', type: 'application/javascript' },
  'prism-typescript.js': { file: 'prismjs/components/prism-typescript.min.js', type: 'application/javascript' },
  'prism-json.js': { file: 'prismjs/components/prism-json.min.js', type: 'application/javascript' },
  'prism-yaml.js': { file: 'prismjs/components/prism-yaml.min.js', type: 'application/javascript' },
};

// The theme follows the admin's toggle (same origin, so the same localStorage key), live across tabs.
const INDEX = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Docs · Astro Blog</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link id="theme" rel="stylesheet" href="${BASE}assets/light.css" />
  <script>
    function abTheme() {
      var t = null;
      try { t = localStorage.getItem('theme'); } catch (e) {}
      var dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.getElementById('theme').href = '${BASE}assets/' + (dark ? 'dark' : 'light') + '.css';
    }
    abTheme();
    addEventListener('storage', function (e) { if (e.key === 'theme' || e.key === null) abTheme(); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', abTheme);
  </script>
</head>
<body>
  <div id="app"></div>
  <script>
    window.$docsify = {
      name: 'Astro Blog docs',
      basePath: '${BASE}',
      homepage: 'getting-started.md',
      loadSidebar: true,
      subMaxLevel: 2,
      auto2top: true,
      externalLinkTarget: '_blank',
      search: { placeholder: 'Search the docs', noData: 'Nothing found', depth: 3 },
    };
  </script>
  <script src="${BASE}assets/docsify.js"></script>
  <script src="${BASE}assets/search.js"></script>
  <script src="${BASE}assets/prism-bash.js"></script>
  <script src="${BASE}assets/prism-typescript.js"></script>
  <script src="${BASE}assets/prism-json.js"></script>
  <script src="${BASE}assets/prism-yaml.js"></script>
</body>
</html>
`;

/**
 * Signed out: opening the docs goes to the admin sign-in, which comes back to /docs and on to the docs; the Markdown fetches docsify makes just get the 401.
 */
@Catch(UnauthorizedException)
class DocsSignInFilter implements ExceptionFilter {
  catch(_e: UnauthorizedException, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const res = host.switchToHttp().getResponse<Response>();
    if (!req.path.endsWith('/docs/') && !req.path.endsWith('/docs')) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }
    res.status(401).type('html').send(`<!doctype html><meta charset="utf-8"><title>Sign in</title>
<script>location.replace('/login?next=' + encodeURIComponent('/docs'));</script>
<p><a href="/login?next=%2Fdocs">Sign in</a> to read the docs.</p>`);
  }
}

/**
 * The project guides (docs/*.md) as a docsify site, for signed-in staff only. Not part of the OpenAPI
 * document: the admin SDK has nothing to call here; the admin's sidebar opens it in a new tab.
 */
@ApiExcludeController()
@Staff()
@UseFilters(DocsSignInFilter)
@Controller('api/admin/docs')
export class DocsController {
  constructor(private readonly config: AppConfig) {}

  private get dir() {
    return resolve(this.config.get('DOCS_DIR'));
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Header('X-Frame-Options', 'DENY')
  @Header('Content-Security-Policy', "frame-ancestors 'none'")
  index() {
    return INDEX;
  }

  @Get('assets/:name')
  asset(@Param('name') name: string, @Res() res: Response) {
    const asset = Object.hasOwn(ASSETS, name) ? ASSETS[name]! : undefined;
    if (!asset) throw new NotFoundException();
    // dotfiles: pnpm keeps packages under node_modules/.pnpm/; the paths are fixed above, never from the request.
    res.type(asset.type).set('Cache-Control', 'private, max-age=86400').sendFile(require.resolve(asset.file), { dotfiles: 'allow' });
  }

  /** One guide, or the sidebar built from the guides in the folder (title = first `# ` heading). */
  @Get(':file')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async file(@Param('file') file: string) {
    if (file === '_sidebar.md') return this.sidebar();
    // Plain guide names only: no paths, no dotfiles, nothing but .md.
    if (!/^[a-z0-9][a-z0-9_-]*\.md$/i.test(file)) throw new NotFoundException();
    return readFile(resolve(this.dir, file), 'utf8').catch(() => {
      throw new NotFoundException();
    });
  }

  private async sidebar() {
    const names = (await readdir(this.dir).catch(() => [] as string[]))
      .filter((f) => /^[a-z0-9][a-z0-9_-]*\.md$/i.test(f))
      .map((f) => f.slice(0, -3));
    const rank = (n: string) => (ORDER.includes(n) ? ORDER.indexOf(n) : ORDER.length);
    names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const lines = await Promise.all(
      names.map(async (n) => {
        const text = await readFile(resolve(this.dir, `${n}.md`), 'utf8').catch(() => '');
        const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? n;
        return `- [${title.replace(/[[\]]/g, '')}](${n}.md)`;
      }),
    );
    return lines.join('\n') + '\n';
  }
}

@Module({ controllers: [DocsController] })
export class DocsModule {}
