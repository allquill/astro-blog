# Analytics (GA4)

The website reports to Google Analytics 4 through gtag.js, with no Google Tag Manager container. It
sends page views and the custom events listed below, and asks for consent first (Consent Mode v2).

The admin dashboard does not use GA4. It shows only what the API counts itself: likes, shares,
subscribers and feedback. Traffic numbers are in GA4.

## How it works

- **One setting, baked in at build time:** `GA_MEASUREMENT_ID` (`G-…`). It is read when the website is
  built (`website/astro.config.mjs`), not when nginx serves it, so **changing it means rebuilding the
  website image.**
- **No ID, no analytics.** Without the ID the pages contain no Google code, no consent banner and no
  *Cookie settings* link.
- **Production builds only.** `astro dev` (`pnpm run dev`) never loads GA, even with the ID set, so
  writing posts locally doesn't add traffic.
- **The ID is checked.** A value that doesn't start with `G-` (an old `UA-…` ID, for example) stops the
  build with `The following constraints for GA_MEASUREMENT_ID are not met: startsWith`.
- **Consent first.** Every page starts with analytics storage *denied* and all ad signals denied for
  good (`components/Analytics.astro`). The banner (`components/ConsentBanner.astro`) appears until
  the visitor chooses:
  - **Accept** sends a consent update. GA sets its cookies and reports the visitor normally.
  - **Decline**, or no choice yet: GA receives only cookieless pings. These don't show up as users in
    reports; GA uses them for modelling at most.
  - The choice is kept in the visitor's browser (`localStorage` key `analytics-consent`). *Cookie
    settings* in the footer opens the banner again.

## 1. Create the GA4 property

