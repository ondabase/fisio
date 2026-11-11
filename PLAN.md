# Fisio — MVP Plan

This is the single source of truth for the Fisio MVP. Part 1 is the agreed specification: what we're building and why. Part 2 is the implementation plan: the order we'll build it in. We implement one milestone at a time and tick it off below.

## Progress
- [ ] M0 — Foundations
- [ ] M1 — Auth, onboarding, user record
- [ ] M2 — Clinical content model + engine + vignettes
- [ ] M3 — Body map
- [ ] M4 — Assessment end to end
- [ ] M5 — Program, session player, video, offline
- [ ] M6 — Check-ins, adjustment, progress, reminders
- [ ] M7 — Billing & gating
- [ ] M8 — Privacy, observability, deletion
- [ ] M9 — Release hardening

---

## Part 1 — Specification


### Context
Fisio is a mobile app (iOS and Android) that offers on-demand, automated physical-therapy guidance for **non-specific low back pain (LBP)** in the **US**. A user marks where it hurts on a body map and answers a PT-authored adaptive assessment. Before any exercise is offered, the user goes through deterministic safety screening. Users who pass receive a PT-authored recovery program that adapts each week within clinical rules. This document records the decisions from the interview so implementation planning can start without guesswork. **No code or schema has been written yet.**

Repo baseline (verified 2026-11-09): Expo SDK ~58.0.23, RN 0.88.1, React 19.3, TS ~6.0, expo-router ~58.0.30 (routes in `src/app/`), @expo/ui ~58, NativeWind 5.0.0-rc.0 + Tailwind 4.1.12, cva/clsx/tailwind-merge, existing Button component, npm. Conventions are in `AGENTS.md`, `docs/code-style.md`, and `docs/ui-components.md`.

### 1. Product & scope
- **User:** US adult (18+) with back pain who wants guided self-care without booking a PT.
- **Must do well:** a safe, trustworthy triage that leads to a clear daily program that's easy to follow.
- **Positioning:** wellness/education first. No diagnostic labels ("back pain exercise program", not "lumbar strain"). Not a replacement for a clinician.
- **In MVP:** Google sign-in, consent, body map (back + leg radiation zones), deterministic adaptive LBP assessment, tiered safety screening, track/phase program, guided exercise sessions with video, offline session logging, weekly check-ins plus rule-based adjustment, progress charts, local reminders, subscription (free through week 1), account deletion.
- **Out of MVP:** LLM features, other body regions/conditions, human PT chat or telehealth, video download, Apple Health/Google Fit, admin CMS, web app, i18n translation (strings stay i18n-ready), social features, wearables.

### 2. Core flows
1. **First launch:** value carousel → Clerk Google sign-in → explicit health-data consent (versioned) plus age gate (18+) → short onboarding profile (only fields the PT confirms are clinically needed).
2. **Assessment (full-screen modal):** body map (front/back, multi-select) → adaptive questions from the PT graph → result.
   - Urgent red flag (e.g. saddle anesthesia, bladder/bowel change) → **stop immediately**, show emergency screen with a call-911 action.
   - Non-urgent concern → finish, then show "see a clinician before starting" plus general education. Program stays locked until a later reassessment clears it.
   - Eligible → result explanation and program overview.
3. **Program:** engine selects track and starting phase → Today shows that day's session → session player (video via expo-video, sets/reps/hold timers, stop rules) → mark done (optimistic, queued offline) → pain rating afterward.
4. **Weekly check-in:** short questionnaire plus red-flag re-screen → progress / hold / regress / stop-and-refer. Worsening never increases difficulty.
5. **Paywall:** after week 1 → RevenueCat paywall with a 7-day trial. Safety outcomes and education are never gated.
6. **Profile:** account, consent, notification preferences, subscription, export/delete data, help, disclaimers, sign out.

**Navigation (NativeTabs):** Today / Program / Progress / Profile. Assessment, session player, check-in, and paywall open as modal stacks above the tabs.

