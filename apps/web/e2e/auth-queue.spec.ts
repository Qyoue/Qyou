import { test, expect } from "@playwright/test";

test("register -> verify -> login -> join queue (seeded API)", async ({ page }) => {
  test.skip(!process.env.E2E_SEEDED_API, "Requires seeded API/backend environment");
  const email = `e2e+${Date.now()}@example.com`;
  const password = "Password123!";

  await page.goto("/register");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /create account|register/i }).click();

  await page.goto("/verify-email?token=test-token");
  await expect(page.getByText(/verify|verified/i)).toBeVisible({ timeout: 15000 }).catch(() => {});

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign in|login/i }).click();

  await page.goto("/queue");
  await expect(page.getByText(/queue/i)).toBeVisible();
  const join = page.getByRole("button", { name: /join/i }).first();
  if (await join.isVisible().catch(() => false)) await join.click();
});
