// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, cloudflare, componentTagger, env injection, alias, etc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";

// Serve the WordPress static mirror from /wp-mirror for clean URLs (e.g. "/", "/contact-us/")
// during dev — this lets us preview the legacy site for reference while building the rebuild
// on top. The mirror is intentionally OUTSIDE /public so it does not ship to production:
// the real /public is for TanStack Start's deployed assets only.
function serveMirror() {
  const publicDir = path.resolve("wp-mirror");
  const tryFiles = (urlPath: string, query: string): string | null => {
    const clean = urlPath.split("#")[0];
    const ext = path.extname(clean);
    const candidates = [
      path.join(publicDir, clean, "index.html"),
      path.join(publicDir, clean.replace(/\/$/, "") + ".html"),
      path.join(publicDir, clean),
    ];
    if (query) {
      // wget mirror saves "foo.css?ver=1" as "foo.css@ver=1.css" or "foo.js@ver=1"
      candidates.push(path.join(publicDir, clean + "@" + query + ext));
      candidates.push(path.join(publicDir, clean + "@" + query));
    }
    for (const c of candidates) {
      try {
        if (fs.statSync(c).isFile()) return c;
      } catch {}
    }
    return null;
  };
  const handler = (req: any, res: any, next: any) => {
    if (!req.url || (req.method !== "GET" && req.method !== "HEAD")) return next();
    const [rawPath, query = ""] = req.url.split("?");
    const file = tryFiles(decodeURIComponent(rawPath), query);
    if (!file) return next();
    const ext = path.extname(file).toLowerCase();
    const types: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
      ".pdf": "application/pdf",
      ".xml": "application/xml; charset=utf-8",
    };
    res.statusCode = 200;
    res.setHeader("content-type", types[ext] ?? "application/octet-stream");
    res.end(fs.readFileSync(file));
  };
  return {
    name: "serve-wp-mirror",
    enforce: "pre" as const,
    configureServer(server: any) {
      // Register BEFORE TanStack's catch-all SSR handler
      return () => {
        server.middlewares.use(handler);
      };
    },
  };
}

export default defineConfig({
  // Cloudflare Workers plugin is off — we deploy to Plesk Node.js, not CF.
  // See src/start-node.ts for the production HTTP launcher.
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [serveMirror()],
  },
});
