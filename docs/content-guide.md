# Content guide

All content is files in `website/src/content/`, edited in **Keystatic**. Under `pnpm run dev` it is at
http://localhost:4322/keystatic. Saving writes the file, the dev site reloads, and publishing is a
commit plus a site build (CI does it on push).

## Posts (CMS → *Posts*)

| Field | Notes |
|---|---|
| Title / slug | The slug is the URL (`/blog/<slug>/`) **and** the key the API counts likes, shares and feedback under. Don't change it after publishing |
| Excerpt | Cards, search results, meta description and the new-post e-mail |
| Published / Last updated | Newest first; "Last updated" shows on the page and in the sitemap |
| Author | An entry in *Authors* (required) |
| Topics | Drive topic pages and topic RSS, and **who gets the new-post e-mail** |
| Tags | Free text; each gets a `/tags/<tag>/` page |
| Cover image + alt | Card, post header, social share image, e-mail image |
| Series | Posts with the same series name list each other, oldest first |
| Featured | The large card on the home page (else the newest post) |
| Draft | Visible under `pnpm run dev`, left out of production builds |
| Canonical URL | Only when the post first appeared elsewhere |

### The body editor

- **Code blocks.** Use the code button, or type three backticks. Set the **language** for highlighting.
  In the block's settings you can add a **Title** (e.g. a file name) and **Highlight lines** (`2,4-6`).
  In the file they are fence annotations: ` ```ts {% title="app.ts" highlight="2" %}`. Highlighting
  runs at build time in light and dark, and readers get a copy button.
- **Images.** Drag in or use the image button. Keystatic stores them under
  `src/assets/posts/<slug>/`, and the build turns them into responsive WebP. Always fill in the alt text.
- **+ menu blocks:**
  - **Video**: YouTube or Vimeo by ID or link (with an optional start time), or a video file URL. The
    player only loads when the reader clicks play.
  - **Callout**: note, tip, warning or danger, with an optional title.
  - **Image gallery**: 2 or 3 columns. These images live in `public/images/gallery/` and are served
    as-is, so keep them reasonably small.
  - **Link card**: a highlighted link with a title and description.
- Headings (`##`, `###`) make up the table of contents.

## Topics, authors, pages

- **Topics** have a name, slug, description, icon, accent colour and order. A topic page exists once it
  has a published post. Subscribers' choices are stored by slug, so avoid renaming the slug.
- **Authors** have a name, role, bio, photo and profile links, and get an `/authors/<slug>/` page.
- **Pages** (about, privacy, terms) choose whether they appear in the header and/or the footer.

## Site settings and the home page

*Site settings* holds the blog name, tagline, description, publisher, contact e-mail, social profiles,
extra header and footer links, **which share buttons to show**, the subscribe box text, posts per page
and the IndexNow key. *Home page* holds the hero texts and section titles.

Mailing-list e-mails (sender name, signature, footer address) are set in the **admin** (Settings), not
here.

## Editing on the live site (GitHub mode)

By default Keystatic writes local files, and it is only mounted by `astro dev`. The production image
never contains the CMS. To let authors publish without a checkout:

1. Set `PUBLIC_KEYSTATIC_GITHUB_REPO=owner/repo` (e.g. in `website/.env`). Keystatic then reads and
   commits to that repository through a GitHub App, which it walks you through creating on first use.
   The app's credentials go in `website/.env` as `KEYSTATIC_GITHUB_CLIENT_ID`,
   `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`
   (Keystatic's GitHub-mode docs have the details).
2. Run the Keystatic host somewhere authors can reach it: `pnpm --dir website run dev` on an internal
   machine, or a separate on-demand deployment of the website with the Keystatic integration.
3. Each save is a commit. The `develop` / `publish` workflows rebuild and push the site image, and
   deploying it publishes the post.

After publishing, send the new-post e-mail from the admin (**Posts → E-mail**). The API only sees the
post once the rebuilt site is serving it.

## Renaming or removing content

- **Renaming a post slug** gives it a new URL and resets its counters (they stay under the old slug).
  Add a redirect in `website/nginx.conf` if the old URL was shared.
- **Removing a topic** fails the build while posts still reference it (`reference('topics')`), so
  remove it from those posts first.
