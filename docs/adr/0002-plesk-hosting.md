# ADR 0002 — Plesk + Node + nginx custom directive

**Status:** Accepted — 2026-05-25
**Related:** [ADR 0001](0001-tanstack-vs-next.md)

## Context

Three viable hosting targets for the SSR Node app:

1. **Vercel** — the original ADR's choice. Native Next.js, edge runtime, automatic Preview Deployments.
2. **Cloudflare Workers** — Lovable's scaffold pre-wired this (`@cloudflare/vite-plugin`, `wrangler.jsonc`, `src/server.ts` written as a Workers handler).
3. **Plesk Node.js** — the existing IDI hosting box already runs Plesk for `interactivedisplays.ie` (WordPress), `interactivedisplays.cloud`, and a half-dozen other Fusion properties. Node 24 and 25 are installed.

Gerry's requirements: "same server as the other IDI sites, isolated from the Odoo Azure VM, Cloudflare CDN in front." That's option 3.

## Decision

Adopt **Plesk Node**, but **not** via Plesk's per-domain Node.js extension UI. Instead:

1. The TanStack Start fetch handler runs as a backgrounded Node 24 process on `127.0.0.1:3417`.
2. A cron entry (`* * * * * ~/bin/beta-node-supervisor.sh`) keeps it alive — restarts within 60 seconds of any crash, idempotent via PID file.
3. Plesk's per-domain "Apache & nginx Settings → Additional nginx directives" gets a custom `location ~ ^/ { proxy_pass http://127.0.0.1:3417; ... }` rule. Regex form (not the simpler prefix `location /`) because Plesk auto-generates a prefix `location /` that nginx errors on as duplicate.
4. Let's Encrypt cert managed by Plesk in the usual way.

## Consequences

**Positive:**
- Zero new infrastructure cost — uses an existing paid host.
- Beta and production can both live on the same box (current beta becomes prod at cutover; just rename the subdomain).
- nginx termination + Cloudflare in front gives us a normal CDN model without any Plesk-specific magic.
- The cron supervisor is portable — works on any Linux host. If we ever move off Plesk it ports unchanged.

**Negative:**
- We don't use Plesk's Node.js UI at all — the panel can't show the app's state. Operators learn the supervisor + nginx model instead. Documented in [docs/PLESK_DEPLOY.md](../PLESK_DEPLOY.md).
- The custom nginx directive is per-domain config that gets overwritten if anyone toggles things in Plesk's "Reset to default" flows. We've not hit this; if it happens, paste back from the deploy doc.
- The cron supervisor restarts within 60s of a crash but doesn't catch slower failure modes (process is alive but stuck). For higher availability we'd add a HEAD-check supervisor or move to systemd. Current uptime hasn't justified the work.

**Operational:**
- One-shot deploy: `ssh beta_displays@78.153.200.34 'cd ~/apps/copy-charm-site && ./deploy.sh'`.
- Build runs on the server (Bun installed in user home). No need to ship build artifacts.

## Alternatives considered

- **Vercel** — would be simpler. Rejected because (a) Gerry explicitly wanted the IDI Plesk host, (b) we'd be paying for another platform, (c) the production cutover plan involves switching DNS at Cloudflare from the legacy WP to the new app on the same host — much cleaner if the new host IS the same host.
- **Cloudflare Workers** — would have given us global edge. Rejected because (a) Plesk = isolated from Odoo, Workers = much more architectural change to introduce, (b) we'd need Cloudflare R2 / D1 for stateful bits that Plesk handles natively, (c) the wrangler config Lovable shipped used the Assets binding which has subtle differences from regular Node FS access.
- **Plesk Node.js panel** — the "obvious" path. Tried it; the per-domain Node.js UI tile does not appear on this Plesk install despite permissions being on (confirmed empty in the Plesk Apps tab and missing from the Hosting & DNS tab). Workaround above bypasses the issue entirely. If Plesk fixes the UI we can migrate to it without changing app code.

## Verification this still holds

```bash
# App is up:
ssh beta_displays@78.153.200.34 'pgrep -af "node start-node.mjs"'

# Cron supervisor is registered:
ssh beta_displays@78.153.200.34 'crontab -l'

# Cert is Let's Encrypt (not Plesk self-signed):
openssl s_client -connect beta.interactivedisplays.ie:443 -servername beta.interactivedisplays.ie < /dev/null 2>/dev/null | openssl x509 -noout -issuer
# expected: issuer=C=US, O=Let's Encrypt, CN=R*
```

Re-litigate this if (a) Plesk fixes the per-domain Node UI and the manual approach becomes pure friction OR (b) hosting cost on Plesk becomes uncompetitive OR (c) we need geographically-distributed edge for some new feature.
