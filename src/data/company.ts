import type { CompanyConfig } from "@/lib/types";

export const company: CompanyConfig = {
  name: "YULA Lab",
  legalName: "YULA Lab",
  tagline: {
    tr: "Geleceğin ürünlerini bugün tasarlıyoruz.",
    en: "We design the products of tomorrow, today.",
  },
  shortDescription: {
    tr: "YULA Lab, yapay zeka ve veri odaklı, insanın hayatını sadeleştiren ürünler tasarlayan bir girişim stüdyosudur. Her projemiz; estetik, etik ve etki üçgeninde inşa edilir.",
    en: "YULA Lab is a venture studio building AI-native, data-driven products that simplify everyday life — each project crafted at the intersection of aesthetics, ethics, and impact.",
  },
  vision: {
    tr: "İnsanların hayatını anlamlı şekilde iyileştiren, yapay zekanın en iyi yanlarını gündelik hayata taşıyan bir ürün ailesi kurmak.",
    en: "To build a family of products that meaningfully improve everyday life by bringing the best of AI into the hands of ordinary people.",
  },
  mission: {
    tr: "Her ürünümüzde şeffaf metodoloji, sade tasarım ve gerçek bir kullanıcı yararını birleştiren bir mühendislik kültürü inşa etmek; yapay zekayı abartmadan, doğru yerde, doğru zamanda kullanmak.",
    en: "To build an engineering culture that combines transparent methodology, minimal design and real user value in every product — using AI where it actually helps, never just because it can.",
  },
  values: [
    {
      title: { tr: "Şeffaflık", en: "Transparency" },
      description: {
        tr: "Kara kutu yok. Modellerimizin nasıl karar verdiğini, hangi veriden öğrendiğini açıkça paylaşırız.",
        en: "No black boxes. We show how our models decide and what data they learn from.",
      },
    },
    {
      title: { tr: "Sadelik", en: "Craft & Restraint" },
      description: {
        tr: "Az ama özenli. Her ekran, her etkileşim üzerinde uğraşıldığını hisseder.",
        en: "Less, but with care. Every screen and interaction feels deliberately crafted.",
      },
    },
    {
      title: { tr: "Gizlilik", en: "Privacy by Default" },
      description: {
        tr: "Veri sahibi kullanıcıdır. Tasarımlarımız bunu varsayımdan değil, mimariden başlatır.",
        en: "The user owns their data. Our designs start from architecture, not afterthought.",
      },
    },
    {
      title: { tr: "Bilim", en: "Science Over Hype" },
      description: {
        tr: "Trende değil, kanıta yaslanırız. Doğrulanmış yöntemler, ölçülebilir sonuçlar.",
        en: "We lean on evidence, not trends. Validated methods, measurable outcomes.",
      },
    },
  ],
  founder: {
    name: "Mustafa Kaan Koçak",
    role: { tr: "Kurucu & Stüdyo Lideri", en: "Founder & Studio Lead" },
    email: "kocakmkaan@gmail.com",
  },
  contact: {
    email: "hello@yulalab.com",
    press: "press@yulalab.com",
  },
  socials: {
    twitter: "https://x.com/yulalab",
    linkedin: "https://www.linkedin.com/company/yulalab",
    instagram: "https://instagram.com/yulalab",
  },
  brand: {
    logo: "/brand/yulalab-logo.png",
    banner: "/brand/yulalab-banner.png",
  },
};
