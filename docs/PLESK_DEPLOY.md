# Plesk deployment — beta.interactivedisplays.ie

> **Why this doc reads differently than the original:** the first version assumed we'd use Plesk's Node.js extension. We discovered that extension's per-domain UI doesn't appear on this Plesk install (cause unknown — Node.js extension is server-installed and permissions are on, but the per-subdomain tile never showed up). So we run the Node app under a cron-managed supervisor and route HTTPS traffic to it via an nginx `proxy_pass` directive in Plesk's "Additional nginx directives" field. Same end result, doesn't depend on the Plesk Node.js extension at all.

## Architecture in one sentence

Cloudflare DNS → Plesk nginx (Let's Encrypt cert, custom `proxy_pass` directive) → Node app on `127.0.0.1:3417` (managed by a cron supervisor) → serves wp-mirror first, TanStack SSR fallback.

## Current live state (as of 2026-05-25)

- URL: https://beta.interactivedisplays.ie/ — serving the wget mirror of the legacy WP site
- Server: `fusiontech01.mybk.ie` (78.153.200.34) — same Plesk box as the live `interactivedisplays.ie`
- SSH user: `beta_displays` (Plesk subscription user; maps to system user `supra`)
- App location: `/var/www/vhosts/interactivedisplays.ie/apps/copy-charm-site`
- Node version: 24 (from `/opt/plesk/node/24/bin/node`)
- Bun: installed at `~/.bun/bin/bun`
- Port: **3417** (loopback only)
- Cert: Let's Encrypt, auto-renewed by Plesk
- Cloudflare: DNS-only (grey cloud) — proxy not enabled yet

## Prerequisites

- Plesk panel access (`Gerry Mcdonnell` admin login)
- SSH access enabled for the `beta_displays` user
- Cloudflare DNS access for `interactivedisplays.ie`

## One-time setup — what was done

### 1. Cloudflare DNS

`A` record: `beta` → `78.153.200.34`, proxy disabled (DNS-only / grey cloud).

### 2. Plesk subdomain

Created `beta.interactivedisplays.ie` as a subdomain of `interactivedisplays.ie`. Document root: default (`/beta.interactivedisplays.ie`).

### 3. Plesk Let's Encrypt cert

Hosting Settings → SSL/TLS support → Certificate dropdown → `Lets Encrypt beta.interactivedisplays.ie`. HTTPS enabled, HTTP→HTTPS 301 redirect enabled.

### 4. SSH-side — clone, install Bun, build

```bash
ssh beta_displays@78.153.200.34

# Install Bun (one-time, user-local)
curl -fsSL https://bun.com/install | bash
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc

# Clone the repo
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/fusionassist/copy-charm-site.git
cd copy-charm-site

# Install + build
~/.bun/bin/bun install
~/.bun/bin/bun run build
```

### 5. Cron supervisor — keep the Node app alive

The supervisor script `~/bin/beta-node-supervisor.sh`:

```bash
#!/bin/bash
APP_DIR="$HOME/apps/copy-charm-site"
LOG="$APP_DIR/logs/app.log"
PID_FILE="$APP_DIR/logs/app.pid"
PORT=3417
mkdir -p "$APP_DIR/logs"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  exit 0
fi
cd "$APP_DIR" || exit 1
PORT=$PORT HOST=127.0.0.1 NODE_ENV=production /opt/plesk/node/24/bin/node start-node.mjs >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"
```

Made executable: `chmod +x ~/bin/beta-node-supervisor.sh`

Cron entry (via `crontab -e`):

```
* * * * * /var/www/vhosts/interactivedisplays.ie/bin/beta-node-supervisor.sh
```

Every minute, the supervisor checks if the Node process is alive (via PID file + `kill -0`). If not, it starts it.

### 6. nginx custom directive — route traffic to the Node app

Plesk panel → `beta.interactivedisplays.ie` → Hosting & DNS → Apache & nginx → scroll to **"Additional nginx directives"** (NOT the Apache fields above it) → paste:

```nginx
location ~ ^/ {
    proxy_pass http://127.0.0.1:3417;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
    proxy_buffering off;
}
```

The `location ~ ^/` (regex, matches any path) is deliberate — Plesk auto-generates a `location /` (prefix) block that we can't override. Regex and prefix locations don't conflict in nginx, and regex wins on match. Click **OK**.

## Future deploys — the loop

Each redeploy after the one-time setup:

```bash
ssh beta_displays@78.153.200.34
cd ~/apps/copy-charm-site
./deploy.sh
```

The script does:
1. `git pull --ff-only`
2. `bun install` (in case `package.json` changed)
3. `bun run build`
4. Kills the current Node process (via PID file)
5. Re-invokes the supervisor to restart it immediately with fresh code
6. Verifies the new process started

If you'd rather not use the script, the manual equivalent is:
```bash
git pull && bun install && bun run build && kill $(cat logs/app.pid)
# supervisor restarts it within 60s
```

## Verify after deploy

```bash
# From your laptop:
curl -I https://beta.interactivedisplays.ie/
# Expect: HTTP/2 200, x-served-by: wp-mirror

curl -s -o /dev/null -w "%{http_code}\n" https://beta.interactivedisplays.ie/contact-us/
# Expect: 200

curl -s -o /dev/null -w "%{http_code}\n" https://beta.interactivedisplays.ie/this-doesnt-exist
# Expect: 404 (from TanStack — mirror has nothing matching, fallthrough)
```

## Cloudflare proxying — turn on later

When you're ready to let Cloudflare CDN/WAF sit in front of beta:

1. Cloudflare → DNS → `beta` row → toggle Proxy status: **Proxied** (orange cloud)
2. Cloudflare → SSL/TLS → **Full (strict)** mode (Plesk has a valid LE cert, so strict is fine)
3. Verify https://beta.interactivedisplays.ie/ still works

Recommended to leave proxying OFF during active development — Cloudflare's caching will fight you when shipping changes.

## Troubleshooting

### App not responding (HTTP 502 / 504)

```bash
# Is the Node process up?
ls -la ~/apps/copy-charm-site/logs/app.pid
kill -0 $(cat ~/apps/copy-charm-site/logs/app.pid) 2>/dev/null && echo "alive" || echo "dead"

# Recent log
tail -50 ~/apps/copy-charm-site/logs/app.log

# Force the supervisor to (re)start now (don't wait for next cron tick)
~/bin/beta-node-supervisor.sh

# Check it's listening
ss -tlnp 2>/dev/null | grep 3417
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3417/
```

### Plesk reverted the nginx directive

Plesk regenerates nginx config on certain events (SSL cert renewal, Plesk Apps install, etc.). The "Additional nginx directives" content normally survives, but if it gets wiped, re-paste it via Apache & nginx → Additional nginx directives.

### Apache & nginx Apply rejected the directive

Common causes:
- Pasted into the Apache textarea (top of page) instead of nginx (bottom) — Apache doesn't understand `location` syntax
- Used `location /` instead of `location ~ ^/` — Plesk already has a prefix `location /` and nginx errors on duplicate. Use the regex form.

### Bun missing after a Plesk update

Plesk occasionally resets PATH. Run `~/.bun/bin/bun --version` to confirm Bun is still installed; if so, re-export PATH in `~/.bashrc` or use the absolute path in your deploy script (which `deploy.sh` already does).

### Future: Let's Encrypt renewal fails because of the catch-all proxy

Our `location ~ ^/` intercepts `/.well-known/acme-challenge/` paths, which Let's Encrypt uses for HTTP-01 challenge during cert renewal. Plesk uses a `^~` prefix location for ACME which typically wins over regex — but if renewal does fail, replace the directive with:

```nginx
location ~ ^/(?!\.well-known/) {
    proxy_pass http://127.0.0.1:3417;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
    proxy_buffering off;
}
```

The negative-lookahead pattern `(?!\.well-known/)` excludes ACME paths from the proxy.

## Deploy-key setup (for when the repo goes back to private)

Currently the server's git remote points at `https://github.com/fusionassist/copy-charm-site.git`. That works while the repo is public. To make it work after flipping the repo private without storing a token on the server:

1. On the server, the existing key at `~/.ssh/id_rsa.pub` is the deploy candidate (`cat ~/.ssh/id_rsa.pub`)
2. GitHub → repo → Settings → Deploy keys → Add deploy key
3. Title: `beta.interactivedisplays.ie server`, key: paste the pubkey, leave **"Allow write access"** unchecked
4. Switch the server remote: `git remote set-url origin git@github.com:fusionassist/copy-charm-site.git`
5. Test: `git pull` — should succeed
6. Then it's safe to flip the GitHub repo private
