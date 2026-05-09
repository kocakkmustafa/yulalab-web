import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  Apple,
  Smartphone as PlayIcon,
  Github,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
} from "lucide-react";
import type { ProjectConfig } from "@/lib/types";
import { formatStatus } from "@/lib/utils";

type Props = {
  project: ProjectConfig;
  others: ProjectConfig[];
};

export function ProjectShowcase({ project, others }: Props) {
  const themeStyle = {
    "--brand-primary": project.brand.primary,
    "--brand-secondary": project.brand.secondary,
    "--brand-accent": project.brand.accent,
    "--brand-surface": project.brand.background,
    "--brand-foreground": project.brand.foreground,
    "--brand-gradient": project.brand.gradient,
  } as React.CSSProperties;

  return (
    <div
      style={themeStyle}
      className="relative"
      data-project={project.slug}
    >
      {/* HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-border/30"
        style={{
          backgroundColor: project.brand.background,
          color: project.brand.foreground,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: project.brand.gradient, filter: "blur(120px)" }}
        />
        <div className="container relative pt-20 pb-24 md:pt-28 md:pb-32">
          <Link
            href="/projects"
            className="text-xs uppercase tracking-widest opacity-60 transition hover:opacity-100"
          >
            ← Projeler
          </Link>

          <div className="mt-8 grid gap-12 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60">
                {project.category.tr}
              </p>
              <h1
                className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
                style={{
                  fontFamily: project.brand.fontDisplay
                    ? `${project.brand.fontDisplay}, var(--font-display)`
                    : "var(--font-display)",
                }}
              >
                {project.name}
              </h1>
              <p className="mt-6 max-w-xl text-lg opacity-80 md:text-xl">
                {project.tagline.tr}
              </p>
              <p className="mt-4 max-w-xl opacity-70">
                {project.description.tr}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-widest"
                  style={{ borderColor: `${project.brand.foreground}30` }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: project.brand.primary }}
                  />
                  {formatStatus(project.status)}
                </span>
                {project.links.website ? (
                  <a
                    href={project.links.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                    style={{
                      background: project.brand.gradient,
                      color: project.brand.background,
                    }}
                  >
                    Siteyi ziyaret et
                    <ArrowUpRight className="size-4" />
                  </a>
                ) : null}
                {project.links.appStore ? (
                  <a
                    href={project.links.appStore}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium"
                    style={{
                      borderColor: `${project.brand.foreground}30`,
                      color: project.brand.foreground,
                    }}
                  >
                    <Apple className="size-4" /> App Store
                  </a>
                ) : null}
                {project.links.playStore ? (
                  <a
                    href={project.links.playStore}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium"
                    style={{
                      borderColor: `${project.brand.foreground}30`,
                      color: project.brand.foreground,
                    }}
                  >
                    <PlayIcon className="size-4" /> Google Play
                  </a>
                ) : null}
                {project.links.github ? (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium"
                    style={{
                      borderColor: `${project.brand.foreground}30`,
                      color: project.brand.foreground,
                    }}
                  >
                    <Github className="size-4" /> GitHub
                  </a>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <div
                className="aspect-square overflow-hidden rounded-3xl border"
                style={{
                  borderColor: `${project.brand.foreground}20`,
                  background: project.brand.gradient,
                }}
              >
                <div className="flex h-full items-center justify-center p-10">
                  <Image
                    src={project.visuals.icon ?? project.visuals.logo}
                    alt={`${project.name} logo`}
                    width={320}
                    height={320}
                    className="drop-shadow-2xl"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS ──────────────────────────────────────────────────────────── */}
      {project.stats?.length ? (
        <section
          className="border-b border-border/30"
          style={{
            backgroundColor: project.brand.background,
            color: project.brand.foreground,
          }}
        >
          <div className="container py-12">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {project.stats.map((s) => (
                <li key={s.label}>
                  <p
                    className="text-3xl font-semibold tracking-tight md:text-4xl"
                    style={{ color: project.brand.primary }}
                  >
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest opacity-60">
                    {s.label}
                  </p>
                  {s.description ? (
                    <p className="mt-1 text-xs opacity-50">{s.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* PITCH ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: project.brand.background,
          color: project.brand.foreground,
        }}
      >
        <div className="container max-w-3xl py-20 md:py-24">
          <p className="text-xs uppercase tracking-widest opacity-60">
            Ne yapıyor?
          </p>
          <p className="mt-6 text-2xl leading-relaxed md:text-3xl">
            {project.pitch.tr}
          </p>
        </div>
      </section>

      {/* FEATURES ──────────────────────────────────────────────────────── */}
      <section
        className="border-y border-border/30"
        style={{
          backgroundColor: project.brand.background,
          color: project.brand.foreground,
        }}
      >
        <div className="container py-20 md:py-24">
          <p className="text-xs uppercase tracking-widest opacity-60">
            Öne çıkan özellikler
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Detaylar
          </h2>

          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {project.features.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border p-6"
                style={{
                  borderColor: `${project.brand.foreground}15`,
                  backgroundColor: `${project.brand.foreground}05`,
                }}
              >
                <div
                  className="mb-4 size-10 rounded-lg"
                  style={{ background: project.brand.gradient }}
                />
                <h3 className="text-lg font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm opacity-70">{f.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* VISION & MISSION ──────────────────────────────────────────────── */}
      {project.vision || project.mission ? (
        <section
          style={{
            backgroundColor: project.brand.background,
            color: project.brand.foreground,
          }}
        >
          <div className="container grid gap-10 py-20 md:grid-cols-2 md:py-24">
            {project.vision ? (
              <div>
                <p className="text-xs uppercase tracking-widest opacity-60">
                  Vizyon
                </p>
                <p className="mt-4 text-2xl leading-snug tracking-tight md:text-3xl">
                  {project.vision.tr}
                </p>
              </div>
            ) : null}
            {project.mission ? (
              <div>
                <p className="text-xs uppercase tracking-widest opacity-60">
                  Misyon
                </p>
                <p className="mt-4 text-2xl leading-snug tracking-tight md:text-3xl">
                  {project.mission.tr}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* LINKS & SOCIALS ───────────────────────────────────────────────── */}
      <section
        className="border-y border-border/30"
        style={{
          backgroundColor: project.brand.background,
          color: project.brand.foreground,
        }}
      >
        <div className="container py-20 md:py-24">
          <p className="text-xs uppercase tracking-widest opacity-60">
            Bağlantılar
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            {project.name}&apos;i takip et
          </h2>

          <div className="mt-10 flex flex-wrap gap-3">
            {project.links.website ? (
              <LinkPill
                href={project.links.website}
                label="Web sitesi"
                icon={<ExternalLink className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.links.appStore ? (
              <LinkPill
                href={project.links.appStore}
                label="App Store"
                icon={<Apple className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.links.playStore ? (
              <LinkPill
                href={project.links.playStore}
                label="Google Play"
                icon={<PlayIcon className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.links.github ? (
              <LinkPill
                href={project.links.github}
                label="GitHub"
                icon={<Github className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.socials.twitter ? (
              <LinkPill
                href={project.socials.twitter}
                label="X / Twitter"
                icon={<Twitter className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.socials.instagram ? (
              <LinkPill
                href={project.socials.instagram}
                label="Instagram"
                icon={<Instagram className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.socials.linkedin ? (
              <LinkPill
                href={project.socials.linkedin}
                label="LinkedIn"
                icon={<Linkedin className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.socials.youtube ? (
              <LinkPill
                href={project.socials.youtube}
                label="YouTube"
                icon={<Youtube className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
            {project.socials.discord ? (
              <LinkPill
                href={project.socials.discord}
                label="Discord"
                icon={<MessageCircle className="size-4" />}
                color={project.brand.foreground}
              />
            ) : null}
          </div>

          {project.contactEmail ? (
            <p className="mt-10 text-sm opacity-60">
              İletişim:{" "}
              <a
                href={`mailto:${project.contactEmail}`}
                className="underline-offset-4 hover:underline"
              >
                {project.contactEmail}
              </a>
            </p>
          ) : null}
        </div>
      </section>

      {/* OTHER PROJECTS ────────────────────────────────────────────────── */}
      {others.length ? (
        <section
          style={{
            backgroundColor: project.brand.background,
            color: project.brand.foreground,
          }}
        >
          <div className="container py-20 md:py-24">
            <p className="text-xs uppercase tracking-widest opacity-60">
              Diğer projeler
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              YULA Lab ailesinde başka neler var?
            </h2>

            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/projects/${o.slug}`}
                    className="group flex items-center gap-4 rounded-2xl border p-4 transition hover:translate-y-[-1px]"
                    style={{
                      borderColor: `${project.brand.foreground}15`,
                      backgroundColor: `${project.brand.foreground}05`,
                    }}
                  >
                    <div
                      className="flex size-14 items-center justify-center rounded-xl"
                      style={{ background: o.brand.gradient }}
                    >
                      <Image
                        src={o.visuals.icon ?? o.visuals.logo}
                        alt={`${o.name} logo`}
                        width={32}
                        height={32}
                        className="rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-widest opacity-60">
                        {o.category.tr}
                      </p>
                      <p className="font-semibold">{o.name}</p>
                    </div>
                    <ArrowUpRight className="size-4 opacity-40 transition group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LinkPill({
  href,
  label,
  icon,
  color,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:bg-white/5"
      style={{ borderColor: `${color}30`, color }}
    >
      {icon}
      {label}
    </a>
  );
}
