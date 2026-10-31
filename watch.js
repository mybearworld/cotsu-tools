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
// @name        Cotsu-Tools
// @namespace   mybearworld
// @match       *://cotsu.de/*
// @grant       GM.xmlHttpRequest
// @require     https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js
// @connect     wadoku.de
// @connect     api.cotsu.de
// @connect     raw.githubusercontent.com
// @version     1.20.7
// @license     MIT
// @author      mybearworld
// @description Userscript für https://cotsu.de.
// @updateURL   https://openuserjs.org/meta/mybearworld/Cotsu-Tools.meta.js
// @downloadURL https://openuserjs.org/install/mybearworld/Cotsu-Tools.user.js
// ==/UserScript==
`,
    },
  })
).watch();
