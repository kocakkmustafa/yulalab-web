import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "İletişim",
  description: `${company.name} ile iletişime geç — iş birliği, basın, yatırım.`,
};

export default function ContactPage() {
  return (
    <section className="container max-w-2xl py-20 md:py-28">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        İletişim
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Konuşalım.
      </h1>
      <p className="mt-4 text-muted-foreground">
        İş birliği, basın, yatırım veya sadece bir merhaba — en hızlı yol e-posta.
      </p>

      <div className="mt-10 flex flex-col gap-3">
        <a
          href={`mailto:${company.contact.email}`}
          className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-5 py-4 transition hover:bg-muted/40"
        >
          <Mail className="size-5" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Genel
            </p>
            <p className="font-medium">{company.contact.email}</p>
          </div>
        </a>
        {company.contact.press ? (
          <a
            href={`mailto:${company.contact.press}`}
            className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-5 py-4 transition hover:bg-muted/40"
          >
            <Mail className="size-5" />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Basın
              </p>
              <p className="font-medium">{company.contact.press}</p>
            </div>
          </a>
        ) : null}
      </div>
    </section>
  );
}
