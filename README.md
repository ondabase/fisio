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

The assessment runs on both sides: the app runs the clinical engine for an instant flow and saves answers as it goes (`/api/assessments`), and at submit the server evaluates the saved answers itself. The server's result is final and is stored with its rule trace, safety flags, and anonymous monthly safety counts; an eligible result creates the user's program.

The API serves content from `content_versions`: only PT-approved versions, unless `CONTENT_CHANNEL=draft` (local development only), which also serves the newest draft. Draft content shows a DRAFT notice on every assessment screen.

The program screens work offline. Queries marked `meta: { persist: true }` (the user record, program, and content versions) are saved on the device with `expo-sqlite`, and a completed session goes to an on-device outbox first, then syncs when the API is reachable (at launch, on returning to the app, and every 30 seconds). Each session log has an app-generated ID that the server records once, so retries never duplicate it.

The database is Neon Postgres, accessed with Drizzle. The schema is [src/server/db/schema.ts](src/server/db/schema.ts):

```bash
npm run db:generate -- --name <change>   # write a migration from schema changes
npm run db:migrate                       # apply pending migrations to DATABASE_URL
npm run db:studio                        # browse the database
```

Commit the generated `drizzle/` files. Never edit a migration that has already been applied.

## Clinical content and engine

The assessment, safety screening, and program rules are data, not code: a content bundle per condition in `src/clinical/content/` (validated by `src/clinical/schema/`), interpreted by a pure TypeScript engine in `src/clinical/engine/` that the app and the API share. The engine never imports React Native, Expo, or server code (an ESLint rule enforces this), and every result carries a trace of the rules that fired.

> The current LBP content (`0.1.0-draft.*`) is a **DRAFT placeholder**, not clinically approved. The PT replaces or signs it before any user sees it.

Vignettes in `src/clinical/vignettes/` are scenarios with an expected result (outcome, red flags, track, starting phase, or check-in decision). They run as tests, and content can't be published unless all of them pass.

```bash
npm run test:clinical                        # engine, content, and vignette tests; the engine needs 100% coverage
npm run content:publish -- lbp --dry-run     # validate, run vignettes, and write the review doc
npm run content:publish -- lbp               # also store the version as an immutable draft in the database
npm run content:approve -- lbp 1.0.0 --by "Name, PT" --checksum <sha256>   # record the PT's sign-off
```

Publishing writes `content-reviews/<id>-<version>.md`: every question, branch, rule, track, exercise, and vignette result in plain language, with the version's checksum and a sign-off block. The PT signs that document, and approval needs the same checksum, so an approval always refers to exactly the content the PT read. A published version never changes (a database trigger enforces it); to change content, bump `version` in the bundle and publish again.

## Checks

```bash
npm run check              # typecheck and lint
npm test                   # Jest: app and server unit tests
npm run test:integration   # API tests against the database in DATABASE_URL
npm run test:clinical      # clinical engine with coverage (see above)
```

CI runs `check`, `test`, `test:clinical`, and a dry-run content publish on every pull request and on pushes to `main` ([.github/workflows/ci.yml](.github/workflows/ci.yml)). Integration tests need a database, so they run locally against the Neon dev branch for now.

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
