// Build used by hosts (Hostinger, Railway, Render): generate client, try to prepare the database,
// then build Next.js. Database steps never fail the build — `npm start` repeats them at startup.
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
// Load .env for local builds (hosts inject variables directly).
if (existsSync(".env")) for (const l of readFileSync(".env", "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const run = (c) => execSync(c, { stdio: "inherit" });
const tryRun = (c) => { try { run(c); } catch (e) { console.warn(`build: "${c}" failed (${e.message.split("\n")[0]}). Continuing — it runs again when the site starts.`); } };
const major = Number(process.versions.node.split(".")[0]);
if (major < 20) console.warn(`build: Node ${process.versions.node} detected. Please choose Node 20 or 22 in your hosting panel.`);
run("npx prisma generate");
if (process.env.DATABASE_URL) {
  tryRun("npx prisma migrate deploy");
  tryRun("npx tsx prisma/ensure-seed.ts");
} else {
  console.warn("DATABASE_URL not set: skipping migrations (set it in your host's environment variables).");
}
run("npx next build");
