#!/usr/bin/env node
/**
 * Build both halves of the plugin.
 *
 * The host half is an ordinary ESM library. The browser half is the shape
 * DSH's ModuleLoader expects: a CJS bundle wrapped in a
 * `window.__ModuleLoader__.load({ id, factory })` handoff, whose externals
 * are resolved through the injected `require` rather than any global or
 * import map.
 */

import { execFileSync } from "node:child_process";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(root, "lib");
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

const MODULE_TABLE = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-runtime/client",
];

await rm(lib, { recursive: true, force: true });

console.log("building host half");
await build({
  entryPoints: [join(root, "src", "index.ts")],
  outfile: join(lib, "index.js"),
  bundle: true,
  packages: "external",
  format: "esm",
  platform: "node",
  target: "es2023",
  sourcemap: true,
});

console.log("building browser half");
await build({
  entryPoints: [join(root, "src", "client", "index.ts")],
  outfile: join(lib, "client.js"),
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "chrome120",
  external: MODULE_TABLE,
  sourcemap: true,
  charset: "utf8",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(manifest.name)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: { js: "return module.exports; } });" },
});

console.log("emitting host declarations");
execFileSync("node", [
  join(root, "node_modules", "typescript", "bin", "tsc"),
  "-p", join(root, "tsconfig.build.json"),
], { cwd: root, stdio: "inherit" });

for (const file of (await readdir(lib)).filter((name) => name.endsWith(".d.ts"))) {
  const path = join(lib, file);
  const before = await readFile(path, "utf8");
  const after = before.replace(/(from\s+'\.[^']*)\.ts'/gu, "$1.js'");
  if (after !== before) await writeFile(path, after, "utf8");
}

const client = await readFile(join(lib, "client.js"), "utf8");
if (!client.startsWith("window.__ModuleLoader__.load(")) {
  throw new Error("client bundle lost its ModuleLoader wrapper");
}
const required = [...client.matchAll(/require\(\s*["']([^"']+)["']\s*\)/gu)].map((match) => match[1]);
const leaked = [...new Set(required.filter((name) => !MODULE_TABLE.includes(name)))];
if (leaked.length > 0) {
  throw new Error(`client bundle requires specifiers the module table does not share: ${leaked.join(", ")}`);
}

const bytes = Buffer.byteLength(client, "utf8");
console.log(`built ${manifest.name} -> lib/ (client ${(bytes / 1024).toFixed(1)} KB)`);
