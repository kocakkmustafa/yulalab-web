import { beforeEach, describe, expect, it, vi } from "vitest";
import { mailTransport, missingTemplates, sendgridTransport, type MailMessage } from "@/server/mail";

const message: MailMessage = {
  outboxId: "11111111-1111-1111-1111-111111111111",
  eventType: "lead_receipt",
  to: "ada@example.com",
  locale: "tr",
  data: { receiptId: "YL-1" },
};

function respondWith(status: number, body = "") {
  return vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;
}

beforeEach(() => {
  for (const key of [
    "LEADS_ENABLED",
    "SENDGRID_API_KEY",
    "MAIL_FROM",
    "LEADS_INTERNAL_ADDRESS",
    "SENDGRID_TEMPLATE_LEAD_RECEIPT_TR",
    "SENDGRID_TEMPLATE_LEAD_RECEIPT_EN",
    "SENDGRID_TEMPLATE_LEAD_INTERNAL_ROUTE_TR",
  ]) {
    delete process.env[key];
  }
});

describe("the provider call", () => {
  it("throws on a rejection instead of counting as delivered", async () => {
    // The whole consumer rests on this: a transport that returns normally is
    // taken as proof the mail went out, and the row is never retried.
    const transport = sendgridTransport("SG.key", "hello@yulalab.com", respondWith(429));
    await expect(transport.send(message)).rejects.toThrow(/429/);
  });

  it("keeps the API key and the provider's echo out of the error", async () => {
    const transport = sendgridTransport(
      "SG.super-secret",
      "hello@yulalab.com",
      respondWith(400, JSON.stringify({ errors: [{ message: "bad address ada@example.com" }] })),
    );
    const error = await transport.send(message).catch((e: Error) => e);
    expect(String(error)).not.toContain("SG.super-secret");
    expect(String(error)).not.toContain("ada@example.com");
  });

  it("sends the address and the receipt, never the message body", async () => {
    const fetchImpl = respondWith(202);
    await sendgridTransport("SG.key", "hello@yulalab.com", fetchImpl).send(message);
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.personalizations[0].to[0].email).toBe("ada@example.com");
    expect(body.from.email).toBe("hello@yulalab.com");
    expect(body.dynamic_template_data).toEqual({ receiptId: "YL-1" });
  });
});

describe("which transport this deployment gets", () => {
  it("is unconfigured with no credentials", () => {
    expect(mailTransport().configured).toBe(false);
  });

  it("is unconfigured when the lead surface itself is closed", () => {
    // Two switches, one meaning. A consumer that would send mail for a form
    // nobody can submit is how you find out later that one was flipped alone.
    process.env.SENDGRID_API_KEY = "SG.key";
    process.env.MAIL_FROM = "hello@yulalab.com";
    expect(mailTransport().configured).toBe(false);
  });

  it("is unconfigured with a key but no sender address", () => {
    process.env.LEADS_ENABLED = "1";
    process.env.SENDGRID_API_KEY = "SG.key";
    expect(mailTransport().configured).toBe(false);
  });

  it("is unconfigured when a template is missing, and says which", () => {
    // With a key and a sender but no template, `configured` would be true,
    // SendGrid rejects an empty template_id, and on a daily schedule
    // MAX_ATTEMPTS retires every receipt within five days — permanent loss,
    // reported as ordinary provider failures.
    process.env.LEADS_ENABLED = "1";
    process.env.SENDGRID_API_KEY = "SG.key";
    process.env.MAIL_FROM = "hello@yulalab.com";
    process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_TR = "d-tr";
    expect(mailTransport().configured).toBe(false);
    expect(missingTemplates()).toEqual(["SENDGRID_TEMPLATE_LEAD_RECEIPT_EN"]);
  });

  it("asks for an internal-route template only once that route has an address", () => {
    process.env.LEADS_ENABLED = "1";
    process.env.SENDGRID_API_KEY = "SG.key";
    process.env.MAIL_FROM = "hello@yulalab.com";
    process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_TR = "d-tr";
    process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_EN = "d-en";
    expect(missingTemplates()).toEqual([]);

    process.env.LEADS_INTERNAL_ADDRESS = "studio@yulalab.com";
    expect(missingTemplates()).toEqual(["SENDGRID_TEMPLATE_LEAD_INTERNAL_ROUTE_TR"]);
    expect(mailTransport().configured).toBe(false);
  });

  it("is configured only when the whole chain is present", () => {
    process.env.LEADS_ENABLED = "1";
    process.env.SENDGRID_API_KEY = "SG.key";
    process.env.MAIL_FROM = "hello@yulalab.com";
    process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_TR = "d-tr";
    process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_EN = "d-en";
    expect(mailTransport().configured).toBe(true);
  });
});

describe("a provider that stops responding", () => {
  it("gives up instead of holding the row's transaction open", async () => {
    // A hang, not a rejection: `attempts` is never incremented, so the
    // retry budget never runs out, and ORDER BY created_at hands the same
    // row back first on every later run. One stuck send would block the
    // whole queue, deterministically and with nothing in the counts.
    const hangs = ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })) as unknown as typeof fetch;
    const transport = sendgridTransport("SG.key", "hello@yulalab.com", hangs, 20);
    await expect(transport.send(message)).rejects.toThrow();
  });
});

describe("the request itself", () => {
  it("authenticates, because an unauthenticated send burns every retry", async () => {
    const fetchImpl = respondWith(202);
    await sendgridTransport("SG.key", "hello@yulalab.com", fetchImpl).send(message);
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer SG.key");
  });

  it("picks the template for the event and the language", async () => {
    process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_TR = "d-turkish";
    const fetchImpl = respondWith(202);
    await sendgridTransport("SG.key", "hello@yulalab.com", fetchImpl).send(message);
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string).template_id).toBe("d-turkish");
  });
});
