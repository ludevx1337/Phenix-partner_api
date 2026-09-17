import { test, expect } from "@playwright/test";

test.describe("auth", () => {
  test("page login affiche le formulaire", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
  });
});
