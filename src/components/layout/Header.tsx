import Image from "next/image";
import Link from "next/link";
import { company } from "@/data/company";

const nav = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/manifesto", label: "Manifesto" },
  { href: "/projects", label: "Projeler" },
  { href: "/contact", label: "İletişim" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label={company.name}>
          <Image
            src={company.brand.logo}
            alt={`${company.name} logo`}
            width={36}
            height={36}
            className="rounded-md"
            priority
          />
          <span className="font-display text-base font-semibold tracking-tight">
            {company.name}
          </span>
        </Link>
        <nav className="hidden md:block">
          <ul className="flex items-center gap-7 text-sm text-muted-foreground">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="/projects"
          className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground hover:text-background md:inline-flex"
        >
          Projeleri Keşfet
        </Link>
      </div>
    </header>
  );
}
