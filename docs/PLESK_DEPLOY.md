# Plesk deployment guide — beta.interactivedisplays.ie

Step-by-step setup for deploying this repo as a Plesk Node.js app at `beta.interactivedisplays.ie`. Designed for Plesk Obsidian (modern Plesk) on Linux. One-time setup is steps 1–9; future deploys are step 10.

## Prerequisites

- Plesk panel access to the existing IDI hosting account
- SSH access enabled for the hosting subscription (Plesk → Subscriptions → [your domain] → SSH access)
- Cloudflare DNS access for `interactivedisplays.ie`
- Plesk **Node.js extension** installed (Plesk → Extensions Catalog → Node.js, free)

## 1. Cloudflare DNS — add the subdomain

In Cloudflare → DNS:

| Type | Name | Content | Proxy |
|---|---|---|---|
| `A` | `beta` | (Plesk server IPv4 — same as the apex) | **DNS only** (grey cloud) |

**Keep proxying OFF for now.** We turn it on after Let's Encrypt issues a cert. With proxying on, Let's Encrypt's HTTP-01 challenge can fail because Cloudflare intercepts the request.

Wait a few minutes for DNS to propagate. Verify with:
```bash
dig +short beta.interactivedisplays.ie
nslookup beta.interactivedisplays.ie
```

## 2. Plesk — create the subdomain

Plesk panel → **Subscriptions** → `interactivedisplays.ie` → **Add Subdomain**:

- **Subdomain name:** `beta`
- **Document root:** `/httpdocs/beta` (the default `beta.interactivedisplays.ie` works too; keep it consistent)
- Click **OK**

## 3. Plesk — issue Let's Encrypt SSL

In the new subdomain's panel:

