import { context } from "esbuild";

(
  await context({
    entryPoints: ["src/index.ts"],
    bundle: true,
    loader: {
      ".css": "text",
    },
    outfile: "script.user.js",
    banner: {
      js: `// ==UserScript==
// @name        Cotsu-Tools - All Vibe Coded Features
// @namespace   mybearworld
// @match       *://cotsu.de/*
// @grant       GM.xmlHttpRequest
// @require     https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js
// @connect     wadoku.de
// @connect     api.cotsu.de
// @connect     kanjiapi.dev
// @connect     raw.githubusercontent.com
// @version     1.20.7
// @license     MIT
// @author      mybearworld
// @description vibes
// ==/UserScript==
`,
    },
  })
).watch();
