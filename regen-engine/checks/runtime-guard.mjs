import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readText(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function fail(message) {
  console.error(`regen-guard: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`regen-guard: ${message}`);
}

const packageJson = JSON.parse(readText("package.json"));
const scripts = packageJson.scripts || {};
const devScript = scripts.dev || "";
const buildScript = scripts.build || "";

if (!devScript.includes("--webpack")) {
  fail(`Expected "scripts.dev" to include "--webpack". Found: "${devScript}"`);
}
ok("dev script uses webpack");

if (!buildScript.includes("--webpack")) {
  fail(`Expected "scripts.build" to include "--webpack". Found: "${buildScript}"`);
}
ok("build script uses webpack");

const layoutText = readText("app/layout.tsx");
if (!layoutText.includes('import "./globals.css"')) {
  fail('app/layout.tsx must import "./globals.css"');
}
ok("layout imports globals.css");

const globalsText = readText("app/globals.css");
if (!globalsText.includes("@tailwind base;") || !globalsText.includes("@tailwind components;") || !globalsText.includes("@tailwind utilities;")) {
  fail("app/globals.css is missing required @tailwind directives");
}
ok("globals.css has tailwind directives");

const postcssText = readText("postcss.config.mjs");
if (!postcssText.includes("tailwindcss") || !postcssText.includes("autoprefixer")) {
  fail("postcss.config.mjs must include tailwindcss and autoprefixer plugins");
}
ok("postcss plugin chain is valid");

console.log("regen-guard: PASS");
