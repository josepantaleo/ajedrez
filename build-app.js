"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectDirectory = __dirname;
const moduleFiles = [
  "01-core-ui.js",
  "02-gameplay.js",
  "03-analysis-tutor.js",
  "04-learning.js",
  "05-online-services.js",
  "06-tournament-data.js",
  "07-tournament-ui.js",
  "08-tournament-match.js",
];
const sourcePath = path.join(projectDirectory, ".app.production.source.js");
const nextBundlePath = path.join(projectDirectory, ".app.next.js");
const bundlePath = path.join(projectDirectory, "app.js");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectDirectory,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} terminó con código ${result.status}.`);
  }
}

function runNpx(args) {
  if (process.platform !== "win32") {
    run("npx", args);
    return;
  }
  run(process.env.ComSpec || "cmd.exe", ["/d", "/c", "npx.cmd", ...args]);
}

try {
  const source = moduleFiles
    .map((fileName) =>
      fs.readFileSync(path.join(projectDirectory, fileName), "utf8"),
    )
    .join("\n\n");
  fs.writeFileSync(sourcePath, source, "utf8");

  runNpx([
    "--yes",
    "terser@5.43.1",
    sourcePath,
    "--compress",
    "passes=2",
    "--mangle",
    "--comments",
    "false",
    "--output",
    nextBundlePath,
  ]);
  run(process.execPath, ["--check", nextBundlePath]);

  fs.renameSync(nextBundlePath, bundlePath);
  console.log(`app.js actualizado desde ${moduleFiles.length} módulos.`);
} finally {
  fs.rmSync(sourcePath, { force: true });
  fs.rmSync(nextBundlePath, { force: true });
}
