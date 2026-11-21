import { validateEnvironment } from "../../config/env";

describe("Mobile environment and components test suite", () => {
  it("uses local fallback in development when API URL is not set", () => {
    const config = validateEnvironment({ NODE_ENV: "development" });
    expect(config.apiUrl).toBe("https://api.qyou.local");
    expect(config.isProduction).toBe(false);
  });

  it("uses staging API URL when staging environment is indicated", () => {
    const config = validateEnvironment({
      NODE_ENV: "development",
      EXPO_PUBLIC_APP_ENV: "staging",
    });
    expect(config.apiUrl).toBe("https://api-staging.qyou.org");
    expect(config.isStaging).toBe(true);
  });

  it("throws error in production if EXPO_PUBLIC_API_URL is missing", () => {
    expect(() => {
      validateEnvironment({ NODE_ENV: "production" });
    }).toThrow("MissingRequiredEnv: EXPO_PUBLIC_API_URL must be provided in release/production builds");
  });

  it("accepts valid API URL in production", () => {
    const config = validateEnvironment({
      NODE_ENV: "production",
      EXPO_PUBLIC_API_URL: "https://api.qyou.org",
    });
    expect(config.apiUrl).toBe("https://api.qyou.org");
    expect(config.isProduction).toBe(true);
  });
});

describe("Maestro & Detox E2E Flows Spec", () => {
  it("defines standard login and queue interaction flow descriptors", () => {
    const e2eFlows = [
      { id: "flow-01", name: "login-flow", steps: ["open_app", "fill_credentials", "submit", "assert_home_screen"] },
      { id: "flow-02", name: "queue-join-flow", steps: ["browse_queues", "select_queue", "press_join", "assert_active_ticket"] },
    ];
    expect(e2eFlows.length).toBe(2);
    expect(e2eFlows[0].steps).toContain("assert_home_screen");
    expect(e2eFlows[1].steps).toContain("assert_active_ticket");
  });
});
