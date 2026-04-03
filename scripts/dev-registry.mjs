import http from "http";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

import chokidar from "chokidar";

import { distRoot, pathExists, repoRoot } from "./lib/registry.mjs";

const args = new Set(process.argv.slice(2));
const serveOnly = args.has("--serve-only");
const port = Number(process.env.PORT || 4173);

let buildRunning = false;
let buildQueued = false;

function mimeType(targetPath) {
  if (targetPath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (targetPath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (targetPath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (targetPath.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (targetPath.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }
  return "application/octet-stream";
}

function runNodeScript(scriptPath) {
  return new Promise(function resolveScript(resolve, reject) {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", function onExit(code) {
      resolve(code || 0);
    });
  });
}

async function runBuild() {
  if (serveOnly) {
    return;
  }

  if (buildRunning) {
    buildQueued = true;
    return;
  }

  buildRunning = true;
  console.log("[registry] validating");
  const validateCode = await runNodeScript(path.join(repoRoot, "scripts", "validate-registry.mjs"));

  if (validateCode === 0) {
    console.log("[registry] building");
    const buildCode = await runNodeScript(path.join(repoRoot, "scripts", "build-registry.mjs"));
    if (buildCode === 0) {
      console.log("[registry] build complete");
    }
  }

  buildRunning = false;

  if (buildQueued) {
    buildQueued = false;
    runBuild();
  }
}

async function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requestPath = cleanPath === "/" ? "/index.html" : cleanPath;
  const relativePath = requestPath.replace(/^\/+/, "");
  let targetPath = path.join(distRoot, relativePath);

  if (await pathExists(targetPath)) {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      targetPath = path.join(targetPath, "index.html");
    }
    return targetPath;
  }

  if (!path.extname(targetPath)) {
    const htmlPath = path.join(targetPath, "index.html");
    if (await pathExists(htmlPath)) {
      return htmlPath;
    }
  }

  return null;
}

async function startServer() {
  const server = http.createServer(async function onRequest(request, response) {
    try {
      const targetPath = await resolveRequestPath(request.url || "/");

      if (!targetPath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const content = await fs.readFile(targetPath);
      response.writeHead(200, { "content-type": mimeType(targetPath) });
      response.end(content);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Internal server error");
      console.error(error);
    }
  });

  await new Promise(function listen(resolve) {
    server.listen(port, resolve);
  });

  console.log("[registry] serving dist at http://localhost:" + port);
}

async function main() {
  if (!serveOnly) {
    await runBuild();

    const watcher = chokidar.watch(
      [
        path.join(repoRoot, "registry"),
        path.join(repoRoot, "CIP-01.md"),
        path.join(repoRoot, "templates"),
        path.join(repoRoot, "styles.css"),
        path.join(repoRoot, "index.html")
      ],
      {
        ignoreInitial: true
      }
    );

    watcher.on("all", function onChange(eventName, changedPath) {
      console.log("[registry] " + eventName + " " + path.relative(repoRoot, changedPath));
      runBuild();
    });
  }

  await startServer();
}

main().catch(function handleError(error) {
  console.error(error);
  process.exitCode = 1;
});
