import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema",
  out: "./src/local-migrations",
  dialect: "sqlite",
  driver: "expo",
});
