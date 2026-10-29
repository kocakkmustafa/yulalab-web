import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { company } from "@/data/company";

const LAST_UPDATED = "2026-10-30";
const REQUEST_EMAIL = "support@yulalab.com";
// Same subject as the request link on privacy/motion#motion-account-deletion.
const REQUEST_HREF = `mailto:${REQUEST_EMAIL}?subject=Motion%20account%20deletion`;

// Store listing names, as on privacy/motion.
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
    title: text(locale, "Motion hesap ve veri silme", "Motion account and data deletion"),
    description: text(locale, "Choreia, Lissom, Gravita, JabLab ve Ostinato'nun ortak Motion hesabını ve verilerini uygulama içinden ya da uygulamaya erişmeden nasıl sileceğinizi öğrenin.", "How to delete the shared Motion account and its data for Choreia, Lissom, Gravita, JabLab and Ostinato, in the app or without access to it."),
    alternates: {
      canonical: isTR ? "/delete-account/motion" : `/${locale}/delete-account/motion`,
      languages: localeAlternates("/delete-account/motion"),
    },
  };
}

// One web page for the account deletion URL of all five Motion store listings (Google Play
// "delete without reinstalling"): steps, what is deleted, what is kept and for how long.
// Sentences shared with privacy/motion are reused verbatim so the two pages cannot drift.
export default async function MotionAccountDeletionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="page-enter">
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Link
            href="/privacy/motion"
            className="font-mono text-[11px] tracking-widest uppercase text-ink-300 hover:text-ink-100 link-wipe"
          >
            ← {text(locale, "Motion gizlilik bilgileri", "Motion privacy information")}
          </Link>

          <div className="mt-6"><EyebrowChip>Motion · {company.legalName}</EyebrowChip></div>
          <h1 className="mt-6 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {text(locale, "Motion hesabını ve verilerini silme", "Delete a Motion account and its data")}
          </h1>
          <p className="mt-4 font-mono text-[11px] tracking-widest uppercase text-ink-300">
            {text(locale, "Son güncelleme", "Last updated")}: {LAST_UPDATED}
          </p>

          <p className="mt-6 text-[15.5px] leading-[1.75] text-ink-200">
            {text(locale, "Bu sayfa, {publisher} tarafından geliştirilen ve tek bir Motion hesabını paylaşan beş Motion uygulamasını kapsar:", "This page covers the five Motion apps developed by {publisher}, which share one Motion account:", { publisher: company.legalName })}
          </p>
          <ul className="mt-3 space-y-1 text-[15.5px] leading-[1.75] text-ink-200" data-motion-deletion-apps>
            {APPS.map((app) => (
              <li key={app}>· {app}</li>
            ))}
          </ul>

          <div className="mt-10 text-[15.5px] leading-[1.75] text-ink-200 space-y-9">
            <Section title={text(locale, "Uygulama olmadan silme talebi", "Request deletion without the app")}>
              <ol className="list-decimal pl-5 space-y-2" data-motion-deletion-steps>
                <li>{text(locale, "support@yulalab.com adresine “Motion account deletion” konulu bir e-posta gönderin; aşağıdaki bağlantı e-postayı hazırlar.", "Email support@yulalab.com with the subject “Motion account deletion”; the link below prepares the email.")}</li>
                <li>{text(locale, "Hesabınızın e-posta adresini ve kullandığınız Motion uygulamasını yazın; mümkünse e-postayı bu adresten gönderin. Parolanızı göndermeyin.", "Include your account email address and the Motion app you used, and send from that address if you can. Do not send your password.")}</li>
                <li>{text(locale, "Hesabın size ait olduğunu doğrulamak için hesap e-postanıza yazabiliriz. Ardından hesap ve sunucudaki verileri silinir ve size bildirilir.", "We may write to your account email to confirm that the account is yours. The account and its server data are then deleted, and we let you know.")}</li>
              </ol>
              <p className="mt-4">{text(locale, "Uygulamayı yeniden yüklemeniz gerekmez.", "You do not need to reinstall the app.")}</p>
              <a
                href={REQUEST_HREF}
                className="mt-5 inline-flex rounded-lg border border-white/25 px-5 py-3 text-ink-50 hover:bg-white/[0.06] focusable"
              >
                {text(locale, "E-postayla silme talebi gönder", "Email an account deletion request")} · {REQUEST_EMAIL}
              </a>
            </Section>

            <Section title={text(locale, "Uygulama içinden", "In the app")}>
              <p>
                {text(locale, "Herhangi bir Motion uygulamasında Hesap > Hesabı sil yolunu kullanabilirsiniz. Bu işlem ortak hesabı, profili ve sunucudaki abonelik erişim kayıtlarını siler; kullandığınız uygulamanın o hesaba ait yerel geçmişini temizler. Diğer Motion uygulamaları açılıp çevrimiçi silme kaydını denetlediklerinde kendi yerel hesap geçmişlerini temizler. Misafir kayıtları ayrı kalır.", "Use Account > Delete account in any Motion app. This deletes the shared account, profile and server-side entitlement records, then clears that account's local history in the app you used. Other Motion apps clear their own local account history when next opened and able to check the online deletion receipt. Guest records remain separate.")}{" "}
                {text(locale, "Tek Motion hesabı beş uygulamada ortaktır; silme beşini birden etkiler. Çevrimdışı bir cihaz, internete bağlanıp uygulamayı açana kadar o hesabın yerel geçmişini tutar ve silme kaydını gördüğünde temizler; silme kanıtı yoksa yerel veriyi silmez.", "One Motion account is shared by all five apps, so deletion affects all of them. An offline device keeps that account's local history until it is online and the app is opened; it then clears the history after seeing the deletion receipt and never deletes local data without that proof.")}
              </p>
            </Section>

            <Section title={text(locale, "Silinen veriler", "Data that is deleted")}>
              <p>{text(locale, "Silme; ortak Motion hesabını, e-posta adresini ve parola özetini, görünen adı, doğum ayı ve yılını, ülkeyi, abonelik hakkı kayıtlarını, Motion+ deneme kaydını ve veli onayı kaydını (veli e-postasının tek yönlü özeti, durum ve tarihler) kapsar.", "Deletion covers the shared Motion account, its email address and password hash, the display name, birth month and year, country, subscription entitlement records, the Motion+ trial record and the parental-approval record (one-way digest of the parent's email, status and dates).")}</p>
              <p className="mt-4">{text(locale, "Kurs ilerlemesi ve çalışma geçmişi yalnız cihazda tutulur. Hesaba bağlı yerel geçmiş yukarıda anlatıldığı gibi temizlenir; misafir kayıtlarını silmek için uygulamanın verilerini cihaz ayarlarından silin veya uygulamayı kaldırın.", "Course progress and practice history are kept only on the device. Account-linked local history is cleared as described above; to delete guest records, clear the app's data in your device settings or uninstall the app.")}</p>
            </Section>

            <Section title={text(locale, "Saklanan kayıtlar ve süreleri", "Records that are kept, and for how long")}>
              <p>{text(locale, "Hesap silindiğinde sunucudaki ürün verileri hemen silinir. Yedekler en fazla 30 günlük bir döngüde tutulur; bir yedekten geri dönülürse, o tarihten sonra silinmiş hesaplar yeniden silinir.", "When an account is deleted, its product data on the server is deleted immediately. Backups are kept on a cycle of at most 30 days; if a backup is ever restored, accounts deleted after that point are deleted again.")}</p>
              <ul className="mt-4 space-y-2">
                <li>· {text(locale, "Silme kaydı (hesap kimliğinin tek yönlü özeti): diğer cihazların silmeyi tanıması için 3 yıl.", "Deletion receipt (one-way digest of the account ID): kept for 3 years so other devices can recognise the deletion.")}</li>
                <li>· {text(locale, "Sağlayıcı günlükleri: en fazla 30 gün.", "Provider logs: at most 30 days.")}</li>
                <li>· {text(locale, "Destek yazışmaları: son iletiden 90 gün sonra silinir, en geç 120 gün içinde kalıcı olarak kaldırılır.", "Support conversations: deleted 90 days after the last message and permanently removed within 120 days at the latest.")} {text(locale, "Silme talebi e-postanız da bir destek yazışmasıdır ve kapandıktan sonra 90 gün saklanır.", "Your deletion request email is also a support conversation and is kept for 90 days after it is closed.")}</li>
                <li>· {text(locale, "Apple ve Google, ödeme ve fatura kayıtlarını kendi politikalarına göre yasal süre boyunca tutar.", "Apple and Google keep payment and invoice records for the legally required period under their own policies.")}</li>
              </ul>
            </Section>

            <Section title={text(locale, "Abonelik", "Subscription")}>
              <p>{text(locale, "Hesap silmek Apple veya Google aboneliğini iptal etmez; yinelenen ödemeyi durdurmak için aboneliği mağaza hesabınızdan ayrıca iptal edin. Silme talebinden önce aboneliği iptal etmeniz gerekmez.", "Deleting the account does not cancel an Apple or Google subscription; cancel it separately in your store account to stop renewal. You do not need to cancel it before requesting deletion.")}</p>
            </Section>

            <p>
              {text(locale, "Veri işleme ve haklarınız hakkında ayrıntılar:", "Details on data handling and your rights:")}{" "}
              <Link href="/privacy/motion" className="link-wipe text-ink-50">
                {text(locale, "Motion gizlilik bilgileri", "Motion privacy information")}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-bold text-ink-50 text-[22px] md:text-[24px] mb-3">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
