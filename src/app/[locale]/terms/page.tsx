import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { company } from "@/data/company";
import { GlassSheen } from "@/components/common/GlassSheen";

const LAST_UPDATED = "2026-09-06";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: text(locale, "Kullanım Şartları", "Terms of Service"),
    description: text(locale, "YULA Lab ürünleri (LifeOS, Burun Farkı, Braavolabs) için ortak kullanım şartları ve son kullanıcı lisans sözleşmesi (EULA).", "Shared terms of service and end-user license agreement (EULA) for YULA Lab products (LifeOS, Burun Farkı, Braavolabs)."),
    alternates: {
      canonical: isTR ? "/terms" : `/${locale}/terms`,
      languages: localeAlternates("/terms"),
    },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Terms />;
}

function Terms() {
  const locale = useLocale();

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Link
            href="/"
            className="font-mono text-[11px] tracking-widest uppercase text-ink-400 hover:text-ink-200 link-wipe"
          >
            ← {text(locale, "Ana sayfa", "Home")}
          </Link>

          <div className="mt-6">
            <EyebrowChip>{text(locale, "Yasal", "Legal")}</EyebrowChip>
          </div>

          <h1 className="mt-6 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {text(locale, "Kullanım Şartları", "Terms of Service")}
          </h1>

          <div className="mt-4 font-mono text-[11px] tracking-widest uppercase text-ink-400">
            {text(locale, "Son güncelleme", "Last updated")}: {LAST_UPDATED}
          </div>

          <p className="mt-6 text-[15.5px] leading-[1.75] text-ink-300">
            {text(locale, "Bu şartlar, YULA Lab tarafından geliştirilen tüm ürünler — LifeOS, Burun Farkı, Braavolabs ve Motion uygulamaları Choreia, Lissom, Gravita, JabLab ve Ostinato (web siteleri ve mobil uygulamalar dahil, birlikte Hizmetler) — için geçerlidir. Hizmetleri kullanarak bu şartları kabul etmiş olursunuz.", "These terms apply to all products developed by YULA Lab — LifeOS, Burun Farkı, Braavolabs and the Motion apps Choreia, Lissom, Gravita, JabLab and Ostinato (including their websites and mobile apps, together the Services). By using the Services you accept these terms.")}
          </p>
          <p className="mt-3 text-[15.5px] leading-[1.75] text-ink-300">
            {text(locale, "Ürüne özel gizlilik uygulamaları için ", "For product-specific privacy practices, see the ")}
            <Link href="/privacy" className="link-wipe text-ink-50">
              {text(locale, "Gizlilik Politikası", "Privacy Policy")}
            </Link>
            {text(locale, " sayfasına bakabilirsiniz.", " page.")}
          </p>

          <div className="mt-10 text-[15.5px] leading-[1.75] text-ink-200 space-y-8">
            <Section title={text(locale, "1. Kabul", "1. Acceptance")}>
              <p>
                {text(locale, "Hizmetleri kullanan, hesap oluşturan veya bir aboneliğe başlayan herkes bu şartları ve son kullanıcı lisans sözleşmesini (EULA) kabul eder. Şartları kabul etmiyorsanız Hizmetleri kullanmamalısınız.", "Anyone who uses the Services, creates an account, or starts a subscription accepts these terms and the end-user license agreement (EULA). If you do not accept them, you must not use the Services.")}{" "}
                {text(locale, "18 yaşından küçükseniz, ebeveyn veya vasinizin bu şartları sizinle birlikte kabul etmesi gerekebilir.", "If you are under 18, a parent or guardian may need to accept these terms together with you.")}
              </p>
            </Section>

            <Section title={text(locale, "2. Lisans (EULA)", "2. License (EULA)")}>
              <p>
                {text(locale, "YULA Lab, size Hizmetleri kişisel ve (Braavolabs için hesabınıza tanımlı) ticari amaçlarla kullanmanız için sınırlı, münhasır olmayan, devredilemez ve geri alınabilir bir lisans verir. Uygulamayı kopyalayamaz, tersine mühendislik uygulayamaz, kaynak koda dönüştüremez veya izinsiz dağıtamazsınız.", "YULA Lab grants you a limited, non-exclusive, non-transferable, revocable license to use the Services for personal and (for Braavolabs) internal business purposes. You may not copy, reverse-engineer, decompile, or distribute the app without authorization.")}
              </p>
              <p className="mt-3">
                {text(locale, "iOS uygulamaları için bu EULA, Apple'ın standart Lisanslı Uygulama Son Kullanıcı Lisans Sözleşmesi ile birlikte geçerlidir; çelişki halinde bu belgedeki koşullar esas alınır. Apple, uygulamanın üçüncü-taraf yararlanıcısıdır ve bu şartları size karşı uygulama hakkına sahiptir.", "For iOS apps, this EULA applies together with Apple's standard Licensed Application End User License Agreement; in case of conflict, the terms in this document govern. Apple is a third-party beneficiary of this agreement and may enforce it against you.")}
              </p>
            </Section>

            <Section title={text(locale, "3. Abonelikler ve ödemeler", "3. Subscriptions and payments")}>
              <p>
                {text(locale, "Ücretli özellikler, Apple App Store ve Google Play üzerinden yönetilen otomatik yenilenen aboneliklerle sunulur. Ödeme, mağaza hesabınızdan tahsil edilir. Abonelik, mevcut dönemin bitiminden en az 24 saat önce iptal edilmezse otomatik yenilenir. Yenilemeyi ve iptali mağaza hesabınızın ayarlarından yönetebilirsiniz; ücret iadeleri ilgili mağazanın politikasına tabidir.", "Paid features are offered via auto-renewing subscriptions managed through the Apple App Store and Google Play. Payment is charged to your store account. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. You manage renewal and cancellation from your store account settings; refunds are subject to the respective store's policy.")}{" "}
                {text(locale, "Motion uygulamalarında fiyatlar mağazanın gösterdiği yerel fiyattır; ücretsiz deneme sunulursa süresi ve yenileme tutarı satın alma ekranında gösterilir.", "Motion prices are the local prices shown by the store; if a free trial is offered, its length and the renewal price are shown on the purchase screen.")}
              </p>
            </Section>

            <Section title={text(locale, "4. Kabul edilebilir kullanım", "4. Acceptable use")}>
              <p>
                {text(locale, "Hizmetleri yasa dışı bir amaçla, başkalarının haklarını ihlal edecek şekilde, sistemin güvenliğini tehlikeye atarak veya makul olmayan bir yük oluşturarak kullanamazsınız. Hesabınızın güvenliğinden ve altında gerçekleşen etkinlikten siz sorumlusunuz.", "You may not use the Services for any unlawful purpose, to infringe others' rights, to compromise system security, or to impose an unreasonable load. You are responsible for your account's security and for activity under it.")}
              </p>
            </Section>

            <Section title={text(locale, "5. Motion uygulamaları — özel şartlar", "5. Motion apps — special terms")}>
              <p data-motion-terms>
                {text(locale, "Choreia, Lissom, Gravita, JabLab ve Ostinato tek bir Motion hesabını paylaşır; hesap 13 yaş ve üzeri içindir ve bazı ülkelerde 18 yaşından küçükler için ebeveyn/vasi onayı gerekir. Bir uygulamada satın alınan bireysel abonelik yalnız o uygulamada geçerlidir; Motion+ beş uygulamayı kapsar. Abonelikler aylık veya yıllık olarak Apple App Store ya da Google Play üzerinden satın alınır ve otomatik yenilenir; yenileme ve iptal mağaza hesabınızdan yönetilir. Abonelik başka bir uygulamada etkinse aynı hesapta ikinci bir Motion+ satın alımı önerilmez. Hesabı silmek beş uygulamadaki hesabı birlikte siler ancak Apple veya Google aboneliğini iptal etmez; aboneliği mağaza hesabınızdan ayrıca iptal etmelisiniz. Motion uygulamaları tıbbi cihaz değildir.", "Choreia, Lissom, Gravita, JabLab and Ostinato share one Motion account; the account is for people aged 13 and over, and in some countries users under 18 need a parent's or guardian's approval. An individual subscription bought in one app applies only to that app; Motion+ covers all five. Subscriptions are bought monthly or yearly through the Apple App Store or Google Play and renew automatically; you manage renewal and cancellation in your store account. While a subscription is active in another app, the same account is not offered a second, overlapping Motion+ purchase. Deleting the account deletes it in all five apps together but does not cancel an Apple or Google subscription; cancel it separately in your store account. The Motion apps are not medical devices.")}
              </p>
            </Section>

            <Section title={text(locale, "6. Burun Farkı — özel şartlar", "6. Burun Farkı — special terms")}>
              <p>
                {text(locale, "Burun Farkı, at yarışı verisi üzerine istatistiksel analiz ve eğitim sunan bir araçtır. Bir bahis platformu DEĞİLDİR; gerçek-parayla bahis işlemi yapmaz ve bahis sitelerine link vermez. İçerik yalnızca 18 yaş ve üstü kullanıcılar içindir. Analizler bir sonucu garanti etmez; kararlarınızın sorumluluğu size aittir. Sorumlu oyun: 18+ · Yeşilay Danışmanlık Merkezi (YEDAM): ", "Burun Farkı is a tool offering statistical analysis and education on horse-racing data. It is NOT a gambling platform; it processes no real-money wagers and links to no betting sites. The content is for users aged 18 and over only. Analyses guarantee no outcome; you are responsible for your decisions. Responsible play: 18+ · Yeşilay Counselling Centre (YEDAM): ")}
                <a href="tel:115" className="underline underline-offset-4 focusable">115</a>
                {" · "}
                <a href="https://yedam.org.tr/telefon-ile-danismanlik" className="underline underline-offset-4 focusable">yedam.org.tr</a>.
              </p>
            </Section>

            <Section title={text(locale, "7. Fikri mülkiyet", "7. Intellectual property")}>
              <p>
                {text(locale, "Hizmetlerin tüm hakları, adı, logosu, tasarımı, yazılımı ve içeriği YULA Lab'e aittir. Ürettiğiniz kişisel verileriniz ve içerikleriniz size aittir; ilgili Gizlilik Politikasında açıklandığı gibi işlenir.", "All rights, name, logo, design, software, and content of the Services belong to YULA Lab. Your personal data and the content you create remain yours; they are processed as described in the relevant Privacy Policy.")}
              </p>
            </Section>

            <Section title={text(locale, "8. Garanti reddi", "8. Disclaimer of warranties")}>
              <p>
                {text(locale, "Hizmetler olduğu gibi ve mevcut olduğu ölçüde sunulur. Kesintisizlik, hatasızlık veya belirli bir amaca uygunluk garantisi verilmez. Yasal olarak verilmesi zorunlu garantiler saklıdır.", "The Services are provided on an as-is and as-available basis. No warranty of uninterrupted, error-free operation or fitness for a particular purpose is given. Warranties that cannot be excluded by law are reserved.")}
              </p>
            </Section>

            <Section title={text(locale, "9. Sorumluluğun sınırlanması", "9. Limitation of liability")}>
              <p>
                {text(locale, "Yürürlükteki yasaların izin verdiği azami ölçüde, YULA Lab dolaylı, arızi veya sonuç niteliğindeki zararlardan sorumlu değildir. Toplam sorumluluk, talebi doğuran olaydan önceki 12 ayda ödediğiniz tutarla sınırlıdır.", "To the maximum extent permitted by law, YULA Lab is not liable for indirect, incidental, or consequential damages. Total liability is limited to the amount you paid in the 12 months preceding the event giving rise to the claim.")}
              </p>
            </Section>

            <Section title={text(locale, "10. Fesih", "10. Termination")}>
              <p>
                {text(locale, "Bu şartları ihlal etmeniz halinde erişiminizi askıya alabilir veya sonlandırabiliriz. Hesabınızı istediğiniz zaman kapatabilirsiniz; kapanışta verileriniz ilgili Gizlilik Politikasında belirtilen sürelerde silinir.", "We may suspend or terminate your access if you breach these terms. You may close your account at any time; upon closure your data is deleted within the periods stated in the relevant Privacy Policy.")}
              </p>
            </Section>

            <Section title={text(locale, "11. Uygulanacak hukuk", "11. Governing law")}>
              <p>
                {text(locale, "Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Tüketici mevzuatının size tanıdığı haklar saklıdır.", "These terms are governed by the laws of the Republic of Türkiye. Rights granted to you by consumer legislation are reserved.")}
              </p>
            </Section>

            <Section title={text(locale, "12. Değişiklikler", "12. Changes")}>
              <p>
                {text(locale, "Bu şartları zaman zaman güncelleyebiliriz. Önemli değişiklikler uygun bir şekilde duyurulur ve Son güncelleme tarihi değişir. Değişiklikten sonra Hizmetleri kullanmaya devam etmeniz güncel şartları kabul ettiğiniz anlamına gelir.", "We may update these terms from time to time. Significant changes will be announced appropriately and the Last updated date will change. Continuing to use the Services after a change means you accept the updated terms.")}
              </p>
            </Section>

            <Section title={text(locale, "13. İletişim", "13. Contact")}>
              <p>
                {text(locale, "Sağlayıcı", "Provider")}: {company.legalName} — {company.founder.name}
                <br />
                {text(locale, "E-posta", "Email")}:{" "}
                <a href={`mailto:${company.contact.email}`} className="link-wipe text-ink-50">
                  {company.contact.email}
                </a>
                <br />
                {text(locale, "Konum", "Location")}: Türkiye
              </p>
            </Section>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-bold text-ink-50 text-[22px] md:text-[24px] mb-3">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
