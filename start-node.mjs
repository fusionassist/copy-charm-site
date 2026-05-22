// Production HTTP launcher for Plesk Node.js deployment.
// Imports the SSR build at dist/server/server.js and runs it via srvx's
// Node adapter. PORT is read from the environment (Plesk sets this) and
// falls back to 3000 for local production smoke-tests.
//
// This file is intentionally outside src/ so Vite's SSR build does not
// compile it into the server bundle — it sits next to the build and
// imports it.

import { serve } from "srvx/node";
import handler from "./dist/server/server.js";

const port = process.env.PORT ?? 3000;
const hostname = process.env.HOST ?? undefined;

const server = serve({
  fetch: handler.fetch,
  port,
  hostname,
});

await server.ready();
const addr = server.node?.address?.();
const url = addr && typeof addr === "object"
  ? `http://${addr.address === "::" || addr.address === "0.0.0.0" ? "localhost" : addr.address}:${addr.port}`
  : `http://localhost:${port}`;
console.log(`interactivedisplays.ie — listening on ${url}`);
