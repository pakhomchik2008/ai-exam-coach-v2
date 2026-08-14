// Landing → demo → Learn tree. No AI. If this dies, the app is blank
// for a first-time visitor.

import { expect, test } from "@playwright/test";

test("landing shows the demo CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Forecast your score/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo, no account" }).first()).toBeVisible();
});

test("demo onboarding reaches the IELTS Learn tree", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Demo, no account" }).first().click();

  await expect(page.getByText("Which exam are you preparing for?")).toBeVisible();
  await page.getByRole("button", { name: /IELTS/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByText("When is it?")).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByText("What are you aiming for?")).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByText("How much can you study a day?")).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();

  await expect(page.getByText("Save your plan")).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();

  await expect(page.getByRole("button", { name: "Start studying →" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Start studying →" }).click();

  await page.getByRole("button", { name: /^Learn$/ }).click();
  await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible();
  await expect(page.getByText("Understanding gist and main ideas")).toBeVisible();
});
