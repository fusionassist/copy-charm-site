# IDI SEO / Content Plan — from the Ads competitive research (2026-07-15)

> **For the IDI site session.** This plan comes from the Google Ads overhaul session's
> competitive research (full context: fusion-atlas\google-ads-battle-plan-2026-07.md).
> Google Ads campaign "IDI IE - Search - Signage & Displays" is LIVE and currently
> lands ALL traffic on the homepage because the category pages below don't exist.
> Every page shipped here directly improves ad Quality Score (lower CPCs) AND organic reach.
> **When a page ships, tell the ads session (google-ads-mcp project) so it repoints
> the matching ad group's final URL.**

## Priority 1 — the two 404s our ads need (ship first)

### /digital-signage
- **Target:** "digital signage ireland", "digital signage screens", "digital advertising screens"
- **Why:** the Digital Signage ad group (our biggest) lands on the homepage. Competitors
  (smartdigitalsignage.ie, creativesystems.ie, 1install.ie) all rank keyword-exact service pages.
- **Content:** H1 "Digital Signage Ireland — Supplied & Installed Nationwide". Lead with scale
  proof (2,500+ installs since 2009, own-brand Moytronix, 3-year warranty, 32 counties,
  Business All-Star 2024). Client logo strip (3Arena, SPAR, Supermac's, LONDIS, Combilift...).
  Sections: what we supply (indoor/outdoor/window/menu/LED), our own install team (vs couriers),
  process (survey → design → install → support), FAQ. CTA: Get a Fast Quote + Free Site Survey.
- **Data source:** SITE_META in src/lib/site-meta.ts already holds every claim.

### /digital-menu-boards
- **Target:** "digital menu boards ireland", "menu board screens", "restaurant menu screens"
- **Why:** historically IDI's best-converting ad keyword (€116 spend, 3 conversions in 90d).
  avts.ie and digitalscreendisplays.ie rank dedicated pages; ours 404s.
- **Content:** H1 "Digital Menu Boards Ireland". Supermac's/QSR proof. Sections: why digital menus
  (price changes in seconds, dayparting breakfast→lunch, allergen compliance callout — competitors
  mention allergen menus, buyers search it), hardware (Moytronix commercial panels vs consumer TVs),
  install + content design included, 3-year warranty. CTA as above.

## Priority 2 — trust & money pages

### /pricing-guide (or /how-much-does-digital-signage-cost)
- **Target:** "digital signage cost ireland", "digital menu board price ireland", "digital display screen price"
- **Why:** NOBODY in Ireland has a credible price guide (only creativesystems.ie shows raw prices,
  €375–€8,380). "digital display screen price" already appears in our paid search terms.
- **Content:** honest price bands per category (entry screen / menu board setup / touch kiosk /
  LED wall per sqm), what drives cost (size, brightness, mounting, content), why commercial-grade
  beats consumer TVs, grant funding section (LEO / Enterprise Ireland / Fáilte Ireland — DSD's
  only unique hook, neutralise it). End with quote CTA. Gerry to sign off the bands before publish.

### /case-studies (hub) + one page each: 3Arena, Supermac's, SPAR, South Dublin County Council
- **Why:** named-venue case studies are the ranking currency for "led video wall ireland"
  (avl.ie ranks purely off Gleneagle/Páirc Uí Chaoimh stories). No Irish signage rival
  publishes real case-study pages — logo walls only.
- **Content per page:** venue, challenge, what was installed (photos!), outcome. Even 300 words + images works.
- **Ads tie-in:** LED Video Walls ad group gets the 3Arena page as final URL.

## Priority 3 — verticals & kiosks

### /digital-signage-for-restaurants, /retail, /hotels, /gyms
- Mirror digitalscreendisplays.ie's vertical spread (deepest in market) but with NAMED clients
  they lack: Supermac's (restaurants), SPAR/LONDIS/Centra (retail), Westport Hotel Group (hotels).
- /digital-signage-for-schools already exists — pattern to copy.

### /self-service-kiosks (hub)
- **Target:** "self service kiosk ireland", "touch screen kiosk ireland", "interactive kiosk"
- **Why:** weakest local SERP of all clusters; our outdoor kiosk product page already ranks —
  a hub consolidating indoor/outdoor/wayfinding captures the head term.

### /moytronix
- Brand page for the own-hardware story — unique in the Irish market (everyone else resells
  Allsee/Samsung/LG). Target "moytronix" + support "commercial display ireland".

## SEO hygiene that multiplies all of the above
- Each page: unique title/meta (pattern in privacy-policy.tsx route head()), FAQPage or Service
  JSON-LD where fitting (OrganizationSchema component exists), internal links from homepage nav
  and between related pages, image alt text with keywords.
- These pages should be React routes (mirror-first architecture: new routes take over their URLs).
- Update sitemap when routes ship.

## Sequencing (one at a time, ADHD-friendly)
1. /digital-signage → tell ads session → ad group repointed
2. /digital-menu-boards → same
3. /pricing-guide (needs Gerry's price bands)
4. 3Arena case study (+ hub), then remaining case studies
5. Verticals, kiosks hub, /moytronix as capacity allows
