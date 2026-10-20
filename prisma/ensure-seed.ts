// Runs during build: fills demo data ONLY when the database is empty (first deploy).
// Never touches a database that already has users.
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const db = new PrismaClient();
(async () => {
  try {
    const n = await db.user.count();
    if (n > 0 || process.env.SKIP_SEED === "true") { console.log(`ensure-seed: ${n} users found, skipping`); return; }
    console.log("ensure-seed: empty database, loading starter data…");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  } catch (e) {
    console.warn("ensure-seed skipped:", (e as Error).message);
  } finally {
    await db.$disconnect();
  }
})();
