This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npm run check               # typecheck and lint (run this before finishing)
npm test                    # run the Jest suite (run this before finishing too)
npm run test:integration    # API tests against the Neon dev branch (run after server changes)
npm run lint:fix            # apply ESLint fixes
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm run check` and `npm test` before declaring any task done. Tests sit next to the code they cover as `*.test.ts(x)`, never inside `src/app/` (every file there is a route). Server tests live in `src/server/` and run in plain Node; database tests are named `*.integration.test.ts`. After changing server code, also run `npm run test:integration`. Use it rather than `npx expo lint`, which only lints JS and TS files in `src/`, `app/` and `components/`, and caches results between runs.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Hard Rules

These hold unless the current request explicitly says otherwise:

- **Git**: read-only `git` commands only (`status`, `diff`, `log`, `show`, etc). Never run commands that change the repo, index, or working tree.

## Code Style

Follow `docs/code-style.md` for import grouping, export placement, and type syntax. These are guidelines, not lint rules: `npm run check` will not flag them, so apply them yourself.

## UI Components

When creating or modifying reusable UI components:

- Read and follow `docs/ui-components.md`.
- Use the `create-ui-component` skill when available.
- Follow existing component conventions and design tokens.
- Do not introduce third-party UI component libraries.

Project-specific UI guidelines take precedence over generic component patterns.
