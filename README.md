# Fisio

Guided, PT-authored recovery programs for low back pain. An [Expo](https://expo.dev) app for iOS and Android. See [PLAN.md](./PLAN.md) for the spec and milestones, and [AGENTS.md](./AGENTS.md) for conventions.

## Get started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables. Copy the template, then fill it in (`npx clerk@latest env pull` writes the Clerk keys):

   ```bash
   cp .env.example .env
   ```

3. Build and run a development build. The app uses native modules, so Expo Go is not supported.

   ```bash
   npx expo run:ios       # or: npx expo run:android
   ```

   After the first build, `npx expo start` is enough until native dependencies change. Restart it after editing `.env`: variables are read at startup.

## API and database

API routes live in `src/app/api/` as `+api.ts` files and run on the dev server (`npx expo start`) locally, then on EAS Hosting. They're thin: each wraps its handler in `withUser()` ([src/server/auth.ts](src/server/auth.ts)), which verifies the Clerk session and resolves the internal user. Server code lives in `src/server/` and can't be imported from app code (an ESLint rule enforces this); shared request and response schemas live in `src/lib/contracts/`.

The database is Neon Postgres, accessed with Drizzle. The schema is [src/server/db/schema.ts](src/server/db/schema.ts):

```bash
npm run db:generate -- --name <change>   # write a migration from schema changes
npm run db:migrate                       # apply pending migrations to DATABASE_URL
npm run db:studio                        # browse the database
```

Commit the generated `drizzle/` files. Never edit a migration that has already been applied.

## Checks

```bash
npm run check              # typecheck and lint
npm test                   # Jest: app and server unit tests
npm run test:integration   # API tests against the database in DATABASE_URL
```

CI runs `check` and `test` on every pull request and on pushes to `main` ([.github/workflows/ci.yml](.github/workflows/ci.yml)). Integration tests need a database, so they run locally against the Neon dev branch for now.

## EAS builds

Build profiles live in [eas.json](./eas.json):

| Profile | Use | Distribution |
|---|---|---|
| `development` | Dev client for devices | Internal |
| `development-simulator` | Dev client for the iOS Simulator | Internal |
| `preview` | Release build for testers | Internal |
| `production` | Store build (build number auto-increments) | Store |

Each profile reads EAS environment variables from the matching environment (`development`, `preview`, `production`). Local `.env` files are not uploaded, so set the variables in [.env.example](./.env.example) on EAS for each environment:

```bash
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value <key> --visibility plaintext
npx eas-cli@latest build --profile development --platform ios
```