1. In [Google Analytics](https://analytics.google.com), go to **Admin → Create → Property**. Set the
   time zone and currency, then finish the business details.
2. **Data collection and modification → Data streams → Add stream → Web.** Enter the blog's public
   URL (the same as `SITE_URL`) and a stream name.
3. Copy the stream's **Measurement ID** (`G-XXXXXXXXXX`). That is the only value the site needs. You
   don't need the "Google tag" snippet GA offers: the site already includes it.

**Use a separate property, or at least a separate stream, for the develop build**, so test traffic
never mixes with real readers. CI already keeps the two IDs apart (see step 2).

## 2. Give the ID to the build

Pick the route you deploy with.

**CI images (the usual way).** In the GitHub repository, go to **Settings → Secrets and variables →
Actions → Variables**. These are variables, not secrets: the ID is public in every page anyway.

| Variable | Used by |
|---|---|
| `GA_MEASUREMENT_ID` | `publish.yaml` (push to `main`): the `:<version>` and `:latest` images |
| `GA_MEASUREMENT_ID_DEVELOP` | `develop.yaml` and `manual.yaml`: the `:develop` and `:manual` images |

The build log prints `GA measurement ID: …` (or `<none - analytics disabled>`), so you can check which
ID went into an image. After setting a variable, run the workflow again: images built earlier don't
change.

**Docker Compose building from this checkout.** Set it in `docker/.env`, then rebuild the website:

```bash
GA_MEASUREMENT_ID=G-XXXXXXXXXX        # in docker/.env
pnpm run compose:up                   # runs `up -d --build`, so the website is rebuilt with the ID
```

A plain `docker compose up -d` with pulled images ignores this value, because the ID is part of the
image. Set the CI variable instead.

**A local production build**, to try it before deploying:

```bash
GA_MEASUREMENT_ID=G-XXXXXXXXXX pnpm --dir website run build
pnpm --dir website run preview        # http://localhost:4322
```

## 3. Adjust the stream's settings

In **Admin → Data streams → (your stream) → Enhanced measurement** (the gear icon), the site already
sends some of these events itself. Turn the duplicates off so they aren't counted twice:

| Enhanced measurement | Set to | Why |
|---|---|---|
| Page views | **on** | The page views themselves |
| … *Show advanced settings* → Page changes based on browser history events | **off** | Every page is a real page load. The search page rewrites its URL (`?q=`) as you type, which would otherwise count as a page view on every keystroke |
| Scrolls | **off** | The site sends `scroll` at 50% and 90% of an article; GA's own fires at 90% of any page |
| Outbound clicks | **off** | The site sends `click` with `outbound: true`, and adds where on the page the link was (`link_location`) |
| Site search | **off** | The site sends `search` when a search is made |
| Form interactions | **off** | The site sends `sign_up`, `post_feedback` and `feedback` itself; GA's generic `form_start` / `form_submit` only add noise |
| Video engagement | either | It only tracks YouTube embeds that use the JS API, which the site's embeds don't. Plays are sent as `video_start` |
| File downloads | either | Harmless |

Also worth changing:

- **Admin → Data collection and modification → Data retention:** raise *Event data retention* from 2
  to **14 months**. The default 2 months limits Explorations to the last 2 months.
- **Admin → Data streams → (stream) → Configure tag settings → Define internal traffic**, then
  activate the *Internal traffic* filter under **Admin → Data filters**, so your own visits don't
  count.

## 4. Key events and custom dimensions

**Key events** (formerly "conversions"), in **Admin → Data display → Events**: once an event has
arrived at least once, mark it with the star. Good candidates:

- `sign_up_confirmed`: a reader confirmed their subscription. This is the real sign-up, because
  `sign_up` only means the form was sent.
- `sign_up`, if you also want to see unconfirmed attempts.

**Custom dimensions.** GA4 receives every event parameter, but only shows a parameter in standard
reports and Explorations once it is registered. Go to **Admin → Data display → Custom definitions →
Create custom dimension**, with *Scope: Event* and the parameter name as below. Register the ones you
want to report on:

| Parameter | Sent with | Means |
|---|---|---|
| `item_id` | `share`, `like`, `post_feedback` | The post's slug |
| `content_type` | `share`, `like` | Always `article` |
| `helpful` | `post_feedback` | `true` / `false`: the "Was this helpful?" answer |
| `percent_scrolled` | `scroll` | `50` or `90` |
| `link_location` | `click` (outbound) | Where the link was: `article`, `page` or a named area |
| `video_url` | `video_start` | The embed that was played |
| `location` | `sign_up`, `copy_code`, `video_start` | The page path it happened on |
| `kind` | `feedback` | `general` (the feedback page) |
| `mode`, `source` | `theme_change` | Light/dark/auto, and which toggle |

Some names are already standard GA4 dimensions and need nothing: `method` (the share network, or
`newsletter`), `search_term`, `link_url`, `link_domain` and `outbound`. If GA refuses to register a
name, it is one of those. **Dimensions only apply from the moment they are registered**: they don't
fill in past data.

### Every event the site sends

| Event | When | Parameters |
|---|---|---|
| `page_view` | Every page (automatic) | GA's own |
| `share` | A share button was clicked | `method` (network), `content_type`, `item_id` |
| `like` | A post was liked (not when a like is taken back) | `content_type`, `item_id` |
| `sign_up` | The subscribe form was sent | `method`, `location` |
| `sign_up_confirmed` | The reader clicked **Confirm** on the page the confirmation e-mail links to | `method` |
| `post_feedback` | "Was this helpful?" answered | `helpful`, `item_id` |
| `feedback` | The general feedback form was sent | `kind` |
| `search` | A search was made on `/search/` | `search_term` |
| `scroll` | 50% and 90% of an article | `percent_scrolled`, `page_path` |
| `video_start` | A video embed was played | `video_url`, `location` |
| `copy_code` | A code block's copy button | `location` |
| `click` | A link to another site | `outbound`, `link_domain`, `link_url`, `link_location` |
| `contact` | A `mailto:` link | `method` (`email`) |
| `theme_change` | The light/dark toggle | `mode`, `source` |

They all go through `track()` in `website/src/lib/analytics.ts`. It does nothing when GA isn't loaded,
so a new event needs no guard: call `track('name', { … })` and add it to this table.

## 5. Check that tracking works

Use a browser profile **without an ad or tracking blocker**: uBlock Origin, Brave's shields, Firefox's
strict mode and many privacy extensions block `googletagmanager.com` and `google-analytics.com`.

1. **The tag is in the page.** View the source of any page and look for
   `googletagmanager.com/gtag/js?id=G-…` with your ID. If it's missing, the build had no ID, or it is
   a dev server (step 2).
2. **The banner appears** on the first visit. Click **Accept**. (To see it again later, use *Cookie
   settings* in the footer, or clear the site's data.)
3. **Hits are sent.** In DevTools → Network, filter on `collect`. Each hit is a request to
   `…google-analytics.com/g/collect`:
   - `tid=` is your measurement ID, and `en=` is the event (`page_view`, `scroll`, `share`, …).
   - `gcs=G111` means consent granted and full tracking; `gcs=G100` means analytics is still denied,
     because the banner hasn't been accepted.
   - Status `204` is normal.
4. **GA receives them.** **Reports → Realtime** shows you within a few seconds of accepting. For
   individual events with their parameters, use **Admin → Data display → DebugView**. It lists only browsers in debug
   mode: open [Tag Assistant](https://tagassistant.google.com), connect it to your site's URL, and
   use the tab it opens.
5. **Standard reports** (Engagement → Events, Pages and screens) fill in 24–48 hours later. That delay
   is normal and not a fault.

### When nothing shows up

| Symptom | Cause |
|---|---|
| No `gtag/js` in the page source | Built without `GA_MEASUREMENT_ID`, it's `astro dev`, or the image predates the variable. Rebuild |
| Tag present, no `collect` requests | A blocker in this browser. Try a clean profile |
| Only `gcs=G100` hits, nothing in Realtime | Consent wasn't accepted. Accept in the banner, or reopen it via *Cookie settings* |
| Hits sent, but to a different property | `tid=` shows the ID that was baked in: the develop ID in a develop image, or an old one. Check the CI variable and the build log line |
| Page views jump while typing a search | *Page changes based on browser history events* is still on (step 3) |
| Scrolls or outbound clicks counted twice | The matching Enhanced measurement switch is still on (step 3) |
| A parameter isn't in reports | It isn't registered as a custom dimension, or it was registered after the data arrived (step 4) |
| Realtime works, reports are empty | Wait 24–48 hours |

## Privacy

GA4 cookies are only set after **Accept**, and ad storage, ad user data and ad personalisation are
always denied. Even so, update **Privacy** (`website/src/content/pages/privacy.mdoc`) to name Google
Analytics, what it collects and how to withdraw consent (*Cookie settings*). Where your readers are, it
may also be worth collecting less: **Admin → Data collection and modification → Data collection**
lets you turn off granular location and device data, and Google signals.
