import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const buildRoot = path.join(root, "apps", "extension", "dist");
const packageFiles = [
  "manifest.json",
  "popup.html",
  "popup.js",
  "styles.css",
  "fonts/alexandria-600.woff2",
  "fonts/alexandria-700.woff2",
  "fonts/ibm-plex-sans-arabic-400.woff2",
  "fonts/ibm-plex-sans-arabic-600.woff2",
  "fonts/ibm-plex-sans-arabic-700.woff2",
  "fonts/amiri-400.woff2",
  "fonts/LICENSE-ALEXANDRIA-OFL.txt",
  "fonts/LICENSE-IBM-PLEX-SANS-ARABIC-OFL.txt",
  "fonts/LICENSE-AMIRI-OFL.txt",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png"
] as const;

type Manifest = { version?: unknown };

function assertVersion(version: unknown): string {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/.test(version)) {
    throw new Error(`Invalid manifest version: ${String(version)}`);
  }
  return version;
}

async function assertRegularFiles(): Promise<void> {
  await Promise.all(packageFiles.map(async (file) => {
    const detail = await lstat(path.join(buildRoot, file));
    if (!detail.isFile() || detail.isSymbolicLink()) throw new Error(`Invalid package file: ${file}`);
  }));
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(path.join(buildRoot, "manifest.json"), "utf8")) as Manifest;
  const version = assertVersion(manifest.version);
  await assertRegularFiles();
  const artifactRoot = path.join(root, "artifacts");
  const archive = path.join(artifactRoot, `pray-times-${version}.zip`);
  await mkdir(artifactRoot, { recursive: true });
  await rm(archive, { force: true });
  await rm(`${archive}.sha256`, { force: true });
  const result = spawnSync("zip", ["-q", "-X", "-9", archive, ...packageFiles], { cwd: buildRoot, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`zip failed: ${(result.stderr || result.stdout).trim()}`);
  const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
  await writeFile(`${archive}.sha256`, `${digest}  ${path.basename(archive)}\n`, "utf8");
  console.log(`Packaged Pray Times ${version}`);
  console.log(`Archive: ${path.relative(root, archive)}`);
  console.log(`SHA-256: ${digest}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
