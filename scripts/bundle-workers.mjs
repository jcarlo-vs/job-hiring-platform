import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";

import { build } from "esbuild";

/**
 * Bundles each Lambda worker into dist/<name>.zip and fails if one exceeds
 * Lambda's 50 MB zipped limit. Terraform consumes these zips directly (see
 * infra/main.tf), so this is the single source of truth for the artifact.
 *
 * Run with: npm run build:workers
 */

const WORKERS = ["screening", "application-received-email"];
const LIMIT_ZIPPED = 50 * 1024 * 1024;

rmSync("dist", { recursive: true, force: true });

let failed = false;

for (const name of WORKERS) {
  const outdir = `dist/${name}`;
  mkdirSync(outdir, { recursive: true });

  await build({
    entryPoints: [`workers/${name}.ts`],
    outfile: `${outdir}/index.js`,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    // The Node 22 Lambda runtime ships the AWS SDK v3; bundling it would add
    // roughly 10 MB for no benefit.
    external: ["@aws-sdk/*"],
    alias: { "@": "." },
    logLevel: "warning",
  });

  execFileSync("zip", ["-qr", `../${name}.zip`, "."], { cwd: outdir });

  const zipped = statSync(`dist/${name}.zip`).size;
  const unzipped = statSync(`${outdir}/index.js`).size;
  const mb = (n) => (n / 1024 / 1024).toFixed(1);

  console.log(`${name}: ${mb(zipped)} MB zipped, ${mb(unzipped)} MB unzipped`);

  if (zipped > LIMIT_ZIPPED) {
    console.error(`  FAIL: exceeds Lambda's 50 MB zipped limit`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("\nAll worker bundles within Lambda limits.");
