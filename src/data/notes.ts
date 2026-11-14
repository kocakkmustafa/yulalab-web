import type { LocalizedString } from "@/lib/types";

/**
 * One piece of evidence behind an article. `ref` is either a claim id in
 * `src/data/public-registry.ts`, or `registry:<product>/surface/<kind>` for a
 * surface record, or a repo-relative file path. `verifiedAt` must equal the
 * registry record's own verifiedAt (repo paths carry the date the note was
 * written against that file).
 */
export type NoteSource = {
  label: string;
  ref: string;
  verifiedAt: string;
};

type NoteBase = {
  slug: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: LocalizedString;
  body: LocalizedString;
};

export type ChangelogNote = NoteBase & { kind: "changelog" };

export type ArticleNote = NoteBase & {
  kind: "article";
  /** Every sentence must trace to an entry in `sources`. */
  paragraphs: LocalizedString[];
  sources: NoteSource[];
};

export type Note = ChangelogNote | ArticleNote;

/**
 * Flat, hand-written notes — no CMS, no MDX. Changelog entries are one per
 * real, user-visible change; articles are written only from facts that have a
 * claim record (id, source, verifiedAt, scope) in the public registry.
 * Newest first.
 */
export const notes: Note[] = [
  {
    kind: "article",
    slug: "how-we-verify-claims",
    date: "2026-11-11",
    title: {
      tr: "İddia kaydını nasıl tutuyoruz",
      en: "How we keep the claim record",
    },
    body: {
      tr: "Yayımladığımız ürün iddiaları, kaynakları, kapsamı ve doğrulama tarihiyle yapılandırılmış bir kayıtta tutulur; kanıt türleri bilerek birbirinden ayrı yazılır.",
      en: "The product claims we publish live in structured records with their source, scope and verification date; evidence kinds are deliberately kept apart.",
    },
    paragraphs: [
      {
        tr: "Yayımladığımız ürün iddiaları src/data/public-registry.ts içinde yapılandırılmış kayıtlar olarak tutulur: her iddianın sabit bir kimliği, Türkçe ve İngilizce ifadesi, kaynağı, kapsamı, sahibi, doğrulama tarihi (verifiedAt) ve geçerlilik sonu (expiresAt) vardır.",
        en: "The product claims we publish are kept as structured records in src/data/public-registry.ts: each claim has a stable id, a Turkish and an English statement, a source, a scope, an owner, a verification date (verifiedAt) and an expiry date (expiresAt).",
      },
      {
        tr: "İddia durumu (claimState) kanıt merdivenindeki yeri söyler: production_verified, beta_verified, source_verified, prototype, planned ya da unknown. Doğrulama yöntemi (verificationMethod) ayrı bir alandır: store_build, live_e2e, ci, source_review ya da none. Doğrulanmış durumlar için doğrulamanın okuduğu commit ya da yapı etiketi (buildOrCommit) yazılır.",
        en: "The claim state (claimState) says where a claim sits on the proof ladder: production_verified, beta_verified, source_verified, prototype, planned or unknown. The verification method (verificationMethod) is a separate field: store_build, live_e2e, ci, source_review or none. For verified states, the commit or build tag the check read (buildOrCommit) is recorded.",
      },
      {
        tr: "Kanıt türü (evidenceKind) dört değerden biridir: measured, source-code-verified, self-reported ve third-party-verified. Kayıt dosyasının başlık yorumuna göre, yalnızca ürünün kendi verisine dayanan bir iddia bilerek self-reported yazılır ve bu, measured'dan daha zayıf bir iddiadır; hiç yapılmamış bir kontrol için doğrulama tarihi uydurulmaz.",
        en: "The evidence kind (evidenceKind) is one of four values: measured, source-code-verified, self-reported and third-party-verified. According to the header comment of the registry file, a claim that rests on a product's own data alone is deliberately written as self-reported, which is a weaker claim than measured; no verification date is invented for a check that was never performed.",
      },
      {
        tr: "Bir iddianın şimdiki zamanda yazılıp yazılamayacağı publishableAsPresentTense alanında tutulur; alan eksikse cevap hayırdır (types.ts: eksik, hayır demektir). \"Bayat\" durumu saklanmaz, expiresAt'ten gösterim anında türetilir; böylece tarih ve etiket birbirinden ayrışamaz.",
        en: "Whether a claim may be written in the present tense is held in the publishableAsPresentTense field; if the field is missing, the answer is no (types.ts: missing means no). The \"stale\" state is not stored; it is derived from expiresAt at render time, so the date and the label cannot drift apart.",
      },
      {
        tr: "Her iddia kapsamını (scopeTr ve scopeEn) taşır: sayının neyi kapsayıp neyi kapsamadığı. Rakam içeren iddialar, söylediği rakamları figures alanında yapılandırılmış olarak bildirir.",
        en: "Every claim carries its scope (scopeTr and scopeEn): what the figure does and does not cover. Claims that contain numbers declare the figures they assert in the structured figures field.",
      },
    ],
    sources: [
      { label: "ProductClaim, ClaimState, VerificationMethod, EvidenceKind types", ref: "src/lib/types.ts", verifiedAt: "2026-11-11" },
      { label: "Registry header comment and claim records", ref: "src/data/public-registry.ts", verifiedAt: "2026-11-11" },
    ],
  },
  {
    kind: "article",
    slug: "lifeos-on-device-encryption",
    date: "2026-11-08",
    title: {
      tr: "LifeOS'ta cihaz-üstü şifreleme: ne doğrulandı, ne doğrulanmadı",
      en: "LifeOS on-device encryption: what was verified and what was not",
    },
    body: {
      tr: "Cihaz-üstü veritabanı şifrelemesinin kaynak koddaki doğrulaması ve bu doğrulamanın kapsam sınırları.",
      en: "The source-code verification of on-device database encryption, and the limits of that verification's scope.",
    },
    paragraphs: [
      {
        tr: "LifeOS'un cihaz-üstü veritabanı AES-256 ile şifrelenir: anahtar 256 bittir ve güvenli rastgele üretimle oluşturulur. Bulut senkronu bu sürümde kapalıdır. Bu, 2026-11-14'te kaynak incelemesiyle doğrulandı (lifeos/app@8e7e10ecaa74).",
        en: "The LifeOS on-device database is encrypted with AES-256: the key is 256 bits and is generated with cryptographically secure randomness. Cloud sync is turned off in this release. This was verified by source review on 2026-11-14 (lifeos/app@8e7e10ecaa74).",
      },
      {
        tr: "Kapsam: doğrulama şifreleme mekanizmasını ve anahtar üretimini kapsar. \"SQLCipher\" adı artık o kütüphanenin kendisini değil, sqlite3mc'nin SQLCipher-uyumlu modunu (PRAGMA cipher='sqlcipher') anlatır; işlevsel olarak aynıdır, isimlendirme tarihseldir.",
        en: "Scope: the verification covers the encryption mechanism and key generation. The name \"SQLCipher\" no longer refers to that library itself but to sqlite3mc's SQLCipher-compatible mode (PRAGMA cipher='sqlcipher'); it is functionally the same, and the naming is historical.",
      },
      {
        tr: "App Store listesi için kayıttaki dayanak 2026-09-23 tarihli herkese açık Apple sorgusudur: o gün listede LifeOS 1.6.0 görünüyordu, en düşük iOS sürümü 16.0'dı. Bu yalnızca listenin erişilebilirliğidir; o tarihten sonrası için bir iddia değildir ve o doğrulamanın geçerlilik süresi aynı gün sona ermiştir.",
        en: "For the App Store listing, the basis in the record is the public Apple lookup of 2026-09-23: on that day the listing showed LifeOS 1.6.0 with a minimum iOS version of 16.0. This concerns listing availability alone; it is not a claim about any date after that, and the validity window of that check ended the same day.",
      },
      {
        tr: "Şifreleme iddiasının kayıttaki geçerlilik sonu 2027-01-13'dir; bu tarihten sonra yeniden doğrulanana kadar güncel sayılmamalıdır.",
        en: "The encryption claim's expiry date in the record is 2027-01-13; after that date it should not be treated as current until it is verified again.",
      },
    ],
    sources: [
      { label: "On-device encryption claim (source-code-verified)", ref: "lifeos-on-device-encryption", verifiedAt: "2026-11-14" },
      { label: "iOS listing surface record (public Apple lookup)", ref: "registry:lifeos/surface/ios", verifiedAt: "2026-09-23" },
    ],
  },
  {
    kind: "article",
    slug: "braavolabs-primitives-and-providers",
    date: "2026-11-08",
    title: {
      tr: "Braavolabs: 9 primitif, 14 sağlayıcı ve 50 adımlık tavan",
      en: "Braavolabs: nine primitives, 14 providers and a 50-step ceiling",
    },
    body: {
      tr: "Braavolabs kaynak kodunda sayılan primitifler ve sağlayıcılar, ve birleşim uzayının neden sınırsız olmadığı.",
      en: "The primitives and providers counted in the Braavolabs source code, and why the combination space is not unlimited.",
    },
    paragraphs: [
      {
        tr: "Braavolabs kaynak kodunda dokuz primitif tanımlıdır: ACQUISITION, SALES, DELIVERY, CONTENT, OPERATIONS, FINANCE, ANALYTICS, MEMORY ve GOVERNANCE. Bu, 2026-11-14'te kaynak incelemesiyle doğrulandı (braavolabs/platform@99109610bc52). Sayı, primitif tiplerinin ad olarak sayısıdır; kombinasyon uzayının büyüklüğü değildir.",
        en: "The Braavolabs source code defines nine primitives: ACQUISITION, SALES, DELIVERY, CONTENT, OPERATIONS, FINANCE, ANALYTICS, MEMORY and GOVERNANCE. This was verified by source review on 2026-11-14 (braavolabs/platform@99109610bc52). The number counts primitive types by name; it is not the size of the combination space.",
      },
      {
        tr: "Aynı incelemede 14 LLM sağlayıcısı (BYOK) sayıldı. Bu, desteklenen sağlayıcı sayısıdır; her sağlayıcının her modelinin aynı kalitede test edildiği anlamına gelmez.",
        en: "The same review counted 14 LLM providers (BYOK). This is the number of supported providers; it does not mean every model from every provider is tested to the same standard.",
      },
      {
        tr: "Birleşim uzayı geniştir ve şablonsuzdur; ancak sistemde sabit bir adım tavanı vardır: MAX_STEPS_PER_RUN=50. Yani uzay matematiksel olarak sınırsız değildir. Bu teknik bir kapasite tavanıdır; kullanıcının pratikte yaşayacağı çeşitlilik hakkında bir iddia değildir.",
        en: "The combination space is open-ended and template-free, but the system has a fixed step cap: MAX_STEPS_PER_RUN=50. The space is therefore not mathematically unlimited. This is a technical capacity ceiling; it is not a claim about the practical variety a user experiences.",
      },
      {
        tr: "Üç kaydın da kayıttaki geçerlilik sonu 2027-01-13'dir; bu tarihten sonra yeniden doğrulanana kadar güncel sayılmamalıdır.",
        en: "All three records expire on 2027-01-13 in the registry; after that date they should not be treated as current until verified again.",
      },
    ],
    sources: [
      { label: "Primitive count claim (9)", ref: "braavolabs-primitive-count", verifiedAt: "2026-11-14" },
      { label: "Provider count claim (14)", ref: "braavolabs-provider-count", verifiedAt: "2026-11-14" },
      { label: "Combination space claim (MAX_STEPS_PER_RUN=50)", ref: "braavolabs-combination-space", verifiedAt: "2026-11-14" },
    ],
  },
  {
    kind: "changelog",
    slug: "site-motion",
    date: "2026-07-10",
    title: {
      tr: "Vitrine biraz can kattık",
      en: "Gave the showcase some life",
    },
    body: {
      tr: "Sayfa geçişleri artık bir sahne değişimi gibi hissediyor, kartlar hover'da markanın kendi rengiyle canlanıyor. Erişilebilirlik ayarı (reduce motion) açık olanlarda hareketler anında sonuçlanıyor.",
      en: "Page transitions now read as a scene change instead of a hard cut, and cards light up in the product's own color on hover. With reduce-motion enabled, everything resolves instantly instead.",
    },
  },
  {
    kind: "changelog",
    slug: "terms-of-service",
    date: "2026-07-10",
    title: {
      tr: "Kullanım Şartları sayfası eklendi",
      en: "Added a Terms of Service page",
    },
    body: {
      tr: "Ürünlerimiz için ortak bir kullanım şartları / EULA sayfası yayında — footer'dan erişilebilir.",
      en: "A shared terms of service / EULA page for our products is live — reachable from the footer.",
    },
  },
  {
    kind: "changelog",
    slug: "lifeos-live",
    date: "2026-07-10",
    title: {
      tr: "LifeOS artık App Store'da",
      en: "LifeOS is live on the App Store",
    },
    body: {
      tr: "LifeOS'u aylardır 'yakında' göstermek dürüstlük sözümüze aykırıydı. Artık gerçekten indirilebilir — düzelttik.",
      en: "Showing LifeOS as 'coming soon' for months didn't match our honesty promise. It's actually downloadable now — fixed.",
    },
  },
];

export const articleNotes: ArticleNote[] = notes.filter(
  (note): note is ArticleNote => note.kind === "article",
);

export function getArticleBySlug(slug: string): ArticleNote | undefined {
  return articleNotes.find((note) => note.slug === slug);
}
