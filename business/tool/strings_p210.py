"""210 Custom-order requests (a crochet or made-to-order shop's): their list, statuses, answer with a quote, and the counts."""

S = [
("customOrders", "Custom orders", "الطلبات الخاصة", "Özel siparişler"),
("customOrdersText", "Requests sent from your app's custom-order form", "طلبات مرسلة من نموذج الطلب الخاص في تطبيقك", "Uygulamanızın özel sipariş formundan gelen talepler"),
("requestStatusNew", "New", "جديد", "Yeni"),
("requestStatusQuoted", "Quoted", "أُرسل السعر", "Fiyat verildi"),
("requestStatusAccepted", "Accepted", "مقبول", "Kabul edildi"),
("requestStatusDeclined", "Declined", "مرفوض", "Reddedildi"),
("requestStatusDone", "Done", "مكتمل", "Tamamlandı"),
("requestsOpen", "Open", "المفتوحة", "Açık"),
("requestsAll", "All", "الكل", "Tümü"),
("noRequests", "No custom orders yet", "لا طلبات خاصة بعد", "Henüz özel sipariş yok"),
("noRequestsText", "Add the custom-order page or form to your app in Studio, and the requests your customers send show here.", "أضف صفحة أو نموذج الطلب الخاص إلى تطبيقك من Studio، وستظهر هنا الطلبات التي يرسلها عملاؤك.", "Studio'da uygulamanıza özel sipariş sayfasını ya da formunu ekleyin; müşterilerinizin gönderdiği talepler burada görünür."),
("noOpenRequests", "No requests waiting for you", "لا طلبات بانتظارك", "Sizi bekleyen talep yok"),
("requestSomeone", "A customer", "عميل", "Bir müşteri"),
("requestQuote", "Quoted {price}", "السعر {price}", "Fiyat {price}"),
("requestAsked", "What they asked for", "ما طلبه العميل", "İstenenler"),
("requestCustomer", "Customer", "العميل", "Müşteri"),
("requestAnswerTitle", "Your answer", "ردّك", "Yanıtınız"),
("requestStatusLabel", "Where it is", "حالة الطلب", "Durumu"),
("requestPrice", "Price ({currency})", "السعر ({currency})", "Fiyat ({currency})"),
("requestPriceHint", "Like 450 or 450.50", "مثل 450 أو 450.50", "Örneğin 450 veya 450.50"),
("requestReply", "Your reply", "ردّك على العميل", "Yanıtınız"),
("requestReplyHint", "The price, the time, a question", "السعر أو المدة أو سؤال", "Fiyat, süre, bir soru"),
("requestSave", "Save the answer", "حفظ الرد", "Yanıtı kaydet"),
("requestSaved", "Saved the answer.", "تم حفظ الرد.", "Yanıt kaydedildi."),
("requestSentOn", "{title} · {date}", "{title} · {date}", "{title} · {date}"),
]

P = [
("requestsNewCount", "count", "{count, plural, =1{1 new request} other{{count} new requests}}", "{count, plural, =1{طلب جديد واحد} =2{طلبان جديدان} few{{count} طلبات جديدة} many{{count} طلبًا جديدًا} other{{count} طلب جديد}}", "{count, plural, other{{count} yeni talep}}"),
]
