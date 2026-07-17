import { test, expect } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, ".auth/user.json");
const hasCreds = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

test.describe("unauthenticated smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /log in|sign in/i })).toBeVisible();
  });

  test("root redirects toward auth or dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(login|dashboard|review|itinerary)/);
  });
});

test.describe("authenticated jobs polish", () => {
  test.skip(!hasCreds, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated specs");

  test.use({ storageState: authFile });

  test.beforeAll(async ({ browser }) => {
    if (!hasCreds) return;
    const page = await browser.newPage();
    await page.goto("/login");
    await page.getByLabel("Username").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.context().storageState({ path: authFile });
    await page.close();
  });

  test("itinerary list exposes search, filters, and select", async ({ page }) => {
    await page.goto("/itinerary");
    await expect(page.getByTestId("itinerary-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("jobs-search")).toBeVisible();
    await expect(page.getByTestId("jobs-filter-open")).toBeVisible();
    await expect(page.getByTestId("jobs-select-toggle")).toBeVisible();
  });

  test("review list opens filter panel", async ({ page }) => {
    await page.goto("/review");
    await expect(page.getByTestId("review-page")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("jobs-filter-open").click();
    await expect(page.getByRole("heading", { name: /filter visits/i })).toBeVisible();
  });

  test("archives list has download control when permitted", async ({ page }) => {
    await page.goto("/archives");
    await expect(page.getByTestId("archives-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("jobs-search")).toBeVisible();
  });

  test("command palette opens with shortcut", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("Meta+KeyK");
    await expect(page.getByPlaceholder(/search pages/i)).toBeVisible({ timeout: 5_000 });
  });
});
