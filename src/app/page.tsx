import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { company } from "@/data/company";
import { projects } from "@/data/projects";
import { formatStatus } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      {/* HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="container pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="animate-fade-in">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="size-1.5 rounded-full bg-foreground" />
                Venture Studio · İstanbul
              </p>
              <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                {company.tagline.tr}
              </h1>
              <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
                {company.shortDescription.tr}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
                >
                  Projeleri keşfet
                  <ArrowUpRight className="size-4" />
                </Link>
                <Link
                  href="/manifesto"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-foreground/5"
                >
                  Manifesto
                </Link>
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
              <Image
                src={company.brand.banner}
                alt={`${company.name} kurumsal banner`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO TEASER ──────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="container py-20 md:py-24">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Vizyon
              </p>
              <p className="mt-4 font-display text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
                {company.vision.tr}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Misyon
              </p>
              <p className="mt-4 font-display text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
                {company.mission.tr}
              </p>
            </div>
            <div className="self-end">
              <Link
                href="/manifesto"
                className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
              >
                Manifestoyu oku
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PROJECTS PREVIEW ──────────────────────────────────────────────── */}
      <section>
        <div className="container py-20 md:py-28">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Projeler
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Şu anda ne inşa ediyoruz
              </h2>
            </div>
            <Link
              href="/projects"
              className="hidden text-sm text-muted-foreground hover:text-foreground md:inline-flex"
            >
              Tümünü gör →
            </Link>
          </div>

          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-6 transition hover:border-foreground/40 hover:bg-muted/40"
                >
                  <div
                    className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl"
                    style={{ background: p.brand.gradient }}
                  >
                    <Image
                      src={p.visuals.icon ?? p.visuals.logo}
                      alt={`${p.name} ikonu`}
                      width={48}
                      height={48}
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {p.category.tr}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    {p.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.tagline.tr}
                  </p>
                  <div className="mt-6 flex items-center justify-between text-xs">
                    <span className="rounded-full border border-border px-2 py-0.5 uppercase tracking-widest text-muted-foreground">
                      {formatStatus(p.status)}
                    </span>
                    <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                      Keşfet →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
