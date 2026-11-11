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

   After the first build, `npx expo start` is enough until native dependencies change.

## Checks

```bash
npm run check   # typecheck and lint
npm test        # Jest
```

CI runs both on every pull request and on pushes to `main` ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

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
