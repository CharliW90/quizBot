import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const root = new URL("..", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const prodDeps = new Set(Object.keys(pkg.dependencies ?? {}));

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

function extractBareSpecifiers(content) {
  const specifiers = new Set();
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /^\s*import\s+['"]([^'"]+)['"]/gm,
  ];
  for (const pattern of patterns) {
    for (const [, specifier] of content.matchAll(pattern)) {
      if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("node:")) continue;
      const parts = specifier.split("/");
      const pkgName = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
      specifiers.add(pkgName);
    }
  }
  return specifiers;
}

const distDir = join(root, "dist");
const errors = [];

for (const file of walk(distDir)) {
  const content = readFileSync(file, "utf8");
  for (const pkgName of extractBareSpecifiers(content)) {
    if (!prodDeps.has(pkgName)) {
      const relPath = file.replace(root, "");
      errors.push({ file: relPath, pkg: pkgName });
    }
  }
}

if (errors.length > 0) {
  console.error("Runtime imports not listed in dependencies:");
  for (const { file, pkg } of errors) {
    console.error(`  ${file} imports "${pkg}"`);
  }
  process.exit(1);
}

console.log("All runtime imports are in dependencies.");
