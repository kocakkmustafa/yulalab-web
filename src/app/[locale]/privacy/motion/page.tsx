import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { company, CONTROLLER_LINE } from "@/data/company";
import { MOTION_PARENTAL_CONSENT_LIVE } from "@/data/motion-release";

const LAST_UPDATED = "2026-10-24";

// Same controller line as the Contact section below (the confirmed REL-03 record).
const CONTROLLER = CONTROLLER_LINE;

const APPS = [
  "Choreia: Learn to Dance",
  "Lissom: Mobility & Yoga",
  "Gravita: Skills & Strength",
  "JabLab: Shadow Training",
  "Ostinato: Music Practice",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: text(locale, "Gizlilik · Motion uygulamaları", "Privacy · Motion apps"),
    description: text(locale, "Motion ailesinin gizlilik bilgileri ve uygulama/sürüm kapsamı: Choreia, Lissom, Gravita, JabLab ve Ostinato.", "Privacy information and app/version scope for the Motion family: Choreia, Lissom, Gravita, JabLab and Ostinato."),
    alternates: {
      canonical: isTR ? "/privacy/motion" : `/${locale}/privacy/motion`,
      languages: localeAlternates("/privacy/motion"),
    },
  };
}

export default async function MotionPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MotionPrivacy />;
}

