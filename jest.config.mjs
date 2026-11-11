import expoPreset from "jest-expo/jest-preset.js"

/*
 * Jest projects:
 * - app: React Native code, with the jest-expo preset.
 * - server: API and server code in plain Node. The jest-expo preset
 *   resolves packages the React Native way, which gives server libraries
 *   (such as Neon's driver) their non-Node builds.
 * - clinical: the pure clinical engine, content, and vignettes, in plain Node.
 * - integration: server tests against a real database. Not part of
 *   `npm test`; run with `npm run test:integration`.
 *
 * The Node projects reuse jest-expo's Babel transform and path aliases, so
 * TypeScript and `@/` imports work the same everywhere.
 */
const node = {
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
      resolver: "<rootDir>/jest.resolver.cjs",
      setupFiles: [...expoPreset.setupFiles, "<rootDir>/jest.setup.app.ts"],
      testPathIgnorePatterns: ["/node_modules/", "<rootDir>/src/server/", "<rootDir>/src/clinical/"],
    },
    {
      ...node,
      displayName: "server",
      testMatch: ["<rootDir>/src/server/**/*.test.ts"],
      testPathIgnorePatterns: ["/node_modules/", "\\.integration\\.test\\.ts$"],
    },
    {
      ...node,
      displayName: "clinical",
      testMatch: ["<rootDir>/src/clinical/**/*.test.ts"],
    },
    {
      ...node,
      displayName: "integration",
      testMatch: ["<rootDir>/src/server/**/*.integration.test.ts"],
    },
  ],
  // Applies with `--coverage` (`npm run test:clinical`). The engine decides
  // safety outcomes, so every branch must be exercised (PLAN.md §6).
  collectCoverageFrom: ["<rootDir>/src/clinical/**/*.ts", "!<rootDir>/src/clinical/**/*.test.ts"],
  coverageThreshold: {
    "./src/clinical/engine/": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
}
