import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";

const LAST_UPDATED = "2026-09-06";

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
      ? "Motion ailesinin gizlilik bilgileri ve uygulama/sürüm kapsamı: Choreia, Lissom, Gravita, JabLab ve Ostinato."
      : "Privacy information and app/version scope for the Motion family: Choreia, Lissom, Gravita, JabLab and Ostinato.",
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
            {isTR ? "Motion gizlilik bilgileri" : "Motion privacy information"}
          </h1>

          <p className="mt-6 font-mono text-[11px] tracking-widest uppercase text-ink-400">
            {isTR ? "Son güncelleme" : "Last updated"}: {LAST_UPDATED}
          </p>

          <p className="mt-6 text-[15px] leading-[1.6] text-ink-300">
            {isTR
              ? "Bu sayfa, geliştirme aşamasındaki aşağıdaki Motion ürünleri için genel gizlilik kapsamını açıklar:"
              : "This page describes the general privacy scope for the following Motion products in development:"}
          </p>
          <ul className="mt-3 space-y-1 text-[15px] leading-[1.6] text-ink-200">
            {APPS.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>

          <div className="mt-14 space-y-10 text-[16px] leading-[1.7] text-ink-300">
            <Section title={isTR ? "Uygulama ve sürüm kapsamı" : "App and version scope"}>
              <p>
                {isTR
                  ? "Kamera, mikrofon, saklama ve ağ kullanımı her uygulamanın kendi özellikleri ve sürümü kapsamında ele alınır. Bu sayfa bütün Motion uygulamaları için tek bir veri işleme politikası sunmaz. Kullandığınız sürüm hakkında bilgi almak için uygulama adını ve sürümünü belirterek bize yazabilirsiniz."
                  : "Camera, microphone, storage and network use are addressed for each app's features and version. This page does not provide one data-processing policy for every Motion app. Contact us with the app name and version for information about the version you use."}
              </p>
            </Section>

            <Section title={isTR ? "Kamera ve mikrofon" : "Camera and microphone"}>
              <p>
                {isTR
                  ? "Görüntü, vücut noktaları veya ses kullanan bir özellik için hangi verinin işlendiği, kaydedildiği ve aktarıldığı uygulamaya özgü gizlilik bilgilerinde açıklanmalıdır. Bu ayrıntıları support@yulalab.com adresinden talep edebilirsiniz."
                  : "For a feature that uses images, body landmarks or audio, the app-specific privacy information needs to explain which data is processed, recorded and transferred. You can request these details at support@yulalab.com."}
              </p>
            </Section>

            <Section title={isTR ? "Saklama ve ağ kullanımı" : "Storage and network use"}>
              <p>
                {isTR
                  ? "Yerel kayıtlar, dışa aktarma, cihaz yedekleri, tanılama ve yazı tipi indirmeleri dahil ağ kullanımı uygulama ve sürüm kapsamında açıklanır. Verilerin saklanması veya silinmesi hakkında sorunuz varsa destek talebinizde uygulama adını ve sürümünü belirtin."
                  : "Local records, exports, device backups, diagnostics and network use, including font downloads, are addressed for each app and version. For questions about storing or deleting data, include the app name and version in your support request."}
              </p>
            </Section>

            <Section title={isTR ? "Sağlık ve fitness" : "Health and fitness"}>
              <p>
                {isTR
                  ? "Motion ürünleri hareket ve pratik desteği amacıyla geliştirilmektedir. Tıbbi cihaz değildirler; teşhis koymaz, tedavi önermez, tıbbi tavsiye vermezler. Bir rahatsızlığınız varsa hekiminize danışın."
                  : "Motion products are being developed to support movement and practice. They are not medical devices; they do not diagnose, prescribe treatment, or give medical advice. If you have a health condition, consult your physician."}
              </p>
            </Section>

            <Section title={isTR ? "Çocuklar" : "Children"}>
              <p>
                {isTR
                  ? "Uygulamalar çocuklara yönelik değildir ve çocuklardan bilerek veri toplamaz."
                  : "The applications are not directed at children and do not knowingly collect data from children."}
              </p>
            </Section>

            <Section title={isTR ? "Haklarınız" : "Your rights"}>
              <p>
                {isTR
                  ? "KVKK ve GDPR kapsamında verilerinize erişme, düzeltme ve silme haklarınız vardır. Talebinizi uygulama adı ve sürümüyle birlikte support@yulalab.com adresine iletebilirsiniz. Talebin kapsamı ilgili uygulamanın veri akışına göre değerlendirilir."
                  : "Under GDPR and Turkish data protection law (KVKK) you have the right to access, correct, and delete your data. Send your request to support@yulalab.com with the app name and version. Its scope is assessed against the relevant app's data flow."}
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
                <a href="mailto:support@yulalab.com" className="link-wipe text-ink-50">
                  support@yulalab.com
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
