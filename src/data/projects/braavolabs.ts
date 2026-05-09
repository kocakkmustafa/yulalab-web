import type { ProjectConfig } from "@/lib/types";

export const braavolabs: ProjectConfig = {
  slug: "braavolabs",
  name: "Braavolabs",
  kind: ["platform", "web", "mobile"],
  status: "pre-launch",
  category: {
    tr: "Otonom AI Şirket İşletim Sistemi",
    en: "Autonomous AI Company Operating System",
  },
  tagline: {
    tr: "AI şirketin, 10 dakikada kurulur.",
    en: "Your AI company, built in 10 minutes.",
  },
  description: {
    tr: "Tek bir paragrafla işinizi anlatın; Braavolabs içerik, satış, operasyon ve finans için tam kadrolu bir otonom AI şirketi kurar. Her karar gerekçelendirilir, her harcama onaylanır, her çalışma uçtan uca denetlenir.",
    en: "Describe your business in plain English. Braavolabs assembles a fully-staffed autonomous AI company across content, sales, ops and finance — every decision reasoned, every spend approved, every run audited end-to-end.",
  },
  pitch: {
    tr: "Braavolabs, kendi LLM anahtarınızla çalışan, 9 yetkinlik (içerik, satış, operasyon, finans, analitik, hafıza, yönetişim, edinme, teslim) etrafında 9 ajanı orkestrasyon eden bir AI şirket işletim sistemidir. Bulutta kullanın ya da Docker ile kendi sunucunuzda çalıştırın.",
    en: "Braavolabs is an AI company OS that orchestrates 9 specialized agents around 9 primitives — content, sales, ops, finance, analytics, memory, governance, acquisition, delivery — using your own LLM key. Run in the cloud or self-host with Docker.",
  },
  brand: {
    primary: "#00d1ff",
    secondary: "#4060ff",
    accent: "#6d11ad",
    background: "#050810",
    foreground: "#e1e2eb",
    gradient:
      "linear-gradient(135deg, #00d1ff 0%, #4060ff 50%, #6d11ad 100%)",
    fontDisplay: "Space Grotesk",
    fontBody: "Inter",
    fontMono: "JetBrains Mono",
    mood: "Linear / Superhuman / Vercel — dark, glass, cobalt rim, animated mesh.",
  },
  visuals: {
    logo: "/projects/braavolabs/logo.png",
    icon: "/projects/braavolabs/icon.png",
    ogImage: "/projects/braavolabs/og.png",
    screenshots: [],
  },
  features: [
    {
      title: "Tek paragrafla şirket kurulumu",
      description:
        "İşinizi cümlelerinizle anlatın; Claude 2-3 soruyla anlar, ~10 dakikada çalışır bir AI şirketi teslim eder.",
      icon: "Sparkles",
    },
    {
      title: "9 Primitif",
      description:
        "Edinme · Satış · Teslim · İçerik · Operasyon · Finans · Analitik · Hafıza · Yönetişim — kategoriyi tanımlayan çerçeve.",
      icon: "LayoutGrid",
    },
    {
      title: "İnsan onayı kapıları",
      description:
        "Her para harcaması ve marka riski insan onayına gelir. Risk Stops döngüleri ve spam'i otomatik durdurur.",
      icon: "ShieldCheck",
    },
    {
      title: "BYOK · 12 LLM sağlayıcı",
      description:
        "Anthropic, OpenAI, Google, Mistral, Groq, OpenRouter, DeepSeek, Kimi, Qwen, Ollama, LM Studio veya kendi modeliniz.",
      icon: "KeyRound",
    },
    {
      title: "Tam denetim kaydı",
      description:
        "Her tool çağrısı, her karar, her gerekçe kayıtlı. 'AI bunu neden yaptı?' sorusunun cevabı bir tık ötede.",
      icon: "FileSearch",
    },
    {
      title: "Self-host & cloud",
      description:
        "Tek scriptle Docker Compose kurulumu. Kendi sunucunuzda da, bulutta da aynı deneyim.",
      icon: "Server",
    },
  ],
  stats: [
    { label: "Primitif", value: "9", description: "Edinme → Yönetişim" },
    { label: "LLM Sağlayıcı", value: "12", description: "BYOK" },
    { label: "Kurulum süresi", value: "~10dk", description: "Sıfırdan çalışır şirket" },
    { label: "Dil", value: "6", description: "TR · EN · ES · DE · FR · AR" },
  ],
  vision: {
    tr: "Otonom AI şirketleri, bir paragraf kadar kolay erişilebilir bir meta haline gelsin.",
    en: "Make autonomous AI companies as accessible as writing a paragraph.",
  },
  mission: {
    tr: "Solo kurucular, üreticiler ve küçük ajanslar denetlenebilir, yönetişim altında çalışan AI şirketleri kursun.",
    en: "Empower solo founders, creators and small agencies to run audited, governed AI companies.",
  },
  order: 1,
  links: {
    website: "https://braavolabs.com",
    github: "https://github.com/kocakkmustafa/braavolabs",
  },
  socials: {
    twitter: "https://x.com/braavolabs",
  },
  contactEmail: "hello@braavolabs.com",
};
