# ADR 0006 — Beta walled off from search engines until cutover

**Status:** Accepted — 2026-05-26
**Related:** [ADR 0003](0003-mirror-first-runtime.md)

## Context

`beta.interactivedisplays.ie` serves the wp-mirror copy of `interactivedisplays.ie` for any URL we haven't rebuilt as a TanStack route. The mirror's HTML carries `<meta name="robots" content="index, follow">` (inherited from the live site's Rank Math SEO config) and `<link rel="canonical">` tags that have been mangled by wget into broken relative paths like `../interactivedisplays.ie/index.html`.

Result if left as-is: Google discovers `beta.interactivedisplays.ie`, treats it as a parallel site, indexes a duplicate copy of every page. Two pages compete for the same keywords. Canonicals don't help because they're broken. The live `interactivedisplays.ie` loses rank, or Google chooses the beta as canonical and the live site loses traffic during the transition.

We need beta indexable eventually — it BECOMES the production site at cutover. We don't need it indexable now.

## Decision

Three-layer noindex on beta, controlled by a single env flag `SITE_NOINDEX=true`:

1. **`X-Robots-Tag: noindex, nofollow` HTTP header** on every response (except `robots.txt` — crawlers must read that to learn the Disallow rule). Set by wrapping the request router in `start-node.mjs` so it covers TanStack routes, mirror responses, AI endpoints, JSON APIs, and static assets uniformly. The header is the most authoritative signal — overrides any page-level meta robots.
2. **`robots.txt` switches to `User-agent: * / Disallow: /`** when `SITE_NOINDEX` is on. The friendly AI-crawler allowlist exists in the same handler but is only emitted when noindex is off.
3. **Mirror HTML rewriter** replaces every `<meta name="robots" ...>` with `<meta name="robots" content="noindex, nofollow"/>` so the page-level signal matches the header. Avoids confusing mixed signals.

At production cutover, remove the `SITE_NOINDEX=true` line from `~/apps/copy-charm-site/.env.local` on the host, restart the supervisor. All three layers flip back to the open SEO/AI configuration in one move.

## Consequences

**Positive:**
- Search engines won't index beta. Live `interactivedisplays.ie` rankings are protected through the migration.
- AI agents you point at the beta directly (eg. via WebFetch tool, via pasting `/llms.txt` into ChatGPT) still work — they're not respecting robots.txt and the `X-Robots-Tag` is advisory for them. So we can demo it.
- One env flag controls the whole behaviour. Easy to test (toggle on a local dev launcher), easy to reverse at cutover.
- The implementation lives in `start-node.mjs` only — no changes to TanStack route code, no changes to mirror HTML on disk. Clean separation between "the site" and "is the site indexable today".

**Negative:**
- The noindex propagates to assets too (CSS, JS, JSON). Harmless — search engines don't index those anyway — but it does mean every response has the header. ~30 bytes per response.
- If someone forgets to remove `SITE_NOINDEX=true` at cutover, the production site stays invisible to Google. Mitigation: documented in `docs/PLESK_DEPLOY.md`. Verify post-cutover with `curl -I https://interactivedisplays.ie/ | grep robots` returning nothing.

**Operational:**
- Verifiable from outside:
  ```bash
  curl -I https://beta.interactivedisplays.ie/ | grep -i x-robots-tag
  # expected: x-robots-tag: noindex, nofollow
  curl https://beta.interactivedisplays.ie/robots.txt
  # expected: User-agent: * / Disallow: /
  ```

## Alternatives considered

- **HTTP Basic Auth on the whole subdomain** — strongest isolation but breaks WebFetch demos and forces a password on every visit. Rejected.
- **Just the `<meta name="robots">` tag** — weaker than the header (the header takes precedence per Google docs), and the mirror HTML originally had `index, follow` which we'd be fighting at runtime anyway. Rejected.
- **Just `robots.txt` Disallow** — many AI crawlers ignore robots.txt; the X-Robots-Tag is the actual control. Rejected as sole solution.

## Verification this still holds

The three layers, each independently checkable:

```bash
# Header (every page)
curl -I https://beta.interactivedisplays.ie/contact-us -L | grep -i robots
# expected: x-robots-tag: noindex, nofollow

# robots.txt
curl https://beta.interactivedisplays.ie/robots.txt
# expected first non-comment line: Disallow: /

# Mirror HTML rewritten
curl -s https://beta.interactivedisplays.ie/ | grep -oE '<meta name="robots"[^>]*>'
# expected: <meta name="robots" content="noindex, nofollow"/>
```

Re-litigate at production cutover (becomes "remove the env flag" rather than "re-decide the architecture").
