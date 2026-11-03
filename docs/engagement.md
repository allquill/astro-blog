# Engagement

Everything readers do beyond reading: likes, shares, feedback and the mailing list. Each feature is a
small script in the page talking to `/api/public/*`. Each one either still works as a plain
form post without JavaScript, or hides itself when the API is unreachable.

## Which posts exist

The content is in the API's own database (`server/src/content/`). A post "exists" for readers when it
is **published and its date has come**. `SiteFeedService` (`server/src/feed/site-feed.service.ts`)
gives the rest of the API that list, and is used to:

- refuse likes, shares and feedback for slugs that aren't published posts
- show post titles in the admin
- build new-post e-mails, with a snapshot taken when sending starts

Post links are `PUBLIC_SITE_URL/blog/<slug>/`, and images in e-mails and feeds are absolute JPEG URLs
on the same host.

## Likes

- `POST` / `DELETE /api/public/posts/:slug/like`, and `GET …/stats` for the count plus "did I like it".
- Each like is stored as a **visitor hash**: an HMAC of IP + user agent with `JWT_SECRET_KEY`, 16 hex
  characters. A visitor can like a post once; the total is recounted on every change, so it can't drift.
- List pages fetch counts for all their cards in one call (`GET /api/public/stats?slugs=…`).

## Shares

- Share buttons are plain links to each network's share page, so they work without JavaScript. With
  JavaScript there is also **Share…** (the device share sheet, where available) and **Copy link**.
- Which networks appear: admin → Site → Share buttons.
- Each click is counted per network (`POST /api/public/posts/:slug/share`) and sent to GA4 as `share`.
  This counts **clicks**, not completed shares.
- A post shows the share buttons twice: in the header under the date, and again at the end of the
  post. Clicks in either bar count the same way.
- Also on wide screens, the post header shows a **QR code** of the post's URL beside the title, for
  opening it on a phone. It is brand teal with the site's mark in the middle (error correction level H,
  so the code still scans with the centre covered). It is drawn on the server as inline SVG
  (`website/src/lib/qr.ts`), so it needs no script or outside service. A scan opens the page like any
  visit and isn't counted as a share.

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

1. Publish the post. The e-mail links to `PUBLIC_SITE_URL/blog/<slug>/`, so set `PUBLIC_SITE_URL` to
   the site's real address (see [Build and deploy → Public hostnames](build-and-deploy.md#public-hostnames)).
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

Set `GA_MEASUREMENT_ID` for the `web` container (read when it starts). The consent banner defaults to *denied*, using Consent Mode v2.
Besides page views, the site sends events for shares, likes, sign-ups, feedback, search, scroll depth,
video plays, code copies and outbound links.

**[Analytics](analytics.md)** covers setting it up so that tracking works: the GA4 property, giving
the ID to the site, the stream settings to change, key events and custom dimensions, the full list
of events, and how to check it.

The admin dashboard only shows what the API counts (likes, shares, subscribers, feedback). Traffic is
in GA4.

## Privacy notes

- No raw IP addresses are stored: likes and rate limits use salted hashes.
- Subscriber records: e-mail, optional name, topics, source page and the confirm/unsubscribe times.
  Deleting a subscriber in the admin removes the row and the address from past delivery records;
  setting them to *unsubscribed* keeps the record (useful as proof that they opted out).
- Public endpoints never return another reader's data, and never say whether an address is subscribed.
