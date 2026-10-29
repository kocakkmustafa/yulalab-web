import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { company, providerLine } from "@/data/company";
import { GlassSheen } from "@/components/common/GlassSheen";

const LAST_UPDATED = "2026-10-30";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: text(locale, "Kullanım Şartları", "Terms of Service"),
    description: text(locale, "YULA Lab ürünleri (LifeOS, Burun Farkı, Braavolabs ve Motion uygulamaları) için ortak kullanım şartları ve son kullanıcı lisans sözleşmesi (EULA).", "Shared terms of service and end-user license agreement (EULA) for YULA Lab products (LifeOS, Burun Farkı, Braavolabs and the Motion apps)."),
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
          <p className="mt-3 text-[15.5px] leading-[1.75] text-ink-300">
            {text(locale, "Bu metin birden çok dilde sunulur. Çeviriler arasında fark olması hâlinde Türkçe metin esas alınır; bu, bulunduğunuz ülkenin tüketicilere tanıdığı emredici hakları sınırlamaz.", "This text is provided in several languages. If translations differ, the Turkish version prevails; this does not limit mandatory consumer rights in your country.")}
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
                {text(locale, "iOS uygulamalarında Apple'ın standart Lisanslı Uygulama Son Kullanıcı Lisans Sözleşmesi (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) geçerlidir; bu şartlar onu tamamlar. Bu sözleşme yalnız sizinle YULA Lab arasındadır; Apple'ın uygulamanın bakımı, desteği, garantisi veya uygulamaya ilişkin talepler bakımından bir yükümlülüğü yoktur. Apple ve iştirakleri bu şartların üçüncü taraf lehtarıdır.", "For iOS apps, Apple's standard Licensed Application End User License Agreement (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) applies and these terms supplement it. This agreement is between you and YULA Lab only; Apple has no obligation for maintenance, support, warranty or claims relating to the app. Apple and its subsidiaries are third-party beneficiaries of these terms.")}
              </p>
            </Section>

            <Section title={text(locale, "3. Abonelikler ve ödemeler", "3. Subscriptions and payments")}>
              <p>
                {text(locale, "Ücretli özellikler, Apple App Store ve Google Play üzerinden yönetilen otomatik yenilenen aboneliklerle sunulur. Ödeme, mağaza hesabınızdan tahsil edilir. Aboneliğiniz, mevcut dönem bitmeden mağaza hesabınızdan iptal edilmedikçe aynı süre için, mağazanın gösterdiği fiyatla otomatik yenilenir (App Store'da dönem bitiminden en az 24 saat önce iptal etmeniz gerekir). İadeler mağazanın politikasına tabidir; tüketici mevzuatından doğan emredici haklarınız saklıdır.", "Paid features are offered via auto-renewing subscriptions managed through the Apple App Store and Google Play. Payment is charged to your store account. Your subscription renews automatically for the same period at the price shown by the store unless you cancel it in your store account before the current period ends (on the App Store, at least 24 hours before). Refunds are subject to the store's policy; your mandatory consumer rights remain unaffected.")}{" "}
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
                {text(locale, "Choreia, Lissom, Gravita, JabLab ve Ostinato tek bir Motion hesabını paylaşır; hesap 13 yaş ve üzeri içindir ve bazı ülkelerde 18 yaşından küçükler için ebeveyn/vasi onayı gerekir. Bir uygulamada satın alınan bireysel abonelik yalnız o uygulamada geçerlidir; Motion+ beş uygulamayı kapsar. Abonelikler aylık veya yıllık olarak Apple App Store ya da Google Play üzerinden satın alınır ve otomatik yenilenir; yenileme ve iptal mağaza hesabınızdan yönetilir. Abonelik başka bir uygulamada etkinse aynı hesapta ikinci bir Motion+ satın alımı önerilmez. Hesabı silmek beş uygulamadaki hesabı birlikte siler ancak Apple veya Google aboneliğini iptal etmez; aboneliği mağaza hesabınızdan ayrıca iptal etmelisiniz. Bu, veli reddi veya onay süresinin dolması nedeniyle yapılan silmeler için de geçerlidir. Motion uygulamaları tıbbi cihaz değildir.", "Choreia, Lissom, Gravita, JabLab and Ostinato share one Motion account; the account is for people aged 13 and over, and in some countries users under 18 need a parent's or guardian's approval. An individual subscription bought in one app applies only to that app; Motion+ covers all five. Subscriptions are bought monthly or yearly through the Apple App Store or Google Play and renew automatically; you manage renewal and cancellation in your store account. While a subscription is active in another app, the same account is not offered a second, overlapping Motion+ purchase. Deleting the account deletes it in all five apps together but does not cancel an Apple or Google subscription; cancel it separately in your store account. This also applies when an account is deleted because a parent declines or the approval period ends. The Motion apps are not medical devices.")}{" "}
                {text(locale, "Yeni abonelere mağaza sunduğunda 14 günlük ücretsiz deneme verilir; deneme, bitiminden en az 24 saat önce iptal edilmezse seçilen pakete mağazanın gösterdiği fiyattan otomatik geçer. Motion+ ücretsiz denemesi hesap başına bir kez sunulur. Her kurs ücretsiz derslerle başlar — en az ilk modülü ya da yaklaşık ilk üçte biri — ve bazı giriş kursları tamamen ücretsizdir; hangi derslerin ücretsiz olduğu uygulamada gösterilir. Kalan dersler ve bağımsız pratik aşaması abonelik gerektirir. İlerleme kayıtlarınız abonelik bitse de görüntülenebilir. Kamera koçluğu ve hareket puanlaması bu sürümde sunulmaz.", "Where the store offers it, new subscribers get a 14-day free trial; unless cancelled at least 24 hours before it ends, the trial continues as the selected plan at the price shown by the store. The Motion+ free trial is offered once per account. Each course opens with free lessons — at least its first module or about its first third — and some introductory courses are entirely free; the app shows which lessons are free. The remaining lessons and the independent practice stage require a subscription. Your progress records stay viewable even after a subscription ends. Camera coaching and movement scoring are not offered in this version.")}
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

            <Section title={text(locale, "7. LifeOS — özel şartlar", "7. LifeOS — special terms")}>
              <p>
                {text(locale, "Çevrimiçi yapay zekâ (uygulamada sunulduğunda): yeni hesaplarda, hesap açılışından itibaren 24 saat içinde en fazla 20 istek ücretsizdir. Sonrasında yalnız Premium abonelere, her gün (UTC 00:00'da sıfırlanır) en fazla 20 istekle sunulur. Sunucuya kabul edilen bir istek teknik bir hatayla sonuçlansa da kotadan düşer. Elle kayıt sınırsız ve ücretsizdir.", "Online AI (when offered in the app): new accounts get up to 20 free requests within 24 hours of account creation. After that it is available to Premium subscribers only, up to 20 requests per day (resets at 00:00 UTC). A request accepted by the server counts toward the limit even if it ends in a technical error. Manual logging is unlimited and free.")}
              </p>
              <p className="mt-3">
                {text(locale, "Yapay zekâ çıktıları: Çevrimiçi yapay zekâ yanıtları ve otomatik çıkarımlar yapay zekâ tarafından üretilir; hatalı, eksik veya güncel olmayabilir. Kaydetmeden önce kontrol etmeniz gerekir. Bu çıktılar ve LifeOS'un sağlık/finans özetleri tıbbi, psikolojik, finansal, yatırım veya hukuki tavsiye değildir; teşhis veya tedavi amacı taşımaz. Acil bir durumda 112'yi arayın. Yapay zekâya başkalarına ait kişisel verileri yazmayın.", "AI outputs: online AI answers and automatic extractions are generated by artificial intelligence and may be wrong, incomplete or outdated; review them before saving. They, and LifeOS health/finance summaries, are not medical, psychological, financial, investment or legal advice and are not intended to diagnose or treat. In an emergency, call your local emergency number. Do not enter other people's personal data into AI.")}
              </p>
            </Section>

            <Section title={text(locale, "8. Fikri mülkiyet", "8. Intellectual property")}>
              <p>
                {text(locale, "Hizmetlerin tüm hakları, adı, logosu, tasarımı, yazılımı ve içeriği YULA Lab'e aittir. Ürettiğiniz kişisel verileriniz ve içerikleriniz size aittir; ilgili Gizlilik Politikasında açıklandığı gibi işlenir.", "All rights, name, logo, design, software, and content of the Services belong to YULA Lab. Your personal data and the content you create remain yours; they are processed as described in the relevant Privacy Policy.")}
              </p>
            </Section>

            <Section title={text(locale, "9. Garanti reddi", "9. Disclaimer of warranties")}>
              <p>
                {text(locale, "Hizmetler olduğu gibi ve mevcut olduğu ölçüde sunulur. Kesintisizlik, hatasızlık veya belirli bir amaca uygunluk garantisi verilmez. Yasal olarak verilmesi zorunlu garantiler saklıdır.", "The Services are provided on an as-is and as-available basis. No warranty of uninterrupted, error-free operation or fitness for a particular purpose is given. Warranties that cannot be excluded by law are reserved.")}
              </p>
            </Section>

            <Section title={text(locale, "10. Sorumluluğun sınırlanması", "10. Limitation of liability")}>
              <p>
                {text(locale, "Kanunun izin verdiği ölçüde, hafif ihmalden doğan dolaylı zararlardan ve düzenli yedekle önlenebilecek veri kaybından sorumlu değiliz. Bu sınırlama; kast veya ağır ihmal, hayat ve sağlığa verilen zararlar ile tüketici mevzuatı ve diğer emredici hükümlerden doğan sorumluluğumuzu kapsamaz.", "To the extent permitted by law, we are not liable for indirect damage caused by slight negligence or for data loss that regular backups would have prevented. This limitation does not apply to intent or gross negligence, injury to life or health, or liability under consumer protection law or other mandatory rules.")}
              </p>
            </Section>

            <Section title={text(locale, "11. Fesih", "11. Termination")}>
              <p>
                {text(locale, "Bu şartları ihlal etmeniz halinde erişiminizi askıya alabilir veya sonlandırabiliriz. Hesabınızı istediğiniz zaman kapatabilirsiniz; kapanışta verileriniz ilgili Gizlilik Politikasında belirtilen sürelerde silinir.", "We may suspend or terminate your access if you breach these terms. You may close your account at any time; upon closure your data is deleted within the periods stated in the relevant Privacy Policy.")}
              </p>
            </Section>

            <Section title={text(locale, "12. Uygulanacak hukuk", "12. Governing law")}>
              <p>
                {text(locale, "Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Tüketiciyseniz 6502 sayılı Kanun uyarınca yerleşim yerinizdeki tüketici hakem heyetine veya tüketici mahkemesine başvurabilirsiniz. Türkiye dışında yaşıyorsanız, ülkenizin tüketiciyi koruyan emredici hükümleri ve mahkemelere başvurma hakkınız saklıdır.", "These terms are governed by the laws of the Republic of Türkiye. If you are a consumer in Türkiye, you may apply to the consumer arbitration committee or consumer court of your place of residence. If you live elsewhere, the mandatory consumer protection rules of your country and your right to sue there are not affected.")}
              </p>
            </Section>

            <Section title={text(locale, "13. Değişiklikler", "13. Changes")}>
              <p>
                {text(locale, "Bu şartlarda önemli bir değişiklik yaptığımızda, yürürlüğe girmeden en az 30 gün önce uygulama içinde ve/veya e-postayla bildiririz. Kabul etmiyorsanız yürürlükten önce hesabınızı kapatabilir ve aboneliğinizi mağazadan iptal edebilirsiniz; yasal haklarınız saklıdır.", "We will notify you of significant changes to these terms in the app and/or by email at least 30 days before they take effect. If you do not agree, you may close your account and cancel your subscription in the store before that date; your statutory rights are unaffected.")}
              </p>
            </Section>

            <Section title={text(locale, "14. İletişim", "14. Contact")}>
              <p>
                {text(locale, "Sağlayıcı", "Provider")}: {providerLine(locale)}
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
