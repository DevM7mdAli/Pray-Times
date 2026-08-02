import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iosDirectory = resolve(appDirectory, "ios");

if (existsSync(iosDirectory)) {
  const sqliteDirectory = dirname(require.resolve("expo-sqlite/package.json"));
  const sqliteSource = resolve(sqliteDirectory, "ios/sqlite3.c");
  const sqliteHeader = resolve(sqliteDirectory, "ios/sqlite3.h");

  if (!existsSync(sqliteSource) || !existsSync(sqliteHeader)) {
    console.log("Expo SQLite iOS sources are missing; refreshing CocoaPods...");
    const result = spawnSync("pod", ["install"], {
      cwd: iosDirectory,
      stdio: "inherit",
    });

    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
