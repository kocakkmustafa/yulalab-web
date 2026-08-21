import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { GlassSheen } from "@/components/common/GlassSheen";
import { StaggerWords } from "@/components/common/StaggerWords";
import {
  EVIDENCE_LEVELS,
  evidenceCounts,
  lapsedSurfaceCount,
  lifecycleRows,
  portfolioCounts,
} from "@/lib/operating-system";
import type { Locale } from "@/lib/types";

/**
 * Operating System / how this lab works (roadmap §4.5, §5.6).
 *
 * Every number on this page is derived from the live registry
 * (src/lib/operating-system.ts), and the "Current limitations" section is
 * as load-bearing as the rest: a page describing how we stay honest, that
 * omits what is currently NOT honest, would be the exact failure it claims
 * to prevent.
 */
/**
 * Same 15-minute window the product routes use (Y-P0-003): the limitations
 * section reports how many surface assertions have lapsed RIGHT NOW, and a
 * fully static page would freeze that number at build time — the page would
 * keep claiming a stale count long after the data moved.
 */
export const revalidate = 900;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tr = locale === "tr";
  return {
    title: tr ? "Nasıl çalışıyoruz" : "How we work",
    description: tr
      ? "Kanıt seviyeleri, ürün durum makinesi, iddia politikası, AI ile insan arasındaki karar sınırı ve bugünkü kısıtlar."
      : "Evidence levels, the product state machine, our claim policy, the AI/human decision boundary, and today's limitations.",
    alternates: {
      canonical: tr ? "/operating-system" : `/${locale}/operating-system`,
      languages: { tr: "/operating-system", en: "/en/operating-system" },
    },
  };
}

export default async function OperatingSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OperatingSystem />;
}

