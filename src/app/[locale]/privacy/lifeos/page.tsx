import { company, CONTROLLER_LINE } from "@/data/company";
import { DATA_RIGHTS_COPY, CHILD_DATA_CONTACT } from "@/data/privacy-copy";
import type { Locale } from "@/i18n/locales";
import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";

const LAST_UPDATED = "2026-10-24";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: text(locale, "Gizlilik · LifeOS", "Privacy · LifeOS"),
    description: text(locale, "LifeOS'un cihazda saklama, isteğe bağlı hizmetler ve veri haklarına ilişkin gizlilik bilgileri.", "LifeOS privacy information about on-device storage, optional services and your data rights."),
    alternates: {
      canonical: isTR ? "/privacy/lifeos" : `/${locale}/privacy/lifeos`,
      languages: localeAlternates("/privacy/lifeos"),
    },
  };
}

export default async function LifeosPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LifeosPrivacy />;
}

function LifeosPrivacy() {
  const locale = useLocale();

  return (
    <div className="page-enter">
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Link
            href="/privacy"
            className="font-mono text-[11px] tracking-widest uppercase text-ink-400 hover:text-ink-200 link-wipe"
          >
            ← {text(locale, "Gizlilik", "Privacy")}
          </Link>

          <div className="mt-6">
            <EyebrowChip>LifeOS</EyebrowChip>
          </div>

          <h1 className="mt-6 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {text(locale, "LifeOS gizlilik politikası", "LifeOS privacy policy")}
          </h1>

          <div className="mt-4 font-mono text-[11px] tracking-widest uppercase text-ink-400">
            {text(locale, "Son güncelleme", "Last updated")}: {LAST_UPDATED}
          </div>

          <div className="mt-10 text-[15.5px] leading-[1.75] text-ink-200 space-y-8">
            <Section title={text(locale, "Tek satırlık özet", "One-line summary")}>
              <p className="text-ink-100">
                {text(locale, "LifeOS, cihaz üstü veri saklamayı temel alan offline-first bir uygulamadır. Hesap, satın alma durumu, çökme raporlaması ve isteğe bağlı çevrimiçi yapay zekâ için işlenen veriler aşağıda ayrı ayrı açıklanır. Cihazda tutulan içerikle bu hizmetlere gönderilen hesap ve hizmet verileri aynı kapsamda değildir.", "LifeOS is an offline-first app built around on-device data storage. Data processed for accounts, purchase state, crash reporting and optional online AI is described separately below. Content kept on your device is distinct from the account and service data sent to those services.")}
              </p>
            </Section>

            <Section title={text(locale, "Cihazda saklanan içerik", "Content stored on your device")}>
              <ul className="list-disc pl-5 space-y-2">
                <li>{text(locale, "Sağlık verileri (Apple Health / Health Connect üzerinden okunan adım, kalp atışı, uyku, egzersiz, kilo ve kan oksijeni; döngü takibini açarsanız ayrı izinle adet kayıtları)", "Health data (read from Apple Health / Health Connect: steps, heart rate, sleep, exercise, weight and blood oxygen; if you turn on cycle tracking, menstruation records with a separate permission)")}</li>
                <li>{text(locale, "Finans kayıtları (gelir, gider, hedefler)", "Financial records (income, expenses, goals)")}</li>
                <li>{text(locale, "Eğitim ve hedef takibi", "Learning and goal tracking")}</li>
                <li>{text(locale, "Sesli günlük ve Z-Rapor kayıtları (konuşma tanıma işletim sisteminin hizmetini kullanır)", "Voice journal and Z-Report entries (speech recognition uses the operating system's service)")}</li>
                <li>{text(locale, "Fotoğraflar ve diğer ek dosyalar", "Photos and other attachments")}</li>
              </ul>
              <p className="mt-4">
                {text(locale, "Ana veritabanının şifreli saklama kapsamı uygulama sürümüne ve platforma bağlıdır. Veritabanı anahtarı platformun güvenli depolama hizmetiyle yönetilir. Ses, fotoğraf, dışa aktarılan dosyalar ve diğer ek dosyalar ayrı dosyalar olabilir; veritabanı şifrelemesi bu dosyaların tamamını kapsadığı anlamına gelmez.", "The main database's encrypted-storage coverage depends on the app version and platform. The database key is managed through the platform's secure storage service. Audio, photos, exports and other attachments may be separate files; database encryption does not mean that it covers every one of those files.")}
              </p>
            </Section>

            <Section title={text(locale, "Sunucumuza giden veriler", "Data sent to our servers")}>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink-100">{text(locale, "Hesap bilgileri", "Account information")}</strong>:
                  {" "}{text(locale, "E-posta ve cihaz ID (yalnızca bir hesap oluşturursanız). Hesap oluşturmadan da uygulamayı çoğu özelliğiyle kullanabilirsiniz.", "Email and device ID (only if you create an account). You can use the app with most features without creating an account.")}
                </li>
                <li>
                  <strong className="text-ink-100">{text(locale, "Çökme raporları", "Crash reports")}</strong>:
                  {" "}{text(locale, "Çökme raporlaması için Sentry kullanılır. Raporlama tercihinizi Ayarlar > Gizlilik bölümünden kontrol edebilir ve değiştirebilirsiniz. Raporlama açıkken uygulama hatalarına ilişkin tanılama verileri Sentry'ye gönderilir.", "Sentry is used for crash reporting. You can check and change your reporting preference in Settings > Privacy. When reporting is enabled, diagnostic data about application errors is sent to Sentry.")}
                </li>
                <li>
                  <strong className="text-ink-100">{text(locale, "Satın alma durumu", "Purchase state")}</strong>:
                  {" "}{text(locale, "Apple App Store / Google Play bildirimleriyle doğrulanır. Hesabınıza bağlı olarak ürün ve plan, abonelik durumu, dönem, bitiş ve ek süre tarihleri, otomatik yenileme durumu, mağaza işlem kimlikleri, ortam (canlı/test), bildirim türü ve mağazanın gönderdiği imzalı bildirim içeriği (fiyat, para birimi ve mağaza ülkesi içerebilir) saklanır. Kart bilgileriniz bize ulaşmaz. Hesap silinince abonelik kayıtları silinir; mağaza bildirim kaydı ise hesabınızla bağı kaldırılarak tutulur.", "Validated with Apple App Store / Google Play notifications. Linked to your account, we store the product and plan, subscription status, period, expiry and grace dates, auto-renew status, store transaction IDs, environment (production/test), notification type and the signed notification content sent by the store (which may include price, currency and storefront country). Your card details never reach us. Deleting your account deletes subscription records; the store notification log is kept with the link to your account removed.")}
                </li>
                <li>
                  <strong className="text-ink-100">{text(locale, "Çevrimiçi yapay zekâ (isteğe bağlı)", "Online AI (optional)")}</strong>:
                  {" "}{text(locale, "Uygulamada sunulduğunda ve kullanmayı seçerseniz, her istekte ekranda gösterilip onayladığınız metin LifeOS sunucusu üzerinden Anthropic PBC'ye (ABD) iletilir ve bir Claude modeliyle işlenir. Anthropic'e hesap kimliğiniz veya e-posta adresiniz gönderilmez; sunucumuz metni ve yanıtı saklamaz.", "When it is offered in the app and you choose to use it, the text shown to you and approved by you for each request is sent through the LifeOS server to Anthropic PBC (USA) and processed by a Claude model. Your account ID and email address are not sent to Anthropic, and our server does not store the text or the reply.")}
                </li>
                <li>
                  <strong className="text-ink-100">{text(locale, "Bulut eşzamanlama", "Cloud sync")}</strong>:
                  {" "}{text(locale, "Bu sürümde bulut eşzamanlama sunulmuyor; kayıtlarınız cihazınızda kalır.", "Cloud sync is not offered in this version; your records stay on your device.")}
                </li>
              </ul>
            </Section>

            <Section title={text(locale, "HealthKit / Health Connect", "HealthKit / Health Connect")}>
              <p>
                {text(locale, "Sağlık verisini okumak için Apple HealthKit (iOS) ve Android Health Connect izinleri istenir. Bu izinleri opsiyonel olarak verirsiniz. Okunan sağlık verisi cihaz üstünde işlenir, sunucuya GÖNDERİLMEZ, model eğitimi için KULLANILMAZ.", "We request Apple HealthKit (iOS) and Android Health Connect permissions to read health data. You grant these optionally. Health data is processed on-device, is NOT sent to any server, and is NOT used for model training.")}
              </p>
            </Section>

            <Section title={text(locale, "Üçüncü taraflar", "Third parties")}>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-ink-100">Supabase</strong>: {text(locale, "Hesap kaydı, abonelik doğrulaması, hesap silme ve (kullanırsanız) çevrimiçi yapay zekâ geçidi. AB içi (Frankfurt) sunucularda barınır.", "Account registration, subscription validation, account deletion and, if you use it, the online AI gateway. Hosted on EU (Frankfurt) servers.")}</li>
                <li><strong className="text-ink-100">Apple HealthKit / Health Connect</strong>: {text(locale, "Sağlık verisi okuma izni (opsiyonel).", "Health data read permission (optional).")}</li>
                <li><strong className="text-ink-100">Apple App Store / Google Play</strong>: {text(locale, "Abonelik ödemesi ve makbuz doğrulama.", "Subscription payments and receipt validation.")}</li>
                <li><strong className="text-ink-100">Sentry</strong>: {text(locale, "Çökme raporları; uygulamadaki raporlama tercihine bağlıdır.", "Crash reports, subject to your reporting preference in the app.")}</li>
                <li><strong className="text-ink-100">Anthropic PBC</strong>: {text(locale, "Onayladığınız çevrimiçi yapay zekâ isteklerini işler.", "Processes the online AI requests you approve.")}</li>
                <li><strong className="text-ink-100">{text(locale, "İsteğe bağlı harici kaynaklar", "Optional external sources")}</strong>: {text(locale, "Kripto fiyatlarını kullanırsanız cihazınız varlık kodlarını doğrudan CoinGecko'ya gönderir ve IP adresiniz sağlayıcıya ulaşır. Bir Hugging Face anahtarı kaydederseniz anahtar yalnız doğrulama için Hugging Face'e gönderilir ve cihazınızın güvenli deposunda kalır. Sesli giriş işletim sisteminin (Apple/Google) konuşma tanıma hizmetini kullanır; cihazınıza ve ayarlarınıza göre ses bu sağlayıcılarca ağ üzerinden işlenebilir.", "If you use crypto prices, your device sends asset codes directly to CoinGecko, which receives your IP address. If you save a Hugging Face key, it is sent to Hugging Face only for validation and stays in your device's secure storage. Voice input uses the operating system's (Apple/Google) speech recognition; depending on your device and settings, audio may be processed by those providers over the network.")}</li>
              </ul>
            </Section>

            <Section title={text(locale, "Veri saklama", "Data retention")}>
              <p>
                {text(locale, "Cihaz verisi siz silene kadar kalır. Hesap silme işlemi ile cihazdaki dosyaların silinmesi ayrı işlemlerdir. Hesap silme işleminin tamamlandığını belgeleyen makbuz kayıtları, hesap silindikten sonra da kullanıcı kimliğiyle birlikte tutulabilir. Bu nedenle tüm sunucu kayıtlarının 30 gün içinde silineceğine dair genel bir garanti vermiyoruz. Hesabınızla ilişkili kayıtların kapsamı, saklama süresi ve silme talebi için support@yulalab.com adresine yazabilirsiniz.", "Device data is kept until you delete it. Deleting an account and removing files from your device are separate actions. Receipts documenting completion of an account deletion may retain the user identifier after the account has been deleted. We therefore do not give a blanket guarantee that all server-side records are removed within 30 days. For the scope and retention period of records associated with your account, or a deletion request, contact support@yulalab.com.")}
              </p>
            </Section>

            <Section title={text(locale, "Çocuklar", "Children")}>
              <p>
                {CHILD_DATA_CONTACT[locale as Locale]}
              </p>
            </Section>

            <Section title={text(locale, "Tıbbi uyarı", "Medical disclaimer")}>
              <p>
                {text(locale, "LifeOS bir sağlık takip aracıdır, TIBBİ TAVSİYE SAĞLAMAZ. Sağlık kararlarınız için lütfen lisanslı bir sağlık profesyoneline danışın. Uygulama herhangi bir hastalığı teşhis, tedavi veya önleme amacı taşımaz.", "LifeOS is a health tracking tool and does NOT provide medical advice. Please consult a licensed health professional for medical decisions. The app is not intended to diagnose, treat, or prevent any disease.")}
              </p>
            </Section>

            <Section title={text(locale, "Haklarınız", "Your rights")}>
              <p>
                {DATA_RIGHTS_COPY[locale as Locale]}
              </p>
              <p className="mt-4">
                {text(locale, "Hesap silme adımları ve uygulama dışından talep yolu: ", "Account deletion steps and the request path outside the app: ")}
                <Link href="/delete-account/lifeos" className="link-wipe text-ink-50">
                  {text(locale, "LifeOS hesabını ve verilerini silme", "Delete your LifeOS account and data")}
                </Link>.
              </p>
            </Section>

            <Section title={text(locale, "Veri güvenliği", "Data security")}>
              <p>
                {text(locale, "Ana veritabanının şifreli saklama kapsamını kullandığınız uygulama sürümü ve platform için kontrol edin; anahtarlar platformun güvenli depolama hizmetiyle yönetilir. Bu koruma kapsamı, ayrı ek dosyalardan ve isteğe bağlı bulut eşzamanlamadan farklıdır. Bulut eşzamanlama için bu sayfada tüm sürümleri kapsayan uçtan uca şifreleme veya sunucunun veriyi okuyamaması garantisi verilmez.", "Check the main database's encrypted-storage coverage for your app version and platform; keys are managed through the platform's secure storage service. This protection has a different scope from separate attachments and optional cloud sync. This page does not guarantee end-to-end encryption or server unreadability of cloud sync data across all versions.")}
              </p>
            </Section>

            <Section title={text(locale, "Değişiklikler", "Changes")}>
              <p>
                {text(locale, "Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikleri uygulama içi bildirimle ve 'Son güncelleme' tarihiyle duyururuz.", "We may update this policy from time to time. Significant changes will be announced via in-app notice and reflected in the 'Last updated' date.")}
              </p>
            </Section>

            <Section title={text(locale, "İletişim", "Contact")}>
              <p>
                {text(locale, "Veri Sorumlusu", "Data Controller")}: {CONTROLLER_LINE}<br />
                {text(locale, "E-posta", "Email")}: <a href="mailto:support@yulalab.com" className="link-wipe text-ink-50">support@yulalab.com</a><br />
                {text(locale, "Adres", "Address")}: {company.publisher.address}<br />
                {text(locale, "Konum", "Location")}: {company.publisher.country}
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
