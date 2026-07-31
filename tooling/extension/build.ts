import { cp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const extensionRoot = path.join(root, "apps", "extension");
const distRoot = path.join(extensionRoot, "dist");

function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, { cwd: extensionRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} exited with ${result.status ?? "an unknown status"}`);
}

async function main(): Promise<void> {
  await rm(distRoot, { recursive: true, force: true });
  await mkdir(distRoot, { recursive: true });
  run("pnpm", [
    "exec",
    "tailwindcss",
    "-c",
    "tailwind.config.cjs",
    "-i",
    "src/input.css",
    "-o",
    "dist/styles.css",
    "--minify",
  ]);
  run("pnpm", [
    "exec",
    "esbuild",
    "src/popup.ts",
    "--bundle",
    "--format=esm",
    "--target=es2022",
    "--outfile=dist/popup.js",
  ]);
  await Promise.all([
    cp(path.join(extensionRoot, "manifest.json"), path.join(distRoot, "manifest.json")),
    cp(path.join(extensionRoot, "_locales"), path.join(distRoot, "_locales"), { recursive: true }),
    cp(path.join(extensionRoot, "src", "popup.html"), path.join(distRoot, "popup.html")),
    cp(path.join(extensionRoot, "public", "icons"), path.join(distRoot, "icons"), {
      recursive: true,
    }),
    cp(path.join(extensionRoot, "public", "fonts"), path.join(distRoot, "fonts"), {
      recursive: true,
    }),
  ]);
  console.log(`Built extension at ${path.relative(root, distRoot)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
