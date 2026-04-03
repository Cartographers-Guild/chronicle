import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import fg from "fast-glob";
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..", "..");
export const templatesRoot = path.join(repoRoot, "templates");
export const distRoot = path.join(repoRoot, "dist");

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    return false;
  }
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=[\]{}|\\:;"'<>,.?/]/g, "")
    .replace(/\s+/g, "-");
}

export function loadMarkdownRenderer(rewriteHref) {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false
  }).use(markdownItAnchor, {
    slugify
  });

  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    function linkOpen(tokens, index, options, env, self) {
      return self.renderToken(tokens, index, options);
    };

  md.renderer.rules.link_open = function linkOpen(tokens, index, options, env, self) {
    const token = tokens[index];
    const href = token.attrGet("href");

    if (href) {
      token.attrSet("href", rewriteHref(href, env));
    }

    return defaultLinkOpen(tokens, index, options, env, self);
  };

  return md;
}

export function parseSpecPath(relativePath) {
  const normalized = toPosix(relativePath);
  const segments = normalized.split("/");

  if (
    segments.length === 6 &&
    segments[0] === "registry" &&
    segments[1] === "kinds" &&
    segments[5] === "spec.md"
  ) {
    const namespace = segments[2];
    const name = segments[3];
    const version = segments[4];
    return {
      sourcePath: normalized,
      category: "kinds",
      namespace,
      name,
      version,
      familyKey: "kinds/" + namespace + "/" + name,
      identifier: namespace + ":" + name
    };
  }

  if (
    segments.length === 5 &&
    segments[0] === "registry" &&
    segments[1] === "types" &&
    segments[4] === "spec.md"
  ) {
    const name = segments[2];
    const version = segments[3];
    return {
      sourcePath: normalized,
      category: "types",
      namespace: null,
      name,
      version,
      familyKey: "types/" + name,
      identifier: name
    };
  }

  return null;
}

export async function loadRegistryEntries() {
  const sourcePaths = await fg("registry/**/spec.md", {
    cwd: repoRoot,
    onlyFiles: true
  });

  const entries = [];

  for (const sourcePath of sourcePaths.sort()) {
    const parsed = parseSpecPath(sourcePath);

    if (!parsed) {
      continue;
    }

    const absolutePath = path.join(repoRoot, sourcePath);
    const markdown = await fs.readFile(absolutePath, "utf8");
    const title = extractTitle(markdown, parsed.identifier);
    const summary = extractSummary(markdown, title);
    const detailPath = buildDetailPath(parsed);
    const latestPath = buildLatestPath(parsed);
    const overviewPath = buildOverviewPath(parsed);

    entries.push({
      ...parsed,
      absolutePath,
      markdown,
      title,
      summary,
      detailPath,
      latestPath,
      overviewPath
    });
  }

  entries.sort(compareEntries);
  return entries;
}

export function compareEntries(left, right) {
  return (
    left.category.localeCompare(right.category) ||
    (left.namespace || "").localeCompare(right.namespace || "") ||
    left.name.localeCompare(right.name) ||
    right.version.localeCompare(left.version)
  );
}

export function groupEntries(entries) {
  const groups = new Map();

  for (const entry of entries) {
    if (!groups.has(entry.familyKey)) {
      groups.set(entry.familyKey, []);
    }
    groups.get(entry.familyKey).push(entry);
  }

  return groups;
}

export function buildDetailPath(entry) {
  if (entry.category === "kinds") {
    return (
      "/registry/kinds/" +
      entry.namespace +
      "/" +
      entry.name +
      "/" +
      entry.version +
      "/"
    );
  }

  return "/registry/types/" + entry.name + "/" + entry.version + "/";
}

export function buildOverviewPath(entry) {
  if (entry.category === "kinds") {
    return "/registry/kinds/" + entry.namespace + "/" + entry.name + "/";
  }

  return "/registry/types/" + entry.name + "/";
}

export function buildLatestPath(entry) {
  return buildOverviewPath(entry) + "latest/";
}

export function extractTitle(markdown, fallback) {
  const atxMatch = markdown.match(/^\uFEFF?#\s+(.+)\r?\n/);

  if (atxMatch) {
    return atxMatch[1].replace(/`/g, "").trim();
  }

  const setextMatch = markdown.match(/^\uFEFF?(.+)\r?\n=+\s*(?:\r?\n|$)/);

  if (!setextMatch) {
    return fallback;
  }

  return setextMatch[1].replace(/`/g, "").trim();
}

export function extractSummary(markdown, fallback) {
  const lines = markdown.split(/\r?\n/);
  const paragraph = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    if (inFence || !trimmed) {
      if (paragraph.length) {
        break;
      }
      continue;
    }

    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("- ") ||
      /^\d+\.\s/.test(trimmed)
    ) {
      if (paragraph.length) {
        break;
      }
      continue;
    }

    paragraph.push(trimmed);
  }

  if (paragraph.length) {
    return paragraph.join(" ");
  }

  return fallback;
}