### 3. Architecture
- **Client:** Expo + Expo Router + NativeTabs, NativeWind 5 with custom cva-based components and design tokens (light mode only for now), TanStack Query with a persisted cache, Clerk Expo SDK, react-native-svg + Gesture Handler + Reanimated for the body map, expo-video, expo-notifications (local reminders), RevenueCat SDK, Sentry.
- **API:** Expo Router API routes (`+api.ts`) deployed to **EAS Hosting** (Cloudflare Workers runtime). Every route verifies the Clerk session JWT (`@clerk/backend`) and scopes every query by the internal `user_id`. Zod validates inputs.
- **DB:** Neon Postgres (US region), accessed only from the API through **Drizzle ORM + Neon HTTP driver**. drizzle-kit SQL migrations.
- **Clinical engine:** a pure TS module with no I/O (e.g. `src/clinical/`), shared by client and server. The client runs it against a pinned content version for instant flow. **The server re-runs it on the full answer set at submit, and that result is final.** The server also records the content version and rule trace.
- **Content:** content-as-code (typed TS/JSON, schema-validated) for the question graph, red-flag rules, tracks/phases, exercises, copy, and Stream video IDs. A publish script writes an **immutable `content_version`** to Neon and generates a human-readable review doc that the PT signs. Only approved versions are served.
- **Video:** Cloudflare Stream (HLS, signed playback URLs issued by the API).
- **Billing:** RevenueCat. Its webhook calls an API route that updates `entitlements`. The API enforces gating server-side.
- **Observability:** Sentry (app and API) with allowlist scrubbing, so no answers, pain scores, or regions are sent. Safety, funnel, and adherence metrics are computed first-party from Neon. No third-party product analytics.

### 4. Data model (draft)
- `users`: id (uuid), clerk_user_id (unique), created_at, consent_version, consented_at, timezone, onboarding fields TBD by the PT (e.g. age band), deleted_at for in-flight deletion only.
- `content_versions`: id, version (unique), status (draft/approved/retired), bundle (jsonb, immutable), checksum, approved_by, approved_at.
- `assessments`: id, user_id, content_version_id, body_regions (text[]), status (in_progress/completed/abandoned), outcome (eligible/refer/urgent), track_id, start_phase, engine_trace (jsonb), started_at, completed_at.
- `assessment_answers`: assessment_id, question_id, value (jsonb), answered_at. Unique on (assessment_id, question_id).
- `safety_flags`: assessment_id or check_in_id, rule_id, severity.
- `programs`: id, user_id, assessment_id, content_version_id, track_id, current_phase, status (active/paused/completed/stopped_referred), started_at, ended_at. At most one active program per user (partial unique index).
- `program_adjustments`: program_id, check_in_id, from_phase, to_phase, decision, rule_id, created_at.
- `session_logs`: id (**client-generated uuid for idempotent offline sync**), program_id, scheduled_date, completed_at, pain_after (0–10).
- `exercise_logs`: session_log_id, exercise_id, completed, sets_done.
- `check_ins`: id, user_id, program_id, content_version_id, answers (jsonb), pain_nrs, outcome, created_at.
- `entitlements`: user_id (unique), status, product_id, expires_at, rc_app_user_id, updated_at.
- `safety_aggregates`: content_version_id, rule_id, outcome, period, count. **No user link; survives deletion.**

Deletion: in-app request → delete the Clerk user and all of that user's rows (cascade). Aggregates are kept. Data export is offered as JSON.

### 5. Environments & delivery (ASSUMED defaults)
- Environments: dev, preview, and prod. Neon branch per environment, Clerk dev/prod instances, EAS build profiles (development, preview, production), EAS Update channels, EAS Hosting preview/prod deploys.
- CI: `npm run check`, unit tests, and clinical vignette tests on every PR. Content publish is blocked unless all vignettes pass.
- Solo developer, no hard deadline. Plan in milestones.

