import type { Metadata } from "next";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Manifesto",
  description: company.mission.tr,
};

export default function ManifestoPage() {
  return (
    <article className="container max-w-3xl py-20 md:py-28">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Manifesto
      </p>
      <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
        Az ama özenli bir ürün ailesi.
      </h1>

      <section className="mt-14 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Vizyonumuz
        </p>
        <p className="font-display text-2xl leading-snug tracking-tight md:text-3xl">
          {company.vision.tr}
        </p>
      </section>

      <section className="mt-14 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Misyonumuz
        </p>
        <p className="font-display text-2xl leading-snug tracking-tight md:text-3xl">
          {company.mission.tr}
        </p>
      </section>

      <section className="mt-20">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Değerlerimiz
        </p>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {company.values.map((v) => (
            <li
              key={v.title.tr}
              className="rounded-xl border border-border/60 bg-muted/20 p-6"
            >
              <h3 className="font-display text-xl font-semibold tracking-tight">
                {v.title.tr}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {v.description.tr}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 border-t border-border/60 pt-10">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Kurucu
        </p>
        <p className="mt-3 font-display text-xl tracking-tight">
          {company.founder.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {company.founder.role.tr}
        </p>
      </section>
    </article>
  );
}
