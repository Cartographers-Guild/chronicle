import fs from "fs/promises";
import path from "path";

import semver from "semver";

import {
  loadRegistryEntries,
  parseSpecPath,
  pathExists,
  repoRoot,
  toPosix
} from "./lib/registry.mjs";

function parseLinks(markdown) {
  const links = [];
  const pattern = /\[[^\]]+\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    const rawTarget = match[1].trim();
    const target = rawTarget.replace(/\s+"[^"]*"$/, "");
    links.push(target);
  }

  return links;
}

function isIgnoredHref(href) {
  return (
    !href ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  );
}

async function main() {
  const errors = [];
  const entries = await loadRegistryEntries();
  const seenVersions = new Set();
  const seenFiles = new Set();

  for (const entry of entries) {
    const parsed = parseSpecPath(entry.sourcePath);

    if (!parsed) {
      errors.push("Invalid registry path shape: " + entry.sourcePath);
    }

    if (!semver.valid(entry.version)) {
      errors.push("Invalid semver version in " + entry.sourcePath + ": " + entry.version);
    }

    const versionKey = entry.familyKey + "@" + entry.version;

    if (seenVersions.has(versionKey)) {
      errors.push("Duplicate registry version: " + versionKey);
    } else {
      seenVersions.add(versionKey);
    }

    if (seenFiles.has(entry.sourcePath)) {
      errors.push("Duplicate source path: " + entry.sourcePath);
    } else {
      seenFiles.add(entry.sourcePath);
    }

    const links = parseLinks(entry.markdown);

    for (const href of links) {
      if (isIgnoredHref(href)) {
        continue;
      }

      const hashIndex = href.indexOf("#");
      const hrefPath = hashIndex >= 0 ? href.slice(0, hashIndex) : href;

      if (!hrefPath) {
        continue;
      }

      const resolvedPath = hrefPath.startsWith("/")
        ? path.join(repoRoot, hrefPath)
        : path.resolve(path.dirname(entry.absolutePath), hrefPath);

      if (!resolvedPath.startsWith(repoRoot)) {
        errors.push("Link escapes repository in " + entry.sourcePath + ": " + href);
        continue;
      }

      if (!(await pathExists(resolvedPath))) {
        errors.push(
          "Broken link in " + entry.sourcePath + ": " + href + " (" + toPosix(path.relative(repoRoot, resolvedPath)) + ")"
        );
      }
    }
  }

  const allSpecFiles = await fs.readdir(path.join(repoRoot, "registry"), { withFileTypes: true });

  if (!allSpecFiles.length) {
    errors.push("Registry directory is empty.");
  }

  if (errors.length) {
    console.error("Registry validation failed:\n");
    for (const error of errors) {
      console.error("- " + error);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Registry validation passed for " + entries.length + " spec files.");
}

main().catch(function handleError(error) {
  console.error(error);
  process.exitCode = 1;
});
