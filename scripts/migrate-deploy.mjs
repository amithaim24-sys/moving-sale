// Resilient wrapper around `prisma migrate deploy` for the build step.
//
// Why: `migrate deploy` takes a single session-level Postgres advisory lock
// (id 72707369). When two deploys/builds run against the same database at once
// (e.g. concurrent Vercel builds, or a local build while CI deploys), the loser
// times out after 10s with `P1002` and the whole build fails. The DIRECT_URL
// (non-pooler) connection does NOT help here — both sides still contend for the
// same lock. So we simply retry the lock acquisition until the other holder
// releases it.
//
// Any NON-lock failure (a genuinely broken migration) fails fast without retry.

import { execSync } from "node:child_process";

// directUrl (used only by `migrate deploy`) is optional infrastructure. If
// DIRECT_URL isn't provided in this environment (e.g. a Preview deploy where
// only DATABASE_URL is set), fall back to DATABASE_URL so the build never breaks
// on a missing var. Production sets DIRECT_URL to the non-pooler endpoint.
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  console.log("ℹ DIRECT_URL not set — falling back to DATABASE_URL for migrate deploy.");
}

const MAX_ATTEMPTS = 10;
const DELAY_MS = 7000;

// Synchronous sleep with no extra dependencies and no CPU busy-wait.
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    const out = execSync("npx prisma migrate deploy", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.write(out);
    console.log(`✔ prisma migrate deploy succeeded (attempt ${attempt}/${MAX_ATTEMPTS}).`);
    process.exit(0);
  } catch (err) {
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    process.stdout.write(output);

    const isLockTimeout = /P1002|advisory lock/i.test(output);
    if (!isLockTimeout) {
      console.error("✖ prisma migrate deploy failed with a non-lock error — not retrying.");
      process.exit(typeof err.status === "number" ? err.status : 1);
    }
    if (attempt === MAX_ATTEMPTS) {
      console.error(
        `✖ prisma migrate deploy still blocked by the advisory lock after ${MAX_ATTEMPTS} attempts.`,
      );
      process.exit(1);
    }
    console.error(
      `⚠ Advisory-lock contention (P1002) on attempt ${attempt}/${MAX_ATTEMPTS}; ` +
        `retrying in ${DELAY_MS / 1000}s…`,
    );
    sleep(DELAY_MS);
  }
}
