import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
    "^../../certs/ap-southeast-2-bundle.pem$":
      "<rootDir>/src/certs/ap-southeast-2-bundle.pem",
    "^.+\\.(pem|crt)$": "<rootDir>/test/mocks/certificateMock.js",
  },
  transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$))"],
  globalSetup: "<rootDir>/test/setup.ts",
  globalTeardown: "<rootDir>/test/teardown.ts",
};

export default config;