export function stripLeadingTitle(markdown) {
  return markdown
    .replace(/^#\s+.+\r?\n(?:\r?\n)?/, "")
    .replace(/^.+\r?\n=+\s*\r?\n(?:\r?\n)?/, "")
    .replace(/^\s*\r?\n/, "");
}

export function buildBreadcrumbs(items) {
  return items
    .map(function mapItem(item, index) {
      const isCurrent = index === items.length - 1;
      const label = escapeHtml(item.label);

      if (isCurrent || !item.href) {
        return '<span aria-current="page">' + label + "</span>";
      }

      return '<a href="' + item.href + '">' + label + "</a>";
    })
    .join('<span class="registry-crumb-separator">/</span>');
}

export function buildMetaList(items) {
  if (!items.length) {
    return "";
  }

  return (
    '<dl class="registry-meta-list">' +
    items
      .map(function mapItem(item) {
        return (
          "<div>" +
          "<dt>" +
          escapeHtml(item.term) +
          "</dt>" +
          "<dd>" +
          item.description +
          "</dd>" +
          "</div>"
        );
      })
      .join("") +
    "</dl>"
  );
}

export function renderVersionList(entries) {
  return (
    '<ol class="registry-version-list">' +
    entries
      .map(function mapEntry(entry) {
        return (
          '<li><a href="' +
          entry.detailPath +
          '">' +
          escapeHtml(entry.version) +
          "</a></li>"
        );
      })
      .join("") +
    "</ol>"
  );
}

export function renderEntryList(entries) {
  return (
    '<ul class="registry-entry-list">' +
    entries
      .map(function mapEntry(entry) {
        return (
          '<li class="registry-entry-list-item">' +
          '<a class="registry-entry-list-link" href="' +
          entry.detailPath +
          '">' +
          escapeHtml(entry.identifier) +
          "</a>" +
          '<span class="registry-entry-list-version">' +
          '<a href="' +
          entry.detailPath +
          '">' +
          escapeHtml(entry.version) +
          "</a></span>" +
          "</li>"
        );
      })
      .join("") +
    "</ul>"
  );
}

export async function renderTemplate(templateName, values) {
  const templatePath = path.join(templatesRoot, templateName);
  const template = await fs.readFile(templatePath, "utf8");

  return template.replace(/\{\{(\w+)\}\}/g, function replace(match, key) {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : "";
  });
}

export async function ensureDirectory(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function writePage(relativeOutputPath, content) {
  const outputPath = path.join(distRoot, relativeOutputPath);
  await ensureDirectory(path.dirname(outputPath));
  await fs.writeFile(outputPath, content);
}

export async function copyFileIfPresent(relativePath) {
  const sourcePath = path.join(repoRoot, relativePath);

  if (!(await pathExists(sourcePath))) {
    return;
  }

  const targetPath = path.join(distRoot, relativePath);
  await ensureDirectory(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

export async function copyDirectoryIfPresent(relativePath) {
  const sourcePath = path.join(repoRoot, relativePath);

  if (!(await pathExists(sourcePath))) {
    return;
  }

  await copyDirectory(sourcePath, path.join(distRoot, relativePath));
}

export async function copyDirectory(sourcePath, targetPath) {
  await ensureDirectory(targetPath);
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const sourceEntryPath = path.join(sourcePath, entry.name);
    const targetEntryPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourceEntryPath, targetEntryPath);
      continue;
    }

    await ensureDirectory(path.dirname(targetEntryPath));
    await fs.copyFile(sourceEntryPath, targetEntryPath);
  }
}

export function rewriteHref(href, env) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const hrefPath = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";

  if (!hrefPath) {
    return href;
  }

  const basePath = env && env.currentSourcePath ? env.currentSourcePath : "registry/";
  const currentDirectory = path.dirname(path.join(repoRoot, basePath));
  const resolvedPath = hrefPath.startsWith("/")
    ? path.join(repoRoot, hrefPath)
    : path.resolve(currentDirectory, hrefPath);

  if (!resolvedPath.startsWith(repoRoot)) {
    return href;
  }

  const relativeResolvedPath = toPosix(path.relative(repoRoot, resolvedPath));
  const registryEntry = env && env.entryBySource ? env.entryBySource.get(relativeResolvedPath) : null;

  if (registryEntry) {
    return registryEntry.detailPath + hash;
  }

  return "/" + relativeResolvedPath + hash;
}