function MotionPrivacy() {
  const locale = useLocale();

  return (
    <div className="page-enter">
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Link
            href="/privacy"
            className="link-wipe font-mono text-[11px] tracking-widest uppercase text-ink-400"
          >
            ← {text(locale, "Gizlilik", "Privacy")}
          </Link>

          <EyebrowChip>Motion</EyebrowChip>

          <h1 className="mt-6 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {text(locale, "Motion gizlilik bilgileri", "Motion privacy information")}
          </h1>

          <p className="mt-6 font-mono text-[11px] tracking-widest uppercase text-ink-400">
            {text(locale, "Son güncelleme", "Last updated")}: {LAST_UPDATED}
          </p>

          <p className="mt-6 text-[15px] leading-[1.6] text-ink-300">
            {text(locale, "Bu politika, aşağıdaki beş Motion uygulamasının ilk mağaza sürümündeki ortak hesap ve uygulamaya özgü yerel veri kullanımını açıklar:", "This policy describes the shared account and app-specific local data use in the first store release of these five Motion apps:")}
          </p>
          <ul className="mt-3 space-y-1 text-[15px] leading-[1.6] text-ink-200">
            {APPS.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>

          <p className="mt-6 text-[15px] leading-[1.6] text-ink-200">
            <a href="#motion-account-deletion" className="link-wipe text-ink-50">
              {text(locale, "Motion hesabı ve ilişkili veriler için silme talebi", "Request deletion of a Motion account and associated data")}
            </a>
          </p>

          <div className="mt-14 space-y-10 text-[16px] leading-[1.7] text-ink-300">
            <Section title={text(locale, "Ortak hesap ve üyelik", "Shared account and membership")}>
              <p>
                {text(locale, "Beş uygulama tek Motion hesabını kullanır. Kayıt, giriş, e-posta doğrulama ve parola kurtarma için e-posta adresiniz ve parolanız Supabase Auth'a gönderilir; isteğe bağlı görünen adınız Motion profilinde saklanır. Rastgele hesap kimliği oturumunuzu ve uygulama erişiminizi ilişkilendirir. Parolayı uygulamanın seans geçmişine kaydetmeyiz. Her kursun ilk modülü ücretsizdir; kalan dersler ve bağımsız pratik App Store ve Google Play üzerinden abonelikle sunulur. Bireysel abonelik yalnız satın alındığı uygulamada, Motion+ ise beş uygulamada geçerlidir.", "The five apps share one Motion account. Your email address and password go to Supabase Auth for sign-up, sign-in, email confirmation and password recovery; an optional display name is stored in your Motion profile. A random account ID links your session and app access. The apps do not put your password in practice history. The first module of each course is free; the remaining lessons and independent practice are offered by subscription through the App Store and Google Play. An individual subscription covers its own app, and Motion+ covers all five.")}{" "}
                {text(locale, "Hesap oluştururken doğum ayınızı ve yılınızı (gün sorulmaz) ve ülkenizi beyan edersiniz; bu bilgiler hangi hesap özelliklerinin ve korumaların uygulanacağını belirlemek için hesabınızla birlikte saklanır ve bir kez beyan edildikten sonra yalnız destek üzerinden düzeltilebilir.", "When you create an account you declare your birth month and year (we do not ask for the day) and your country; they are stored with your account to decide which account features and protections apply, and after the first declaration they can be corrected only through support.")}
              </p>
              <p className="mt-3">
                {text(locale, "Supabase Auth, parolanızı doğrulamak için bcrypt ile üretilmiş tuzlu bir parola özeti (hash) saklar. Bu kimlik doğrulama kaydı hesabınıza bağlıdır ve hesap girişi ile güvenliği için kullanılır.", "Supabase Auth stores a salted password hash produced with bcrypt to verify your password. This authentication record is linked to your account and used for account sign-in and security.")}
              </p>
            </Section>

            <Section title={text(locale, "Sağlayıcı günlükleri ve yaklaşık konum", "Provider logs and approximate location")}>
              <p>
                {text(locale, "Motion hesap hizmetlerine gönderilen istekler, Supabase ve hizmet sağlayıcılarının sakladığı operasyonel günlüklere IP adresi, kullanıcı aracısı (user agent), işletim sistemi, platform ve çalışma ortamı sürümleri ile istek ve kimlik doğrulama olaylarının teknik ayrıntılarını ekleyebilir. Bunlar teknik hizmet bilgileridir; uygulamalar benzersiz bir cihaz kimliği göndermez. Sağlayıcı günlükleri ayrıca IP adresine dayanan yaklaşık ülke, bölge ve şehir bilgisi içerir. Bu konum bilgisi GPS'ten alınmaz ve uygulamalar konum izni istemez.", "Requests to Motion account services can add your IP address, user agent, operating system, platform and runtime versions, and request and authentication metadata to operational logs retained by Supabase and service providers. These are technical service details; the apps do not send a unique device ID. Provider logs also contain approximate country, region and city information based on the IP address. This location does not come from GPS, and the apps do not request location permission.")}
              </p>
              <p className="mt-3">
                {text(locale, "Günlük kayıtları hesap kimliği veya IP adresi üzerinden sizinle ilişkilendirilebilir. Hesap ve sağlayıcı verileri kimlik doğrulama, güvenlik, hizmetin işletilmesi ve teknik sorunların incelenmesi için kullanılır; reklam veya reklam amaçlı takip için kullanılmaz.", "Log records can be associated with you through an account ID or IP address. Account and provider data are used for authentication, security, operating the service and investigating technical issues; they are not used for advertising or advertising tracking.")}{" "}
                {text(locale, "Uygulamalar parola, oturum belirteci veya e-posta içeriğini günlüğe yazmaz. Sağlayıcı günlükleri en fazla 30 gün saklanır.", "The apps do not write passwords, session tokens or email contents to logs. Provider logs are kept for at most 30 days.")}
              </p>
            </Section>

            <Section title={text(locale, "Satın alma doğrulaması", "Purchase verification")}>
              <p>
                {text(locale, "Abonelikler Apple App Store veya Google Play üzerinden satın alınır; mağaza ürünü ve işlem kanıtı Apple veya Google ile doğrulanır. Bunun için Motion, uygulama kimliği, mağaza, ürün, işlem referansı, üyelik durumu ve bitiş/doğrulama zamanını hesabınızla ilişkili olarak saklar; Google işlem referansı satın alma belirtecini içerebilir. Doğrulama için mağaza sağlayıcısına istek gönderilir. Ödeme kartı bilgilerinizi Motion almaz.", "Subscriptions are purchased through the Apple App Store or Google Play, and the store product and transaction evidence are verified with Apple or Google. For this, Motion stores the app ID, store, product, transaction reference, entitlement status, and expiry/verification times against your account; a Google transaction reference can contain a purchase token. Verification requests go to the store provider. Motion does not receive your payment card details.")}
              </p>
            </Section>

            <Section title={text(locale, "Kamera, isteğe bağlı mikrofon ve cihazdaki geçmiş", "Camera, optional microphone and on-device history")}>
              <p>
                {text(locale, "İlk sürümde beş uygulamada da kamera koçluğu kapalıdır; kurslar kamera izni gerektirmez. Kamera videosu kaydedilmez veya Motion sunucusuna yüklenmez. Ostinato'nun gitar kursunda isteğe bağlı tek nota gözlemini siz başlatır ve mikrofon iznini siz verirsiniz. Yaklaşık nota gözlemi doğruluk veya ustalık puanı üretmez ve dersi tamamlamaz. Ses yalnız cihaz belleğinde işlenir; ham ses dosyası kaydedilmez veya sunucuya yüklenmez. Gözlemi durdurduğunuzda, hesap değiştirdiğinizde ya da ekran veya uygulama arka plana geçtiğinde mikrofon durur; geri dönüşte kendiliğinden başlamaz. Kurs mikrofonsuz tamamlanabilir; diğer dört Motion uygulamasının ilk kursları mikrofon istemez. Okuma, pratik ve öz bildirimli kurs ilerlemesi kamera beceri puanı değildir. Kurs ilerlemesi ve uygulamanın oluşturduğu çalışma geçmişi yalnız o uygulamanın cihazdaki alanında tutulur; Motion hesabına eşitlenmez. Misafir geçmişi giriş yaptığınızda hesabınıza otomatik taşınmaz. Motion hesap kayıtları Frankfurt'taki Supabase projesinde saklanır; iletimde HTTPS kullanılır. Uygulamalarda reklam veya davranış izleme SDK'sı yoktur.", "Camera coaching is disabled in the first release of all five apps; the courses do not require camera permission. Camera video is not recorded or uploaded to Motion servers. In Ostinato's guitar course, you choose to start optional single-note observation and grant microphone permission. The approximate note observation does not produce a correctness or mastery score or complete a lesson. Audio is processed only in device memory; raw audio files are not recorded or uploaded. The microphone stops when you stop observation, change account, or the screen or app leaves the foreground; returning does not restart it. You can complete the course without it; the other four Motion apps' first courses do not request microphone access. Reading, practice and self-reported course progress are not a camera skill score. Course progress and practice history created by an app stay in that app's local device storage; they are not synced to your Motion account. Guest history is not automatically moved into an account when you sign in. Motion account records are stored in its Frankfurt Supabase project, with HTTPS in transit. The apps contain no advertising or behavioral tracking SDK.")}
              </p>
            </Section>

            <section id="motion-account-deletion" className="scroll-mt-28">
              <h2 className="font-display font-bold text-ink-50 text-[22px] md:text-[24px] mb-3">
                {text(locale, "Motion hesabını ve verilerini silme", "Delete a Motion account and its data")}
              </h2>
              <p>
                {text(locale, "Herhangi bir Motion uygulamasında Hesap > Hesabı sil yolunu kullanabilirsiniz. Bu işlem ortak hesabı, profili ve sunucudaki abonelik erişim kayıtlarını siler; kullandığınız uygulamanın o hesaba ait yerel geçmişini temizler. Diğer Motion uygulamaları açılıp çevrimiçi silme kaydını denetlediklerinde kendi yerel hesap geçmişlerini temizler. Misafir kayıtları ayrı kalır.", "Use Account > Delete account in any Motion app. This deletes the shared account, profile and server-side entitlement records, then clears that account's local history in the app you used. Other Motion apps clear their own local account history when next opened and able to check the online deletion receipt. Guest records remain separate.")}{" "}
                {text(locale, "Tek Motion hesabı beş uygulamada ortaktır; silme beşini birden etkiler. Çevrimdışı bir cihaz, internete bağlanıp uygulamayı açana kadar o hesabın yerel geçmişini tutar ve silme kaydını gördüğünde temizler; silme kanıtı yoksa yerel veriyi silmez.", "One Motion account is shared by all five apps, so deletion affects all of them. An offline device keeps that account's local history until it is online and the app is opened; it then clears the history after seeing the deletion receipt and never deletes local data without that proof.")}
              </p>
              <p className="mt-3">
                {text(locale, "Uygulama elinizde yoksa veya silme işlemi başarısız olursa, aşağıdaki bağlantıdan support@yulalab.com adresine Motion hesabı silme talebi gönderin. Talebi işlemek için hesap e-postanızı ve kullandığınız uygulamayı belirtin; parolanızı göndermeyin.", "If you no longer have the app or deletion fails, use the link below to request deletion from support@yulalab.com. Include your account email and the app you used so we can locate the account; do not send your password.")}
              </p>
              <a
                href="mailto:support@yulalab.com?subject=Motion%20account%20deletion"
                className="link-wipe text-ink-50"
              >
                {text(locale, "E-postayla silme talebi gönder", "Email an account deletion request")}
              </a>
              <p className="mt-3">
                {text(locale, "Hesap silmek Apple veya Google aboneliğini iptal etmez; yinelenen ödemeyi durdurmak için aboneliği mağaza hesabınızdan ayrıca iptal edin. Diğer cihazların silmeyi sonradan tanıması için rastgele hesap kimliğinin tek yönlü özeti sunucuda silme kaydı olarak tutulur.", "Deleting the account does not cancel an Apple or Google subscription; cancel it separately in your store account to stop renewal. A one-way digest of the random account ID is retained on the server as a deletion receipt so other devices can recognize deletion on a later launch.")}{" "}
                {text(locale, "Hesap silindiğinde sunucudaki ürün verileri hemen silinir. Yedekler en fazla 30 günlük bir döngüde tutulur; bir yedekten geri dönülürse, o tarihten sonra silinmiş hesaplar yeniden silinir.", "When an account is deleted, its product data on the server is deleted immediately. Backups are kept on a cycle of at most 30 days; if a backup is ever restored, accounts deleted after that point are deleted again.")}
              </p>
            </section>

            <Section title={text(locale, "Sağlık ve fitness", "Health and fitness")}>
              <p>
                {text(locale, "Motion ürünleri hareket ve pratik desteği amacıyla geliştirilmektedir. Tıbbi cihaz değildirler; teşhis koymaz, tedavi önermez, tıbbi tavsiye vermezler. Bir rahatsızlığınız varsa hekiminize danışın.", "Motion products are being developed to support movement and practice. They are not medical devices; they do not diagnose, prescribe treatment, or give medical advice. If you have a health condition, consult your physician.")}
              </p>
            </Section>

            <Section title={text(locale, "Gençler ve yaş sınırı", "Teens and minimum age")}>
              <p>
                {text(locale, "Motion hesabı 13 yaş ve üzeri içindir; 13 yaşından küçükler için hesap açılmaz. Bulunduğunuz ülkenin dijital rıza yaşının altındaysanız (ülkeye göre 13–18), hesap özellikleri bir ebeveyn veya vasinin onayına kadar kısıtlı kalır; bu süre içinde cihazdaki pratik kullanılabilir. 18 yaşından küçük kullanıcılara pazarlama iletisi gönderilmez ve kişiselleştirilmiş reklam gösterilmez; uygulamalarda reklam veya analitik izleme yoktur; ileride ürün analitiği eklenirse 18 yaş altında yalnız açık izinle etkinleşir.", "A Motion account is for people aged 13 and over; no account is created for anyone under 13. If you are below your country's digital consent age (13–18 depending on the country), account features stay limited until a parent or guardian approves; practice on the device remains available meanwhile. Users under 18 receive no marketing messages and no personalised advertising; the apps contain no advertising or analytics tracking, and if product analytics is added later it is enabled for users under 18 only with explicit permission.")}{" "}
                {text(locale, "Veli onayı bekleyen hesaplara satın alma önerilmez; 18 yaş altındaki satın almalar mağazanın aile/ebeveyn denetimlerine tabidir.", "Accounts awaiting parental approval are not offered purchases; purchases by users under 18 are subject to the store's family and parental controls.")}
              </p>
            </Section>

            {MOTION_PARENTAL_CONSENT_LIVE && (
              <Section title={text(locale, "Veli veya vasi onayı", "Parent or guardian approval")}>
                <p data-motion-parental-approval>
                  {text(locale, "Onay gereken gençler, ebeveyn veya vasilerinin e-posta adresini girer. Bu adrese bir kez onay bağlantısı gönderilir; adresin kendisi saklanmaz, yalnız tek yönlü özeti (tekrarlanan istekleri sınırlamak için) tutulur. Bağlantı 7 gün geçerlidir ve onay sayfasında gencin e-posta adresi maskeli gösterilir. Onaylanırsa hesap özellikleri açılır; reddedilirse hesap silinir. 30 gün içinde onaylanmayan hesap silinir.", "Teens who need approval enter a parent's or guardian's email address. One approval link is sent to it; the address itself is not stored, only a one-way digest used to limit repeated requests. The link works for 7 days and the approval page shows the teen's email address masked. If approved, account features open; if declined, the account is deleted. An account not approved within 30 days is deleted.")}
                </p>
              </Section>
            )}

            <Section title={text(locale, "Saklama süreleri", "Retention")}>
              <ul className="space-y-2">
                <li>· {text(locale, "Hesap ve ürün verileri: hesap silinene kadar; silmede hemen.", "Account and product data: until the account is deleted; immediately on deletion.")}</li>
                <li>· {text(locale, "Silme kaydı (hesap kimliğinin tek yönlü özeti): diğer cihazların silmeyi tanıması için.", "Deletion receipt (one-way digest of the account ID): kept so other devices can recognise the deletion.")}</li>
                <li>· {text(locale, "Sağlayıcı günlükleri: en fazla 30 gün.", "Provider logs: at most 30 days.")}</li>
                <li>· {text(locale, "Yedekler: en fazla 30 günlük döngü; geri dönüşte silmeler yeniden uygulanır.", "Backups: cycle of at most 30 days; deletions are reapplied after any restore.")}</li>
                {MOTION_PARENTAL_CONSENT_LIVE && (
                  <li>· {text(locale, "Onaylanmamış genç hesabı: 30 gün.", "Unapproved teen account: 30 days.")}</li>
                )}
                <li>· {text(locale, "Kapanan destek yazışmaları: 90 gün.", "Closed support conversations: 90 days.")}</li>
                <li>· {text(locale, "Abonelik hakkı kayıtları (uygulama, ürün, mağaza işlem referansı, durum, bitiş): abonelik süresince ve hesap silinene kadar; silmede hemen. Ödeme ve fatura kayıtlarını Apple/Google yasal süre boyunca tutar.", "Subscription entitlement records (app, product, store transaction reference, state, expiry): for the subscription and until the account is deleted; immediately on deletion. Apple/Google keep payment and invoice records for the legally required period.")}</li>
              </ul>
            </Section>

            <Section title={text(locale, "Haklarınız", "Your rights")}>
              <p>
                {text(locale, "Hesap profilinizi uygulamada görebilir ve görünen adınızı düzeltebilirsiniz. Verilerinize erişim, düzeltme veya silme taleplerinizi hesap e-postanız ve uygulama adıyla support@yulalab.com adresine iletebilirsiniz. Uygulanabilir KVKK ve GDPR hakları saklıdır.", "You can view your account profile and correct your display name in the app. Send requests to access, correct or delete data to support@yulalab.com with your account email and app name. Applicable rights under Turkish data protection law (KVKK) and GDPR remain available.")}{" "}
                {text(locale, "Ebeveyn veya vasiler, gencin hesabıyla ilgili taleplerini aynı adrese iletebilir. Yanlış beyan edilen doğum tarihi destek üzerinden düzeltilir.", "Parents or guardians can send requests about a teen's account to the same address. An incorrectly declared birth date is corrected through support.")}
              </p>
            </Section>

            <Section title={text(locale, "Değişiklikler", "Changes")}>
              <p>
                {text(locale, "Bu politikayı güncellersek yukarıdaki tarihi değiştiririz. Veri işleme biçimimizde esaslı bir değişiklik olursa uygulama içinde bildiririz.", "If we update this policy we will change the date above. If there is a material change in how we handle data, we will notify you inside the application.")}
              </p>
            </Section>

            <Section title={text(locale, "Veri rolleri ve alt işleyenler", "Data roles and processors")}>
              <p data-motion-data-roles>
                {text(locale, "Veri sorumlusu: {controller}.", "The data controller is {controller}.", { controller: CONTROLLER })}{" "}
                {text(locale, "Supabase (Frankfurt, AB) hesap, kimlik doğrulama ve veritabanı hizmetini bizim adımıza sağlar.", "Supabase (Frankfurt, EU) provides the account, authentication and database service on our behalf.")}{" "}
                {MOTION_PARENTAL_CONSENT_LIVE && (
                  <>
                    {text(locale, "Google (Workspace) veli onayı e-postalarını bizim adımıza gönderir.", "Google (Workspace) sends parental-approval emails on our behalf.")}{" "}
                  </>
                )}
                {text(locale, "Apple ve Google, mağaza satın almaları ve abonelikler için kendi politikalarıyla bağımsız veri sorumlusudur.", "Apple and Google act as independent controllers for store purchases and subscriptions under their own policies.")}
              </p>
            </Section>

            <Section title={text(locale, "İletişim", "Contact")}>
              <p>
                {text(locale, "Veri Sorumlusu", "Data Controller")}: {CONTROLLER_LINE}
                <br />
                {text(locale, "E-posta", "Email")}:{" "}
                <a href="mailto:support@yulalab.com" className="link-wipe text-ink-50">
                  support@yulalab.com
                </a>
                <br />
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
