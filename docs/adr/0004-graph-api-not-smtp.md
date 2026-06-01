# ADR 0004 — M365 Graph API for outbound email, not SMTP

**Status:** Accepted — 2026-05-25
**Superseded approach:** nodemailer + smtp.office365.com:587

## Context

The contact form needs to send lead notifications to `sales@interactivedisplays.ie`. Three plausible paths through M365:

1. **SMTP** via `smtp.office365.com:587` with nodemailer and an app password.
2. **Microsoft Graph API** with OAuth2 client-credentials flow against an Entra (Azure AD) app registration.
3. **Resend** as an unrelated third-party.

First attempt was SMTP. nodemailer installed, env vars wired, `/api/email-test` returned 500. Diagnosis: Microsoft is mid-deprecation of SMTP Basic Auth and the tenant didn't have it enabled. Could have asked to enable it; instead pivoted to Graph.

## Decision

**Graph API, OAuth2 client credentials.**

- Entra app registration `interactivedisplays-beta-mail` in the IDI tenant.
- Application permission `Mail.Send` (NOT Delegated), admin-consented.
- Token issued by `login.microsoftonline.com/{tenant}/oauth2/v2.0/token`, cached in-memory with 60s safety margin before expiry.
- Mail sent via `POST /users/{sender}/sendMail` against `graph.microsoft.com/v1.0/`.
- `sender = gerry@interactivedisplays.ie` (a real licensed mailbox). `LEAD_RECIPIENT = sales@interactivedisplays.ie` (a distribution-list / non-licensed shared address that Graph cannot send AS, but can send TO).
- `Reply-To` set to the lead's email so hitting Reply in Outlook goes straight back to the lead.

Implementation: ~70 lines of plain `fetch()` in `start-node.mjs`. Zero new dependencies (uses Node's built-in fetch). No `@azure/msal-node`.

## Consequences

**Positive:**
- Forward-compatible. SMTP Basic Auth has been on Microsoft's deprecation glide path for years; Graph is the canonical path going forward.
- App permissions are auditable in Entra. The app is explicitly scoped to `Mail.Send`, nothing else. Rotating the client secret is a 60-second click.
- Token caching means typical request adds ~40 ms (network call to `graph.microsoft.com`) once per hour, ~5 ms for cached subsequent calls.
- The `fusion_ai_livechat` Odoo module already uses Graph-style flows for the rest of the platform — consistent with Fusion stack patterns.

**Negative:**
- The current Mail.Send app permission grants the app the right to send AS ANY USER in the tenant. Best practice is to scope this down with a PowerShell `New-ApplicationAccessPolicy` to restrict to `gerry@` only. Tracked as a follow-up; current value of the secret is low (it's per-tenant, app-specific) but it should still be done before launch.
- `sales@` being a distribution group rather than a shared mailbox means we can't send AS `sales@`. The From header is `gerry@`. If recipients reply via the From header instead of the Reply-To, the response goes to Gerry instead of the sales DL. Acceptable for now; could be fixed by converting `sales@` to a shared mailbox + adding Send-As permission.
- Per-tenant Entra app registration means at production cutover, no app change is needed — same Entra app, same Graph endpoint, just point the production DNS at the same box.

**Operational:**
- Client secret stored in `~/apps/copy-charm-site/.env.local` (chmod 600). Never in git.
- The supervisor restarts pick it up via Node's `--env-file-if-exists` flag.
- `/api/email-test` (GET or POST) triggers a fixed test email — handy for verifying the chain after env changes.

## Alternatives considered

- **SMTP via nodemailer** — abandoned mid-implementation. Would have worked with a tenant-level SMTP AUTH enablement; not worth the deprecation tech debt.
- **Resend** — would have been simpler (single API key, ~5 lines of code) but introduces a third-party paid service for what Microsoft already provides as part of the M365 subscription IDI already pays for. Rejected.
- **Sending direct from the Plesk Postfix** — possible but deliverability would suffer (no DKIM/SPF alignment from the Plesk box; Microsoft tenant has these in DNS pointing at Office365).

## Verification this still holds

```bash
curl -X POST -H 'content-type: application/json' \
  -d '{"name":"Test","email":"test@example.com","message":"verification email from ADR"}' \
  https://beta.interactivedisplays.ie/api/contact
# expected: {"success":true,"messageStatus":202}
# and an email lands in sales@ within seconds
```

Re-litigate if Microsoft introduces breaking changes to Mail.Send (none announced), or if M365 stops being IDI's email provider.
