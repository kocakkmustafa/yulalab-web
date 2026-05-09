import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
        Bu sayfa kayıp.
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Aradığınız içerik taşınmış ya da hiç var olmamış olabilir. Ana sayfaya
        dönmek ister misiniz?
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
      >
        Ana sayfa
      </Link>
    </section>
  );
}
