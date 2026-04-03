import fs from "fs/promises";
import path from "path";

import semver from "semver";

import {
  buildBreadcrumbs,
  buildMetaList,
  compareEntries,
  copyDirectoryIfPresent,
  copyFileIfPresent,
  distRoot,
  ensureDirectory,
  extractSummary,
  extractTitle,
  groupEntries,
  loadMarkdownRenderer,
  loadRegistryEntries,
  renderEntryList,
  renderTemplate,
  renderVersionList,
  rewriteHref,
  stripLeadingTitle,
  writePage
} from "./lib/registry.mjs";

function sortVersions(entries) {
  return entries.slice().sort(function sortByVersion(left, right) {
    return semver.rcompare(left.version, right.version);
  });
}

function familyLabel(entry) {
  return entry.category === "kinds" ? entry.identifier : entry.name;
}

function familyOutputSegments(entry) {
  if (entry.category === "kinds") {
    return ["registry", "kinds", entry.namespace, entry.name];
  }

  return ["registry", "types", entry.name];
}

function detailOutputSegments(entry) {
  return familyOutputSegments(entry).concat(entry.version);
}

function buildFamilyMarkup(entry, versions) {
  const latest = versions[0];
  const versionCount = versions.length === 1 ? "1 version" : versions.length + " versions";

  return (
    '<article class="registry-family">' +
    '<header class="registry-family-header">' +
    '<p class="registry-family-label">' +
    (entry.category === "kinds" ? "Kind" : "Type") +
    "</p>" +
    "<h2>" +
    familyLabel(entry) +
    "</h2>" +
    '<p class="registry-family-summary">' +
    latest.summary +
    "</p>" +
    "</header>" +
    '<p class="registry-family-links">' +
    '<a href="' +
    latest.detailPath +
    '">Latest spec</a> ' +
    '<span>' +
    versionCount +
    "</span>" +
    "</p>" +
    renderVersionList(versions) +
    "</article>"
  );
}

