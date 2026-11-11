import { defineConfig } from "drizzle-kit"

// The project doesn't load Node's types, so app code can't use Node globals
// by accident. This config runs in Node, so it declares the part it uses.
declare const process: { env: Record<string, string | undefined> }

// drizzle-kit doesn't load `.env` itself. The npm scripts pass
// `--env-file-if-exists=.env`; elsewhere (CI) the variable comes from the shell.
const url = process.env.DATABASE_URL

if (url === undefined || url === "") {
  throw new Error("Missing DATABASE_URL. Add it to .env (see .env.example).")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
