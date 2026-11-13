import { test, expect, type Page } from "@playwright/test";

/**
 * /contact lead form. The form is rendered server-side only when
 * LEADS_ENABLED=1 (default closed), so the two states are covered by
 * registering the matching describe block for the server's mode:
 *   default server          -> closed-state tests
 *   LEADS_ENABLED=1 server  -> open-state tests
 * The flag is read while /contact is prerendered, i.e. at `next build`, not at
 * `next start`: for the open-state tests run `LEADS_ENABLED=1 pnpm build` first,
 * then `LEADS_ENABLED=1 playwright test e2e/contact.spec.ts`. CI builds with the
 * default env, so it only runs the two closed-state tests (no skipped tests).
 * The network is always mocked; no database or mail is touched.
 */
const leadsOpen = process.env.LEADS_ENABLED === "1";

const MAIL = "support@yulalab.com";

async function fillValid(page: Page) {
  await page.getByLabel("Ad", { exact: true }).fill("Ada Test");
  await page.getByLabel("E-posta", { exact: true }).fill("ada@example.com");
  await page.getByLabel("Mesaj", { exact: true }).fill("Merhaba, bir sorum var.");
  await page.getByRole("checkbox").check();
}

if (!leadsOpen) {
  test.describe("contact (lead intake closed, default)", () => {
    test("tr: no form, mail path remains", async ({ page }) => {
      await page.goto("/contact");
      await expect(page.getByRole("heading", { level: 1, name: "İletişim" })).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.locator("[data-intake-language-notice]")).toHaveCount(0);
      await expect(page.locator(`a[href="mailto:${MAIL}"]`).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Projenizi konuşalım", exact: true })).toHaveAttribute("href", "/consulting#consulting-contact");
    });

    test("en: no form, mail path remains", async ({ page }) => {
      await page.goto("/en/contact");
      await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.locator(`a[href="mailto:${MAIL}"]`).first()).toBeVisible();
    });
  });
}

