import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Logs in once and stores storage state for dependent specs.
 * Requires E2E_EMAIL / E2E_PASSWORD against a reachable API.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  setup.skip(!email || !password, "E2E_EMAIL and E2E_PASSWORD are required");

  await page.goto("/login");
  await page.getByLabel("Username").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});