async function main() {
  const entries = await loadRegistryEntries();
  const renderer = loadMarkdownRenderer(rewriteHref);
  const groups = groupEntries(entries);
  const latestEntries = [];
  const entryBySource = new Map();

  for (const entry of entries) {
    entryBySource.set(entry.sourcePath, entry);
  }

  await fs.rm(distRoot, { recursive: true, force: true });
  await ensureDirectory(distRoot);

  await Promise.all([
    copyFileIfPresent("index.html"),
    copyFileIfPresent("styles.css"),
    copyFileIfPresent("CNAME"),
    copyFileIfPresent("CIP-01.md"),
    copyFileIfPresent("README.md"),
    copyDirectoryIfPresent("registry"),
    copyDirectoryIfPresent("public")
  ]);

  for (const groupedEntries of groups.values()) {
    const versions = sortVersions(groupedEntries);
    const latest = versions[0];
    latestEntries.push(latest);

    const familyContent = buildFamilyMarkup(latest, versions);
    const familyPage = await renderTemplate("registry-page.html", {
      title: familyLabel(latest) + " | Chronicle Registry",
      description: latest.summary,
      canonicalPath: latest.overviewPath,
      heading: familyLabel(latest),
      subtitle:
        "Canonical " +
        (latest.category === "kinds" ? "kind" : "type") +
        " definition in the Chronicle registry.",
      breadcrumbs: buildBreadcrumbs([
        { label: "Registry", href: "/registry/" },
        { label: familyLabel(latest) }
      ]),
      content: familyContent,
      meta: buildMetaList([
        {
          term: "Latest",
          description:
            '<a href="' + latest.detailPath + '">' + latest.version + "</a>"
        },
        {
          term: "Source",
          description:
            '<a href="/' + latest.sourcePath + '">View markdown</a>'
        }
      ])
    });

    await writePage(path.join.apply(path, familyOutputSegments(latest).concat("index.html")), familyPage);

    const latestRedirectPage = await renderTemplate("registry-page.html", {
      title: familyLabel(latest) + " latest | Chronicle Registry",
      description: latest.summary,
      canonicalPath: latest.latestPath,
      heading: familyLabel(latest) + " latest",
      subtitle: "Latest published version in this registry family.",
      breadcrumbs: buildBreadcrumbs([
        { label: "Registry", href: "/registry/" },
        { label: familyLabel(latest), href: latest.overviewPath },
        { label: "Latest" }
      ]),
      content:
        '<div class="registry-callout"><p><strong>Latest version:</strong> <a href="' +
        latest.detailPath +
        '">' +
        latest.version +
        "</a></p></div>",
      meta: buildMetaList([
        {
          term: "Resolved version",
          description:
            '<a href="' + latest.detailPath + '">' + latest.version + "</a>"
        }
      ])
    });

    await writePage(
      path.join.apply(path, familyOutputSegments(latest).concat("latest", "index.html")),
      latestRedirectPage
    );

    for (const versionEntry of versions) {
      const renderedContent = renderer.render(stripLeadingTitle(versionEntry.markdown), {
        currentSourcePath: versionEntry.sourcePath,
        entryBySource
      });

      const detailPage = await renderTemplate("registry-page.html", {
        title: versionEntry.title + " " + versionEntry.version + " | Chronicle Registry",
        description: versionEntry.summary,
        canonicalPath: versionEntry.detailPath,
        heading: versionEntry.title,
        subtitle:
          versionEntry.category === "kinds"
            ? "Kind specification, version " + versionEntry.version
            : "Type specification, version " + versionEntry.version,
        breadcrumbs: buildBreadcrumbs([
          { label: "Registry", href: "/registry/" },
          { label: familyLabel(versionEntry), href: versionEntry.overviewPath },
          { label: versionEntry.version }
        ]),
        content: renderedContent,
        meta: buildMetaList([
          {
            term: "Version",
            description: versionEntry.version
          },
          {
            term: "Latest alias",
            description:
              '<a href="' + versionEntry.latestPath + '">/latest/</a>'
          },
          {
            term: "Source",
            description:
              '<a href="/' + versionEntry.sourcePath + '">View markdown</a>'
          }
        ])
      });

      await writePage(
        path.join.apply(path, detailOutputSegments(versionEntry).concat("index.html")),
        detailPage
      );
    }
  }

  latestEntries.sort(compareEntries);

  const kinds = latestEntries.filter(function filterKinds(entry) {
    return entry.category === "kinds";
  });
  const types = latestEntries.filter(function filterTypes(entry) {
    return entry.category === "types";
  });

  const rootPage = await renderTemplate("registry-index.html", {
    title: "Chronicle Registry",
    description: "Reference definitions for Chronicle kinds and types.",
    canonicalPath: "/registry/",
    heading: "Chronicle Registry",
    subtitle: "Reference definitions for Chronicle kinds and types.",
    content:
      '<section class="registry-root-section"><h2>Kinds</h2>' +
      renderEntryList(kinds) +
      '</section><section class="registry-root-section"><h2>Types</h2>' +
      renderEntryList(types) +
      "</section>"
  });

  await writePage(path.join("registry", "index.html"), rootPage);

  const protocolMarkdown = await fs.readFile(path.join(process.cwd(), "CIP-01.md"), "utf8");
  const protocolTitle = extractTitle(protocolMarkdown, "CIP-01");
  const protocolSummary = extractSummary(
    stripLeadingTitle(protocolMarkdown),
    "Core Chronicle node protocol specification."
  );
  const protocolContent = renderer.render(stripLeadingTitle(protocolMarkdown), {
    currentSourcePath: "CIP-01.md",
    entryBySource
  });
  const protocolPage = await renderTemplate("registry-page.html", {
    title: protocolTitle + " | Chronicle",
    description: protocolSummary,
    canonicalPath: "/protocol/cip-01/",
    heading: protocolTitle,
    subtitle: "Core Chronicle node protocol specification.",
    breadcrumbs: buildBreadcrumbs([
      { label: "Home", href: "/" },
      { label: "CIP-01" }
    ]),
    content: protocolContent,
    meta: buildMetaList([
      {
        term: "Spec",
        description: "Chronicle Improvement Proposal 01"
      },
      {
        term: "Source",
        description: '<a href="/CIP-01.md">View markdown</a>'
      }
    ])
  });

  await writePage(path.join("protocol", "cip-01", "index.html"), protocolPage);

  const manifest = {
    generated_at: new Date().toISOString(),
    counts: {
      families: latestEntries.length,
      entries: entries.length,
      kinds: kinds.length,
      types: types.length
    },
    entries: latestEntries.map(function mapEntry(entry) {
      const versions = sortVersions(groups.get(entry.familyKey));
      return {
        category: entry.category,
        identifier: entry.identifier,
        namespace: entry.namespace,
        name: entry.name,
        summary: entry.summary,
        latest_version: entry.version,
        overview_path: entry.overviewPath,
        latest_path: entry.latestPath,
        source_path: "/" + entry.sourcePath,
        versions: versions.map(function mapVersion(versionEntry) {
          return {
            version: versionEntry.version,
            path: versionEntry.detailPath,
            source_path: "/" + versionEntry.sourcePath
          };
        })
      };
    })
  };

  await writePage(
    path.join("registry", "index.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
}

main().catch(function handleError(error) {
  console.error(error);
  process.exitCode = 1;
});