- Click **SSL/TLS Certificates** → **Install a free basic certificate provided by Let's Encrypt**
- Domain name: `beta.interactivedisplays.ie`
- **Uncheck** "Include a 'www' subdomain" (we don't want `www.beta.…`)
- Email: your admin email
- Click **Get it free**

If this fails: confirm DNS is resolving to the Plesk server (step 1) and Cloudflare proxying is still **off**.

## 4. Plesk — enable Node.js for the subdomain

Subdomain panel → **Node.js**:

- **Node.js version:** pick **22.x or newer** (TanStack Start needs `>=22.12`). If Plesk only offers 20 or 18, install a newer Node version system-wide first via Plesk → Tools & Settings → Updates, or ask the host to enable Node 22.
- **Document root:** `/beta.interactivedisplays.ie` (whatever Plesk made in step 2)
- **Application mode:** **production**
- **Application root:** `/beta.interactivedisplays.ie` (we'll change this in step 7 to a sibling directory)
- **Application URL:** `https://beta.interactivedisplays.ie`
- **Application startup file:** `start-node.mjs`

Leave **Custom environment variables** blank for now — we fill them in step 8.

Click **Apply**. The "Disable Node.js" button should now be visible.

## 5. SSH — connect and prepare the app directory

```bash
ssh <plesk-user>@interactivedisplays.ie    # use the SSH credentials from Plesk → SSH access
cd ~                                       # land in the home dir of the Plesk subscription user
```

Check Node and npm:
```bash
node --version    # must be >= 22.12
npm --version
```

Make a dedicated directory for the app, **outside the web-served document root**. This is important: the Plesk-managed `httpdocs/beta` document root is for static assets only. The Node.js app should live alongside it so secrets / source files are never directly web-accessible.

```bash
mkdir -p ~/apps/beta-interactivedisplays
cd ~/apps/beta-interactivedisplays
```

## 6. SSH — install Bun (one-time)

```bash
curl -fsSL https://bun.com/install | bash
# Bun installs to ~/.bun/bin/bun
export PATH="$HOME/.bun/bin:$PATH"
bun --version    # verify
```

To make Bun available in every shell, append to `~/.bashrc`:
```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

If `curl | bash` is blocked (some hardened hosts), fall back to npm (note: regenerates a competing `package-lock.json`; OK as long as you don't commit it):
```bash
# Alternative path — skip bun, use npm
npm install --no-save
# also adjust the Plesk Node.js panel "Package Manager" setting to npm
```

## 7. SSH — clone the repo

```bash
cd ~/apps/beta-interactivedisplays
git clone https://github.com/fusionassist/copy-charm-site.git .
# (the trailing dot clones INTO the current dir rather than a subfolder)
git checkout feat/wp-mirror-housekeeping     # or main after the PR merges
```

If the repo is private, configure a deploy key or PAT for `https://` access.

Now go back to Plesk → Subdomain → **Node.js** and update:
- **Application root:** `/home/<plesk-user>/apps/beta-interactivedisplays`
- Click **Apply**

## 8. Plesk — environment variables

In the Node.js panel, expand **Custom environment variables** and add:

| Name | Value |
|---|---|
| `VITE_PUBLIC_SITE_URL` | `https://beta.interactivedisplays.ie` |
| `ODOO_BASE_URL` | (your Odoo instance, e.g. `https://odoo.qfusion.ie`) |
| `ODOO_DB` | (Odoo DB name) |
| `ODOO_API_KEY` | (server-only secret) |
| `VITE_PUBLIC_ODOO_LIVECHAT_CHANNEL_ID` | (Odoo Live Chat channel ID — get from Odoo admin) |
| `VITE_PUBLIC_ODOO_BASE_URL` | (same as `ODOO_BASE_URL`, exposed to client for chat widget) |
| `RESEND_API_KEY` | (server-only) |
| `RESEND_FALLBACK_INBOX` | `leads@interactivedisplays.ie` |
| `NODE_ENV` | `production` |

Until Odoo and Resend are wired up in code (CLAUDE.md §11 step 10), these can be placeholders or left blank — the build won't fail.

Click **Apply**.

## 9. SSH — install dependencies and build

```bash
cd ~/apps/beta-interactivedisplays
bun install                    # ~30s, fetches ~500 packages
bun run build                  # ~5s, outputs to dist/
```

Verify the build artifact exists:
```bash
ls dist/server/server.js       # should be ~3.8 KB
ls dist/client/                # should have assets/ subfolder with .css and .js
```

In the Plesk Node.js panel, click **Restart App**. Or from SSH:
```bash
touch tmp/restart.txt          # Plesk watches this file and restarts the app
# (create tmp/ first if missing: mkdir -p tmp)
```

## 10. Verify

In the browser, open `https://beta.interactivedisplays.ie`. You should see the IDI homepage (served from `wp-mirror/`).

Check the response header to confirm the Node app is in front:
```bash
curl -I https://beta.interactivedisplays.ie/
# Expect:
#   HTTP/2 200
#   x-served-by: wp-mirror
#   content-type: text/html; charset=utf-8
```

Smoke-test a few other URLs:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://beta.interactivedisplays.ie/contact-us/
# Expect: 200

curl -s -o /dev/null -w "%{http_code} %{header_x-served-by}\n" \
  https://beta.interactivedisplays.ie/product/android-a-board/
# Expect: 200 wp-mirror

curl -s -o /dev/null -w "%{http_code}\n" https://beta.interactivedisplays.ie/this-doesnt-exist
# Expect: 404 (from TanStack — the mirror has nothing matching)
```

## 11. Turn on Cloudflare proxying

Once HTTPS works directly to the Plesk host:

Cloudflare → DNS → `beta` record → toggle **DNS only** → **Proxied** (orange cloud).

Then in Cloudflare → SSL/TLS → **Overview**: set to **Full (strict)** if it isn't already. Flexible would be insecure since the Plesk cert is valid.

Verify the site still loads at `https://beta.interactivedisplays.ie` after toggling.

## 12. Future deploys

After the one-time setup above, each redeploy is a four-step shell sequence:

```bash
cd ~/apps/beta-interactivedisplays
git pull
bun install
bun run build
touch tmp/restart.txt
```

This can be wrapped in a `deploy.sh` script at the repo root, or triggered from Plesk's **Git** extension if you install it (auto-pull-on-push).

## Troubleshooting

### App won't start — check the Plesk Node.js panel log

In the panel, expand the log section (or `tail -f` the log file path shown there). Common errors:

- `Cannot find module './dist/server/server.js'` — you skipped `bun run build`, or built in a different directory.
- `Cannot find package 'srvx'` — `bun install` didn't run, or `node_modules/` got cleared.
- `EADDRINUSE` — the previous app process didn't terminate. From SSH: `pkill -f "node start-node.mjs"`, then restart from Plesk.

### Page loads but missing CSS / JS

The mirror's HTML references `/wp-content/...` and `/wp-includes/...` paths. The mirror layer in `start-node.mjs` resolves those to `wp-mirror/wp-content/...`. If a 404 shows for an asset, check that:
- `wp-mirror/` made it through git (it's ~355 MB — confirm `du -sh wp-mirror/` matches local)
- `Application root` in Plesk is set to the repo root, not `dist/`

### Bun missing on the server after a Plesk update

Plesk occasionally resets PATH. Run `~/.bun/bin/bun --version` from SSH to confirm Bun is still installed; if so, re-export PATH in `~/.bashrc` or invoke with the absolute path in your deploy script.

### Trailing-slash 307 redirects from TanStack

If you build a TanStack route that collides with a mirror URL (e.g. `src/routes/about.tsx` and `wp-mirror/about/index.html` both exist), the mirror wins by default. Add the path to the `MIRROR_EXCLUDE` set in `start-node.mjs`, redeploy, and TanStack will take over.
