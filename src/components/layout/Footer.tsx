import Link from "next/link";
import { company } from "@/data/company";
import { projects } from "@/data/projects";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-lg font-semibold">{company.name}</p>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {company.tagline.tr}
            </p>
            <p className="mt-2 max-w-sm text-xs text-muted-foreground">
              {company.shortDescription.tr}
            </p>
          </div>

          <nav aria-labelledby="footer-projects">
            <p
              id="footer-projects"
              className="mb-3 text-xs uppercase tracking-widest text-muted-foreground"
            >
              Projeler
            </p>
            <ul className="space-y-2 text-sm">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/projects/${p.slug}`}
                    className="hover:text-foreground text-muted-foreground"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-company">
            <p
              id="footer-company"
              className="mb-3 text-xs uppercase tracking-widest text-muted-foreground"
            >
              Şirket
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/manifesto" className="text-muted-foreground hover:text-foreground">
                  Manifesto
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  İletişim
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${company.contact.email}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {company.contact.email}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {company.legalName}. Tüm hakları saklıdır.
          </p>
          <p>
            Kurucu —{" "}
            <span className="text-foreground/80">{company.founder.name}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
