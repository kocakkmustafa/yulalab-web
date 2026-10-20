import type { Locale } from "@/i18n/locales";

export type VerificationCopy = {
  title: string;
  heading: string;
  intro: string;
  button: string;
  retry: string;
  sending: string;
  verified: string;
  failed: string;
  uncertain: string;
  noScript: string;
  contact: string;
  email: string;
};

/** Email verification is distinct from fulfilling the underlying data request. */
export const VERIFICATION_COPY: Record<Locale, VerificationCopy> = {
  "tr": {
    "title": "Veri talebini doğrula · YULA Lab",
    "heading": "Veri talebini doğrula",
    "intro": "Bu işlem, talebin e-posta adresinin size ait olduğunu doğrular.",
    "button": "Talebi doğrula",
    "retry": "Aynı bağlantıyla yeniden kontrol et",
    "sending": "Doğrulanıyor…",
    "verified": "E-posta adresi doğrulandı. Talebiniz işleme alınabilir.",
    "failed": "Bu bağlantıyla doğrulama sonucu teyit edilemiyor. Bağlantı geçersiz, süresi dolmuş veya daha önce kullanılmış olabilir. Önceki deneme tamamlanmış olabilir; e-posta ile teyit edebilirsiniz.",
    "uncertain": "Doğrulama yanıtı alınamadı. Önceki deneme tamamlanmış olabilir. Aynı bağlantıyla yeniden kontrol edebilir veya e-posta ile teyit edebilirsiniz.",
    "noScript": "Talebinizi doğrulamak için JavaScript'i etkinleştirip e-postanızdaki bağlantıyı yeniden açın.",
    "contact": "İletişime dön",
    "email": "Talebin durumunu e-posta ile teyit et"
  },
  "en": {
    "title": "Verify data request · YULA Lab",
    "heading": "Verify your data request",
    "intro": "This action confirms that the request email address belongs to you.",
    "button": "Verify request",
    "retry": "Check again with the same link",
    "sending": "Verifying…",
    "verified": "The email address was verified. Your request can now be processed.",
    "failed": "The verification result cannot be confirmed with this link. It may be invalid, expired, or already used. An earlier attempt may have completed; you can confirm by email.",
    "uncertain": "The verification response was not received. An earlier attempt may have completed. You can check again with the same link or confirm by email.",
    "noScript": "To verify your request, enable JavaScript and reopen the link in your email.",
    "contact": "Back to contact",
    "email": "Confirm the request status by email"
  },
  "es-419": {
    "title": "Verifica tu solicitud de datos · YULA Lab",
    "heading": "Verifica tu solicitud de datos",
    "intro": "Esta acción confirma que la dirección de correo de la solicitud te pertenece.",
    "button": "Verificar solicitud",
    "retry": "Volver a comprobar con el mismo enlace",
    "sending": "Verificando…",
    "verified": "Se verificó la dirección de correo. Ahora se puede tramitar tu solicitud.",
    "failed": "No se puede confirmar el resultado de la verificación con este enlace. Puede ser inválido, haber vencido o haberse usado. Un intento anterior de verificación puede haberse completado; puedes confirmarlo por correo.",
    "uncertain": "No se recibió la respuesta de la verificación. Un intento anterior de verificación puede haberse completado. Puedes volver a comprobar con el mismo enlace o confirmarlo por correo.",
    "noScript": "Para verificar tu solicitud, habilita JavaScript y vuelve a abrir el enlace de tu correo.",
    "contact": "Volver a contacto",
    "email": "Confirmar el estado de la solicitud por correo"
  },
  "pt-BR": {
    "title": "Verifique sua solicitação de dados · YULA Lab",
    "heading": "Verifique sua solicitação de dados",
    "intro": "Esta ação confirma que o endereço de e-mail da solicitação pertence a você.",
    "button": "Verificar solicitação",
    "retry": "Verificar novamente com o mesmo link",
    "sending": "Verificando…",
    "verified": "O endereço de e-mail foi verificado. Sua solicitação agora pode ser processada.",
    "failed": "Não é possível confirmar o resultado da verificação com este link. Ele pode ser inválido, ter expirado ou já ter sido usado. Uma tentativa anterior de verificação pode ter sido concluída; você pode confirmar por e-mail.",
    "uncertain": "A resposta da verificação não foi recebida. Uma tentativa anterior de verificação pode ter sido concluída. Você pode verificar novamente com o mesmo link ou confirmar por e-mail.",
    "noScript": "Para verificar sua solicitação, ative o JavaScript e reabra o link no seu e-mail.",
    "contact": "Voltar ao contato",
    "email": "Confirmar o status da solicitação por e-mail"
  },
  "de": {
    "title": "Datenanfrage bestätigen · YULA Lab",
    "heading": "Bestätigen Sie Ihre Datenanfrage",
    "intro": "Diese Aktion bestätigt, dass die E-Mail-Adresse der Anfrage Ihnen gehört.",
    "button": "Anfrage bestätigen",
    "retry": "Mit demselben Link erneut prüfen",
    "sending": "Wird bestätigt…",
    "verified": "Die E-Mail-Adresse wurde bestätigt. Ihre Anfrage kann nun bearbeitet werden.",
    "failed": "Das Ergebnis der Bestätigung lässt sich mit diesem Link nicht feststellen. Er ist möglicherweise ungültig, abgelaufen oder bereits verwendet. Ein früherer Bestätigungsversuch könnte bereits abgeschlossen sein. Den Status können Sie per E-Mail erfragen.",
    "uncertain": "Die Antwort auf die Bestätigung ist nicht eingegangen. Ein früherer Bestätigungsversuch könnte bereits abgeschlossen sein. Sie können mit demselben Link erneut prüfen oder den Status per E-Mail erfragen.",
    "noScript": "Aktivieren Sie JavaScript und öffnen Sie den Link in Ihrer E-Mail erneut, um Ihre Anfrage zu bestätigen.",
    "contact": "Zurück zum Kontakt",
    "email": "Status der Anfrage per E-Mail erfragen"
  },
  "fr": {
    "title": "Vérifiez votre demande relative aux données · YULA Lab",
    "heading": "Vérifiez votre demande relative aux données",
    "intro": "Cette action confirme que l’adresse e-mail associée à la demande vous appartient.",
    "button": "Vérifier la demande",
    "retry": "Vérifier à nouveau avec le même lien",
    "sending": "Vérification…",
    "verified": "L’adresse e-mail a été vérifiée. Votre demande peut maintenant être traitée.",
    "failed": "Ce lien ne permet pas de confirmer le résultat de la vérification. Il peut être invalide, avoir expiré ou avoir déjà été utilisé. Une tentative précédente de vérification a peut-être abouti ; vous pouvez le confirmer par e-mail.",
    "uncertain": "La réponse à la vérification n’a pas été reçue. Une tentative précédente de vérification a peut-être abouti. Vous pouvez vérifier à nouveau avec le même lien ou confirmer par e-mail.",
    "noScript": "Pour vérifier votre demande, activez JavaScript et ouvrez à nouveau le lien reçu par e-mail.",
    "contact": "Retour au contact",
    "email": "Confirmer le statut de la demande par e-mail"
  },
  "ja": {
    "title": "データのご依頼の確認 · YULA Lab",
    "heading": "データのご依頼を確認",
    "intro": "この操作で、ご依頼に使われたメールアドレスがご本人のものであることを確認します。",
    "button": "依頼を確認",
    "retry": "同じリンクでもう一度確認",
    "sending": "確認中…",
    "verified": "メールアドレスを確認しました。ご依頼の処理に進める状態になりました。",
    "failed": "このリンクでは確認結果を確かめられません。リンクが無効、期限切れ、または使用済みの可能性があります。以前の確認操作が完了している場合もあります。メールで状況をお問い合わせいただけます。",
    "uncertain": "確認結果の応答を受信できませんでした。以前の確認操作が完了している可能性があります。同じリンクでもう一度確認するか、メールで状況をお問い合わせください。",
    "noScript": "依頼を確認するには、JavaScriptを有効にして、メール内のリンクをもう一度開いてください。",
    "contact": "お問い合わせに戻る",
    "email": "メールで依頼の状況を問い合わせる"
  },
  "ar": {
    "title": "تأكيد طلب البيانات · YULA Lab",
    "heading": "أكّد طلب بياناتك",
    "intro": "يؤكد هذا الإجراء أن عنوان البريد الإلكتروني الوارد في الطلب يخصك.",
    "button": "تأكيد الطلب",
    "retry": "تحقّق مجددًا بالرابط نفسه",
    "sending": "جارٍ التأكيد…",
    "verified": "تم تأكيد عنوان البريد الإلكتروني. يمكن الآن معالجة طلبك.",
    "failed": "لا يمكن تأكيد نتيجة التحقق باستخدام هذا الرابط. قد يكون غير صالح أو منتهي الصلاحية أو استُخدم بالفعل. ربما اكتملت محاولة تحقق سابقة؛ ويمكنك الاستفسار عن حالة الطلب بالبريد الإلكتروني.",
    "uncertain": "لم تُستلم استجابة التحقق. ربما اكتملت محاولة تحقق سابقة. يمكنك إعادة التحقق باستخدام الرابط نفسه أو الاستفسار عن حالة الطلب بالبريد الإلكتروني.",
    "noScript": "لتأكيد طلبك، فعّل JavaScript وافتح الرابط الوارد في بريدك الإلكتروني من جديد.",
    "contact": "العودة إلى التواصل",
    "email": "الاستفسار عن حالة الطلب بالبريد الإلكتروني"
  },
  "it": {
    "title": "Verifica la richiesta sui dati · YULA Lab",
    "heading": "Verifica la tua richiesta sui dati",
    "intro": "Questa azione conferma che l'indirizzo e-mail della richiesta appartiene a te.",
    "button": "Verifica la richiesta",
    "retry": "Controlla di nuovo con lo stesso link",
    "sending": "Verifica in corso…",
    "verified": "L'indirizzo e-mail è stato verificato. La richiesta può ora essere elaborata.",
    "failed": "Il risultato della verifica non può essere confermato con questo link. Potrebbe essere non valido, scaduto o già usato. Un tentativo precedente potrebbe essere stato completato; puoi chiedere conferma via e-mail.",
    "uncertain": "Non è stata ricevuta una risposta di verifica. Un tentativo precedente potrebbe essere stato completato. Puoi ricontrollare con lo stesso link o chiedere conferma via e-mail.",
    "noScript": "Per verificare la richiesta, attiva JavaScript e riapri il link nell'e-mail.",
    "contact": "Torna ai contatti",
    "email": "Conferma lo stato della richiesta via e-mail"
  },
  "ko": {
    "title": "데이터 요청 확인 · YULA Lab",
    "heading": "데이터 요청 확인",
    "intro": "이 작업은 요청에 사용한 이메일 주소가 본인 소유임을 확인합니다.",
    "button": "요청 확인",
    "retry": "같은 링크로 다시 확인",
    "sending": "확인 중…",
    "verified": "이메일 주소가 확인되었습니다. 이제 요청을 처리할 수 있습니다.",
    "failed": "이 링크로는 확인 결과를 확정할 수 없습니다. 링크가 잘못되었거나 만료되었거나 이미 사용되었을 수 있습니다. 이전 시도가 완료되었을 수도 있으니 이메일로 확인할 수 있습니다.",
    "uncertain": "확인 응답을 받지 못했습니다. 이전 시도가 완료되었을 수 있습니다. 같은 링크로 다시 확인하거나 이메일로 확인할 수 있습니다.",
    "noScript": "요청을 확인하려면 JavaScript를 켜고 이메일의 링크를 다시 여세요.",
    "contact": "문의 페이지로 돌아가기",
    "email": "이메일로 요청 상태 확인"
  },
  "id": {
    "title": "Verifikasi permintaan data · YULA Lab",
    "heading": "Verifikasi permintaan data Anda",
    "intro": "Tindakan ini mengonfirmasi bahwa alamat email pada permintaan adalah milik Anda.",
    "button": "Verifikasi permintaan",
    "retry": "Periksa kembali dengan tautan yang sama",
    "sending": "Memverifikasi…",
    "verified": "Alamat email telah diverifikasi. Permintaan Anda kini dapat diproses.",
    "failed": "Hasil verifikasi tidak dapat dikonfirmasi melalui tautan ini. Tautan mungkin tidak valid, kedaluwarsa, atau sudah digunakan. Percobaan sebelumnya mungkin telah selesai; Anda dapat meminta konfirmasi lewat email.",
    "uncertain": "Respons verifikasi belum diterima. Percobaan sebelumnya mungkin telah selesai. Anda dapat memeriksa kembali dengan tautan yang sama atau meminta konfirmasi lewat email.",
    "noScript": "Untuk memverifikasi permintaan, aktifkan JavaScript dan buka kembali tautan pada email Anda.",
    "contact": "Kembali ke kontak",
    "email": "Konfirmasikan status permintaan lewat email"
  },
  "pl": {
    "title": "Potwierdź wniosek dotyczący danych · YULA Lab",
    "heading": "Potwierdź wniosek dotyczący danych",
    "intro": "Ta czynność potwierdza, że adres e-mail podany we wniosku należy do Ciebie.",
    "button": "Potwierdź wniosek",
    "retry": "Sprawdź ponownie tym samym odnośnikiem",
    "sending": "Weryfikowanie…",
    "verified": "Adres e-mail został zweryfikowany. Można teraz przystąpić do rozpatrzenia wniosku.",
    "failed": "Nie można potwierdzić wyniku weryfikacji tym odnośnikiem. Może być nieprawidłowy, wygasły lub już użyty. Wcześniejsza próba mogła się zakończyć; możesz potwierdzić status e-mailem.",
    "uncertain": "Nie otrzymano odpowiedzi weryfikacyjnej. Wcześniejsza próba mogła się zakończyć. Sprawdź ponownie tym samym odnośnikiem lub potwierdź status e-mailem.",
    "noScript": "Aby potwierdzić wniosek, włącz JavaScript i ponownie otwórz odnośnik z e-maila.",
    "contact": "Wróć do kontaktu",
    "email": "Potwierdź status wniosku e-mailem"
  },
  "hi": {
    "title": "डेटा संबंधी अनुरोध का सत्यापन · YULA Lab",
    "heading": "अपने डेटा संबंधी अनुरोध का सत्यापन करें",
    "intro": "यह कार्रवाई पुष्टि करती है कि अनुरोध का ईमेल पता आपका है।",
    "button": "अनुरोध का सत्यापन करें",
    "retry": "उसी लिंक से फिर जाँचें",
    "sending": "सत्यापन जारी है…",
    "verified": "ईमेल पते का सत्यापन हो गया है। अब आपके अनुरोध पर कार्यवाही की जा सकती है।",
    "failed": "इस लिंक से सत्यापन के परिणाम की पुष्टि नहीं हो सकती। लिंक गलत हो सकता है, उसकी अवधि समाप्त हो सकती है या वह पहले इस्तेमाल हो चुका हो सकता है। पहले का सत्यापन प्रयास पूरा हो चुका हो सकता है; ईमेल से पुष्टि कर सकते हैं।",
    "uncertain": "सत्यापन का उत्तर नहीं मिला। पहले का सत्यापन प्रयास पूरा हो चुका हो सकता है। उसी लिंक से फिर जाँच सकते हैं या ईमेल से पुष्टि कर सकते हैं।",
    "noScript": "अपने अनुरोध का सत्यापन करने के लिए JavaScript चालू करें और ईमेल में दिया लिंक फिर खोलें।",
    "contact": "संपर्क पेज पर लौटें",
    "email": "ईमेल से अनुरोध की स्थिति की पुष्टि करें"
  },
  "zh-Hans": {
    "title": "确认数据请求 · YULA Lab",
    "heading": "确认您的数据请求",
    "intro": "此操作用于确认请求中的邮箱地址属于您。",
    "button": "确认请求",
    "retry": "使用同一链接再次确认",
    "sending": "确认中…",
    "verified": "邮箱地址已确认。现在可以处理您的请求。",
    "failed": "无法使用此链接确认验证结果。链接可能无效、已过期或已使用。先前的验证尝试可能已完成；您可以通过邮件确认请求状态。",
    "uncertain": "未收到验证响应。先前的验证尝试可能已完成。您可以使用同一链接再次确认，或通过邮件确认请求状态。",
    "noScript": "如需确认请求，请启用 JavaScript，然后重新打开邮件中的链接。",
    "contact": "返回联系页面",
    "email": "通过邮件确认请求状态"
  }
};