if (leadsOpen) {
  test.describe("contact (lead intake open)", () => {
    test("unsupported intake language shows the notice and no form", async ({ page }) => {
      await page.goto("/de/contact");
      await expect(page.locator("[data-intake-language-notice]")).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.locator(`a[href="mailto:${MAIL}"]`).first()).toBeVisible();
    });

    test("exposes labelled fields by role", async ({ page }) => {
      await page.goto("/contact");
      await expect(page.locator("form")).toBeVisible();
      await expect(page.getByLabel("Ad", { exact: true })).toBeVisible();
      await expect(page.getByLabel("E-posta", { exact: true })).toHaveAttribute("type", "email");
      await expect(page.getByLabel("Şirket (isteğe bağlı)")).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Konu" })).toBeVisible();
      await expect(page.getByLabel("Mesaj", { exact: true })).toBeVisible();
      await expect(page.getByRole("checkbox")).toBeVisible();
      await expect(page.getByRole("button", { name: "Gönder", exact: true })).toBeVisible();
      // Honeypot is hidden from assistive tech and the tab order.
      await expect(page.locator('[aria-hidden="true"] input[name="website"]')).toHaveAttribute("tabindex", "-1");
    });

    test("blocks submit without consent and never calls the API", async ({ page }) => {
      let calls = 0;
      await page.route("**/api/leads", async (route) => {
        calls++;
        await route.fulfill({ status: 201, json: { receiptId: "x" } });
      });
      await page.goto("/contact");
      await page.getByLabel("Ad", { exact: true }).fill("Ada Test");
      await page.getByLabel("E-posta", { exact: true }).fill("ada@example.com");
      await page.getByLabel("Mesaj", { exact: true }).fill("Merhaba");
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("Devam etmek için gizlilik bildirimini onaylaman gerekiyor.")).toBeVisible();
      expect(calls).toBe(0);
    });

    test("invalid email: server 400 maps to the email error", async ({ page }) => {
      let body: Record<string, unknown> | null = null;
      await page.route("**/api/leads", async (route) => {
        body = route.request().postDataJSON();
        await route.fulfill({ status: 400, json: { error: "email" } });
      });
      await page.goto("/contact");
      await fillValid(page);
      await page.getByLabel("E-posta", { exact: true }).fill("not-an-email");
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("E-posta adresi geçerli görünmüyor.")).toBeVisible();
      expect(body).toMatchObject({ email: "not-an-email", consent: true, locale: "tr" });
    });

    test("empty required field: server 400 maps to the field error", async ({ page }) => {
      await page.route("**/api/leads", (route) => route.fulfill({ status: 400, json: { error: "message" } }));
      await page.goto("/contact");
      await fillValid(page);
      await page.getByLabel("Mesaj", { exact: true }).fill("");
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("Mesaj boş olamaz; en fazla 4000 karakter.")).toBeVisible();
    });

    test("201 shows the receipt and replaces the form", async ({ page }) => {
      let body: Record<string, unknown> | null = null;
      await page.route("**/api/leads", async (route) => {
        body = route.request().postDataJSON();
        await route.fulfill({ status: 201, json: { receiptId: "rcpt-123" } });
      });
      await page.goto("/contact");
      await fillValid(page);
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("Mesajın kaydedildi.", { exact: false })).toBeVisible();
      await expect(page.getByText("Referans: rcpt-123")).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      expect(body).toMatchObject({ name: "Ada Test", email: "ada@example.com", message: "Merhaba, bir sorum var.", consent: true, website: "", locale: "tr" });
    });

    test("503 not_accepting_submissions shows the closed message", async ({ page }) => {
      await page.route("**/api/leads", (route) => route.fulfill({ status: 503, json: { error: "not_accepting_submissions" } }));
      await page.goto("/contact");
      await fillValid(page);
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("Form şu anda kapalı. Bu sayfadaki e-posta adresinden bize ulaşabilirsin.")).toBeVisible();
      await expect(page.locator("form")).toBeVisible();
    });

    test("other 503 shows the uncertain message, keeps fields and offers support mail", async ({ page }) => {
      await page.route("**/api/leads", (route) => route.fulfill({ status: 503, json: { error: "storage_unavailable" } }));
      await page.goto("/contact");
      await fillValid(page);
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("Gönderimin sonucunu doğrulayamadık", { exact: false })).toBeVisible();
      await expect(page.getByRole("status").locator(`a[href="mailto:${MAIL}"]`)).toBeVisible();
      await expect(page.getByLabel("Ad", { exact: true })).toHaveValue("Ada Test");
    });

    test("honeypot: UI shows success on a 201 and the website value is posted in the body", async ({ page }) => {
      let body: Record<string, unknown> | null = null;
      await page.route("**/api/leads", async (route) => {
        body = route.request().postDataJSON();
        await route.fulfill({ status: 201, json: { receiptId: "bot-1" } });
      });
      await page.goto("/contact");
      await fillValid(page);
      await page.locator('input[name="website"]').fill("http://spam.example");
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("Referans: bot-1")).toBeVisible();
      expect(body).toMatchObject({ website: "http://spam.example" });
    });

    test("keyboard-only submit with Enter", async ({ page }) => {
      await page.route("**/api/leads", (route) => route.fulfill({ status: 201, json: { receiptId: "kbd-1" } }));
      await page.goto("/contact");
      await page.getByLabel("Ad", { exact: true }).focus();
      await page.keyboard.type("Ada Test");
      await page.getByLabel("E-posta", { exact: true }).focus();
      await page.keyboard.type("ada@example.com");
      await page.getByLabel("Mesaj", { exact: true }).focus();
      await page.keyboard.type("Klavye ile gönderim");
      await page.getByRole("checkbox").focus();
      await page.keyboard.press("Space");
      await expect(page.getByRole("checkbox")).toBeChecked();
      await page.getByRole("button", { name: "Gönder", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByText("Referans: kbd-1")).toBeVisible();
    });
  });
}
