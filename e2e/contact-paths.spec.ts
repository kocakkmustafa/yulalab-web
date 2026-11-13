import { test, expect } from "@playwright/test";

/**
 * /contact#yollar audience paths (WEB-UX-05f). Closed-mode assertions: the
 * lead flag is read at build, default closed, so no form renders; the mail
 * links are the contact path. No sentence about capital or finished outside
 * client work belongs on /contact or /consulting (ADR-004 §8 #2).
 */
for (const [locale, prefix, sentence] of [
  ["tr", "", "İş ortaklığı ve yatırım görüşmeleri için bize yazın."],
  ["en", "/en", "Write to us for partnership and investment conversations."],
] as const) {
  test(`${locale} /contact audience paths`, async ({ page }) => {
    await page.goto(`${prefix}/contact`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const paths = page.locator("#yollar");
    await expect(paths).toHaveCount(1);
    await expect(paths.locator("[data-contact-path]")).toHaveCount(4);
    await expect(paths.getByText(sentence, { exact: true })).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(paths.locator('a[href="mailto:support@yulalab.com"]').first()).toBeVisible();
    await expect(paths.locator('a[href="mailto:yula@yulalab.com"]')).toHaveCount(1);
    await expect(paths.locator('a[href$="/consulting#consulting-contact"]')).toHaveCount(1);
    await expect(paths.locator('a[href$="/lab"]')).toHaveCount(1);
    await expect(paths.locator('a[href$="/transparency"]')).toHaveCount(1);
    // The partner row adds no channel of its own: no button, no form.
    await expect(paths.locator('[data-contact-path="partner"] :is(button, form, input)')).toHaveCount(0);
    await expect(page.getByText(/sermaye sağlamıyoruz|we do not provide capital/i)).toHaveCount(0);
  });

  test(`${locale} /consulting has no capital sentence`, async ({ page }) => {
    await page.goto(`${prefix}/consulting`);
    await expect(page.getByText(/sermaye sağlamıyoruz|we do not provide capital/i)).toHaveCount(0);
  });
}
