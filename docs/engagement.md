# Engagement

Everything readers do beyond reading: likes, shares, feedback and the mailing list. The site is static,
so each feature is a small script talking to `/api/public/*`. Each one either still works as a plain
form post without JavaScript, or hides itself when the API is unreachable.

## Which posts exist

The API has no copy of the content. It reads the website's **`/feed.json`** (JSON Feed 1.1 with a
`_blog` extension that carries each post's slug and topic ids, plus the topic list) from `SITE_FEED_URL`
and caches it for 5 minutes. It uses the feed to:

- refuse likes, shares and feedback for slugs that aren't on the site
- show post titles in the admin
- build new-post e-mails, with a snapshot taken when sending starts

If the feed has never been readable (for example when the website isn't up yet in development), any
well-formed slug is accepted and a warning is logged. The admin shows a banner in that state.

## Likes

- `POST` / `DELETE /api/public/posts/:slug/like`, and `GET …/stats` for the count plus "did I like it".
- Each like is stored as a **visitor hash**: an HMAC of IP + user agent with `JWT_SECRET_KEY`, 16 hex
  characters. A visitor can like a post once; the total is recounted on every change, so it can't drift.
- List pages fetch counts for all their cards in one call (`GET /api/public/stats?slugs=…`).

## Shares

- Share buttons are plain links to each network's share page, so they work without JavaScript. With
  JavaScript there is also **Share…** (the device share sheet, where available) and **Copy link**.
- Which networks appear: Keystatic → Site settings → Share buttons.
- Each click is counted per network (`POST /api/public/posts/:slug/share`) and sent to GA4 as `share`.
  This counts **clicks**, not completed shares.

## Feedback

- **On a post:** "Was this helpful?" 👍/👎. With JavaScript the vote is saved at once, and the message
  box that appears adds to the same record (`POST /api/public/feedback/:id/message`, accepted only from
  the same visitor within an hour). Without JavaScript it is one form, and the page shows "Thanks" on
  return (`?feedback=1`).
- **General:** `/feedback/`.
- Bare votes are stored as `read`, because they need no attention. Messages arrive as `new`, notify
  the admin's notify list and, if the reader left an address, send them a thank-you (each is a
  setting).
- In the admin: the inbox, read/archived/spam statuses and **replies by e-mail** (the reader's message
  is quoted). Per-post helpful ratios are under **Posts**.

## Mailing list

| Step | What happens |
|---|---|
| Subscribe | E-mail, optional name and topics (none = everything). A **honeypot** field catches bots. The answer is always "check your inbox", whether or not the address was already listed. A new or lapsed address gets a confirm link; an active one gets its manage link |
| Confirm | The link opens `/subscribe/confirm/?token=…`, where the reader clicks **Yes, subscribe me** (a POST). Mail scanners that open links therefore can't subscribe anyone. Then a welcome e-mail (a setting) |
| Manage | `/subscribe/manage/?token=…`, linked from every e-mail: change topics or name, unsubscribe, re-subscribe |
| Unsubscribe | The manage page, or the mail client's own button (RFC 8058 `List-Unsubscribe-Post` to `/api/public/unsubscribe?token=…`) |

- **Tokens** are `<id>.<HMAC(JWT_SECRET_KEY, purpose:id:accessKey)>` with separate *confirm* and
  *manage* purposes. Nothing link-shaped is stored, and changing `JWT_SECRET_KEY` invalidates every
  link already sent.
- Confirm e-mails to the same address are sent at most once every 2 minutes, and the subscribe routes
  are rate-limited per IP.
- In the admin, **Subscribers** offers:
  - search and filters by status and topic
  - a status change per row and resending the confirm link
  - CSV export
  - CSV import (admins only), either "already consented" (added as active) or added as pending with a
    confirm e-mail each

## New-post e-mails

1. Publish the post and let the site rebuild, so it appears in `feed.json`.
2. Admin → **Posts** → **E-mail** (or **New-post e-mails → New e-mail**) creates a draft. Its subject
   defaults to "New post: <title>", and you can add an optional note above the post card.
3. **Preview** shows the e-mail and the number of recipients: active subscribers who follow none (all
   topics) or at least one of the post's topics.
4. **Send test** sends a copy to you (or any address), marked `[TEST]`.
5. **Send** (admins only):
   - claims the draft, so a double click can't send it twice
   - snapshots the post and queues one `digest_deliveries` row per recipient
   - returns at once; a background loop then sends `DIGEST_BATCH_SIZE` e-mails, pauses
     `DIGEST_BATCH_PAUSE_MS`, and repeats
   - skips anyone who has unsubscribed in the meantime
   - resumes after an API restart
6. The page shows progress and each recipient's result. Failed sends keep the SMTP error.

Every list e-mail carries `List-Unsubscribe` / `List-Unsubscribe-Post` and a footer with the manage
link and the **mailing-list footer** from Settings (put your postal address there).

## Analytics (GA4)

Set `GA_MEASUREMENT_ID` at build time. The consent banner defaults to *denied*, using Consent Mode v2.
Besides page views, the site sends events for shares, likes, sign-ups, feedback, search, scroll depth,
video plays, code copies and outbound links.

**[Analytics](analytics.md)** covers setting it up so that tracking works: the GA4 property, passing
the ID to the build, the stream settings to change, key events and custom dimensions, the full list
of events, and how to check it.

The admin dashboard only shows what the API counts (likes, shares, subscribers, feedback). Traffic is
in GA4.

## Privacy notes

- No raw IP addresses are stored: likes and rate limits use salted hashes.
- Subscriber records: e-mail, optional name, topics, source page and the confirm/unsubscribe times.
  Deleting a subscriber in the admin removes the row and the address from past delivery records;
  setting them to *unsubscribed* keeps the record (useful as proof that they opted out).
- Public endpoints never return another reader's data, and never say whether an address is subscribed.
