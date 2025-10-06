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
// @version     1.11.4
// @license     MIT
// @author      mybearworld
// @description Userscript für https://cotsu.de.
// @updateURL   https://openuserjs.org/meta/mybearworld/Cotsu-Tools.meta.js
// @downloadURL https://openuserjs.org/install/mybearworld/Cotsu-Tools.user.js
// ==/UserScript==`,
    },
  })
).watch();
