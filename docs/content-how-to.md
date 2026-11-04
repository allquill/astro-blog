# Step by step

Walkthroughs for the most common jobs in the admin app. The button and field names below are the ones
on screen. For every field and rule, see the [Content guide](content-guide.md).

## Before you start

1. Sign in to the admin. **Staff** can write, edit and publish. Deleting content, importing and
   changing **Site** settings are for **admins**.
2. Make sure there is an **author** to put on the post: **Authors → New author**, with a name and,
   optionally, a role, bio, photo and profile links. A post can't be published without one.
3. Make sure the **topics** you want exist: **Topics** → add a name, description, icon and colour.
  - Topics decide which subscribers get the new-post e-mail, so pick them carefully.
  - A topic's slug can't change after it is created.

## Add a new post

1. Open **Posts** and press **New post**.
2. Type the **Title**. The slug (the URL, `/blog/<slug>/`) follows the title until you edit it.
  - Choose the slug before publishing: it is **locked once the post has been published**.
3. Write the **Excerpt**: one or two sentences, shown in post lists, search results, feeds and the
   new-post e-mail.
4. Write the body in the editor. The toolbar inserts code, images, videos and so on; see the
   sections below.
5. Fill in the side panel:
  - **Date**: leave it empty to use the day you publish, or pick a **future date to schedule** the
    post (it appears on that day, UTC).
  - **Author** (required), **Topics** and **Tags**.
  - **Cover image** and **Cover alt text**: used on cards, at the top of the post, in share previews
    and in the e-mail.
  - Optional: **Series**, **Featured on the home page**, **Repository link** (see
    [Link the post's code](content-how-to.md#link-the-posts-code)), **Canonical URL** (only if the post first appeared
    elsewhere).
  - Optional: **Search & sharing** (see
    [Make a post search-friendly](content-how-to.md#make-a-post-search-friendly)).
6. Drafts save themselves a few seconds after you stop typing; **Save draft** saves straight away.
7. Press **Preview** to see the draft on the real site. The link works for two hours and is never
   indexed.
8. Press **Publish**. It checks for an author, a date and a body, and the post is on the site within
   about 15 seconds.
9. Optional: press **Draft a new-post e-mail** in the editor (or **E-mail** on the post's row in
   **Posts**) to tell subscribers.

To change a published post, edit it and press **Save changes** (Ctrl/Cmd+S). Unlike a draft, a
published post changes on the site only when you save. **Unpublish** takes it off the site; its likes,
shares and feedback stay.

## Add a new page

Pages are the standalone pages such as About, Privacy or Terms, at `/<slug>/`.

1. Open **Pages** and press **New page**.
2. Fill in the **Title**, the **Slug** (the URL; a few slugs such as `blog`, `topics` and `api` are
   reserved for the site) and a **Description** (shown under the title and in search results).
  - Keep the slug the obvious word (`about`, `privacy`), and write the description as one or two
    real sentences: it is the page's meta description.
3. Optional: **Last updated** (useful for a privacy policy), and **Link in the header** and/or **Link
   in the footer** to add the page to the site's navigation.
4. Write the body with the same editor and toolbar as posts.
5. Press **Save**. **A page goes live as soon as it is saved**; there is no draft. When you change an
   existing page, the editor warns you that saving updates it right away.
6. Press **Open** to view it on the site.

## Make a post search-friendly

A five-minute pass before you press **Publish**. The reasons behind each step are in
[Writing for search](content-guide.md#writing-for-search).

1. **Title:** does it say plainly what the post is about, main words first? If it's long or clever,
   open **Search & sharing** and write a plainer **SEO title** (aim for 60 characters or fewer).
2. **Slug:** short, with the main keywords, no dates or filler. It can't change after publishing.
3. **Excerpt:** one or two sentences saying what the reader will get. To show something different in
   search results, write a **Meta description** (aim for 155 characters or fewer).
4. **Check the preview** under **Search & sharing**: it shows roughly how the post will look in search
   results. The counters turn amber when a field is longer than search engines usually show.
5. **Headings:** sections start with `##` (the toolbar's **Heading** button), sub-sections with
   `###`, and each heading says what its section is about.
6. **Images:** a **Cover image** (landscape, 1280 px wide or more) with **Cover alt text**, and alt
   text on every image in the body. Without a cover, the post shares a generated card with its title.
7. **Links:** at least one link to a related post or topic on the blog, and descriptive link text.
8. **Topics and tags:** one to three topics, and existing tags where they fit.
9. **Leave Hide from search engines unticked**, unless the post really shouldn't appear in search.
10. After publishing, in Google Search Console paste the post's URL into **URL inspection** and press
  **Request indexing** (see "Check that it works" in [SEO and search engines](seo.md)). If your site uses
  IndexNow, ask a developer to run `pnpm run indexnow`.

When you revise an older post substantially, set **Updated on** so search engines see the change.

## Format text

The body is Markdown plus a few tags (Markdoc). Select text and use the toolbar:

| Button | What it does |
|---|---|
| **Bold**, **Italic**, **Inline code** | Wrap the selection |
| **Link** | `[link text](https://…)` |
| **Heading**, **Subheading** | `##` and `###`. These build the post's table of contents |
| **Bulleted list**, **Numbered list**, **Quote** | Prefix the selected lines |

Problems (an unknown tag, a missing attribute) are listed under the editor as you type, and a body
with errors can't be saved. The **Markdoc syntax** link at the end of the toolbar opens the full
syntax reference.

## Add a code snippet

1. Put the cursor where the code should go (or select code you've already pasted) and press **Code
   block (paste or from GitHub)** on the toolbar.
2. Get the code in, either way:
  - **Paste** it into **Code**, or
  - **Fetch from a link**: paste the link to a public file on GitHub, GitLab, Bitbucket or a Gist (or
    any https link to a text file) and press **Fetch**. Add `#L10-L20` to the link to take only those
    lines. The language, title and source link fill themselves in.
3. Check the details:
  - **Language**: used for highlighting (`ts`, `bash`, `json`, …).
  - **Title**: shown above the code, usually the file name.
  - **Highlight lines**: lines to emphasise, such as `2,4-6`.
  - **Source link**: optional, shown as "View on GitHub" (or the site's name) above the code.
4. Press **Insert**. The editor adds a fence like this:

   ````md
   ```ts {% title="app.ts" highlight="2,4-6" source="https://github.com/owner/repo/blob/main/app.ts#L10-L20" %}
   export function hello(name: string) {
     return `Hello, ${name}`;
   }
   ```
   ````

Fetched code is **copied into the post** when you insert it, so later changes to the file don't
change the post; fetch it again to update it. Readers get light and dark highlighting and a copy
button.

## Link the post's code

When a post comes with a project or example code, link the repository once for the whole post, and
link individual files from their code blocks.

**The whole repository: Repository link**

1. In the post editor's side panel, paste the link into **Repository link**, for example
   `https://github.com/owner/repo`. Any https link works: a repository on GitHub, GitLab, Bitbucket or
   Codeberg, a folder or branch inside one (`…/tree/main/examples/islands`), or another code page.
2. Save the draft (or **Save changes** on a published post) and **Preview** it.
3. Check it: under the title, the date and author line, there is a **View the code on GitHub** button
   (it names GitLab, Bitbucket and so on for those links, or the site's address for anything else).
   It opens in a new tab.

To remove the button, clear the field and save. The link must start with `https://`; anything else is
refused when you save.

**One file: a code block's Source link**

Inside the body, a code block can point at the file it came from. Use **Fetch from a link** or fill
in **Source link** (see [Add a code snippet](content-how-to.md#add-a-code-snippet)), and the block shows "View on
GitHub" above the code. Use both: the repository button for the project, source links for the files
you quote.

**A highlighted link in the text**

To point at the repository again further down, for example at the end of a tutorial, insert a
**Link card** with the repository URL (see [Add a callout or a link card](content-how-to.md#add-a-callout-or-a-link-card)).

## Add a video

1. Put the cursor where the video should go and press **Video** on the toolbar.
2. Choose the **Source**: **YouTube**, **Vimeo** or **Video file (URL)**.
3. Paste the **Video link or ID** (for example `https://youtu.be/dQw4w9WgXcQ`), or for a file the full
   https URL of an `.mp4` or `.webm`.
4. Give it a **Title**, which screen readers announce, and optionally **Start at (seconds)**.
5. Press **Insert**. The editor adds:

   ```md
   {% video provider="youtube" id="dQw4w9WgXcQ" title="Astro islands in 2 minutes" start=30 /%}
   ```

Nothing loads from YouTube or Vimeo until the reader presses play, so a video doesn't slow the page
down or set cookies on its own.

## Add images and galleries

**One image**

1. Press **Image** on the toolbar.
2. Pick an image from the library, or upload one (JPEG, PNG, WebP, GIF or AVIF, up to 10 MB by
   default). SVG is refused.
3. Fill in the **Alt text**: describe the image for people who can't see it. Leave it empty only for
   pure decoration.
4. Press **Insert**. The site serves resized WebP copies automatically.

**A gallery**

1. Press **Gallery**, then pick or upload several images.
2. Under **In the gallery, in this order**, give each one alt text and an optional caption, and
   remove the ones you don't want.
3. Choose **Columns** (2 or 3) and press **Insert**.

Every uploaded image is listed under **Images**, which shows where each one is used. An image that
is still in use can't be deleted.

## Add a callout or a link card

**Callout**: a highlighted box for a note, tip, warning or danger.

1. Press **Callout**, choose the **Kind**, optionally a **Title**, and write the **Text** (Markdown is
   fine).
2. Press **Insert**:

   ```md
   {% callout type="tip" title="Good to know" %}
   Islands hydrate only when they need to.
   {% /callout %}
   ```

**Link card**: a highlighted link with a title and description.

1. Press **Link card** and fill in the **Link** (a full URL, or a path on this site such as
   `/blog/my-post/`), the **Title** and the **Description**.
2. Press **Insert**:

   ```md
   {% linkcard url="/blog/astro-islands/" title="Astro islands, explained" description="Ship HTML by default." /%}
   ```

## Change the site's colours

1. Open **Site** (admins only) and scroll to **Brand colour**.
2. Click a theme (**Default**, **Purple**, **Blue**, **Pink** or **Green**), or a colour under **Or
   any Tailwind colour**.
3. Check the preview under the swatches: a button, a link and a topic badge in that colour.
4. Press **Save site settings**. The site picks up the colour within a few seconds. The tab icon may
   take a reload to change.
5. To go back, choose **Default** and save.

The colour also changes the header logo mark, the QR codes and the buttons in e-mails. The admin app
keeps its own colours. See [Brand colour](content-guide.md#brand-colour) for everything it covers.

## Back up or move some content

To copy a few posts (or pages, topics, authors) to another blog, or to keep a backup of them:

1. Open **Posts** (admins only) and press **Export all**.
2. Untick the kinds you don't want. Next to **Posts**, press **Choose…** and tick the posts to take.
   Do the same for pages, topics or authors if you want only some of them.
3. Leave **Include the topics and authors the exported posts use** ticked, so the posts can be
   imported on their own.
4. Press **Download .zip**.

To bring it in (on the same blog or another one):

1. Open **Posts** and press **Import**. Choose the `.zip` (or a single `.md` post).
2. Tick **Overwrite** if items that already exist should be replaced, and **Import every post as a
   draft** to review posts before they go live.
3. Press **Check**. This is a dry run: nothing changes yet. The list shows what would be created,
   overwritten, skipped or refused, and why.
4. Untick any rows you don't want. A post's topics and author come along when you tick it, and
   unticking a topic or author also unticks the posts that need it.
5. Press **Import N selected**. The result list shows what happened to each item.

See [Import and export](content-guide.md#import-and-export) for the file format and limits.

## Schedule, update or remove content

- **Schedule**: give the post a future **Date** and publish it. It appears on that day (UTC).
- **Show that a post was revised**: set **Updated on**. The post shows an "Updated" date and the
  sitemap picks it up.
- **Take a post down for now**: **Unpublish**. You can publish it again later, under the same slug.
- **Remove it for good** (admins): **Delete post** in the editor. Its likes and feedback stay in the
  database under the old slug.
- **Move a published post to a new URL**: slugs of published posts can't change. Create a new post
  and ask a developer to add a redirect from the old URL.

More detail on every field, import/export and site settings is in the [Content guide](content-guide.md).
