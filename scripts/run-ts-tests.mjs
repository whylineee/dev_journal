import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tempOutDir = path.join(os.tmpdir(), "dev-journal-ts-tests");

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });

const collectTestFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectTestFiles(entryPath);
      }
      return entry.name.endsWith(".test.js") ? [entryPath] : [];
    })
  );

  return files.flat();
};

await rm(tempOutDir, { recursive: true, force: true });
await mkdir(tempOutDir, { recursive: true });
await writeFile(path.join(tempOutDir, "package.json"), JSON.stringify({ type: "commonjs" }));

const tscEntrypoint = path.join(repoRoot, "node_modules", "typescript", "lib", "tsc.js");
await run(process.execPath, [
  tscEntrypoint,
  "-p",
  "tsconfig.test.json",
  "--outDir",
  tempOutDir,
]);
const compiledTestFiles = await collectTestFiles(path.join(tempOutDir, "tests"));
await run(process.execPath, ["--test", ...compiledTestFiles], {
  env: {
    ...process.env,
    NODE_PATH: path.join(repoRoot, "node_modules"),
  },
});
