import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const run = (cmd, env = process.env) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
};

const rawDbUrl =
  process.env.DATABASE_URL && process.env.DATABASE_URL !== "file:./dev.db"
    ? process.env.DATABASE_URL
    : process.env.NETLIFY_DB_URL ||
      process.env.NETLIFY_DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      "";

const isPostgres =
  rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://");

const buildEnv = {
  ...process.env,
  ...(rawDbUrl ? { DATABASE_URL: rawDbUrl } : {}),
};

if (isPostgres) {
  console.log("[netlify-build] Detected PostgreSQL DATABASE_URL. Switching Prisma schema to PostgreSQL...");
  const pgSchemaPath = path.resolve("prisma/schema.postgres.prisma");
  const mainSchemaPath = path.resolve("prisma/schema.prisma");
  fs.copyFileSync(pgSchemaPath, mainSchemaPath);

  run("npx prisma generate", buildEnv);
  run("npx prisma db push --accept-data-loss", buildEnv);
  run("npx tsx prisma/apply-constraints.ts", buildEnv);

  // Check if Branch table already has records; seed only if empty
  let count = 0;
  try {
    const out = execSync(
      `node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.branch.count().then(c => { console.log(c); return p.$disconnect(); }).catch(() => process.exit(1));"`,
      { env: buildEnv, encoding: "utf8" }
    ).trim();
    count = Number.parseInt(out, 10) || 0;
  } catch {
    count = 0;
  }

  if (count === 0) {
    console.log("[netlify-build] Database is empty. Running initial demo seed...");
    run("npx tsx prisma/seed.ts", buildEnv);
  } else {
    console.log(`[netlify-build] Database already seeded (${count} branch found). Skipping seed.`);
  }
} else {
  console.log("[netlify-build] No PostgreSQL DATABASE_URL detected. Generating Prisma Client with default schema...");
  run("npx prisma generate", buildEnv);
}

run("npm run build", buildEnv);
