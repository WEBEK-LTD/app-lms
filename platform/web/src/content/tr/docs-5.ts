import type { DocTranslation } from "../translation-types";

/** 55 The documentation in Turkish, part 5: selling and bookings, and media. */
export const TR_DOCS_5: Record<string, DocTranslation> = {
  "store-orders": {
    title: "Ürünler, siparişler ve kargo",
    description: "Web siteniz olmadan satış yapın: ürün ve kategori ekleyin, kargoyu ayarlayın ve siparişleri panelden yönetin.",
    body: `Web sitesi olmayan mağaza uygulamaları, panelin **Ürünler** sayfasında eklediğiniz ürünleri satar. Değişiklikler uygulamada hemen görünür.

## Ürünler

**Yeni ürün**'ü seçin ve şunları doldurun:

- Ad, açıklama ve fotoğraflar
- **Fiyat** ve isteğe bağlı **İndirimli fiyat**; normal fiyat üstü çizili olarak gösterilir
- **Stok**: stok saymıyorsanız boş bırakın; 0 olduğunda ürün tükendi olarak görünür
- **Kategoriler** ve isteğe bağlı bir ürün kodu
- **Dijital ürün**: hediye kartı gibi gönderilecek bir şey yoktur. Kargo ücreti alınmaz ve iPhone uygulaması bu ürünü satmaz (Apple'ın kuralları)
- **Öne çıkan**: uygulamanın ana ekranında ilk sırada gösterilir
- **Uygulamada göster**: bir ürünü silmeden gizlemek için kapatın

Her ürünün paylaşabileceğiniz kendi web sayfası da vardır.

## Kategoriler

Ürünlerinizi "Buketler" veya "Hediyeler" gibi gruplara ayırın. Müşteriler bunlara uygulamada göz atar.

## Kargo

Fiziksel ürün içeren siparişler için bir **Kargo ücreti** belirleyin (ücretsiz kargo için boş bırakın) ve isteğe bağlı olarak belirli bir sipariş tutarından itibaren **Ücretsiz kargo** sunun.

## Kuponlar

**Ürünler** sayfasındaki **Kuponlar** bölümünde, müşterilerinizin uygulamanın sepetine yazacağı SPRING10 gibi kodlar ekleyin: ürünlerden **Yüzde indirim** ya da **Tutar indirimi** (kargo aynı kalır), isteğe bağlı **En az sipariş**, **Son gün** ve **Kullanım** sayısıyla. Sepet, kuponun ne kadar indirim yaptığını ve toplamı ya da neden geçerli olmadığını gösterir; ödeme sayfası indirim düşülmüş toplamı tahsil eder. Ödenen her sipariş bir kullanım sayılır. **Kapat** kuponu şimdilik durdurur; siparişler kullanılan kuponu gösterir.

WooCommerce'e bağlı uygulamalar WooCommerce kuponlarınızla aynı şekilde çalışır: sepet kodu kontrol eder, ödeme sayfanız uygular (Yallapp eklentisi 0.4.15 veya sonrası). Shopify'daki uygulamalar kodu siparişle birlikte mağazanızın ödeme sayfasına gönderir; diğer bağlı platformlarda sepet, müşterilere kodu ödeme adımında girmelerini hatırlatır.

## Ödemeler

Müşteriler, sağlayıcınızın (iyzico, Kashier veya Fawaterk) güvenli sayfasında kartla öder. Kendi anahtarlarınızı ekleyin: [Kartla ödemeler](/docs/card-payments) sayfasına bakın.

## Siparişler

Ödenen siparişler **Siparişler** sayfasında görünür ve her biri için e-posta alırsınız. Teslim edilen siparişi **tamamlandı**, gerektiğinde **iptal edildi** olarak işaretleyin ve altındaki **İade** ile tamamını ya da bir kısmını iade edin ([Kartla ödemeler](/docs/card-payments) sayfasına bakın). Müşteriler siparişlerini, durumlarını ve iade edilen tutarı uygulamada görür.
`,
  },
  restaurants: {
    title: "Restoranlar ve kafeler: menü, gel-al, teslimat ve mutfak",
    description: "Web siteniz olmadan bir Restoran ve kafe uygulaması çalıştırın: seçenekli yemekler, çalışma saatleri, gel-al ve teslimat ile Mutfak sayfası.",
    body: `Restoran ve kafe uygulaması, müşterilerinizin beklediği kelimelerle konuşan bir yemek mağazasıdır: paneliniz **Menü** ve **Mutfak**'ı, uygulama da **Menü**'nüzü gösterir. **Uygulama kurulumu**'nun ilk sayfasında **Restoran ve kafe**'yi, ardından Web sitesi adımında **Web sitem yok**'u seçin.

## Yemekler ve kategoriler

**Menü** sayfasında **Yemek ekle**'yi seçin ve her ürün gibi adını, açıklamasını, fiyatını ve fotoğraflarını doldurun ([Ürünler, siparişler ve kargo](/docs/store-orders) sayfasına bakın). *Kahvaltı*, *Ana yemekler* ve *İçecekler* gibi kategoriler, uygulamadaki menünüzün üstünde sekmelere dönüşür.

## Seçenekler

**Seçenekler** altında, müşterinin yaptığı her seçim için **Seçenek grubu ekle**'yi seçin; örneğin:

- **Boyut**: Küçük ya da 20 fazlasına Büyük. Müşteriler **en az 1** ve **en fazla 1** seçer.
- **Ekstralar**: 15 fazlasına peynir, 25 fazlasına pastırma. Müşteriler **en az 0** (isteğe bağlı) ve **en fazla 3** seçer.

Her seçenek yemeğe ek ücretli ya da ücretsiz olabilir. Uygulama, seçilmesi gereken grupları sorar ve fiyatı değiştikçe gösterir. Fiyatları her zaman telefon değil sunucumuz hesaplar; yani belirlediğiniz fiyat ödenen fiyattır.

## Gel-al ve teslimat

**Gel-al ve teslimat** altında:

- Müşterilerin siparişlerini aldığı adresle **Gel-al**; **teslimat ücreti**, teslimat için **minimum sipariş** ve teslimat yaptığınız **semtler veya posta kodları** ile **Teslimat** (her satıra bir tane; müşteriler birini seçer). *Moda'ya 3 km mesafede* gibi kısa bir not, müşterilere nereye teslimat yaptığınızı söyler.
- Haftanın her günü için **Çalışma saatleri** ve **saat diliminiz**. Kapalı günler işaretlenmeden bırakılır.
- **Hazırlık süresi**: bir siparişin ne kadar sürdüğü. Müşteriler bundan daha erken bir saat seçemez.
- Açıkken **En kısa sürede** siparişler ve örneğin her 15 dakikada bir, birkaç gün sonrasına kadar **ileri saatli siparişler**.

Kapalıyken uygulama **Şu an kapalı** yazar ve ne zaman açılacağınızı gösterir. En kısa sürede siparişler siz açılana kadar bekler; izin verdiyseniz ileri saatli siparişler yine çalışır.

## Mutfak sayfası

Ödenen siparişler, seçilenler, gel-al veya teslimat, saat ve adresle birlikte **Mutfak**'ta görünür. Her biri için ayrıca e-posta alırsınız. Her siparişi tek düğmeyle ilerletin: **Hazırlanıyor**, **Hazır**, **Yolda** (yalnızca teslimatlarda) ve **Tamamlandı** ya da **Siparişi iptal et**. Sipariş yalnızca ileri gider. Her adım müşteriye bildirim olarak ulaşır ve uygulamadaki siparişi nerede olduğunu gösterir. Sayfa her 30 saniyede bir kendiliğinden yenilenir.

> İptal edilen siparişler otomatik olarak iade edilmez: **Biten siparişler**'deki siparişin altındaki **İade** ile iade edin.

## Ödemeler

Müşteriler giriş yapar, ardından Android'de ve iPhone'da sağlayıcınızın (iyzico, Kashier veya Fawaterk) güvenli sayfasında kartla öder: yemek fiziksel bir üründür, bu yüzden Apple'ın kuralları buna izin verir. Kendi anahtarlarınızı ekleyin: [Kartla ödemeler](/docs/card-payments) sayfasına bakın.

## WooCommerce ile

WooCommerce ile satış yapan restoranlar menü ifadelerini kullanır ve ürün varyasyonları seçenek olarak çalışır. Uygulamada siparişin adımı WooCommerce durumunu izler: processing **Hazırlanıyor**'dur, completed ve cancelled ise kendi anlamlarıyla gösterilir. Ek fiyatlı seçenek grupları, çalışma saatleri, gel-al ve teslimat şimdilik yalnızca Yallapp panelindedir.
`,
  },
  "card-payments": {
    title: "iyzico, Kashier veya Fawaterk ile kartla ödemeler",
    description: "Web sitesi olmayan uygulamalarda kendi iyzico, Kashier veya Fawaterk hesabınıza kartla ödeme alın.",
    body: `Web sitesi olmayan uygulamalar kartla ödemeleri **iyzico** (Türkiye), **Kashier** veya **Fawaterk** (Mısır) üzerinden alır: mağazalar siparişleri için, restoranlar ve kafeler, etkinlik düzenleyiciler biletler için, spor salonları üyelikler için, akademiler ücretli kurslar için ve hayır kurumları bağışlar için. Müşteriler kartlarını sağlayıcının güvenli sayfasına girer; Yallapp kartı asla görmez. Bir sipariş, ancak sağlayıcı ödemeyi tam o tutar ve para birimiyle onayladıktan sonra ödendi olarak işaretlenir: sağlayıcıya kendimiz sorarız, bu yüzden bir bağlantı açılarak ödeme taklit edilemez.

## Kendi ödeme hesabınızı kullanın

**Ürünler** sayfasında (ya da fiyatlarınızı belirlediğiniz sayfada: **Kurslar**, **Menü**, **Etkinlikler**, **Üyelik planları**, **Kampanyalar**) **Kartla ödemeler** altında **Kendi ödeme hesabınızı kullanın**'ı açın, sağlayıcınızı seçin ve anahtarlarınızı yapıştırın. Ödemeler doğrudan hesabınıza geçer.

- **iyzico**: iyzico üye işyeri panelinde Settings altındaki **API key** ve **Secret key**. Fiyatlar TRY, USD veya EUR.
- **Kashier**: Kashier panelinde Integrate now altındaki **Merchant ID** (MID-…), **Payment API key** ve **Secret key**. Fiyatlar EGP, USD veya EUR.
- **Fawaterk**: Fawaterk panelinde Integrations altındaki **API key**. Fiyatlar EGP, USD, SAR, AED veya EUR.

Fiyatlarınızı sağlayıcınızın kabul ettiği bir para biriminde belirleyin: eşleşmediklerinde **Kartla ödemeler** kutusu sizi uyarır.

> Önce denemek için test anahtarını (**Sandbox keys**, **Test mode keys** veya **Staging key**) açın, sağlayıcının test anahtarlarını yapıştırın ve test kartlarıyla ödeyin. Canlı anahtarlarınızı yapıştırdığınızda kapatın: test ve canlı anahtarlar farklıdır.

## Yallapp müşterilerinizin ödemelerini asla almaz

Her işletme müşterilerinin ödemelerini kendi ödeme sağlayıcısı hesabında alır: Yallapp satışlarınız için hiçbir para tahsil etmez, bu satışların tarafı değildir ve komisyon yoktur. Anahtarlarınız kaydedilene kadar müşteriler ürünlerinizi, kurslarınızı veya biletlerinizi uygulamada görür ama ödeme yapamaz. Daha önce sunulan Yallapp'in hesabı üzerinden satış sona erdi: kullandıysanız yukarıdan kendi hesabınızı ekleyin; daha önce ödenmiş siparişler eskisi gibi sonuçlandırılır.

## İadeler

Ödenmiş bir siparişi, bileti, kursu veya bağışı **Siparişler** ya da **Bağışlar** sayfasında altındaki **İade** ile, tamamını veya bir kısmını, bir gerekçeyle iade edin.

- **iyzico** ve **Kashier**: Yallapp iadeyi sağlayıcınız üzerinden sizin anahtarlarınızla yapar. iyzico aynı gün yapılan ödemeyi iptal eder (müşterinin ekstresinde hiçbir şey görünmez), diğer durumlarda kalem kalem iade eder. Kashier gizli anahtarınızın iade yetkisi olması gerekir.
- **Fawaterk**: iadeyi Fawaterk panelinde yapın, ardından **İade** ile kaydedin (isterseniz Fawaterk'in referansıyla).
- Sonrasında: sipariş veya bağış **İade edildi** (ya da iade edilen tutar) olarak görünür, müşteri bir e-posta alır ve bunu uygulamada görür. Bir siparişin tamamını iade etmek, karşılığında ödenenleri geri alır: biletler iptal edilir ve yerleri yeniden satışa çıkar, kurs öğrenciye kapanır, üyelik sona erer; kısmi iadede neyin geri alınacağını siz işaretlersiniz. İade edilen bağış, kampanyanın toplamına artık sayılmaz.
- Bu sona ermeden önce Yallapp'in hesabı üzerinden satılmış bir sipariş: iade Yallapp'in hesabından yapılır ve Yallapp komisyonunu orantılı olarak geri verir. Payınız zaten aktarıldıysa (Kashier veya Fawaterk), Yallapp iadedeki payınızı bir sonraki aktarımınızdan düşer. Yallapp'in hesabındaki bir Fawaterk ödemesini ekibimiz iade eder: bize WhatsApp'tan yazın.

## Ücretli kurslar

Web sitesi olmayan akademi uygulamaları ücretli kursları aynı şekilde, yalnızca Android'de satar: öğrenci ödeme sayfasında öder ve ödeme onaylandığında kursa kaydedilir. Apple'ın kuralları gereği iPhone uygulaması ücretli kurslar için satın alma düğmesi göstermez.

## Bağışlar

Hayır kurumu ve bağış uygulamaları, her uygulama gibi, bağışları kendi iyzico, Kashier veya Fawaterk hesaplarıyla alır. Anahtarlarınızı **Kampanyalar** sayfasında ekleyin. [Hayır kurumu ve bağış uygulamaları](/docs/donations) sayfasına bakın.
`,
  },
  bookings: {
    title: "Hizmetler, ekip ve randevular",
    description: "Web siteniz olmadan bir Randevu uygulaması çalıştırın: hizmetler, ekibinizin çalışma saatleri, randevu kuralları ve randevular.",
    body: `Web sitesi olmayan randevu uygulamaları hizmetlerini, ekiplerini ve kurallarını panelin **Hizmetler ve ekip** sayfasından alır. Müşteriler uygulamadan randevu alır, siz de randevularını **Randevular** sayfasında görürsünüz.

## Hizmetler ve kategoriler

**Hizmet ekle**'yi seçin; hizmete bir ad, dakika cinsinden süre, fiyat ve renk verin ve bir kategoriye koyun. Fiyat randevuda ödenir; ücretsiz hizmet için boş bırakın. Bir hizmeti silmeden gizlemek için **Müşteriler randevu alabilir**'i kapatın.

## Ekibiniz

Randevu alan her kişi için **Ekip üyesi ekle**'yi seçin; görevini, **verdiği hizmetleri**, haftanın her günü için **çalışma saatlerini** ve izin günlerini (her satıra bir tarih, örneğin 2026-12-31) girin. Boş saatler, her kişinin çalışma saatlerinden randevuları çıkarılarak bulunur; böylece iki randevu asla çakışmaz.

## Randevu kuralları

- **Saat diliminiz** ve **para biriminiz**
- **Saatler şu aralıkla başlar**: boş bir saatin ne sıklıkla başladığı, örneğin her 30 dakikada bir
- **En az** şu kadar saat önceden **randevu alınır** ve **en fazla** şu kadar gün sonrasına **randevu alınır**
- Randevudan **en geç** şu kadar saat önce **iptal**; müşteriler uygulamadan iptal edemiyorsa boş bırakın
- **Müşteriler not bırakabilir**
- **Yeni randevuları hemen onayla** ya da her birini kendiniz onaylayın

## Randevular

Her yeni randevu **Randevular**'da görünür ve bir e-posta alırsınız. Onay gerektiren randevuları **onaylayın** veya **reddedin**, birini **iptal edin** ve sonrasında **gerçekleşti** ya da **gelmedi** olarak işaretleyin. Müşteriler durumu uygulamada görür.

> Ödeme işletmenizde yapılır. Uygulama bir randevu için asla ödeme almaz.
`,
  },
  clinics: {
    title: "Klinikler: doktorlar, muayeneler ve ön bilgi formu",
    description: "Web siteniz olmadan bir Klinik uygulaması çalıştırın: doktorlarınızın profilleri, hastaların randevu alırken doldurduğu ön bilgi formu ve muayeneleri.",
    body: `Klinik uygulaması, hastalarınızın beklediği kelimelerle bir Randevu uygulaması gibi çalışır: paneliniz **Doktorlar ve hizmetler** ile **Muayeneler**'i gösterir, uygulama da doktorlardan ve muayenelerden söz eder. **Uygulama kurulumu**'nun ilk sayfasında **Klinik**'i, ardından Web sitesi adımında **Web sitem yok**'u seçin.

Hizmetler, çalışma saatleri, izin günleri ve randevu kuralları [Hizmetler, ekip ve randevular](/docs/bookings) sayfasında anlatıldığı gibi çalışır.

## Doktorlarınız

Hasta kabul eden her doktor veya terapist için **Doktor ekle**'yi seçin. Görevinin, hizmetlerinin ve çalışma saatlerinin yanı sıra şunları ekleyebilirsiniz:

- Virgülle ayrılmış **Uzmanlık alanları**, örneğin *Ortodonti, Çocuk diş hekimliği*
- Hastalarla konuştuğu **Diller**
- **Hakkında**: uygulamadaki profilinde gösterilen birkaç satır

## Ön bilgi formu

**Ön bilgi formu** altında, muayeneden önce öğrenmek istediğiniz her şey için **Soru ekle**'yi seçin. Bir sorunun yanıtı şunlardan biri olabilir:

- **Kısa yanıt**: en fazla 200 karakter
- **Uzun yanıt**: en fazla 2.000 karakter
- **Tarih**, örneğin doğum tarihi
- **Listeden biri**: seçenekleri her satıra bir tane olacak şekilde yazın

Hastaların atlayamayacağı sorular için **Yanıtlanması zorunlu**'yu açın. Sırayı değiştirmek için **Yukarı taşı**'yı, bir soruyu kaldırmak için **Soruyu sil**'i kullanın; daha önce verilen yanıtlar soruyu sorulduğu haliyle saklar. Hastalar muayene randevusu alırken uygulamada yanıtlar ve yanıtlarını muayeneyle birlikte görür.

## Muayeneler

Her yeni muayene, hastanın adı ve ona nasıl ulaşılacağıyla birlikte **Muayeneler**'de görünür. Yanıtlarını okumak için **Form yanıtları**'nı açın. Her yeni muayene için bir e-posta alırsınız; e-posta yanıtların panelinizde olduğunu söyler ama yanıtları asla içermez.

## Gizlilik

Form yanıtlarını yalnızca hasta, uygulamadaki muayenelerinde, ve kliniğiniz, panelinizde görebilir. Yanıtlar asla e-postalara, anlık bildirimlere veya kısa mesajlara konmaz. Yallapp bunları muayeneyle birlikte, webek.org tarafından barındırılan sunucularda saklar. Muayeneden önce yalnızca ihtiyacınız olanı sorun.

## Bir WordPress randevu eklentisiyle

Amelia, BookingPress veya LatePoint ile randevu alan klinikler doktor, hasta ve muayene ifadelerini kullanır, ancak şimdilik uygulamada ön bilgi formu yoktur: hastalar, Randevu uygulamasındaki gibi randevu alır.

> Ödeme kliniğinizde yapılır. Uygulama bir muayene için asla ödeme almaz.
`,
  },
  fitness: {
    title: "Spor salonları ve stüdyolar: ders programı, dersler ve üyelikler",
    description: "Web siteniz olmadan bir Spor salonu ve fitness uygulaması çalıştırın: haftalık dersleriniz, her dersteki yerler, üyelik planları ve üyeleriniz.",
    body: `Spor salonu ve fitness uygulaması, grup dersleri ve üyelikleri olan bir Randevu uygulamasıdır. **Uygulama kurulumu**'nun ilk sayfasında **Spor salonu ve fitness**'ı, ardından Web sitesi adımında **Web sitem yok**'u seçin. Panelinizin menüsü bu durumda **Dersler ve eğitmenler**, **Ders programı**, **Üyelik planları**, **Üyeler**, **Özel dersler** ve **Siparişler**'i gösterir.

## Dersler ve eğitmenler

**Dersler ve eğitmenler**'de verdiğiniz her dersi (örneğin *Yoga flow*, 60 dakika) ve her eğitmeni ekleyin. Yalnızca ders programında olan ve hiçbir zaman birebir randevu alınmayan bir derste **Müşteriler randevu alabilir** kapalıdır. Müşterilerin birebir randevu aldığı kişisel antrenman gibi hizmetler [Hizmetler, ekip ve randevular](/docs/bookings) sayfasında anlatıldığı gibi çalışır: boş saatleri her eğitmenin çalışma saatleri belirler ve bir eğitmen ders verirken özel ders için asla boş görünmez.

## Ders programı

**Ders programı**'nda her haftalık ders için **Programa ders ekle**'yi seçin: ders, eğitmen, gün, başlangıç saati, süre ve kaç **Yer** olduğu. Uygulama önümüzdeki 8 haftanın derslerini gösterir ve her gün yeni haftalar eklenir.

Bir kaydı değiştirmek yaklaşan derslerini değiştirir; birinin zaten yer ayırttığı ders saatini korur. Bir kaydı programdan kaldırmak, kimsenin yer ayırtmadığı yaklaşan derslerini kaldırır.

**Önümüzdeki 7 gün** altında, her derse kimin yer ayırttığını görmek için **Kimler geliyor**'u açın. **Dersi iptal et** bir dersi iptal eder: yer ayırtan herkes uygulamada bildirim alır; yerleri ve kullanılan ders hakkı geri gelir.

## Yer ayırtma

Üyeler bir gün seçer, her dersi eğitmeni ve kalan yerleriyle görür ve tek dokunuşla yer ayırtır. Pek çok üye aynı anda yer ayırtsa bile, yalnızca boş yer kaldığı sürece yer ayrılır. Üyeler, **Dersler ve eğitmenler**'deki randevu kurallarınızda **En geç şu kadar saat önce iptal** altında belirlenen süreye kadar yerlerini bırakabilir.

## Üyelik planları

**Üyelik planları**'nda her planı fiyatı ve süresiyle ekleyin: **Aylık**, **3 ayda bir**, **Yıllık** ya da bitiş tarihi olmayan bir **Ders paketi**. Belirli sayıda ders içeren bir plan için **Dahil dersler**'i doldurun ya da sınırsız ders için boş bırakın (ders paketinin her zaman bir sayısı vardır). Bir planın satışını durdurmak için **Uygulamada satışta**'yı kapatın; satın alınmış üyelikler devam eder.

Derslere yalnızca üyelerin yer ayırtabilmesi için **Dersler üyelik gerektirir**'i açın. Bu durumda her rezervasyon ders sayılı bir planın bir dersini kullanır ve zamanında iptal etmek onu geri verir. Kapalıyken, giriş yapmış herkes ders ayırtabilir ve ödemeyi işletmenizde yapar.

Üyeler uygulamada bir plan satın alır ve ödeme sayfanızda kartla öder; üyelik hemen başlar. Kartla ödemeleri **Üyelik planları**'nın altında ayarlayın: [Kartla ödemeler](/docs/card-payments) sayfasına bakın. Ödenen üyelikler **Siparişler**'de de görünür.

## Üyeler

**Üyeler**, kimin hangi üyeliğe sahip olduğunu, ne zaman bittiğini ve kaç ders kaldığını listeler. Bir üyeliğe ders eklemek (ya da eksi bir sayıyla düşmek) için **Ders ekle**'yi, birini durdurmak için **Üyeliği bitir**'i, resepsiyonda ödeme yapan biri için de giriş yaptığı cep telefonu numarası veya e-posta adresiyle **Üyelik ekle**'yi kullanın.

## iPhone ve App Store

Üyelik, işletmenizdeki ve yüz yüze kullanılan dersler içindir; bu yüzden Apple, ödemenin uygulama dışında yapılmasına izin verir (App Store İnceleme Yönergesi 3.1.3(e)). iPhone uygulaması, Android ile aynı ödeme sayfasını açar. Yayınlarken bunu **Yayın**'daki **Mağaza inceleyicileri için** alanına ekleyin: sayfa uygun ifadeyi önerir.
`,
  },
  media: {
    title: "Medya ve depolama",
    description: "Videolarınızı, görsellerinizi ve PDF'lerinizi Yallapp'e yükleyin, derslerde ve sayfalarda kullanın, gerektiğinde depolama alanı ekleyin.",
    body: `Panelin **Medya** sayfası, uygulamanızın videolarını, görsellerini ve PDF'lerini Yallapp'in sunucularında saklar. Medya'daki bir ders videosu, uygulamanızın kendi oynatıcısında, filigranınızla ve nerede barındırıldığını gösteren hiçbir şey olmadan, yalnızca dersi izleyebilecek kişiler için oynatılır.

## Yükleme

Dosyaları **Medya**'ya bırakın ya da **Dosya seç**'i seçin. Şunları yükleyebilirsiniz:

- **Videolar**: MP4, MOV veya WebM, her biri en fazla 5 GB. MP4 (H.264) her telefonda oynar; mümkün olduğunda bu biçimde kaydedin veya dışa aktarın.
- **Görseller**: JPEG, PNG, WebP veya GIF, her biri en fazla 20 MB.
- **PDF'ler**: her biri en fazla 200 MB.

Büyük videolar parça parça yüklenir. Bağlantı koparsa yükleme kendiliğinden yeniden dener; sayfayı kapatırsanız aynı dosyayı yeniden seçin, kaldığı yerden devam eder. İki gün içinde tamamlanmayan yüklemeler iptal edilir ve alanları geri gelir.

## Dosyalarınızı kullanın

- **Bir derste** (web sitesi olmayan kurslar): kursu açın, ardından **Video adresi**'nin yanındaki **Medya'dan seç**'i seçin.
- **Bir WordPress dersinde** (Tutor LMS, LearnPress ve diğerleri): Medya'da **Bağlantıyı kopyala**'yı seçin ve bağlantıyı dersin video adresi olarak (harici veya gömülü video) ya da Yallapp eklentisinin her derse eklediği **Yallapp video** kutusuna yapıştırın. Uygulama videoyu kendi oynatıcısında oynatır; eklenti önce öğrencinin dersi açıp açamayacağını kontrol eder. Web sitenizde \`[yallapp_video link="…"]\` kısa kodu, videoyu dersi görebilen kişilere gösterir.
- **Sayfalarda, ürünlerde ve ilanlarda**: bir görsel veya video adresinin yanındaki **Medya'dan seç**. Bir sayfaya koyduğunuz video, uygulamayı açan herkes için oynatılır.

Bir görselin bağlantısı herkes için çalışır. Bir videonun veya PDF'in bağlantısı ise **Bağlantıyı paylaş**'ı seçmediğiniz sürece yalnızca derslerde açılır. Her dosya yeniden adlandırılabilir; silmek alanını hemen boşaltır ve onu kullanan dersler videosunu kaybeder.

Planınızda çevrimdışı mod varsa, çevrimdışı izleme için indirmeler Medya'daki videolarla çalışır.

## Depolama

Her plan depolama alanı içerir: Starter'da **2 GB**, Growth'ta **20 GB**, Pro'da **100 GB** ve Business'ta **500 GB**. **Medya**'nın üstü dosyalarınızın ne kadar yer kapladığını gösterir. Bir dosya, yüklemesi başlar başlamaz sayılır.

## Daha fazla depolama

Medya'da **Daha fazla depolama satın al**'ı seçin ve **+25 GB** veya **+100 GB** gibi bir paket seçin. Plan döneminizde kalan her ay için bir aylık fiyatı kartla ödersiniz ve paket, plan döneminiz bitene kadar geçerlidir. Planınızı kartla yenilediğinizde, ödeme sayfası paketlerinizi de birlikte yenilemeyi önerir. Başka bir yolla mı ödüyorsunuz? Bize WhatsApp'tan yazın, paketi biz ekleriz.

Dosyalarınız depolama alanınızdan fazla yer kaplarken bir paket sona ererse hiçbir şey silinmez ve her şey oynatılmaya devam eder, ancak yeni yüklemeler siz dosya silene veya alan ekleyene kadar bekler. Bunu size e-postayla ve panelinizde bildiririz.
`,
  },
};
