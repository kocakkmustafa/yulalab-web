import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { company } from "@/data/company";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://yulalab.com",
  ),
  title: {
    default: `${company.name} — ${company.tagline.tr}`,
    template: `%s · ${company.name}`,
  },
  description: company.shortDescription.tr,
  applicationName: company.name,
  authors: [{ name: company.founder.name }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: company.name,
    title: `${company.name} — ${company.tagline.tr}`,
    description: company.shortDescription.tr,
    images: [{ url: company.brand.banner, width: 1920, height: 1080 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${company.name} — ${company.tagline.tr}`,
    description: company.shortDescription.tr,
    images: [company.brand.banner],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${manrope.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