### 6. Quality bar (definition of done)
- 100% branch coverage of engine rule and red-flag logic.
- 30–50 PT-authored vignettes run as golden tests.
- PT sign-off on every published content version.
- Regulatory-counsel opinion and privacy policy reviewed before public launch.
- Passes `npm run check`. Accessibility: Dynamic Type, screen-reader labels on the body map and controls, and 44pt targets.

### Decisions log
D1 US/English · D2 LBP only · D3 wellness-first + counsel · D4 no LLM in MVP · D5 sign-in before assessment, consent at onboarding · D6 Expo API routes on EAS Hosting, pure-TS engine · D6a local-notification reminders · D7 custom SVG body map · D8 content-as-code + signed review doc · D9 tracks × phases + weekly rules · D10 Cloudflare Stream · D11 Today/Program/Progress/Profile tabs · D12 free through week 1 → 7-day trial · D13 RevenueCat · D14 hard delete + unlinked aggregates · D15 Drizzle + Neon HTTP · D16 TanStack Query · D17 offline sessions, online assessment · D18 Sentry + first-party metrics · D19 shared engine, server authoritative · D20 tiered immediate red-flag stop · D21 solo, no deadline · D22 vignettes + full branch coverage

### ASSUMPTIONS (not firmly answered)
- A1 PT = part-time clinical lead (~5–15 h/wk): authors or approves the graph, red flags, tracks, exercises, and vignettes; reviews videos; signs versions.
- A2 Users are 18+ and US-only (age gate; store availability limited to US).
- A3 Onboarding collects only PT-confirmed clinically needed fields (likely an age band; no name beyond Clerk's, no address).
- A4 Environments/CI as in §5.
- A5 Exercise videos are recorded by or with the PT; a designer produces the body-map SVG and brand.
- A6 Prices and trial length are set later in RevenueCat and App Store Connect / Play Console.
- A7 Accessibility: WCAG-equivalent basics as in §6; no formal audit for MVP.

### OPEN RISKS / unknowns
- R1 **Regulatory:** condition-specific triage plus program assignment sits near the FDA SaMD line. The wellness posture depends on counsel's opinion and may force copy or feature changes.
- R2 **PT bandwidth** is undefined. Content, vignettes, videos, and sign-off are the critical path.
- R3 **Consumer health data laws** (FTC HBNR, WA MHMDA, NV, CT, etc.): consent flows, privacy policy, and vendor DPAs (Clerk, Neon, Cloudflare, Sentry, RevenueCat) need legal review.
- R4 **Liability:** missed red flags. Mitigated by conservative rules, vignettes, and disclaimers. Needs insurance and terms review.
- R5 **Single-condition retention:** needs maintenance-phase and education content to justify a subscription.
- R6 **NativeWind 5 is a release candidate.** Breaking changes are possible.
- R7 **EAS Hosting (Workers) limits:** cron/background-job support, CPU time, and Node API compatibility for the Clerk, Drizzle, and Neon SDKs need checking against current docs before planning.
- R8 **App Store review** for health apps: medical claims and disclaimers, in-app deletion, and IAP rules. Possible rejection loops.
- R9 **Sign-in-first friction** may hurt top-of-funnel conversion. Revisit with data.

### To verify against current docs during implementation planning
Expo SDK 58 NativeTabs API, EAS Hosting runtime and cron, Clerk Expo SDK (Google SSO on iOS/Android), `@clerk/backend` on Workers, Drizzle + `@neondatabase/serverless` on Workers, RevenueCat Expo integration, Cloudflare Stream signed URLs + expo-video, expo-notifications scheduling, Sentry Expo SDK.

---

## Part 2 — Implementation Plan


### Verified platform facts (checked 2026-11-09)
- **NativeTabs**: import from `expo-router/native-tabs` (SDK 58; the `unstable-` prefix is gone). Tabs are declared statically with `NativeTabs.Trigger`, `.Label`, `.Icon` (`sf` / `md`), `.Badge`. Android allows at most 5 tabs. Native tabs can't be nested. Toggling a tab's `hidden` remounts the navigator. FlatList scroll-to-top and minimize don't work.
- **EAS Hosting**: Cloudflare Workers runtime. Partial Node compatibility (`crypto`, `buffer`, client `http`/`tls` are available; anything unlisted is unavailable). **No cron or scheduled jobs.** Every deployment is immutable with a preview URL, and aliases are used for staging and prod.
  - The MVP needs no cron: reminders are local notifications, safety aggregates are incremented inside the same transaction as the write, and entitlements are pushed by the RevenueCat webhook.
  - If a schedule is needed later: an EAS Workflows or GitHub Actions cron that calls a secret-protected route.
- **Clerk**: package `@clerk/expo`. Native Google sign-in (`<AuthView />` or the native Google hook) **requires a development build**, so Expo Go is not an option from M1 onward. Native setup needs Google iOS, Android, and Web client IDs.
- **Neon**: use the `@neondatabase/serverless` HTTP driver (fetch-based, fits Workers) with `drizzle-orm/neon-http`. Multi-statement transactions go through the driver's `transaction()` batch API. Keep each write a single batch.

### Library decisions to confirm (new, not in the spec)
I'm recommending these. Each is confirmed at the start of the milestone that first needs it.

| Need | Recommendation | Why |
|---|---|---|
| Validation (content schema, API I/O) | `zod` | Schemas shared by client, server, and content tooling |
| Test runner | `jest-expo` | Expo's standard; handles RN components and pure TS |
| Secure token cache (Clerk) | `expo-secure-store` | Expo module, Keychain/Keystore |
| Persisted query cache + offline outbox | `expo-sqlite` (kv-store) | Expo module, durable, no extra vendor |
| Charts (Progress) | Custom with `react-native-svg` | Already needed for the body map; a few simple line and bar charts |
| SVG | `react-native-svg` | Body map, charts |

### Target structure
```
src/
  app/                         # routes only
    _layout.tsx                # providers (Clerk, Query, Sentry) + auth/onboarding gate
    (auth)/welcome.tsx             # Google sign-in happens here; no separate sign-in screen
    onboarding/consent.tsx, profile.tsx   # a plain folder: a (group) would clash with the Profile tab's /profile URL
    (app)/_layout.tsx          # Stack: tabs + modals
    (app)/(tabs)/_layout.tsx   # NativeTabs: today, program, progress, profile
    (app)/assessment/          # modal stack: body-map, question/[id], result
    (app)/session/[id].tsx     # session player (full-screen modal)
    (app)/check-in.tsx, paywall.tsx
    api/**/+api.ts             # thin handlers → src/server
  server/                      # db (drizzle schema, client), auth (Clerk verify), services
  clinical/                    # PURE TS, no I/O, no RN imports
    engine/                    # graph walker, rule evaluator, program selector, adjuster
    schema/                    # zod schemas for the content bundle
    content/lbp/               # authored content (placeholder until the PT signs)
    vignettes/                 # golden scenarios + runner
  features/                    # client feature modules (assessment, program, progress, …)
  components/ui/               # design-system primitives (existing)
  lib/                         # api client, query client, storage, utils (existing)
scripts/                       # content publish + review-doc generator
```
Rule: `src/clinical` must never import from `react-native`, `expo-*`, or `src/server`. An ESLint restricted-imports rule enforces this.

### Milestones

#### M0 — Foundations
- Design tokens in `src/styles/global.css`: color roles (including safety colors: urgent, caution, success), type scale, spacing, radii. Light mode only for now (dark mode deferred). Primitives: Text, Card, Screen, ListRow, ProgressBar, Chip/Option, Sheet. Use `@expo/ui` for native controls (pickers, switches, sliders).
- Remove the `demo/` route. Set up the route skeleton above with placeholder screens. NativeTabs with 4 tabs and SF/Material icons.
- Env handling (`EXPO_PUBLIC_*` client vars only for public keys). `eas.json` profiles: development, preview, production.
- jest-expo with a first test. CI (GitHub Actions or EAS Workflows): `npm run check` plus tests.
- **Done when**: a dev build runs on iOS and Android with tabs and modal routes (light mode only).

#### M1 — Auth, onboarding, user record
- Neon project with dev, preview, and prod branches. Drizzle schema: `users`. drizzle-kit migrations.
- `src/server/auth.ts`: verify the Clerk session token (`@clerk/backend` `verifyToken`/`authenticateRequest`), resolve the internal user, return 401 otherwise. Every handler goes through `withUser()`.
- Clerk Expo: Google sign-in, secure token cache. API client attaches `getToken()`.
- Root gate: signed out → welcome. Signed in without consent → onboarding. Otherwise → tabs.
- Consent screen: versioned consent text and an 18+ attestation, stored server-side (`POST /api/me/consent`).
- **Done when**: a fresh install signs in with Google on both platforms, consents, and lands on Today. A row exists in Neon. Requests without a token are rejected.

#### M2 — Clinical content model + engine + vignettes (core, highest care)
- Zod schema for the content bundle: regions, questions (single/multi/scale/body-zone), branching edges (predicate → next), red-flag rules (severity: urgent/refer, early-stop), eligibility rules, tracks → phases → sessions → exercises (dosing, cues, stop rules, Stream video ID), check-in rules (progress/hold/regress/stop), copy.
- Engine (pure functions):
  - `nextStep(bundle, answers) → question | earlyStop | complete`
  - `evaluate(bundle, answers) → { outcome, flags[], trackId, startPhase, trace[] }`
  - `adjust(bundle, program, checkIn) → { decision, toPhase, ruleId, flags[] }`
  - Fully deterministic. The trace lists every rule that fired.
- Predicate language: a small JSON DSL (`all` / `any` / `not`, `eq` / `in` / `gte` on answer IDs), interpreted by the engine. No `eval`. The PT can read it.
- Placeholder LBP content drafted from published guidance, **marked DRAFT / not clinically approved** until the PT replaces or signs it.
- Vignette runner: `vignettes/*.json` (answers → expected outcome, flags, track) run in jest. Branch-coverage threshold set to 100% for `clinical/engine`.
- `scripts/publish-content.ts`: validates, runs vignettes, computes a checksum, inserts an immutable `content_versions` row (draft), and generates a review doc (Markdown/PDF) for the PT. `scripts/approve-content.ts` records approver and timestamp.
- **Done when**: vignettes pass, coverage is 100%, a draft version is published to dev Neon, and the review doc is generated.

#### M3 — Body map
- A designer supplies front/back SVGs with region paths whose IDs match the region IDs in the content bundle (lumbar, buttock L/R, thigh posterior L/R, below-knee L/R, …).
- `features/body-map`: `react-native-svg` paths, Gesture Handler tap hit-testing, Reanimated highlight, front/back toggle, multi-select, haptics. Accessibility: each region is a labeled button, with a list fallback.
- **Done when**: selection works smoothly on both platforms and works with VoiceOver and TalkBack.

#### M4 — Assessment end to end
- `GET /api/content/current` returns the approved bundle (cached client-side by version). `POST /api/assessments` creates an in-progress row pinned to the version.
- The client walks `nextStep` locally with a one-question-per-screen UI and a progress indicator, and saves answers incrementally (`PUT /api/assessments/:id/answers`).
- Early stop on urgent: emergency screen (call 911 via `Linking`, no paywall, no program). This is also recorded server-side.
- `POST /api/assessments/:id/submit`: the server re-runs `evaluate`, persists outcome, flags, and trace, creates the program if eligible, and increments `safety_aggregates`. **If client and server outcomes disagree, the server wins and the event is logged** (no health data in the log).
- Result screens for eligible, refer, and urgent. Only non-diagnostic copy.
- **Done when**: every vignette replayed through the UI on a device yields the expected screen, and DB rows match.

#### M5 — Program, session player, video, offline
- Tables: `programs`, `session_logs`, `exercise_logs`. `GET /api/program/today`.
- Today tab: the next action (session, check-in, or reassessment). Program tab: phases, sessions, exercise library.
- Session player: expo-video with a Cloudflare Stream HLS URL signed by `GET /api/videos/:id/token`, set/rep counter, hold timer, stop-rules sheet, post-session pain rating.
- Offline: persisted TanStack Query cache in expo-sqlite. Completions are written to an outbox with client UUIDs and replayed in order on reconnect. Server upserts are idempotent.
- **Done when**: a session can be completed in airplane mode and syncs exactly once on reconnect.

#### M6 — Check-ins, adjustment, progress, reminders
- Weekly check-in modal (includes the red-flag re-screen) → `POST /api/check-ins` → the server runs `adjust`, writes `program_adjustments`, and updates the phase. Worsening or a flag triggers hold/regress or stop-and-refer.
- Progress tab: pain trend, adherence, sessions completed, phase milestones. Custom SVG charts.
- expo-notifications local reminders (session time, weekly check-in). Permission requested in context, not at launch.
- **Done when**: vignette-style check-in scenarios produce the expected adjustment end to end.

#### M7 — Billing & gating
- RevenueCat (`react-native-purchases`), with `appUserID` set to the internal user ID. Webhook → `POST /api/webhooks/revenuecat` (shared-secret auth) → `entitlements`.
- Server-side gating: sessions after week 1 require an active entitlement. Assessments, safety results, check-in red-flag screening, and education are always free.
- Paywall modal with trial copy, plus restore purchases.
- **Done when**: sandbox purchase, trial, expiry, and restore work on both stores, and the server rejects gated requests without an entitlement.

#### M8 — Privacy, observability, deletion
- Sentry (app and API): `beforeSend` allowlist, no breadcrumbs carrying request bodies, user identified by internal ID only.
- Profile: export data (JSON), delete account (`DELETE /api/me` → cascade delete, then Clerk user deletion; aggregates kept).
- Internal metrics: SQL views and a protected `GET /api/admin/metrics` (or a Neon SQL dashboard) covering funnel, red-flag rates per rule and version, adherence, and pain deltas.
- **Done when**: deletion leaves no user rows (verified by test), and a Sentry event inspection shows no health fields.

#### M9 — Release hardening
- Accessibility pass (Dynamic Type, screen reader, contrast, 44pt targets). Empty, error, and slow-network states on every screen.
- EAS production builds, store listings with health disclaimers, privacy nutrition labels / Data safety form, in-app deletion link, US-only availability.
- TestFlight / internal testing with the PT running every vignette by hand.
- **Done when**: the PT signs content v1.0, counsel signs off on copy and privacy policy, and store review passes.

### Parallel non-engineering track (start now — critical path)
1. **PT**: confirm hours. Deliver the LBP red-flag list, question graph, 2–3 tracks × phases, exercise list with cues, and 30–50 vignettes (needed for M2 and M4).
2. **Regulatory counsel**: FDA wellness vs SaMD opinion on the flow. Review copy, terms, and privacy policy (needed before M9; earlier is better).
3. **Designer**: brand, tokens, body-map SVG with region IDs (needed by M0 and M3).
4. **Video production**: record exercises once the PT's exercise list is fixed (needed for M5).
5. **Vendor DPAs**: Clerk, Neon, Cloudflare, Sentry, RevenueCat.

### Verification approach
- `npm run check` and jest on every change. The engine has 100% branch coverage and all vignettes must pass, enforced in CI and in `publish-content`.
- API handlers get integration tests against a Neon dev branch: auth required, user isolation (user A can't read user B), idempotent sync.
- Manual device runs per milestone on an iOS and an Android dev build.
