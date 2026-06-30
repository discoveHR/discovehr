import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "components/tpo-dashboard/TpoHomePanel.tsx",
    "components/tpo-dashboard/TpoSidebar.tsx",
    "components/tpo-dashboard/TpoStudentsPanel.tsx",
    "components/tpo-dashboard/utils.ts",
    "components/common/MailerStatusBanner.tsx",
    "lib/api/tpo-student-search.ts",
    "lib/api/email.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: { lines: 80 },
  },
};

export default config;
