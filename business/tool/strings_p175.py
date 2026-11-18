"""175 Yallapp Business: Cancel order on a paid order asks the owner, every time, to refund it or not; postpone and retry days from the shop's own clock; Arabic-Indic digits in amounts."""

S = [
("cancelPaidText", "The customer is told, and its items go back in stock. Choose what happens to the payment.", "سيتم إبلاغ العميل، وتعود المنتجات إلى المخزون. اختر ما يحدث للمبلغ المدفوع.", "Müşteriye bildirilir ve ürünler stoğa geri döner. Ödemeye ne olacağını seçin."),
("cancelAndRefund", "Cancel and refund {amount}", "إلغاء واسترداد {amount}", "İptal et ve {amount} iade et"),
("cancelRefundNow", "Refunded now through the order's payment gateway. The customer is told.", "يُسترد المبلغ الآن عبر بوابة الدفع الخاصة بالطلب، ويُبلَّغ العميل.", "Siparişin ödeme altyapısı üzerinden hemen iade edilir. Müşteriye bildirilir."),
("cancelRefundYourself", "This payment can't go back by itself: the order shows Needs a refund until you pay it back.", "لا يمكن استرداد هذا المبلغ تلقائيًا: سيظهر الطلب «يحتاج إلى استرداد» إلى أن تعيده بنفسك.", "Bu ödeme kendiliğinden iade edilemez: siz geri ödeyene kadar sipariş «İade gerekiyor» olarak görünür."),
("cancelRefundEither", "Refunded through the order's payment gateway when it can; otherwise the order shows Needs a refund until you pay it back.", "يُسترد عبر بوابة الدفع الخاصة بالطلب متى أمكن؛ وإلا فسيظهر الطلب «يحتاج إلى استرداد» إلى أن تعيده بنفسك.", "Mümkünse siparişin ödeme altyapısı üzerinden iade edilir; değilse siz geri ödeyene kadar sipariş «İade gerekiyor» olarak görünür."),
("cancelWithoutRefund", "Cancel without refund", "إلغاء دون استرداد", "İade etmeden iptal et"),
("cancelWithoutRefundHint", "You keep the payment. You can still refund it later.", "يبقى المبلغ لديك، ويمكنك استرداده لاحقًا.", "Ödeme sizde kalır. Daha sonra yine iade edebilirsiniz."),
("keepOrder", "Keep the order", "الإبقاء على الطلب", "Siparişi koru"),
]

P = []
