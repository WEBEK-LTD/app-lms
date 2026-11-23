"""212 The shop's wishlist, reviews with photos and back in stock in Yallapp Business: the reviews inbox, the saved and waiting counts."""

S = [
("inboxProductReviews", "Product reviews", "تقييمات المنتجات", "Ürün değerlendirmeleri"),
("onProduct", "on {product}", "على {product}", "{product} için"),
("reviewsWithPhotos", "With photos", "بالصور", "Fotoğraflı"),
("reviewPhotos", "Photos with the review", "صور مع التقييم", "Değerlendirmenin fotoğrafları"),
("photoNumber", "Photo {n}", "الصورة {n}", "Fotoğraf {n}"),
("noProductReviewsText", "Customers who bought a product can review it in your app, with photos.", "يستطيع العملاء الذين اشتروا منتجًا تقييمه في تطبيقك، مع الصور.", "Bir ürünü satın alan müşteriler onu uygulamanızda fotoğraflarla değerlendirebilir."),
("shopWishes", "Waiting & saved", "المنتظرون والمحفوظ", "Bekleyenler ve kaydedilenler"),
("shopWaiting", "Waiting for stock", "بانتظار المخزون", "Stok bekleyenler"),
("shopWaitingHint", "When it's back, each of them gets a notification once.", "حين يعود المنتج يصل إلى كل منهم إشعار واحد.", "Geri geldiğinde her biri bir kez bildirim alır."),
("shopWaitingNone", "Nobody is waiting for a product right now.", "لا أحد ينتظر منتجًا الآن.", "Şu anda bir ürünü bekleyen yok."),
("shopSaved", "Saved to wishlists", "المحفوظ في المفضلة", "İstek listelerinde"),
("shopSavedNone", "No customer saved a product yet.", "لم يحفظ أي عميل منتجًا بعد.", "Henüz hiçbir müşteri ürün kaydetmedi."),
("variationNumber", "Choice #{id}", "الاختيار رقم {id}", "Seçenek #{id}"),
("productNoLongerSold", "A product no longer sold", "منتج لم يعد يُباع", "Artık satılmayan bir ürün"),
]

P = [
("shopWaitingCount", "count", "{count, plural, =1{1 waits} other{{count} wait}}", "{count, plural, =1{ينتظره عميل واحد} other{ينتظره {count}}}", "{count, plural, =1{1 kişi bekliyor} other{{count} kişi bekliyor}}"),
("shopSavedCount", "count", "{count, plural, =1{Saved by 1} other{Saved by {count}}}", "{count, plural, =1{حفظه عميل واحد} other{حفظه {count}}}", "{count, plural, =1{1 kişi kaydetti} other{{count} kişi kaydetti}}"),
]
