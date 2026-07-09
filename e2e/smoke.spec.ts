import { test, expect } from "../playwright-fixture";

// QA-P1: minimal production smoke. Playwright previously had zero specs.
// Point at a deployed preview via env (repo secrets in CI):
//   E2E_BASE_URL  — public marketing site (defaults to local marketing dev)
//   E2E_APP_URL   — authenticated customer app (optional; enables the noindex check)

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const APP_URL = process.env.E2E_APP_URL;

test("marketing homepage loads and is titled SellerSuit", async ({ page }) => {
  const res = await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  expect(res?.ok(), "homepage should return a 2xx/3xx response").toBeTruthy();
  await expect(page).toHaveTitle(/SellerSuit/i);
});

test("customer app is marked noindex (private surface)", async ({ page }) => {
  test.skip(!APP_URL, "Set E2E_APP_URL to run the app noindex check");
  await page.goto(APP_URL as string, { waitUntil: "domcontentloaded" });
  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute("content");
  expect(robots ?? "", "app must not be indexable").toContain("noindex");
});
