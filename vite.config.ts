// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, cloudflare, componentTagger, env injection, alias, etc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";

// Serve the WordPress static mirror in /public for clean URLs (e.g. "/", "/contact-us/")
// during dev. In production on Cloudflare, the Assets binding handles this automatically.
function serveMirror() {
  const publicDir = path.resolve("public");
  const tryFiles = (urlPath: string): string | null => {
    const clean = urlPath.split("?")[0].split("#")[0];
    const candidates = [
      path.join(publicDir, clean, "index.html"),
      path.join(publicDir, clean.replace(/\/$/, "") + ".html"),
      path.join(publicDir, clean),
    ];
    for (const c of candidates) {
      try {
        if (fs.statSync(c).isFile()) return c;
      } catch {}
    }
    return null;
  };
  return {
    name: "serve-wp-mirror",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req.url || req.method !== "GET") return next();
        const file = tryFiles(decodeURIComponent(req.url));
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
        res.setHeader("content-type", types[ext] ?? "application/octet-stream");
        res.end(fs.readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [serveMirror()],
  },
});