function OperatingSystem() {
  const locale = useLocale() as Locale;
  const tr = locale === "tr";
  const counts = evidenceCounts();
  const totals = portfolioCounts();
  const lifecycles = lifecycleRows();
  // Read at render time (the route revalidates), so this figure ages with
  // the data instead of with the deploy.
  const lapsed = lapsedSurfaceCount(new Date());

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />

      <section className="mx-auto max-w-3xl px-6 pb-12 pt-32 lg:px-10 lg:pt-40">
        <EyebrowChip>{tr ? "İşletim biçimi" : "Operating system"}</EyebrowChip>
        <h1 className="mt-7 font-display text-[40px] font-extrabold leading-[0.96] tracking-tightest text-ink-50 sm:text-[56px] md:text-[68px]">
          <StaggerWords text={tr ? "Nasıl çalışıyoruz." : "How we work."} />
        </h1>
        <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.65] text-ink-300">
          {tr
            ? "Bu sayfa süreç anlatmıyor; çalışan mekanizmaları anlatıyor. Aşağıdaki her sayı, sitenin geri kalanının okuduğu kayıttan hesaplanıyor — elle yazılmıyor, dolayısıyla bayatlayamıyor."
            : "This page is not a description of process; it lists mechanisms that run. Every number below is computed from the same record the rest of the site renders from — nothing here is typed by hand, so nothing here can go stale."}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            [totals.products, tr ? "ürün" : "products"],
            [totals.claims, tr ? "kayıtlı iddia" : "recorded claims"],
            [totals.screenshots, tr ? "kaynaklı ekran" : "sourced screenshots"],
            [totals.caseStudies, tr ? "vaka çalışması" : "case studies"],
          ].map(([n, label]) => (
            <div key={String(label)} className="rounded-2xl border border-hairline bg-surface p-4">
              <div className="font-display text-3xl font-bold text-ink-50">{n}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-400">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Evidence levels ---- */}
      <Block
        title={tr ? "Kanıt seviyeleri" : "Evidence levels"}
        intro={
          tr
            ? "Her iddia bir seviyeyle etiketlenir. Bu bir kalite sıralaması değil, kapsam etiketidir: okuyucunun 'kodu okuyup saydık' ile 'kendi metnimiz böyle diyor'u ayırt edebilmesi için."
            : "Every claim is tagged with a level. Not a quality ranking — a scope label, so a reader can tell 'we read the code and counted' apart from 'our own copy says so'."
        }
      >
        <div className="space-y-3">
          {EVIDENCE_LEVELS.map((lvl) => (
            <div
              key={lvl.level}
              className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-5 sm:flex-row sm:items-baseline sm:gap-5"
            >
              <div className="flex shrink-0 items-baseline gap-3 sm:w-40">
                <span className="font-mono text-sm font-medium text-ink-100">{lvl.level}</span>
                <span className="text-[14px] text-ink-200">
                  {tr ? lvl.labelTr : lvl.labelEn}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[14.5px] leading-relaxed text-ink-300">
                  {tr ? lvl.meaningTr : lvl.meaningEn}
                </p>
              </div>
              <div className="shrink-0 font-mono text-[11px] text-ink-400">
                {counts[lvl.kind]} {tr ? "iddia" : "claims"}
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* ---- State machine ---- */}
      <Block
        title={tr ? "Ürün durum makinesi" : "Product state machine"}
        intro={
          tr
            ? "Dört durum var ve her biri mekanik olarak bir şeyi değiştirir. Hiçbir şeyi değiştirmeyen bir durum etikettir; onu burada aşama diye listelemek tam olarak kaçındığımız şey olurdu."
            : "Four states, each of which mechanically changes something. A state that changes nothing is a label — listing it here as a stage would be the theatre this page exists to avoid."
        }
      >
        <div className="space-y-3">
          {lifecycles.map((row) => (
            <div key={row.key} className="rounded-2xl border border-hairline bg-surface p-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-display text-lg font-semibold text-ink-50">
                  {tr ? row.labelTr : row.labelEn}
                </span>
                <span className="font-mono text-[11px] text-ink-400">
                  {row.count} {tr ? "ürün" : "products"}
                </span>
              </div>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-300">
                {tr ? row.effectTr : row.effectEn}
              </p>
            </div>
          ))}
        </div>
      </Block>

      {/* ---- Claim policy ---- */}
      <Block
        title={tr ? "İddia politikası" : "Public claim policy"}
        intro={
          tr
            ? "Bir rakamın bu sitede görünmesi için önünde geçmesi gereken kapılar. Hepsi çalışıyor; hiçbiri niyet beyanı değil."
            : "The gates a number must pass before it appears here. All of them run; none is a statement of intent."
        }
      >
        <RuleList
          items={
            tr
              ? [
                  "Yapısal eksik build'i düşürür: kaynağı, kapsamı, sahibi veya tarihi olmayan bir iddia yayına giremez.",
                  "Tarihler sıfır dolgulu olmak zorunda — tek eksik sıfır (2026-9-18) iddianın yıl dönene kadar hiç bayatlamamasına yol açardı.",
                  "Süre dolması build'i DÜŞÜRMEZ, sayfayı değiştirir: bayat iddia yanlış değil, doğrulanmamıştır — silinmez, 'yeniden doğrulama bekliyor' olarak gösterilir.",
                  "Bir istatistik kartı, bağlandığı iddianın metninde geçmeyen bir rakamı basamaz.",
                  "Yayınlanmamış ürün sahte ekran görüntüsü gösteremez; her ekran görüntüsü hangi build'den, hangi tarihte alındığını taşır.",
                  "Metin taraması, geçmişte yanlış çıkmış 12 ifadeyi adıyla arar ve dönmelerini engeller.",
                  "Vaka çalışması kapısı: izin, başlangıç, artefakt, ölçülmüş sonuç, başarısızlık dersi ve geçerlilik tarihi olmadan bir vaka yayınlanamaz.",
                ]
              : [
                  "A structural gap fails the build: a claim with no source, scope, owner or date cannot ship.",
                  "Dates must be zero-padded — one missing zero (2026-9-18) would keep a claim from ever expiring until the year turned.",
                  "Expiry does NOT fail the build, it changes the page: a lapsed claim is not false, it is unverified — never deleted, shown as awaiting re-verification.",
                  "A stat card may not print a figure the claim it links to does not contain.",
                  "An unreleased product may not show a fabricated screen; every screenshot carries the build it came from and the date it was taken.",
                  "A prose scan looks for 12 statements that turned out false in the past, by name, and stops them coming back.",
                  "The case-study gate: no permission, baseline, artifact, measured outcome, failure lesson and validity date — no case.",
                ]
          }
        />
      </Block>

      {/* ---- Privacy / security ---- */}
      <Block
        title={tr ? "Gizlilik ve güvenlik" : "Privacy and security"}
        intro={
          tr
            ? "Bugün fiilen ne topluyoruz sorusunun cevabı: neredeyse hiçbir şey — ve bunun sebebi henüz kimsenin yazmamış olması değil, anahtarın kapalı olması."
            : "What we actually collect today: almost nothing — and not because nobody has written it yet, but because the switch is off."
        }
      >
        <RuleList
          items={
            tr
              ? [
                  "İletişim formu ve e-posta kuyruğu kodu tamamlandı ama TEK bir anahtarla kapalı; kapalıyken uç nokta 503 döner ve gizlilik metni de bu gerçeği aynı anahtardan okur.",
                  "Rıza bir kutucuk değil, tarihli bildirim sürümüyle kendi kaydıdır — 'onayladı' bilgisi 'neye onayladı' sorusunu yanıtlayamaz.",
                  "Huni ölçümü serbest metin kabul etmez: alan adı bile bilinse değeri kısıtlıdır, sayfa yolundan sorgu dizesi düşürülür, saklama 30 gündür ve silme işi gerçekten koşar.",
                  "Kişisel veri talepleri (erişim, düzeltme, silme) adres kanıtıyla işler ve onurlandırılan bir silme, kişiye ait bekleyen bildirimleri de düşürür.",
                  "Tarayıcıya gönderilen içerik sıkı bir CSP altında çalışır; çerçeveleme kapalı, yalnız açıkça anlaşılmış tek bir dış kaynak gömülebilir.",
                ]
              : [
                  "The contact form and mail queue are complete but held behind ONE switch; while it is off the endpoint returns 503, and the privacy page reads that same switch rather than describing a different site.",
                  "Consent is not a checkbox but its own record, stamped with a dated notice version — knowing someone agreed cannot answer what they agreed to.",
                  "Funnel measurement refuses free text: even a known field's value is constrained, query strings are stripped from the page path, retention is 30 days, and the deletion job actually runs.",
                  "Data requests (access, correction, deletion) require proof of address, and an honoured deletion also drops that person's pending notifications.",
                  "Everything served runs under a strict CSP; framing is off, and exactly one external surface is embeddable by explicit agreement.",
                ]
          }
        />
      </Block>

      {/* ---- AI vs human ---- */}
      <Block
        title={tr ? "AI ile insan arasındaki sınır" : "The AI/human boundary"}
        intro={
          tr
            ? "Bu site büyük ölçüde AI oturumlarıyla yazılıyor. Sınır belirsiz bırakılmadı; risk sınıfına bağlı ve kurallı."
            : "This site is largely written by AI sessions. The boundary is not left vague — it is bound to a risk class."
        }
      >
        <RuleList
          items={
            tr
              ? [
                  "Kurucu kapısı: mağaza gönderimi, fiyat, gerçek para, hesap sahipliği, hukuk ve geri dönülmez kararlar yalnız insana aittir.",
                  "Güvenlik, ödeme, migration ve gizlilik sınıfı işlerde bağımsız bir inceleme zorunludur; kimse kendi işini onaylayamaz. Bu inceleme pratikte reddediyor da — kayıtta üst üste RED almış turlar var.",
                  "'Bitti' bir yüzde değildir: bir iş yalnız KABUL EDİLDİ durumuna geçtiğinde biter, o da kanıt satırı yazılmadan mümkün değil.",
                  "İnsan, cihaz veya takvim gerektiren şeyler tahmin edilmez; DIŞ KAPI olarak kaydedilir ve sıradaki işe geçilir.",
                ]
              : [
                  "Founder gate: store submission, pricing, real money, account ownership, legal questions and irreversible decisions belong to a human only.",
                  "Security, payment, migration and privacy work requires an independent review before acceptance; nobody approves their own work. That review does reject in practice — the record contains rounds that were turned down more than once.",
                  "'Done' is not a percentage: work ends only when it reaches ACCEPTED, and it cannot get there without an evidence row.",
                  "Anything needing a person, a device or a calendar is not guessed at — it is recorded as an EXTERNAL GATE and the next task starts.",
                ]
          }
        />
      </Block>

      {/* ---- Limitations: the section that earns the page ---- */}
      <Block
        title={tr ? "Bugünkü kısıtlar" : "Current limitations"}
        intro={
          tr
            ? "Bu bölüm sayfanın bedelidir. Nasıl dürüst kaldığını anlatan bir sayfanın, şu an dürüst OLMAYAN yerlerini atlaması tam olarak engellemeye çalıştığı şey olurdu."
            : "This section is the price of the page. One that describes how we stay honest while omitting where we currently are not would be the exact failure it claims to prevent."
        }
      >
        <RuleList
          tone="warn"
          items={
            tr
              ? [
                  `Yüzey tazeliği hesaplanıyor ama hiçbir sayfaya bağlı değil. Şu anda kayıttaki ${lapsed} mağaza/erişim yüzeyinin doğrulama penceresi kapanmış durumda; kartlardaki durum rozeti ise kayıttan değil ikinci bir kaynaktan geliyor ve hiç tarih taşımıyor. İki kaynağın birleştirilmesi sıradaki iş kaleminde.`,
                  "Bağlantı erişilebilirliği CI'da engelleyici değil: bozuk bir mağaza adresi uyarı üretir, boru hattını düşürmez.",
                  "Sürekli entegrasyon şu anda faturalandırma nedeniyle koşamıyor; kapılar yerelde çalıştırılıyor ve kanıtı kayda yazılıyor.",
                  "Portföyde abonesi olan bir ürün (Readio) bu kayıtta hiç yok — kapsamı genişletmek kurucu kararıdır, sessizce yapılmaz.",
                  "İletişim makbuzu hedefi 60 saniyeydi; kuyruk günde bir kez boşaltılıyor. Yayınlanan hiçbir metin daha hızlısını vaat etmiyor, ama hedef karşılanmıyor.",
                ]
              : [
                  `Surface freshness is computed but wired to no page. Right now ${lapsed} store/availability surfaces in the record have passed their verification window; meanwhile the status badge on a card comes from a second source that carries no date at all. Merging the two sources is the next scheduled item.`,
                  "Link reachability is not blocking in CI: a dead store URL raises a warning, it does not fail the pipeline.",
                  "Continuous integration cannot currently run for billing reasons; the gates are run locally and the evidence is written to the record.",
                  "One product with paying subscribers (Readio) is absent from this record entirely — widening the scope is the founder's decision, not something done quietly.",
                  "The contact receipt target was 60 seconds; the queue drains once a day. No published text promises faster, but the target is not met.",
                ]
          }
        />
        <p className="mt-6 text-[14px] leading-relaxed text-ink-400">
          {tr ? "İlgili: " : "Related: "}
          <Link href="/transparency" className="link-wipe text-ink-200">
            {tr ? "ürün şeffaflığı" : "product transparency"}
          </Link>
          {" · "}
          <Link href="/case-studies" className="link-wipe text-ink-200">
            {tr ? "vaka çalışmaları" : "case studies"}
          </Link>
        </p>
      </Block>
    </div>
  );
}

function Block({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-14 lg:px-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-50">{title}</h2>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.65] text-ink-300">{intro}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function RuleList({ items, tone }: { items: string[]; tone?: "warn" }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className={`flex gap-3 rounded-2xl border p-4 text-[14.5px] leading-relaxed ${
            tone === "warn"
              ? "border-hairline bg-surface-inset text-ink-300"
              : "border-hairline bg-surface text-ink-300"
          }`}
        >
          <span aria-hidden className={tone === "warn" ? "text-ink-400" : "text-ink-500"}>
            {tone === "warn" ? "!" : "—"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
