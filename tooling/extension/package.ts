import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXTENSION_PACKAGE_FILES,
  EXTENSION_TARGET_DEFINITIONS,
  resolveTargets,
  type ExtensionTarget,
} from "./targets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distRoot = path.join(root, "apps", "extension", "dist");
const artifactRoot = path.join(root, "artifacts");

type Manifest = { version?: unknown; background?: unknown };

function assertVersion(version: unknown): string {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/.test(version)) {
    throw new Error(`Invalid manifest version: ${String(version)}`);
  }
  return version;
}

/**
 * A background entry that names a missing or renamed file still loads, and the
 * extension then silently runs without notifications, so the declared script is
 * checked against what the archive actually ships.
 */
function assertBackgroundEntry(target: ExtensionTarget, background: unknown): void {
  const declared =
    background && typeof background === "object"
      ? ((background as { service_worker?: unknown; scripts?: unknown }).service_worker ??
        (background as { scripts?: unknown[] }).scripts?.[0])
      : undefined;
  if (typeof declared !== "string") {
    throw new Error(`${target}: the manifest declares no background script`);
  }
  if (!(EXTENSION_PACKAGE_FILES as readonly string[]).includes(declared)) {
    throw new Error(`${target}: the background script "${declared}" is not packaged`);
  }
}

async function assertRegularFiles(buildRoot: string, target: ExtensionTarget): Promise<void> {
  await Promise.all(
    EXTENSION_PACKAGE_FILES.map(async (file) => {
      const detail = await lstat(path.join(buildRoot, file)).catch(() => undefined);
      if (!detail) throw new Error(`${target}: missing package file: ${file}`);
      if (!detail.isFile() || detail.isSymbolicLink())
        throw new Error(`${target}: invalid package file: ${file}`);
    })
  );
}

async function packageTarget(target: ExtensionTarget): Promise<string> {
  const buildRoot = path.join(distRoot, target);
  const manifest = JSON.parse(
    await readFile(path.join(buildRoot, "manifest.json"), "utf8")
  ) as Manifest;
  const version = assertVersion(manifest.version);
  assertBackgroundEntry(target, manifest.background);
  await assertRegularFiles(buildRoot, target);

  const archive = path.join(artifactRoot, `pray-times-${target}-${version}.zip`);
  await rm(archive, { force: true });
  await rm(`${archive}.sha256`, { force: true });
  const result = spawnSync("zip", ["-q", "-X", "-9", archive, ...EXTENSION_PACKAGE_FILES], {
    cwd: buildRoot,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`zip failed: ${(result.stderr || result.stdout).trim()}`);
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  await writeFile(`${archive}.sha256`, `${digest}  ${path.basename(archive)}\n`, "utf8");
  console.log(`${EXTENSION_TARGET_DEFINITIONS[target].label}: ${path.relative(root, archive)}`);
  console.log(`  SHA-256: ${digest}`);
  return version;
}

async function main(): Promise<void> {
  const targets = resolveTargets(process.argv.slice(2));
  await mkdir(artifactRoot, { recursive: true });
  const versions = new Set<string>();
  for (const target of targets) versions.add(await packageTarget(target));
  if (versions.size > 1) {
    throw new Error(`The target builds disagree on the version: ${[...versions].join(", ")}`);
  }
  console.log(`Packaged Pray Times ${[...versions][0]} for ${targets.join(", ")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
