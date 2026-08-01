import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXTENSION_TARGET_DEFINITIONS,
  resolveTargets,
  type ExtensionTarget,
  type Manifest,
} from "./targets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const extensionRoot = path.join(root, "apps", "extension");
const distRoot = path.join(extensionRoot, "dist");
// Tailwind output is identical for every target, so it is built once here and
// then copied into each target directory.
const sharedStyles = path.join(distRoot, ".styles", "styles.css");

function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, { cwd: extensionRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} exited with ${result.status ?? "an unknown status"}`);
}

function bundle(entry: string, outfile: string, format: "esm" | "iife", target: ExtensionTarget) {
  run("pnpm", [
    "exec",
    "esbuild",
    entry,
    "--bundle",
    `--format=${format}`,
    "--target=es2022",
    `--define:__EXTENSION_TARGET__=${JSON.stringify(target)}`,
    `--outfile=${outfile}`,
  ]);
}

async function buildTarget(target: ExtensionTarget, base: Manifest): Promise<void> {
  const definition = EXTENSION_TARGET_DEFINITIONS[target];
  const targetRoot = path.join(distRoot, target);
  await mkdir(targetRoot, { recursive: true });

  // The popup always runs as a module script; only the background differs.
  bundle("src/popup.ts", path.join(targetRoot, "popup.js"), "esm", target);
  bundle(
    "src/service-worker.ts",
    path.join(targetRoot, "service-worker.js"),
    definition.backgroundFormat,
    target
  );

  await Promise.all([
    writeFile(
      path.join(targetRoot, "manifest.json"),
      `${JSON.stringify(definition.manifest(base), null, 2)}\n`,
      "utf8"
    ),
    cp(sharedStyles, path.join(targetRoot, "styles.css")),
    cp(path.join(extensionRoot, "src", "popup.html"), path.join(targetRoot, "popup.html")),
    cp(path.join(extensionRoot, "_locales"), path.join(targetRoot, "_locales"), {
      recursive: true,
    }),
    cp(path.join(extensionRoot, "public", "icons"), path.join(targetRoot, "icons"), {
      recursive: true,
    }),
    cp(path.join(extensionRoot, "public", "fonts"), path.join(targetRoot, "fonts"), {
      recursive: true,
    }),
  ]);
  console.log(`Built ${definition.label} at ${path.relative(root, targetRoot)}`);
}

async function main(): Promise<void> {
  const targets = resolveTargets(process.argv.slice(2));
  const base = JSON.parse(
    await readFile(path.join(extensionRoot, "manifest.base.json"), "utf8")
  ) as Manifest;

  // Only clear what this run rebuilds, so building one target keeps the others.
  await Promise.all(
    targets.map((target) => rm(path.join(distRoot, target), { recursive: true, force: true }))
  );
  await mkdir(path.dirname(sharedStyles), { recursive: true });
  run("pnpm", [
    "exec",
    "tailwindcss",
    "-c",
    "tailwind.config.cjs",
    "-i",
    "src/input.css",
    "-o",
    sharedStyles,
    "--minify",
  ]);

  for (const target of targets) await buildTarget(target, base);

  await rm(path.dirname(sharedStyles), { recursive: true, force: true });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
