import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  createWriteStream,
  statSync,
} from "node:fs";
import { join } from "node:path";
import archiver from "archiver";

/**
 * Always builds with the parameters (minified, sourcemap, etc.).
 * Release mode only adds manifest rewriting for GitHub Actions.
 *
 * Usage:
 *   bun build.ts                    # Regular build to dist/
 *   bun build.ts --release          # Release build (requires env vars, writes to temp by default)
 *   WRITE_MANIFEST=true bun build.ts --release  # Release build (writes to real locations)
 */
const args = process.argv.slice(2);
const isRelease = args.includes("--release");

const TEMP_DIR = "dist-release-temp";
const REAL_DIST = "dist";
const WRITE_MANIFEST = process.env.WRITE_MANIFEST === "true";

let RELEASE_VERSION: string | undefined;
let RELEASE_PROJECT_URL: string | undefined;
let RELEASE_MANIFEST_URL: string | undefined;
let RELEASE_DOWNLOAD_URL: string | undefined;

if (isRelease) {
  RELEASE_VERSION = (process.env.RELEASE_VERSION || "").replace(/^v/, "");
  RELEASE_PROJECT_URL = process.env.RELEASE_PROJECT_URL || "";
  RELEASE_MANIFEST_URL = process.env.RELEASE_MANIFEST_URL || "";
  RELEASE_DOWNLOAD_URL = process.env.RELEASE_DOWNLOAD_URL || "";

  if (
    !RELEASE_VERSION ||
    !RELEASE_PROJECT_URL ||
    !RELEASE_MANIFEST_URL ||
    !RELEASE_DOWNLOAD_URL
  ) {
    console.error("Missing required environment variables for release build:");
    console.error("  RELEASE_VERSION:", RELEASE_VERSION || "(missing)");
    console.error("  RELEASE_PROJECT_URL:", RELEASE_PROJECT_URL || "(missing)");
    console.error(
      "  RELEASE_MANIFEST_URL:",
      RELEASE_MANIFEST_URL || "(missing)",
    );
    console.error(
      "  RELEASE_DOWNLOAD_URL:",
      RELEASE_DOWNLOAD_URL || "(missing)",
    );
    process.exit(1);
  }
}

const outputDir =
  isRelease && WRITE_MANIFEST ? REAL_DIST : isRelease ? TEMP_DIR : REAL_DIST;
const manifestOutputPath =
  isRelease && WRITE_MANIFEST
    ? "module.json"
    : isRelease
      ? "module.json.release"
      : null;

if (isRelease) {
  console.log(`Building release to: ${outputDir}`);
  if (!WRITE_MANIFEST) {
    console.log("(Safe mode: outputs will go to temp directory)");
  }
} else {
  console.log(`Building to: ${outputDir}`);
}

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}
mkdirSync(outputDir, { recursive: true });

console.log("Building JavaScript bundle...");
const buildResult = await Bun.build({
  entrypoints: ["./src/instant-range.ts"],
  outdir: outputDir,
  target: "browser",
  format: "esm",
  minify: true,
  sourcemap: "linked",
});

if (!buildResult.success) {
  console.error("Build failed:");
  for (const log of buildResult.logs) {
    if (log.level === "error") {
      console.error(log);
    }
  }
  process.exit(1);
}

// Normalize sourcemap paths - fixes Windows devtools display issue where paths appear flattened
const mapPath = join(outputDir, "instant-range.js.map");
if (existsSync(mapPath)) {
  let mapContent: { sources?: unknown[] };
  try {
    mapContent = JSON.parse(readFileSync(mapPath, "utf8"));
  } catch (err) {
    console.warn("Failed to parse sourcemap, skipping normalization:", err);
    mapContent = {};
  }
  if (Array.isArray(mapContent.sources)) {
    mapContent.sources = mapContent.sources.map((s) =>
      typeof s === "string" ? s.replace(/\\/g, "/") : s,
    );
    writeFileSync(mapPath, JSON.stringify(mapContent));
  }
}

// Build CSS (optional, only for release builds)
let cssOutputPath: string | null = null;
if (isRelease) {
  let moduleJson: { styles?: string[] };
  try {
    moduleJson = JSON.parse(readFileSync("module.json", "utf8"));
  } catch (err) {
    console.error("Failed to parse module.json:", err);
    process.exit(1);
  }
  if (moduleJson.styles && moduleJson.styles.length > 0) {
    const cssEntry = moduleJson.styles[0];
    console.log(`Building CSS from: ${cssEntry}`);

    const cssBuildResult = await Bun.build({
      entrypoints: [cssEntry],
      outdir: outputDir,
      minify: true,
      sourcemap: "linked",
    });

    if (cssBuildResult.success) {
      const cssBasename = cssEntry
        .split("/")
        .pop()
        ?.replace(/\.css$/, "");
      if (cssBasename) {
        cssOutputPath = `${outputDir}/${cssBasename}.min.css`;
      }
    } else {
      console.warn("CSS build failed (non-fatal):");
      for (const log of cssBuildResult.logs) {
        if (log.level === "error" || log.level === "warning") {
          console.warn(log);
        }
      }
    }
  }
}

if (isRelease && manifestOutputPath) {
  let moduleJson: { styles?: string[]; [key: string]: unknown };
  try {
    moduleJson = JSON.parse(readFileSync("module.json", "utf8"));
  } catch (err) {
    console.error("Failed to parse module.json:", err);
    process.exit(1);
  }
  const modifiedManifest = {
    ...moduleJson,
    version: RELEASE_VERSION!,
    url: RELEASE_PROJECT_URL!,
    manifest: RELEASE_MANIFEST_URL!,
    download: RELEASE_DOWNLOAD_URL!,
    esmodules: [`${outputDir}/instant-range.js`],
  };

  if (cssOutputPath) {
    modifiedManifest.styles = [cssOutputPath];
  } else if (moduleJson.styles) {
    // Keep existing styles if CSS build wasn't needed/attempted
    modifiedManifest.styles = moduleJson.styles;
  }

  writeFileSync(
    manifestOutputPath,
    JSON.stringify(modifiedManifest, null, 2) + "\n",
  );
  console.log(`Manifest written to: ${manifestOutputPath}`);

  // Create module.zip archive
  console.log("Creating module archive...");
  const zipPath = "module.zip";
  const output = createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(
      `Module archive created: ${zipPath} (${archive.pointer()} bytes)`,
    );
  });

  archive.on("error", (err) => {
    console.error("Archive error:", err);
    process.exit(1);
  });

  archive.pipe(output);

  // Files and directories to include in the archive
  const archiveFiles = [
    "module.json",
    "CHANGELOG.md",
    "LICENSE",
    "templates/",
    "dist/",
    "lang/",
    "assets/",
  ];

  for (const file of archiveFiles) {
    const filePath = file.replace(/\/$/, ""); // Remove trailing slash for existsSync
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      if (stats.isDirectory()) {
        archive.directory(file, file);
      } else {
        archive.file(file, { name: file });
      }
    } else {
      console.warn(`Warning: ${file} not found, skipping...`);
    }
  }

  await archive.finalize();
}

console.log(`Build complete!`);

if (isRelease && !WRITE_MANIFEST) {
  console.log(`\nTo write to real locations, run with: WRITE_MANIFEST=true`);
  console.log(`Temp files are in: ${TEMP_DIR}/`);
} else if (isRelease) {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  console.log(`Files written to: ${REAL_DIST}/`);
}
