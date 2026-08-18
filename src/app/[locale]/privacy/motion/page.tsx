import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";

const LAST_UPDATED = "2026-08-17";

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
    title: isTR ? "Gizlilik · Motion uygulamaları" : "Privacy · Motion apps",
    description: isTR
      ? "Choreia, Lissom, Gravita, JabLab ve Ostinato için gizlilik politikası. Kamera görüntüsü cihazdan çıkmaz."
      : "Privacy policy for Choreia, Lissom, Gravita, JabLab and Ostinato. The camera image never leaves your device.",
    alternates: {
      canonical: isTR ? "/privacy/motion" : `/${locale}/privacy/motion`,
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
  const isTR = locale === "tr";

  return (
    <div className="page-enter">
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <Link
            href="/privacy"
            className="link-wipe font-mono text-[11px] tracking-widest uppercase text-ink-400"
          >
            ← {isTR ? "Gizlilik" : "Privacy"}
          </Link>

          <EyebrowChip>Motion</EyebrowChip>

          <h1 className="mt-6 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {isTR ? "Motion gizlilik politikası" : "Motion privacy policy"}
          </h1>

          <p className="mt-6 font-mono text-[11px] tracking-widest uppercase text-ink-400">
            {isTR ? "Son güncelleme" : "Last updated"}: {LAST_UPDATED}
          </p>

          <p className="mt-6 text-[15px] leading-[1.6] text-ink-300">
            {isTR
              ? "Bu politika beş uygulamanın tamamı için geçerlidir:"
              : "This policy covers all five applications:"}
          </p>
          <ul className="mt-3 space-y-1 text-[15px] leading-[1.6] text-ink-200">
            {APPS.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>

          <div className="mt-14 space-y-10 text-[16px] leading-[1.7] text-ink-300">
            <Section title={isTR ? "Özet" : "Summary"}>
              <p>
                {isTR
                  ? "Bu beş uygulama tamamen cihazınızda çalışır. Kamera görüntüsü ve ondan çıkarılan vücut noktaları telefonunuzdan çıkmaz. Hesap açmanız gerekmez; bulut senkronu, analitik ve reklam yoktur. Sizin hakkınızda hiçbir sunucumuzda veri tutmuyoruz."
                  : "These five applications run entirely on your device. The camera image, and the body landmarks derived from it, never leave your phone. No account is required; there is no cloud sync, no analytics, and no advertising. We hold no data about you on any server of ours."}
              </p>
            </Section>

            <Section title={isTR ? "Kamera" : "Camera"}>
              <p>
                {isTR
                  ? "Kamera, hareketinizi gerçek zamanlı olarak vücut noktalarına (33 nokta) dönüştürmek için kullanılır. Görüntü karesi cihazın içinde işlenir; kaydedilmez, diske yazılmaz, hiçbir yere gönderilmez. Uygulamayı kapattığınızda o kareden geriye hiçbir şey kalmaz."
                  : "The camera is used to convert your movement into body landmarks (33 points) in real time. Frames are processed inside the device; they are not recorded, not written to disk, and not transmitted anywhere. When you close the app, nothing remains of those frames."}
              </p>
              <p className="mt-3">
                {isTR
                  ? "Kamera izni yalnız siz verdiğinizde ve yalnız antrenman ekranlarında kullanılır."
                  : "Camera permission is used only when you grant it, and only on the practice screens."}
              </p>
            </Section>

            <Section title={isTR ? "Cihazınızda saklananlar" : "What is stored on your device"}>
              <p>
                {isTR
                  ? "Çalışma kayıtlarınız, ölçülen eklem açıları ve ilerlemeniz uygulamanın kendi özel klasöründe, düz dosya olarak tutulur. Bu veriler cihazdan çıkmaz. Uygulamayı sildiğinizde birlikte silinir."
                  : "Your practice records, measured joint angles, and progress are kept as plain files in the application's own private storage. This data does not leave the device. Deleting the app deletes it."}
              </p>
              <p className="mt-3">
                {isTR
                  ? "Not: telefonunuzda iCloud veya Google yedeklemesi açıksa, bu dosyalar sizin kendi yedeğinize dahil olabilir. O yedek size aittir; bizim erişimimiz yoktur."
                  : "Note: if iCloud or Google backup is enabled on your phone, these files may be included in your own backup. That backup belongs to you; we have no access to it."}
              </p>
            </Section>

            <Section title={isTR ? "Toplamadığımız veriler" : "Data we do not collect"}>
              <p>
                {isTR
                  ? "Hesap bilgisi, e-posta, ad, konum, rehber, reklam tanımlayıcısı, kullanım analitiği veya telemetri toplamıyoruz. Uygulamaların üretim kodunda verinizi bir sunucuya ileten hiçbir ağ isteği yok (tek istisna aşağıda: yazı tipi indirmesi) — bu bir iddia değil, ölçüldü."
                  : "We do not collect account details, email, name, location, contacts, advertising identifiers, usage analytics, or telemetry. The applications' production code contains no network request that transmits your data to a server (one exception below: font downloads) — this is not a claim, it was measured."}
              </p>
            </Section>

            <Section title={isTR ? "Tek istisna: yazı tipleri" : "One exception: fonts"}>
              <p>
                {isTR
                  ? "Dürüstlük gereği ayrıca yazıyoruz: beş uygulamanın dördü (Choreia, Lissom, JabLab, Ostinato) ilk açılışta yazı tiplerini Google Fonts sunucularından indiriyor. Bu istek sırasında Google, standart bir web isteğinde olduğu gibi IP adresinizi görebilir. İstek yalnız yazı tipi dosyası içindir; hakkınızda hiçbir veri gönderilmez."
                  : "For the sake of honesty we state this separately: four of the five applications (Choreia, Lissom, JabLab, Ostinato) download their fonts from Google Fonts servers on first launch. During that request Google can see your IP address, as with any standard web request. The request is only for the font file; no data about you is sent."}
              </p>
              <p className="mt-3">
                {isTR
                  ? "Gravita bunu yapmaz — yazı tipleri uygulamanın içine paketlenmiştir ve hiçbir ağ isteği yoktur. Diğer dördünde de aynı değişikliği yapıyoruz; bu sayfa tamamlandığında güncellenecek."
                  : "Gravita does not do this — its fonts are bundled inside the application and it makes no network requests at all. We are making the same change in the other four; this page will be updated when that is complete."}
              </p>
            </Section>

            <Section title={isTR ? "Üçüncü taraf bileşenler" : "Third-party components"}>
              <p>
                {isTR
                  ? "Vücut noktalarını çıkarmak için Google'ın MediaPipe kütüphanesini kullanıyoruz. MediaPipe tamamen cihaz üzerinde çalışır ve ağ bağlantısı kurmaz. Ayrıca izin durumunu cihazda saklayan standart bir izin bileşeni kullanılıyor. Reklam ağı, analitik veya çökme raporlama servisi bulunmuyor."
                  : "We use Google's MediaPipe library to derive body landmarks. MediaPipe runs entirely on-device and makes no network connections. We also use a standard permissions component that stores permission state on the device. There is no ad network, analytics service, or crash-reporting service."}
              </p>
            </Section>

            <Section title={isTR ? "Sağlık ve fitness" : "Health and fitness"}>
              <p>
                {isTR
                  ? "Bu uygulamalar vücut hareketinizi ölçer ve size geri bildirim verir. Tıbbi cihaz değildirler; teşhis koymaz, tedavi önermez, tıbbi tavsiye vermezler. Apple Sağlık veya Google Fit ile veri paylaşmıyoruz. Bir rahatsızlığınız varsa hekiminize danışın."
                  : "These applications measure your body movement and give you feedback. They are not medical devices; they do not diagnose, prescribe treatment, or give medical advice. We do not share data with Apple Health or Google Fit. If you have a health condition, consult your physician."}
              </p>
            </Section>

            <Section title={isTR ? "Çocuklar" : "Children"}>
              <p>
                {isTR
                  ? "Uygulamalar çocuklara yönelik değildir ve çocuklardan bilerek veri toplamaz. Zaten hiç kimseden sunucuya veri toplamıyoruz."
                  : "The applications are not directed at children and do not knowingly collect data from children. We do not collect data from anyone to any server in any case."}
              </p>
            </Section>

            <Section title={isTR ? "Haklarınız" : "Your rights"}>
              <p>
                {isTR
                  ? "KVKK ve GDPR kapsamında verilerinize erişme, düzeltme ve silme haklarınız vardır. Pratikte: hakkınızda hiçbir sunucumuzda veri bulunmadığı için bizden dışa aktarılacak ya da silinecek bir şey yoktur. Tüm veriniz cihazınızdadır ve tamamen sizin denetiminizdedir; uygulamayı silmek onu da siler."
                  : "Under GDPR and Turkish data protection law (KVKK) you have the right to access, correct, and delete your data. In practice: because we hold no data about you on any server, there is nothing for us to export or delete. All of your data is on your device and entirely under your control; deleting the app deletes it."}
              </p>
            </Section>

            <Section title={isTR ? "Değişiklikler" : "Changes"}>
              <p>
                {isTR
                  ? "Bu politikayı güncellersek yukarıdaki tarihi değiştiririz. Veri işleme biçimimizde esaslı bir değişiklik olursa uygulama içinde bildiririz."
                  : "If we update this policy we will change the date above. If there is a material change in how we handle data, we will notify you inside the application."}
              </p>
            </Section>

            <Section title={isTR ? "İletişim" : "Contact"}>
              <p>
                {isTR ? "Veri Sorumlusu" : "Data Controller"}: YULA Lab — Mustafa Kaan Koçak
                <br />
                {isTR ? "E-posta" : "Email"}:{" "}
                <a href="mailto:merhaba@yulalab.com" className="link-wipe text-ink-50">
                  merhaba@yulalab.com
                </a>
                <br />
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
