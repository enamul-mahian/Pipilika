// Start used by hosts: make sure the database is ready (tables + starter data on an empty DB), then serve.
// Safe to run on every start: migrations are idempotent and starter data only loads when there are no users.
import { execSync, spawn } from "child_process";
const run = (c) => { try { execSync(c, { stdio: "inherit" }); } catch (e) { console.error(`start: "${c}" failed, continuing`, e.message); } };
if (process.env.DATABASE_URL) {
  run("npx prisma migrate deploy");
  run("npx tsx prisma/ensure-seed.ts");
} else {
  console.error("start: DATABASE_URL is not set — the site cannot reach its database.");
}
const port = process.env.PORT || "3000";
const child = spawn("npx", ["next", "start", "-p", port], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const s of ["SIGTERM", "SIGINT"]) process.on(s, () => child.kill(s));
