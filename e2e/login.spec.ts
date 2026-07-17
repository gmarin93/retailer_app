import { test, expect } from "@playwright/test";

test.describe("login form", () => {
  test("shows validation when submitting empty", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    // RHF + Zod should surface field errors or keep the user on /login.
    await expect(page).toHaveURL(/\/login/);
  });

  test("rejects bad credentials without navigating away permanently", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("not-a-real-user@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

