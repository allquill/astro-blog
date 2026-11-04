# Content guide

All content (posts, topics, authors, pages, images, site settings) lives in the API's database and is
edited in the **admin app**. There is no build step: **Publish** puts a post on the site within a few
seconds (the site checks for changes every `CONTENT_POLL_MS`, 5 s by default, and nginx keeps a page
for 10 s).

| Admin screen | What it holds |
|---|---|
| **Posts** | Every post, drafts included, with likes, shares and feedback. Import and export |
| **Topics** | Topic name, slug, description, icon, colour, order |
| **Authors** | Name, role, bio, photo, profile links |
| **Pages** | About, privacy, terms and other pages at `/<slug>/` |
| **Images** | Every uploaded image: alt text, where it is used, delete |
| **Site** | Blog name, navigation, share buttons, subscribe box, home page texts |

Staff can write, edit and publish. Only admins delete content, change Site settings and import.

New to the editor? Follow the [step-by-step guide](content-how-to.md): adding a post or a page, code
snippets, videos, images, callouts and link cards.

## Posts

**Posts → New post** opens the editor. Drafts save themselves a few seconds after you stop typing;
a published post changes on the site only when you press **Save changes** (Ctrl/Cmd+S).

| Field | Notes |
|---|---|
| Title / slug | The slug is the URL (`/blog/<slug>/`) **and** the key likes, shares, feedback and e-mails use. It follows the title until you edit it, and is **locked once the post has been published** |
| Date | Shown on the post. A **future date schedules** the post: it is published but appears on that day (UTC). Empty = the day you publish |
| Updated on | Optional "Updated" date (and the sitemap's last change) |
| Author | Required to publish |
| Topics | Topic pages and topic RSS, and **who gets the new-post e-mail** |
| Tags | Free text; each gets a `/tags/<tag>/` page |
| Cover image + alt | Card, post header, share image, e-mail image |
| Series | Posts with the same series name list each other, oldest first |
| Featured | The large card on the home page (else the newest post) |
| Repository link | Optional https link to the code behind the post (a GitHub, GitLab, Bitbucket or Codeberg repository, or any https page). Shown as a **View the code on GitHub** button under the title |
| Canonical URL | Only when the post first appeared elsewhere. Such a post points search engines at the original and is left out of the sitemap |
| Excerpt | Cards, search results, meta description and the new-post e-mail |
| SEO title | Optional (**Search & sharing**). Replaces the title in the browser tab, search results and share cards; the page heading keeps the title. Aim for about 60 characters |
| Meta description | Optional (**Search & sharing**). Replaces the excerpt as the search and share description. Aim for about 155 characters |
| Hide from search engines | Optional (**Search & sharing**). The post stays on the blog but gets `noindex` and is left out of the sitemap |

- **Share image:** the cover. A post without one gets a generated 1200×630 card (its SEO title or title
  on the brand colour, with the blog name and the author), redrawn whenever one of those changes.

- **Preview** opens the saved post on the site, drafts included, through a signed link that works for
  two hours and is never indexed.
- **Publish** checks that there is an author, a date and a body. **Unpublish** takes the post off the
  site; its counters stay.
- **Export** downloads the post as Markdown (a `.zip` with its images when it has any).

### The body editor

The body is **Markdoc**: Markdown plus a few tags. The toolbar inserts everything, so you rarely type
a tag by hand. Problems (an unknown tag, a missing attribute) show under the editor as you type, and a
body with errors can't be saved.

- **Text:** bold, italic, inline code, links, headings (`##`, `###`; they make the table of contents),
  lists and quotes.
- **Code block** (the file icon): paste code, or **fetch it from a link**.
  - Fetch takes a public file on GitHub, GitLab, Bitbucket or a Gist, or any https link to a text
    file. Add `#L10-L20` to take only those lines. The code is copied in when you insert it, so later
    changes to the file don't change the post.
  - Set the **language** (highlighting), a **title** (e.g. the file name), **highlight lines**
    (`2,4-6`) and a **source link**, which shows as "View on GitHub" above the code.
  - In the body it is a fence with annotations:
    ` ```ts {% title="app.ts" highlight="2,4-6" source="https://github.com/…#L10-L20" %}`.
  - Readers get both light and dark highlighting and a copy button.
- **Image:** pick from the library or upload (JPEG, PNG, WebP, GIF or AVIF, up to `MEDIA_MAX_BYTES`,
  10 MB by default). Fill in the alt text. The site serves responsive WebP copies.
- **Gallery:** several images in 2 or 3 columns, each with alt text and an optional caption.
- **Video:** YouTube or Vimeo by link or ID (with an optional start time), or a video file URL. The
  player loads only when the reader clicks play.
- **Callout:** note, tip, warning or danger, with an optional title.
- **Link card:** a highlighted link with a title and description.

## Topics, authors, pages

- **Topics** have a name, slug, description, icon, colour and order. A topic page exists once it has a
  published post. The slug can't change after creation (subscribers' choices use it), and a topic that
  posts still use can't be deleted.
- **Authors** have a name, role, bio, photo and profile links, and get an `/authors/<slug>/` page. An
  author with posts can't be deleted.
- **Pages** (about, privacy, terms) are live as soon as they are saved, and choose whether they appear
  in the header and/or the footer. A few slugs are reserved for the site's own routes (`blog`,
  `topics`, `api`, …).

## Images

Uploads are decoded and saved again by the API, which drops EXIF data (location, camera) and anything
that isn't an image. SVG is refused. Files live in `MEDIA_DIR` (`docker/volumes/server/media/` in
Docker) beside the database: back them up together. **Images** shows where each one is used; an image
still in use can't be deleted.

## Site settings and the home page

**Site** holds the blog name, tagline, description, publisher, contact e-mail, social profiles, extra
header and footer links, **which share buttons to show**, the subscribe box text, posts per page and
the IndexNow key, the **Google Search Console and Bing Webmaster verification codes** (paste only the
`content="…"` value of the meta tag each one gives you), the **brand colour**, plus the home page's hero
texts and section titles. Setting up Google and Bing is described in
[SEO and search engines](seo.md).

### Brand colour

**Site → Brand colour** (admins) sets the colour of the site and its e-mails. Pick one of the themes
(**Default** teal, **Purple**, **Blue**, **Pink**, **Green**) or any Tailwind colour family under **Or
any Tailwind colour**. A preview shows a button, a link and a topic badge; **Save site settings**
applies it, and the site shows it within a few seconds.

| Follows the brand colour | Stays as it is |
|---|---|
| Buttons, links, highlights, header glows and focus rings on the site | The admin app (always teal) |
| The browser-tab icon and the header logo mark (`/mark.svg`) | `logo.png` (home-screen icon, default link preview image, logo in structured data) and the fallback `/favicon.svg` |
| QR codes on posts | Topic colours (each topic's own **Colour**) |
| Buttons and quote bars in every e-mail the API sends | |

- The colours are Tailwind's own palettes. Light families (yellow, lime, amber) give white button text
  less contrast, so check the preview.
- The setting is part of `site.yaml` in an export (`brandColor: purple`), so an import carries it over.

Mailing-list e-mails (sender name, signature, footer address) are set under **Settings**.

## Writing for search

The site handles the technical side (sitemaps, canonical links, structured data, share cards; see
[SEO and search engines](seo.md)). What decides whether people find and click a post is the content
itself. These habits help most.

### Posts

- **Write for one clear question or task.** Decide what someone would type into a search box to find
  the post, and make sure the post answers it fully. One topic per post beats a post that covers five.
- **Title:** specific and plain, with the main words near the start (*"Cache pnpm installs in GitHub
  Actions"* rather than *"Speeding things up"*). The browser tab and search results show it as
  `<title> · <blog name>`. When the title is long or playful, put a clearer one in **SEO title**.
  Search results cut off at about 60 characters, blog name included.
- **Slug:** short, lowercase, words joined by dashes, with the main keywords (`github-actions-caching`).
  Drop filler words and dates. It is **locked once published**, so get it right first.
- **Excerpt:** one or two sentences that say what the reader gets, written for a person. It is the
  meta description unless you set **Meta description** (about 155 characters; longer is cut off).
  Search engines may still show their own snippet; a good excerpt makes that less likely.
- **Headings:** the title is the page's only top-level heading, so start the body at `##`, with `###`
  below it. Don't skip levels. `##` and `###` headings also build the table of contents. Make them
  describe their section (*"Restore the cache"*, not *"Step 2"*).
- **Opening paragraph:** say what the post covers and for whom in the first two or three sentences.
  Readers and search engines both decide there.
- **Links:**
  - Link to your own related posts, topics and pages where they help the reader. Internal links help
    search engines find and rank posts.
  - Link to sources and official documentation.
  - Use descriptive link text (*"the pnpm store docs"*), never *"click here"*.
- **Images:**
  - Upload them rather than linking from elsewhere: uploaded images get responsive WebP copies and are
    listed in the image sitemap.
  - Give every image alt text that says what it shows (*"Cache hit ratio before and after, 40% to
    92%"*). Leave out "image of".
  - A **cover image** gives the post a large share preview and an image in search results. Use at least
    1280 px wide, landscape, with the subject in the middle (social networks crop to about 1.91:1).
- **Code and video:** use code blocks (not screenshots of code) so the code can be searched and copied.
  Embedded YouTube/Vimeo videos are announced to search engines as part of the post, so a short
  summary in the text around them helps.
- **Topics and tags:** pick one to three topics and a few precise tags. Each tag gets its own page, so
  reuse existing tags instead of near-duplicates (`TypeScript`, not also `typescript` and `TS`).
- **Keep it current:** when you revise a post substantially, set **Updated on**. The post shows the
  date, and search engines see the change in the sitemap and structured data. Don't bump it for typo
  fixes.
- **Author:** a real author with a role, bio, photo and profile links builds trust, and the profile
  links go into the structured data.
- **Avoid duplicates:**
  - Don't publish the same text twice.
  - For a post that first appeared elsewhere, set **Canonical URL** to the original. It then sends
    search engines there and is left out of the sitemap.
  - Use **Hide from search engines** for posts that shouldn't be found by search at all, such as
    announcements for subscribers only or thin placeholder posts.

### Pages

- Give each page a clear **Title** and a one or two sentence **Description**; the description is its
  meta description and the subtitle under the title.
- Slugs should be the obvious word: `about`, `privacy`, `contact`, `uses`.
- An **About** page with who writes the blog and why is worth having: it is the page search engines
  and readers use to judge the blog.
- Keep **Last updated** current on policy pages (privacy, terms).
- Link important pages from the header or footer (**Link in the header / footer**) so they are found
  from every page.

### Topics and authors

- A **topic description** is the meta description of its page. Write a real sentence about what
  the topic covers, not just its name.
- An **author bio** is the description of the author page. Two or three sentences about who they are
  and what they write about.

### What not to do

- Don't stuff keywords into titles, excerpts or alt text. Write naturally; repetition hurts.
- Don't change a published post's subject entirely. Write a new post and link the old one to it.
- Don't publish many short posts on the same question. One thorough post ranks better than several
  thin ones.

## Import and export

**Posts → Export all** (admins) downloads a `.zip`, and **Import** reads the same format back.
Both can be narrowed to chosen items. The zip looks like this:

```
posts/<slug>/index.md        YAML front matter + Markdoc body
posts/<slug>/assets/…        its images, referenced as ./assets/<file>
pages/<slug>/index.md
topics/<slug>.yaml           name, description, icon, accent, order
authors/<slug>.yaml          name, role, bio, avatar (./assets/…), links
site.yaml, home.yaml
```

A post's front matter:

```yaml
---
title: Astro islands, explained
excerpt: Ship HTML by default and hydrate only the interactive bits.
publishedDate: 2026-10-20
author: ada-park
topics: [web-development]
tags: [Astro, Performance]
cover: ./assets/islands.jpg
coverAlt: Abstract gradient
series: Fast sites with Astro
featured: true
repositoryUrl: https://github.com/ada-park/astro-islands-demo
seoTitle: Astro islands in plain words      # optional; also seoDescription
noindex: false                              # optional
draft: false
---
```

- **Export** takes every post, topic, author and page, or only the ones you choose:
  - Untick a kind to leave it out, or press **Choose…** next to it and tick items in the list (it can
    be filtered by title or slug). **Export all** goes back to every item of that kind.
  - **Include the topics and authors the exported posts use** (on by default) adds what those posts
    need, even when Topics or Authors are unticked, so the zip imports cleanly into another blog.
  - **Published posts only** leaves drafts out, chosen or not.
- **Import** first runs a **dry run** (**Check**): it changes nothing and lists, per item, whether it
  would be created, overwritten, skipped or refused (unknown author or topic, missing image, invalid
  body). Then **Import N selected** applies it.
  - Every row that would be created or overwritten has a tick box, ticked by default. Untick what you
    don't want, or use the per-kind boxes above the list (Posts, Topics…) and the box in the header.
  - Dependencies follow: a post that needs a topic or author from the same file shows it under
    Notes. Ticking the post ticks them, and unticking one of them also unticks the posts that need
    it (a line under the list says what changed with it). A post imported without a topic or author
    it needs is refused with "Unknown topic" or "Unknown author".
  - Changing the file or an option clears the list; press **Check** again.
  - Existing items are skipped unless you tick **Overwrite**.
  - **Import every post as a draft** ignores `draft: false`. A post without an author is always
    imported as a draft.
  - Each item is imported completely or not at all.
- A single post can also be imported as a plain `.md` file.
- Limits: 50 MB upload, 200 MB unpacked, 2,000 files. Paths with `..` are refused.
- From the command line (paths relative to `server/`):
  - `pnpm run content:import -- <file.zip | file.md | folder> [--overwrite] [--draft] [--dry-run]`
  - `pnpm run content:export -- <out.zip> [--published]`
  - The command line always imports or exports everything; choosing items is in the admin only.
  - In Docker: `docker compose exec server node dist/cli/content.js import /data/backup.zip`.
- The sample content is in `server/seed/content.zip`: `pnpm run content:import -- seed/content.zip`.
- **Moving from the old Keystatic files:** run `pnpm run content:import -- <path to a website/ checkout>`.
  It reads `src/content/` (`.mdoc`, YAML, `settings.yaml`) with images from `src/assets/` and `public/`.

The format is also a way to write posts in any Markdown editor: export, edit, import with
**Overwrite**.

## After publishing

Send the new-post e-mail from **Posts → E-mail** (or the editor's **Draft a new-post e-mail**).

## Renaming or removing content

- **Slugs of published posts can't change**, so links, counters and e-mails stay valid. To move a
  post, create a new one and add a redirect in `website/nginx.conf`.
- **Deleting a post** (admins) removes it from the site; its likes and feedback stay in the database
  under the old slug.
