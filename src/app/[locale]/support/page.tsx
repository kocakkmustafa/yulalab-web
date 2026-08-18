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
    title: isTR ? "Destek · YULA Lab" : "Support · YULA Lab",
    description: isTR
      ? "Braavolabs, Burun Farkı, LifeOS ve Motion uygulamaları için destek ve sıkça sorulan sorular."
      : "Support and FAQ for Braavolabs, Burun Farkı, LifeOS, and the Motion apps.",
    alternates: {
      canonical: isTR ? "/support" : `/${locale}/support`,
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
  const isTR = locale === "tr";

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <EyebrowChip>{isTR ? "Destek" : "Support"}</EyebrowChip>

          <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[52px] md:text-[60px]">
            {isTR ? "Yardımcı olalım." : "We're here to help."}
          </h1>

          <p className="mt-7 max-w-[52ch] text-[16.5px] md:text-[17.5px] leading-[1.6] text-ink-300">
            {isTR
              ? "Tüm ürünlerimizin destek talepleri merhaba@yulalab.com adresine gelir. Mesajlarınıza genellikle 48 saat içinde dönüyoruz; acil bir konu olduğunda satır başına 'ACIL' yazmanız yeterli."
              : "Support requests for all our products go to merhaba@yulalab.com. We usually respond within 48 hours; for urgent matters, lead your message with 'URGENT'."}
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
            <a
              href="mailto:merhaba@yulalab.com"
              className="group block rounded-2xl border border-white/15 hover:border-white/30 hover:bg-white/[0.04] p-6 transition-colors focusable"
            >
              <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
                {isTR ? "E-posta" : "Email"}
              </div>
              <div className="mt-4 font-display text-[22px] text-ink-50">
                merhaba@yulalab.com
              </div>
              <div className="mt-3 text-sm text-ink-300">
                {isTR ? "48 saat içinde yanıt" : "Reply within 48 hours"}
              </div>
            </a>

            <Link
              href="/contact"
              className="glass group block p-6 transition-colors focusable"
            >
              <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
                {isTR ? "Genel iletişim" : "General contact"}
              </div>
              <div className="mt-4 font-display text-[22px] text-ink-50 flex items-center gap-2">
                {isTR ? "İletişim sayfası" : "Contact page"}
                <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
              </div>
              <div className="mt-3 text-sm text-ink-300">
                {isTR ? "Basın · ortaklık · diğer" : "Press · partnerships · other"}
              </div>
            </Link>
          </div>

          {/* FAQ */}
          <div className="mt-20">
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-6">
              {isTR ? "Sıkça sorulanlar" : "Frequently asked"}
            </div>
            <div className="space-y-8">
              {/* Placed first on purpose: the subscription and account-deletion
                  answers below describe Braavolabs/LifeOS/Burun Farkı. The five
                  Motion apps have neither accounts nor purchases, so a Motion
                  user following those steps would look for a screen that does
                  not exist. Stating the exception before the rule prevents that. */}
              <FAQ
                q={isTR
                  ? "Motion uygulamaları (Choreia · Lissom · Gravita · JabLab · Ostinato) için de bunlar geçerli mi?"
                  : "Do these apply to the Motion apps (Choreia · Lissom · Gravita · JabLab · Ostinato)?"}
                a={isTR
                  ? "Kısmen. Motion uygulamalarında hesap yoktur, giriş yapmazsınız ve şu an satın alınacak bir şey yoktur — dolayısıyla aşağıdaki abonelik, hesap silme ve geri ödeme adımları bu beş uygulama için geçerli değildir. Verinizin tamamı cihazınızda durur; uygulamayı silmek onu da siler. Kamera görüntüsü telefonunuzdan hiç çıkmaz. Ayrıntı: /privacy/motion"
                  : "Partly. The Motion apps have no accounts, no sign-in, and nothing to purchase right now — so the subscription, account-deletion, and refund steps below do not apply to these five. All of your data stays on your device; deleting the app deletes it. The camera image never leaves your phone. Details: /privacy/motion"}
              />
              <FAQ
                q={isTR ? "Aboneliğimi nasıl iptal ederim?" : "How do I cancel my subscription?"}
                a={isTR
                  ? "Abonelik Apple App Store veya Google Play üzerinden yönetilir. iOS: Ayarlar > [Adınız] > Abonelikler. Android: Play Store > Profil > Ödemeler ve abonelikler > Abonelikler. Buradan istediğiniz zaman iptal edebilirsiniz; mevcut dönem sonuna kadar kullanım devam eder."
                  : "Subscriptions are managed via Apple App Store or Google Play. iOS: Settings > [Your name] > Subscriptions. Android: Play Store > Profile > Payments & subscriptions > Subscriptions. Cancel anytime there; access continues until the end of the current period."}
              />
              <FAQ
                q={isTR ? "Hesabımı nasıl silerim?" : "How do I delete my account?"}
                a={isTR
                  ? "Uygulama içinden Ayarlar > Hesap > Hesabı Sil. Veriniz 30 gün içinde sunucularımızdan silinir; cihaz verisi anında silinir. Alternatif olarak merhaba@yulalab.com adresine mail atabilirsiniz."
                  : "From within the app: Settings > Account > Delete account. Server-side data is removed within 30 days; device data is deleted immediately. Alternatively email merhaba@yulalab.com."}
              />
              <FAQ
                q={isTR ? "Geri ödeme alabilir miyim?" : "Can I get a refund?"}
                a={isTR
                  ? "Abonelik ödemeleri Apple ve Google tarafından yönetildiği için geri ödemeler de onların üzerinden işlenir. Apple için reportaproblem.apple.com, Google için play.google.com/store/account/orderhistory üzerinden talep gönderebilirsiniz. Mağaza kararlarına müdahalemiz yoktur; ancak bir tartışma olursa biz de inceleyip destek olmaya çalışırız."
                  : "Because Apple and Google manage subscription payments, refunds also go through them. For Apple use reportaproblem.apple.com; for Google use play.google.com/store/account/orderhistory. We cannot override store decisions, but if there's a dispute we'll review and try to help."}
              />
              <FAQ
                q={isTR ? "Verim güvende mi?" : "Is my data safe?"}
                a={isTR
                  ? "Her ürünün detaylı gizlilik politikasını /privacy adresinden okuyabilirsiniz. Kısa cevap: iletişim TLS ile şifrelenir; LifeOS özelinde cihaz verisi SQLCipher + AES-256 ile şifrelenir; Motion uygulamalarında kamera görüntüsü cihazdan hiç çıkmaz; reklam yok, model eğitimi için kullanılmıyor."
                  : "You can read each product's detailed privacy policy at /privacy. Short answer: traffic is TLS-encrypted; LifeOS specifically encrypts on-device data with SQLCipher + AES-256; in the Motion apps the camera image never leaves your device; no ads, no use for model training."}
              />
              <FAQ
                q={isTR ? "Bir hata buldum, nereye bildiririm?" : "I found a bug — where do I report it?"}
                a={isTR
                  ? "merhaba@yulalab.com adresine yazabilir veya ilgili uygulamanın GitHub Issues sayfasına bildirebilirsiniz (kamu repo'ları). Hata raporunda cihaz modeli, OS sürümü, uygulama sürümü ve hatanın adımlarını paylaşmanız çözümü hızlandırır."
                  : "Email merhaba@yulalab.com or open an issue in the relevant app's public GitHub repo. Including device model, OS version, app version, and reproduction steps speeds up resolution."}
              />
              <FAQ
                q={isTR ? "Birden fazla cihazda kullanabilir miyim?" : "Can I use it on multiple devices?"}
                a={isTR
                  ? "Apple App Store / Google Play aile paylaşımını destekliyoruz. Aynı Apple ID veya Google hesabı altındaki cihazlarda aboneliğiniz otomatik aktif olur."
                  : "We support Apple App Store / Google Play family sharing. Subscriptions activate automatically on devices signed into the same Apple ID or Google account."}
              />
              <FAQ
                q={isTR ? "Hangi platformları destekliyorsunuz?" : "Which platforms do you support?"}
                a={isTR
                  ? "Braavolabs ve LifeOS: iOS 13+ ve Android 8+. Burun Farkı: iOS 13+ ve Android 6+. iPad ve Android tablet desteği uygulama bazında değişebilir; App Store / Play Store sayfasında belirtilmiştir."
                  : "Braavolabs and LifeOS: iOS 13+ and Android 8+. Burun Farkı: iOS 13+ and Android 6+. iPad / Android tablet support varies by app and is listed on each App Store / Play Store page."}
              />
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-white/10">
            <p className="text-[15px] leading-[1.65] text-ink-300">
              {isTR
                ? "Yanıtını bulamadığınız bir soru mu var? Çekinmeden yazın — kurucu ekip her destek mesajını okur."
                : "Have a question not answered here? Drop us a line — the founding team reads every support message."}
            </p>
            <div className="mt-4">
              <a
                href="mailto:merhaba@yulalab.com"
                className="inline-flex items-center gap-2 rounded-full bg-ink-50 text-ink-900 pl-5 pr-4 py-3 text-[14px] font-medium hover:bg-ink-100 transition-colors focusable"
              >
                merhaba@yulalab.com
                <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none flex items-start justify-between gap-4 py-3 border-b border-white/[0.06] hover:border-white/15 transition-colors">
        <span className="font-display font-semibold text-[18px] text-ink-100 group-hover:text-ink-50">
          {q}
        </span>
        <span className="font-mono text-[12px] text-ink-400 group-open:rotate-45 transition-transform mt-1.5">+</span>
      </summary>
      <div className="mt-4 text-[15px] leading-[1.7] text-ink-300">{a}</div>
    </details>
  );
}
