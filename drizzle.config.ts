import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_MIGRATION_URL or DATABASE_URL is not set. See .env.example.",
  );
}

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  schemaFilter: ["crm"],
  migrations: {
    schema: "crm",
    table: "__crm_migrations",
  },
  dbCredentials: {
    url: databaseUrl,
  },
});
