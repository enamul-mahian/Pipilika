// Build used by hosts (Hostinger, Railway, Render): generate client, apply migrations,
// load starter data on an empty DB, then build Next.js.
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
// Load .env for local builds (hosts inject variables directly).
if (existsSync(".env")) for (const l of readFileSync(".env", "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const run = (c) => execSync(c, { stdio: "inherit" });
run("npx prisma generate");
if (process.env.DATABASE_URL) {
  run("npx prisma migrate deploy");
  run("npx tsx prisma/ensure-seed.ts");
} else {
  console.warn("DATABASE_URL not set: skipping migrations (set it in your host's environment variables).");
}
run("npx next build");
