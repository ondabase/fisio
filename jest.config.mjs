import expoPreset from "jest-expo/jest-preset.js"

/*
 * Three Jest projects:
 * - app: React Native code, with the jest-expo preset.
 * - server: API and server code in plain Node. The jest-expo preset
 *   resolves packages the React Native way, which gives server libraries
 *   (such as Neon's driver) their non-Node builds.
 * - integration: server tests against a real database. Not part of
 *   `npm test`; run with `npm run test:integration`.
 *
 * The server projects reuse jest-expo's Babel transform and path aliases,
 * so TypeScript and `@/` imports work the same everywhere.
 */
const server = {
  testEnvironment: "node",
  transform: expoPreset.transform,
  transformIgnorePatterns: expoPreset.transformIgnorePatterns,
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
}

export default {
  projects: [
    {
      displayName: "app",
      preset: "jest-expo",
      testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/server/"],
    },
    {
      ...server,
      displayName: "server",
      testMatch: ["<rootDir>/src/server/**/*.test.ts"],
      testPathIgnorePatterns: ["/node_modules/", "\\.integration\\.test\\.ts$"],
    },
    {
      ...server,
      displayName: "integration",
      testMatch: ["<rootDir>/src/server/**/*.integration.test.ts"],
    },
  ],
}
