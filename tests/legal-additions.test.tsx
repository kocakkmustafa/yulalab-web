import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { text } from "@/lib/localized";
import LifeosPrivacyPage from "@/app/[locale]/privacy/lifeos/page";
import BraavolabsPrivacyPage from "@/app/[locale]/privacy/braavolabs/page";
import PrivacyPage from "@/app/[locale]/privacy/page";
import TermsPage from "@/app/[locale]/terms/page";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));

const escaped = (value: string) => renderToStaticMarkup(<>{value}</>);
type Page = (props: { params: Promise<{ locale: string }> }) => Promise<React.ReactElement>;
const render = async (page: Page, locale: string) => {
  const element = await page({ params: Promise.resolve({ locale }) });
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={{}}>{element}</NextIntlClientProvider>);
};

// Counsel-approved additions and founder decisions (2026-10-29): LifeOS A-6/A-8/A-9/A-24, terms
// A-11/A-12/A-13/A-15/A-16/A-18/A-28, Braavolabs A-3 + Sentry period. No transfer-safeguard claim.
const PAGES: Array<[string, Page, Array<[string, string]>]> = [
  ["privacy/lifeos", LifeosPrivacyPage as Page, [
    ["Bu politikayı değiştirdiğimizde güncel metni bu sayfada yayımlarız; önemli değişiklikleri yürürlükten en az 30 gün önce uygulama içinde bildiririz. Yeni bir işleme açık rızaya dayanıyorsa, başlamadan önce ayrıca rızanızı isteriz.", "When we change this policy we publish the current version on this page and announce significant changes in the app at least 30 days before they take effect. If a new processing activity relies on consent, we will ask for your consent before it starts."],
    ["Açık rızaya dayanan işlemeler için rızanızı dilediğiniz zaman geri alabilirsiniz; bu, geri almadan önceki işlemeyi etkilemez. LifeOS hakkınızda hukuki sonuç doğuran otomatik karar vermez. Başvurunuz reddedilir, yanıt yetersiz bulunur veya süresinde yanıt verilmezse, yanıtı öğrendiğiniz tarihten itibaren 30 gün ve her hâlde başvuru tarihinden itibaren 60 gün içinde Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsiniz. GDPR kapsamındaysanız, bulunduğunuz ülkenin veri koruma otoritesine şikâyet hakkınız vardır.", "Where processing relies on consent, you may withdraw it at any time without affecting prior processing. LifeOS makes no automated decisions with legal effects about you. If your request is rejected, the answer is insufficient or not given in time, you may complain to the Turkish Personal Data Protection Board within 30 days of learning the answer and in any case within 60 days of your request. Where the GDPR applies, you may lodge a complaint with the data protection authority of your country."],
    ["Cihaz verisi siz silene kadar kalır; hesap silme ile cihazdaki dosyaların silinmesi ayrı işlemlerdir. Hesap silme talebiniz en geç 30 gün içinde sonuçlandırılır. Sunucu tarafındaki kayıtlar şu sürelerle saklanır:", "Device data is kept until you delete it; deleting an account and removing files from your device are separate actions. Account deletion requests are completed within 30 days at the latest. Server-side records are kept as follows:"],
    ["Hesap verileri: hesap silinene kadar.", "Account data: until the account is deleted."],
    ["Abonelik kayıtları: hesapla birlikte silinir.", "Subscription records: deleted with the account."],
    ["Mağaza bildirim kaydı (hesap bağı kaldırılmış): ödeme uyuşmazlıklarının ispatı için 10 yıl.", "Store notification log (unlinked from the account): 10 years, to evidence payment disputes."],
    ["Hesap silme makbuzu (kullanıcı kimliği ve tarih): silmenin ispatı için 3 yıl.", "Account deletion receipt (user ID and date): 3 years, to prove the deletion."],
    ["Çevrimiçi yapay zekâ kullanım kayıtları: hesap silinince silinir.", "Online AI usage records: deleted with the account."],
    ["Çökme raporları (Sentry): en fazla 90 gün.", "Crash reports (Sentry): at most 90 days."],
    ["Destek yazışmaları: son iletiden 90 gün sonra silinir, en geç 120 gün içinde kalıcı olarak kaldırılır.", "Support conversations: deleted 90 days after the last message and permanently removed within 120 days at the latest."],
    ["Süresi dolan kayıtlar silinir veya anonim hâle getirilir. Kayıtlarınızın kapsamı veya silme talebi için support@yulalab.com adresine yazabilirsiniz.", "Expired records are deleted or anonymised. For the scope of your records or a deletion request, contact support@yulalab.com."],
    ["Bu metin birden çok dilde sunulur. Çeviriler arasında fark olması hâlinde Türkçe metin esas alınır; bu, bulunduğunuz ülkenin tüketicilere tanıdığı emredici hakları sınırlamaz.", "This text is provided in several languages. If translations differ, the Turkish version prevails; this does not limit mandatory consumer rights in your country."],
  ]],
  ["terms", TermsPage as Page, [
    ["Bu metin birden çok dilde sunulur. Çeviriler arasında fark olması hâlinde Türkçe metin esas alınır; bu, bulunduğunuz ülkenin tüketicilere tanıdığı emredici hakları sınırlamaz.", "This text is provided in several languages. If translations differ, the Turkish version prevails; this does not limit mandatory consumer rights in your country."],
    ["iOS uygulamalarında Apple'ın standart Lisanslı Uygulama Son Kullanıcı Lisans Sözleşmesi (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) geçerlidir; bu şartlar onu tamamlar. Bu sözleşme yalnız sizinle YULA Lab arasındadır; Apple'ın uygulamanın bakımı, desteği, garantisi veya uygulamaya ilişkin talepler bakımından bir yükümlülüğü yoktur. Apple ve iştirakleri bu şartların üçüncü taraf lehtarıdır.", "For iOS apps, Apple's standard Licensed Application End User License Agreement (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) applies and these terms supplement it. This agreement is between you and YULA Lab only; Apple has no obligation for maintenance, support, warranty or claims relating to the app. Apple and its subsidiaries are third-party beneficiaries of these terms."],
    ["Ücretli özellikler, Apple App Store ve Google Play üzerinden yönetilen otomatik yenilenen aboneliklerle sunulur. Ödeme, mağaza hesabınızdan tahsil edilir. Aboneliğiniz, mevcut dönem bitmeden mağaza hesabınızdan iptal edilmedikçe aynı süre için, mağazanın gösterdiği fiyatla otomatik yenilenir (App Store'da dönem bitiminden en az 24 saat önce iptal etmeniz gerekir). İadeler mağazanın politikasına tabidir; tüketici mevzuatından doğan emredici haklarınız saklıdır.", "Paid features are offered via auto-renewing subscriptions managed through the Apple App Store and Google Play. Payment is charged to your store account. Your subscription renews automatically for the same period at the price shown by the store unless you cancel it in your store account before the current period ends (on the App Store, at least 24 hours before). Refunds are subject to the store's policy; your mandatory consumer rights remain unaffected."],
    ["7. LifeOS — özel şartlar", "7. LifeOS — special terms"],
    ["Çevrimiçi yapay zekâ (uygulamada sunulduğunda): yeni hesaplarda, hesap açılışından itibaren 24 saat içinde en fazla 20 istek ücretsizdir. Sonrasında yalnız Premium abonelere, her gün (UTC 00:00'da sıfırlanır) en fazla 20 istekle sunulur. Sunucuya kabul edilen bir istek teknik bir hatayla sonuçlansa da kotadan düşer. Elle kayıt sınırsız ve ücretsizdir.", "Online AI (when offered in the app): new accounts get up to 20 free requests within 24 hours of account creation. After that it is available to Premium subscribers only, up to 20 requests per day (resets at 00:00 UTC). A request accepted by the server counts toward the limit even if it ends in a technical error. Manual logging is unlimited and free."],
    ["Yapay zekâ çıktıları: Çevrimiçi yapay zekâ yanıtları ve otomatik çıkarımlar yapay zekâ tarafından üretilir; hatalı, eksik veya güncel olmayabilir. Kaydetmeden önce kontrol etmeniz gerekir. Bu çıktılar ve LifeOS'un sağlık/finans özetleri tıbbi, psikolojik, finansal, yatırım veya hukuki tavsiye değildir; teşhis veya tedavi amacı taşımaz. Acil bir durumda 112'yi arayın. Yapay zekâya başkalarına ait kişisel verileri yazmayın.", "AI outputs: online AI answers and automatic extractions are generated by artificial intelligence and may be wrong, incomplete or outdated; review them before saving. They, and LifeOS health/finance summaries, are not medical, psychological, financial, investment or legal advice and are not intended to diagnose or treat. In an emergency, call your local emergency number. Do not enter other people's personal data into AI."],
    ["Kanunun izin verdiği ölçüde, hafif ihmalden doğan dolaylı zararlardan ve düzenli yedekle önlenebilecek veri kaybından sorumlu değiliz. Bu sınırlama; kast veya ağır ihmal, hayat ve sağlığa verilen zararlar ile tüketici mevzuatı ve diğer emredici hükümlerden doğan sorumluluğumuzu kapsamaz.", "To the extent permitted by law, we are not liable for indirect damage caused by slight negligence or for data loss that regular backups would have prevented. This limitation does not apply to intent or gross negligence, injury to life or health, or liability under consumer protection law or other mandatory rules."],
    ["Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Tüketiciyseniz 6502 sayılı Kanun uyarınca yerleşim yerinizdeki tüketici hakem heyetine veya tüketici mahkemesine başvurabilirsiniz. Türkiye dışında yaşıyorsanız, ülkenizin tüketiciyi koruyan emredici hükümleri ve mahkemelere başvurma hakkınız saklıdır.", "These terms are governed by the laws of the Republic of Türkiye. If you are a consumer in Türkiye, you may apply to the consumer arbitration committee or consumer court of your place of residence. If you live elsewhere, the mandatory consumer protection rules of your country and your right to sue there are not affected."],
    ["Bu şartlarda önemli bir değişiklik yaptığımızda, yürürlüğe girmeden en az 30 gün önce uygulama içinde ve/veya e-postayla bildiririz. Kabul etmiyorsanız yürürlükten önce hesabınızı kapatabilir ve aboneliğinizi mağazadan iptal edebilirsiniz; yasal haklarınız saklıdır.", "We will notify you of significant changes to these terms in the app and/or by email at least 30 days before they take effect. If you do not agree, you may close your account and cancel your subscription in the store before that date; your statutory rights are unaffected."],
  ]],
  ["privacy/braavolabs", BraavolabsPrivacyPage as Page, [
    ["Bu haklar erişim, düzeltme, silme, işlemeyi kısıtlama, taşınabilirlik, itiraz ve rızayı geri almayı kapsar. Yanıtımızı yeterli bulmazsanız Kişisel Verileri Koruma Kurulu'na veya AB'de yaşadığınız ya da çalıştığınız yerdeki denetim makamına şikâyette bulunabilirsiniz. Hakkınızda hukuki sonuç doğuran otomatik karar vermeyiz. Hesap verilerini vermek hizmet için zorunludur; vermezseniz hesap açılamaz.", "These rights cover access, rectification, erasure, restriction, portability, objection and withdrawal of consent. If you are not satisfied with our answer, you can complain to the Turkish Personal Data Protection Board or to the supervisory authority where you live or work in the EU. We do not make automated decisions that produce legal effects about you. Account data is required for the service; without it we cannot open an account."],
    ["Hata kayıtları (Sentry) en fazla 90 gün saklanır.", "Error logs (Sentry) are kept for at most 90 days."],
  ]],
  ["privacy", PrivacyPage as Page, [
    ["Bu metin birden çok dilde sunulur. Çeviriler arasında fark olması hâlinde Türkçe metin esas alınır; bu, bulunduğunuz ülkenin tüketicilere tanıdığı emredici hakları sınırlamaz.", "This text is provided in several languages. If translations differ, the Turkish version prevails; this does not limit mandatory consumer rights in your country."],
  ]],
];
const TRANSFER_CLAIM = /standart sözleşme|standard contract|Standard Contractual|Data Privacy Framework|VERBİS|EU representative|AB temsilcisi/i;

describe.each(SUPPORTED_LOCALES)("legal additions (%s)", (locale) => {
  it.each(PAGES)("%s renders every addition in this language, no address and no safeguard claim", async (_slug, page, pairs) => {
    const html = await render(page, locale);
    for (const [tr, en] of pairs) expect(html).toContain(escaped(text(locale, tr, en)));
    expect(html).not.toMatch(/Kayseri|Melikgazi|Bülbül/);
    expect(html).not.toMatch(TRANSFER_CLAIM);
  });
});
