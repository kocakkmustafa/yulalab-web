import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { projects } from "@/data/projects";
import { formatStatus } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Projeler",
  description:
    "YULA Lab çatısı altında geliştirilen ürünler — her biri kendi tasarım dilinde, kendi rotasyonunda.",
};

export default function ProjectsIndexPage() {
  return (
    <section className="container py-20 md:py-28">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Projeler
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Aile.
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        YULA Lab çatısı altında üretilen ürünler. Her biri kendi tasarım dilinde,
        kendi vizyonunda — ama hepsinde aynı özen, aynı şeffaflık ve aynı bilim.
      </p>

      <ul className="mt-16 grid gap-8 md:grid-cols-2">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/projects/${p.slug}`}
              className="group block overflow-hidden rounded-2xl border border-border/60"
            >
              <div
                className="relative h-44 w-full overflow-hidden"
                style={{ background: p.brand.gradient }}
              >
                {p.visuals.banner ? (
                  <Image
                    src={p.visuals.banner}
                    alt={`${p.name} banner`}
                    fill
                    className="object-cover opacity-70 transition group-hover:scale-105 group-hover:opacity-90"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-between p-6">
                  <Image
                    src={p.visuals.icon ?? p.visuals.logo}
                    alt={`${p.name} logo`}
                    width={56}
                    height={56}
                    className="rounded-xl shadow-lg"
                  />
                  <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white backdrop-blur">
                    {formatStatus(p.status)}
                  </span>
                </div>
              </div>
              <div className="bg-muted/20 p-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {p.category.tr}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                  {p.name}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.tagline.tr}
                </p>
                <p className="mt-4 line-clamp-3 text-sm text-muted-foreground/80">
                  {p.description.tr}
                </p>
                <p className="mt-6 inline-flex items-center text-sm font-medium text-foreground/90 transition group-hover:translate-x-1">
                  Sayfayı aç →
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
