import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";

const LAST_UPDATED = "2026-05-12";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: isTR ? "Gizlilik · LifeOS" : "Privacy · LifeOS",
    description: isTR
      ? "LifeOS uygulaması için gizlilik politikası. Verileriniz cihazınızda kalır."
      : "Privacy policy for the LifeOS application. Your data stays on your device.",
    alternates: {
      canonical: isTR ? "/privacy/lifeos" : `/${locale}/privacy/lifeos`,
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
  const isTR = locale === "tr";

  return (
    <div className="page-enter">
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Link
            href="/privacy"
            className="font-mono text-[11px] tracking-widest uppercase text-ink-400 hover:text-ink-200 link-wipe"
          >
            ← {isTR ? "Gizlilik" : "Privacy"}
          </Link>

          <div className="mt-6">
            <EyebrowChip>LifeOS</EyebrowChip>
          </div>

          <h1 className="mt-6 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {isTR ? "LifeOS gizlilik politikası" : "LifeOS privacy policy"}
          </h1>

          <div className="mt-4 font-mono text-[11px] tracking-widest uppercase text-ink-400">
            {isTR ? "Son güncelleme" : "Last updated"}: {LAST_UPDATED}
          </div>

          <div className="mt-10 text-[15.5px] leading-[1.75] text-ink-200 space-y-8">
            <Section title={isTR ? "Tek satırlık özet" : "One-line summary"}>
              <p className="text-ink-100">
                {isTR
                  ? "LifeOS, kişisel verilerinizi cihazınızda şifreli olarak saklayan offline-first bir uygulamadır. Sunucumuza hiçbir kişisel veri kalıcı olarak gönderilmez (bulut senkronu seçeneği hariç — bu da uçtan uca şifrelidir)."
                  : "LifeOS is an offline-first app that stores your personal data encrypted on your device. No personal data is permanently sent to our servers (except optional cloud sync, which is end-to-end encrypted)."}
              </p>
            </Section>

            <Section title={isTR ? "Cihaz üstü kalan veriler" : "Data that stays on your device"}>
              <ul className="list-disc pl-5 space-y-2">
                <li>{isTR ? "Sağlık verileri (Apple Health / Health Connect üzerinden okunan adım, kalp atışı, uyku, egzersiz)" : "Health data (read from Apple Health / Health Connect: steps, heart rate, sleep, exercise)"}</li>
                <li>{isTR ? "Finans kayıtları (gelir, gider, hedefler)" : "Financial records (income, expenses, goals)"}</li>
                <li>{isTR ? "Eğitim ve hedef takibi" : "Learning and goal tracking"}</li>
                <li>{isTR ? "Sesli günlük ve Z-Rapor kayıtları (ses cihazda metne dönüştürülür)" : "Voice journal and Z-Report entries (audio is transcribed on-device)"}</li>
                <li>{isTR ? "Fotoğraflar ve diğer ek dosyalar" : "Photos and other attachments"}</li>
              </ul>
              <p className="mt-4">
                {isTR
                  ? "Tüm bu veriler SQLCipher + AES-256 ile cihaz üstünde şifrelenir. Anahtar cihazın Keychain (iOS) veya Keystore (Android) içinde saklanır."
                  : "All of this is encrypted on-device with SQLCipher + AES-256. The encryption key is stored in the device's Keychain (iOS) or Keystore (Android)."}
              </p>
            </Section>

            <Section title={isTR ? "Sunucumuza giden veriler" : "Data sent to our servers"}>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-ink-100">{isTR ? "Hesap bilgileri" : "Account information"}</strong>:
                  {" "}{isTR
                    ? "E-posta ve cihaz ID (yalnızca bir hesap oluşturursanız). Hesap oluşturmadan da uygulamayı çoğu özelliğiyle kullanabilirsiniz."
                    : "Email and device ID (only if you create an account). You can use the app with most features without creating an account."}
                </li>
                <li>
                  <strong className="text-ink-100">{isTR ? "Anonim çökme raporları" : "Anonymous crash reports"}</strong>:
                  {" "}{isTR
                    ? "Sentry üzerinden, ve VARSAYILAN OLARAK KAPALI. Ayarlar > Gizlilik bölümünden açabilirsiniz; veriyi tanımlayan kişisel bilgi içermez."
                    : "Via Sentry, and DISABLED BY DEFAULT. You can enable it in Settings > Privacy; the data contains no personally identifying information."}
                </li>
                <li>
                  <strong className="text-ink-100">{isTR ? "Satın alma durumu" : "Purchase state"}</strong>:
                  {" "}{isTR
                    ? "Apple App Store / Google Play makbuz doğrulaması. Sadece aktif/pasif ve seviye (Plus / Pro) bilgisi saklanır."
                    : "Apple App Store / Google Play receipt validation. We only store active/inactive and tier (Plus / Pro)."}
                </li>
                <li>
                  <strong className="text-ink-100">{isTR ? "Bulut yedek (opsiyonel)" : "Cloud backup (optional)"}</strong>:
                  {" "}{isTR
                    ? "Eğer açık olarak etkinleştirirseniz, verileriniz şifreli bundle olarak Supabase Storage'a yüklenir. Şifre çözme anahtarı cihazınızdadır — YULA Lab veriyi okuyamaz, eğitim için kullanamaz."
                    : "If you explicitly enable it, your data is uploaded to Supabase Storage as an encrypted bundle. The decryption key stays on your device — YULA Lab cannot read or use the data for training."}
                </li>
              </ul>
            </Section>

            <Section title={isTR ? "HealthKit / Health Connect" : "HealthKit / Health Connect"}>
              <p>
                {isTR
                  ? "Sağlık verisini okumak için Apple HealthKit (iOS) ve Android Health Connect izinleri istenir. Bu izinleri opsiyonel olarak verirsiniz. Okunan sağlık verisi cihaz üstünde işlenir, sunucuya GÖNDERİLMEZ, model eğitimi için KULLANILMAZ. Apple Health Veri Kullanım Politikası ile tam uyumludur."
                  : "We request Apple HealthKit (iOS) and Android Health Connect permissions to read health data. You grant these optionally. Health data is processed on-device, is NOT sent to any server, and is NOT used for model training. Fully compliant with Apple's Health Data Use Policy."}
              </p>
            </Section>

            <Section title={isTR ? "Üçüncü taraflar" : "Third parties"}>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-ink-100">Supabase</strong>: {isTR ? "Hesap kaydı ve opsiyonel bulut yedek. AB içi (Frankfurt) sunucularda barınır." : "Account registration and optional cloud backup. Hosted on EU (Frankfurt) servers."}</li>
                <li><strong className="text-ink-100">Apple HealthKit / Health Connect</strong>: {isTR ? "Sağlık verisi okuma izni (opsiyonel)." : "Health data read permission (optional)."}</li>
                <li><strong className="text-ink-100">Apple App Store / Google Play</strong>: {isTR ? "Abonelik ödemesi ve makbuz doğrulama." : "Subscription payments and receipt validation."}</li>
                <li><strong className="text-ink-100">Sentry</strong>: {isTR ? "Çökme raporları (varsayılan KAPALI)." : "Crash reports (disabled by default)."}</li>
              </ul>
            </Section>

            <Section title={isTR ? "Veri saklama" : "Data retention"}>
              <p>
                {isTR
                  ? "Cihaz verisi siz silene kadar kalır. Hesap silindiğinde sunucudaki kayıtlar 30 gün içinde silinir. Bulut yedeklerini istediğiniz zaman tek tıkla silebilirsiniz."
                  : "Device data is kept until you delete it. When you delete your account, server-side records are removed within 30 days. You can delete cloud backups with a single tap at any time."}
              </p>
            </Section>

            <Section title={isTR ? "Çocuklar" : "Children"}>
              <p>
                {isTR
                  ? "LifeOS 13 yaş ve üzeri kullanıcılar içindir. 13 yaşından küçük bir kullanıcıdan veri topladığımızı fark edersek hesabı silip kayıtları temizleriz."
                  : "LifeOS is for users 13 and older. If we learn that we have collected data from a child under 13, we will delete the account and clear the records."}
              </p>
            </Section>

            <Section title={isTR ? "Tıbbi uyarı" : "Medical disclaimer"}>
              <p>
                {isTR
                  ? "LifeOS bir sağlık takip aracıdır, TIBBİ TAVSİYE SAĞLAMAZ. Sağlık kararlarınız için lütfen lisanslı bir sağlık profesyoneline danışın. Uygulama herhangi bir hastalığı teşhis, tedavi veya önleme amacı taşımaz."
                  : "LifeOS is a health tracking tool and does NOT provide medical advice. Please consult a licensed health professional for medical decisions. The app is not intended to diagnose, treat, or prevent any disease."}
              </p>
            </Section>

            <Section title={isTR ? "Haklarınız" : "Your rights"}>
              <p>
                {isTR
                  ? "KVKK Madde 11 ve GDPR Madde 15-22 kapsamındaki erişim, düzeltme, silme, taşıma ve itiraz haklarına sahipsiniz. Uygulama içinden tek tıkla tüm cihaz verisini export edebilir veya silebilirsiniz. Sunucu kayıtları için merhaba@yulalab.com adresine yazın."
                  : "You have rights of access, correction, deletion, portability, and objection under KVKK Article 11 and GDPR Articles 15-22. From within the app you can export or delete all device data with one tap. For server-side records, email merhaba@yulalab.com."}
              </p>
            </Section>

            <Section title={isTR ? "Veri güvenliği" : "Data security"}>
              <p>
                {isTR
                  ? "Cihaz veritabanı SQLCipher + AES-256 ile şifrelenir. Anahtar Keychain/Keystore içinde tutulur. Bulut yedekler uçtan uca şifrelenir — sunucu hiçbir veriyi açık metin görmez. İletişim TLS 1.2+ ile yapılır."
                  : "The device database is encrypted with SQLCipher + AES-256. The key is stored in Keychain/Keystore. Cloud backups are end-to-end encrypted — the server never sees plaintext. Communication uses TLS 1.2+."}
              </p>
            </Section>

            <Section title={isTR ? "Değişiklikler" : "Changes"}>
              <p>
                {isTR
                  ? "Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikleri uygulama içi bildirimle ve 'Son güncelleme' tarihiyle duyururuz."
                  : "We may update this policy from time to time. Significant changes will be announced via in-app notice and reflected in the 'Last updated' date."}
              </p>
            </Section>

            <Section title={isTR ? "İletişim" : "Contact"}>
              <p>
                {isTR ? "Veri Sorumlusu" : "Data Controller"}: YULA Lab — Mustafa Kaan Koçak<br />
                {isTR ? "E-posta" : "Email"}: <a href="mailto:merhaba@yulalab.com" className="link-wipe text-ink-50">merhaba@yulalab.com</a><br />
                {isTR ? "Konum" : "Location"}: Türkiye
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
