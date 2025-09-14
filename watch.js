import { context } from "esbuild";

(
  await context({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "out.js",
    banner: {
      js: `// ==UserScript==
// @name        Cotsu-Tools
// @namespace   mybearworld
// @match       *://cotsu.de/*
// @grant       GM.xmlHttpRequest
// @version     1.7.2
// @license     MIT
// @author      mybearworld
// @description Userscript für https://cotsu.de.
// @updateURL   https://openuserjs.org/meta/mybearworld/Cotsu-Tools.meta.js
// @downloadURL https://openuserjs.org/install/mybearworld/Cotsu-Tools.user.js
// ==/UserScript==`,
    },
  })
).watch();
