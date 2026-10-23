import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "@/components/common/icons";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { GlassSheen } from "@/components/common/GlassSheen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: text(locale, "Destek", "Support"),
    description: text(locale, "Braavolabs, Burun Farkı, LifeOS ve Motion uygulamaları için destek ve sıkça sorulan sorular.", "Support and FAQ for Braavolabs, Burun Farkı, LifeOS, and the Motion apps."),
    alternates: {
      canonical: isTR ? "/support" : `/${locale}/support`,
      languages: localeAlternates("/support"),
    },
  };
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Support />;
}

function Support() {
  const locale = useLocale();
  const supportSubject = text(locale, "Ürün desteği / geri bildirim", "Product support / feedback");
  const supportBody = text(locale, "Ürün:\nSürüm / build:\nCihaz ve işletim sistemi:\nYapmak istediğim görev:\nBeklenen sonuç:\nGerçek sonuç / takıldığım adım:\nTekrar oluşturma adımları:\n\nŞifre, doğrulama kodu, API anahtarı veya özel kayıt eklemeyin. Ekran görüntüsündeki kişisel bilgileri kapatın.", "Product:\nVersion / build:\nDevice and operating system:\nTask I wanted to complete:\nExpected result:\nActual result / step where I got stuck:\nSteps to reproduce:\n\nDo not include passwords, verification codes, API keys or private records. Redact personal information in screenshots.");
  const supportHref = `mailto:support@yulalab.com?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <EyebrowChip>{text(locale, "Destek", "Support")}</EyebrowChip>

          <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {text(locale, "Yardımcı olalım.", "We're here to help.")}
          </h1>

          <p className="mt-7 max-w-[52ch] text-[16.5px] md:text-[17.5px] leading-[1.6] text-ink-300">
            {text(locale, "Destek ve geri bildirim için support@yulalab.com adresine yazabilirsiniz. Ürün adı, sürüm ve takıldığınız adım çözümü incelememize yardımcı olur. Şifre, doğrulama kodu, API anahtarı veya özel kayıt göndermeyin.", "Email support@yulalab.com for support or feedback. Include the product, version and step where you got stuck so we can investigate. Do not send passwords, verification codes, API keys or private records.")}
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
            <a
              href={supportHref}
              className="group block rounded-2xl border border-white/15 hover:border-white/30 hover:bg-white/[0.04] p-6 transition-colors focusable"
            >
              <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
                {text(locale, "E-posta", "Email")}
              </div>
              <div className="mt-4 font-display text-[22px] text-ink-50">
                support@yulalab.com
              </div>
              <div className="mt-3 text-sm text-ink-300">
                {text(locale, "E-posta taslağını açar; mesajı siz gönderirsiniz", "Opens an email draft; you send the message")}
              </div>
            </a>

            <Link
              href="/contact"
              className="glass group block p-6 transition-colors focusable"
            >
              <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
                {text(locale, "Genel iletişim", "General contact")}
              </div>
              <div className="mt-4 font-display text-[22px] text-ink-50 flex items-center gap-2">
                {text(locale, "İletişim sayfası", "Contact page")}
                <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
              </div>
              <div className="mt-3 text-sm text-ink-300">
                {text(locale, "Basın · ortaklık · diğer", "Press · partnerships · other")}
              </div>
            </Link>
          </div>

          {/* FAQ */}
          <div className="mt-20">
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-6">
              {text(locale, "Sıkça sorulanlar", "Frequently asked")}
            </div>
            <div className="space-y-8">
              {/* Explain product scope before the store/account workflows below. */}
              <FAQ
                q={text(locale, "Motion uygulamaları (Choreia · Lissom · Gravita · JabLab · Ostinato) için de bunlar geçerli mi?", "Do these apply to the Motion apps (Choreia · Lissom · Gravita · JabLab · Ostinato)?")}
                a={text(locale, "Beş Motion uygulaması tek hesabı paylaşır. İlk sürümde kamera koçluğu beşinde de kapalıdır; her kursun ilk modülü ücretsizdir, kalan dersler ve bağımsız pratik App Store ve Google Play üzerinden abonelikle sunulur; kursların okuma, pratik ve öz bildirimli ilerlemesi kamera beceri puanı değildir. Ostinato'nun gitar kursunda isteğe bağlı, cihaz belleğinde işlenen tek nota gözlemi vardır; siz başlatır ve mikrofon izni verirsiniz. Kurs mikrofonsuz tamamlanabilir; diğer dört ilk kurs mikrofon istemez. Bireysel abonelik ilgili uygulamada, Motion+ beşinde geçerlidir. Hesap silme bütün Motion hesabını etkiler; diğer uygulamalar çevrimiçi silme kaydını denetlediklerinde o hesaba ait yerel geçmişlerini temizler. Diğer YULA Lab ürünlerinde akış farklı olabilir.", "The five Motion apps share one account. Camera coaching is disabled in the first release of all five; the first module of each course is free, and the remaining lessons and independent practice are offered by subscription through the App Store and Google Play; reading, practice and self-reported course progress are not a camera skill score. Ostinato's guitar course offers optional single-note observation processed in device memory; you choose to start it and grant microphone permission. The course can be completed without it; the other four first courses do not request microphone access. An individual subscription covers its own app, and Motion+ covers all five. Account deletion affects the whole Motion account; other apps clear that account's local history when they can check the online deletion receipt. Other YULA Lab products may have different flows.")}
                links={[{ href: "/privacy/motion", label: text(locale, "Motion gizlilik bilgileri", "Motion privacy information") }]}
              />
              <FAQ
                q={text(locale, "Aboneliğimi nasıl iptal ederim?", "How do I cancel my subscription?")}
                a={text(locale, "Abonelik Apple App Store veya Google Play üzerinden yönetilir. iOS: Ayarlar > [Adınız] > Abonelikler. Android: Play Store > Profil > Ödemeler ve abonelikler > Abonelikler. Buradan istediğiniz zaman iptal edebilirsiniz; mevcut dönem sonuna kadar kullanım devam eder.", "Subscriptions are managed via Apple App Store or Google Play. iOS: Settings > [Your name] > Subscriptions. Android: Play Store > Profile > Payments & subscriptions > Subscriptions. Cancel anytime there; access continues until the end of the current period.")}
              />
              <FAQ
                q={text(locale, "Hesabımı nasıl silerim?", "How do I delete my account?")}
                a={text(locale, "Motion için uygulamada Hesap > Hesabı sil yolunu kullanın; uygulamaya erişemiyorsanız support@yulalab.com adresine Motion hesabı silme talebi gönderin. Motion ortak hesabı bütün beş uygulamada silinir; diğer ürünlerde kapsam farklıdır. Braavolabs’ta başka üyeleri olan çalışma alanı kayıtları kalabilir. LifeOS için hesap ve veri silme kapsamını aşağıdaki bağlantıdan inceleyin. Aboneliği iptal etmek ayrı bir işlemdir.", "For Motion, use Account > Delete account in the app, or email support@yulalab.com to request deletion if you cannot access the app. The shared Motion account is deleted across all five apps; other products have different scopes. In Braavolabs, workspace records can remain when other members still belong to that workspace. For LifeOS, check the account and data deletion scope using the link below. Cancel subscriptions separately.")}
                links={[{ href: "/delete-account/lifeos", label: text(locale, "LifeOS hesap ve veri silme", "LifeOS account and data deletion") }]}
              />
              <FAQ
                q={text(locale, "Geri ödeme alabilir miyim?", "Can I get a refund?")}
                a={text(locale, "Abonelik ödemeleri Apple ve Google tarafından yönetildiği için geri ödemeler de onların üzerinden işlenir. Apple için reportaproblem.apple.com, Google için play.google.com/store/account/orderhistory üzerinden talep gönderebilirsiniz. Mağaza kararlarına müdahalemiz yoktur; ancak bir tartışma olursa biz de inceleyip destek olmaya çalışırız.", "Because Apple and Google manage subscription payments, refunds also go through them. For Apple use reportaproblem.apple.com; for Google use play.google.com/store/account/orderhistory. We cannot override store decisions, but if there's a dispute we'll review and try to help.")}
                links={[
                  { href: "https://reportaproblem.apple.com", label: text(locale, "Apple geri ödeme talebi", "Request an Apple refund") },
                  { href: "https://play.google.com/store/account/orderhistory", label: text(locale, "Google Play sipariş geçmişi", "Google Play order history") },
                ]}
              />
              <FAQ
                q={text(locale, "Verim güvende mi?", "Is my data safe?")}
                a={text(locale, "Ürünlerin gizlilik bilgilerini aşağıdaki bağlantıdan okuyabilirsiniz. İletişim TLS ile şifrelenir. LifeOS veritabanının şifreli saklama kapsamı uygulama sürümüne ve platforma bağlıdır; ek dosyalar ve bulut kopyaları ayrı değerlendirilir. Motion ürünleri için uygulama ve sürüme özgü kapsam ayrı açıklanır.", "You can read the product privacy information using the link below. Traffic is TLS-encrypted. The encrypted-storage coverage of the LifeOS database depends on the app version and platform; attachments and cloud copies have separate scopes. The scope for Motion products is described separately by app and version.")}
                links={[{ href: "/privacy", label: text(locale, "Gizlilik politikaları", "Privacy policies") }]}
              />
              <FAQ
                q={text(locale, "Bir hata buldum, nereye bildiririm?", "I found a bug — where do I report it?")}
                a={text(locale, "support@yulalab.com adresine ürün adı, cihaz modeli, işletim sistemi, uygulama sürümü, beklenen ve gerçek sonuç ile tekrar oluşturma adımlarını yazın. Ekran görüntüsündeki kişisel bilgileri kapatın; şifre, token veya özel kayıt göndermeyin.", "Email support@yulalab.com with the product, device, operating system, app version, expected and actual results, and steps to reproduce. Redact personal information in screenshots; do not send passwords, tokens or private records.")}
              />
              <FAQ
                q={text(locale, "Birden fazla cihazda kullanabilir miyim?", "Can I use it on multiple devices?")}
                a={text(locale, "Aynı mağaza hesabıyla birden fazla cihaz kullanmak, aile üyeleriyle satın alma paylaşımından farklıdır. Yeni cihazda satın alırken kullandığınız mağaza hesabıyla giriş yapın; erişim görünmüyorsa satın alımları geri yükleme seçeneğini kullanın veya bize yazın. Google Play Aile Kitaplığı uygulama içi satın almaları paylaşmaz. Apple'da aile paylaşımı yalnız uygun satın alma ve abonelikler için geçerlidir; satın alma ekranındaki koşulları kontrol edin.", "Using several devices with the same store account is different from sharing purchases with family members. Sign in on the new device with the store account used for the purchase; if access is missing, use the restore-purchases option or contact us. Google Play Family Library does not share in-app purchases. On Apple, family sharing applies only to eligible purchases and subscriptions; check the terms shown when purchasing.")}
                links={[
                  { href: "https://support.apple.com/en-us/108107", label: text(locale, "Apple aile abonelikleri", "Apple family subscriptions") },
                  { href: `https://support.google.com/googleplay/answer/7007852?hl=${encodeURIComponent(locale)}`, label: text(locale, "Google Play Aile Kitaplığı", "Google Play Family Library") },
                ]}
              />
              <FAQ
                q={text(locale, "Hangi platformları destekliyorsunuz?", "Which platforms do you support?")}
                a={text(locale, "Yayımlanmış iPhone sürümlerinde Braavolabs iOS 17.0+, LifeOS iOS 16.0+ gerektirir. İndirilebilir sürümler ve mağaza bağlantıları ilgili ürün sayfasında yer alır. Android, iPad ve tablet uyumluluğu ürün ve sürüme göre değişir; indirmeden önce mağaza sayfasındaki cihaz gereksinimlerini kontrol edin.", "The published iPhone versions require iOS 17.0+ for Braavolabs and iOS 16.0+ for LifeOS. Available releases and store links are listed on each product page. Android, iPad, and tablet compatibility varies by product and release; check the device requirements on the store listing before downloading.")}
                links={[{ href: "/projects", label: text(locale, "Ürünler ve indirme bağlantıları", "Products and download links") }]}
              />
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-white/10">
            <div className="mt-4">
              <a
                href={supportHref}
                className="inline-flex items-center gap-2 rounded-full bg-ink-50 text-ink-900 pl-5 pr-4 py-3 text-[14px] font-medium hover:bg-ink-100 transition-colors focusable"
              >
                support@yulalab.com
                <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FAQ({ q, a, links = [] }: { q: string; a: string; links?: { href: string; label: string }[] }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none flex items-start justify-between gap-4 py-3 border-b border-white/[0.06] hover:border-white/15 transition-colors">
        <span className="font-display font-semibold text-[18px] text-ink-100 group-hover:text-ink-50">
          {q}
        </span>
        <span className="font-mono text-[12px] text-ink-400 group-open:rotate-45 transition-transform mt-1.5">+</span>
      </summary>
      <div className="mt-4 text-[15px] leading-[1.7] text-ink-300">{a}</div>
      {links.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-100">
          {links.map(({ href, label }) => (
            <li key={href}>
              {href.startsWith("/") ? (
                <Link href={href} className="inline-flex min-h-11 items-center underline underline-offset-4 focusable">{label}</Link>
              ) : (
                <a href={href} className="inline-flex min-h-11 items-center underline underline-offset-4 focusable">{label}</a>
              )}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
