import type { DocTranslation } from "../translation-types";

/** 131.54 The documentation in Turkish, part 11: Delivery & offers for every store app (Phase 131). */
export const TR_DOCS_11: Record<string, DocTranslation> = {
  "delivery-and-offers": {
    title: "Teslimat günleri, hediyeler ve flaş indirimler",
    description: "Her mağaza uygulamasında teslimat günlerini ve saatlerini, nereye teslim ettiğinizi ve ücretini, hediye ödemesini, vesileye göre kart mesajlarını, hediye eklerini, flaş indirimleri ve uygulamadaki indirim kodlarını ayarlayın; her bağlantı yolunun neleri desteklediğini görün.",
    body: `Her mağaza uygulamasının panel menüsünde, ürünleriniz Yallapp'tayken **Ürünler** ve **Siparişler**'in yanında bir **Teslimat ve fırsatlar** sayfası vardır; bir Yallapp Studio projesinin menüsünde de **Kart mesajları** ile birlikte yer alır. Çiçekçiler ve hediyelik eşya mağazaları için yapıldı, her mağazada çalışır: ne zaman ve nereye teslim ettiğiniz ve ne kadar tuttuğu, hediyeler ve kartları, hediye ekleri, flaş indirimler ve uygulamada gösterilen indirim kodları.

Sayfanın her bölümü yalnızca mağazanızın kaynağıyla çalıştığı yerde görünür ve nasıl çalıştığını söyler. Restoran ve kafelerin siparişleri mutfaklarının saatlerini korur: teslimat günleri ve hediye ödemesi onlar için değildir (bkz. [Restoranlar ve kafeler](/docs/restaurants)).

## Mağazanızın kaynağıyla neler çalışır

- **Yallapp'taki ürünler** (web sitesi olmadan): bu sayfadaki her şey. Yallapp'ın ödeme sayfası teslimat saatinin ek ücretini, teslimat fiyatını ve flaş indirim fiyatını alır.
- **WooCommerce ile WordPress**: teslimat günleri ve saatleri, hediye ödemesi, hediyeler ve flaş indirim WordPress'teki Yallapp eklentisinin ayarlarındadır (eklenti 0.4.44; aşağıdaki WordPress'te bölümüne bakın). Kargoyu WooCommerce'in kendi kargo bölgeleri fiyatlar. Kart mesajları ve uygulamadaki başlıklar bu sayfadan gelir; hediye ekleri WooCommerce ürünlerinde ayarlanır.
- **Shopify, Wix, ikas, Ticimax, IdeaSoft, Salla ve Zid**: uygulama teslimat gününü ve saatini, hediye bilgilerini ve siparişin nereye gideceğini sorar; ödeme sayfası platformunuzda açılır ve kendi fiyatlarını, kargosunu ve ücretlerini alır. Shopify günü, saati, kişileri ve kartı kendi siparişinde (sepetin özniteliklerinde ve notunda), Wix ise alıcının mağazaya notunda tutar. Diğer platformların siparişleri bunları alamaz: onları bu sayfada, **Uygulamadan gelen teslimatlar** altında görürsünüz.
- **Kendi API'niz**: bunların hepsini, her bölümü isteğe bağlı olarak ve kart mesajları da dahil (\`GET /store/gift-messages\`), API başvurusunun anlattığı gibi API'niz sunar; uygulamanız onları oradan okur: bu sayfada ve **Kart mesajları**'nda ayarladıklarınız uygulamanıza ulaşmaz. Bkz. [Geliştirici belgelerindeki Store uç noktaları](/developers#store) ve [Kendi API'nizi bağlayın](/docs/my-own-api).

## Ödeme

**Ödeme** bölümünde uygulamanın ödeme sayfasının siparişi nasıl soracağını seçin:

- **Standart ödeme**: sepet, açarsanız teslimat günü ve ödeme.
- **Hediye ödemesi**: hediyeler ve çiçekler için. Müşteri kendi adını, telefonunu ve e-postasını, alıcının adını, telefonunu ve adresini, teslimat gününü ve saatini (ikisi de zorunlu) ve kartı yazar.

Bir Yallapp Studio projesinde, hediye ödemesi olan bir görünüm (Leqaa'nınkiler gibi) onu da açar ve sayfa bunu söyler. Görünümü [Studio'nun premium öğeleri](/docs/studio-premium-elements) sayfasındadır.

## Teslimat günleri ve saatleri

**Teslimat günleri ve saatleri** bölümünde **Müşteriler teslimat gününü seçer**'i açın ve **Bir gün (ve saat) seçilmeli** olup olmadığını seçin. Sonra şunları ayarlayın:

- **Aynı gün teslimat**, **Bugünün siparişleri şu saate kadar** ile, örneğin 14:00. Boş: gün boyu.
- **Ertesi gün teslimat**. Aynı gün teslimat kapalıyken ilk gün yarındır; ikisi de kapalıyken ondan sonraki gün.
- **İleri günler**: müşterilerin seçebileceği son gün, bugünden itibaren, en fazla 60.
- **Teslimat yapmadığınız günler**, örneğin cumalar. En az bir gün açık kalır.
- **Saat dilimi**: son sipariş saati ve günler bu dilimde sayılır.
- **Teslimat saatleri**: en fazla 8; her biri **Başlangıç** ve **Bitiş** ile, aldığı **Sipariş** sayısı ve bir **Ek ücret** ile, ikisi de isteğe bağlı.

**Teslimat saatlerini kaydet**'i seçin. Uygulama yalnızca hâlâ seçilebilenleri gösterir: son sipariş saatine kadar bugünü, başlayana kadar bugünün bir saatini ve dolu bir saati dolu olarak. Yallapp, uygulama ne gönderirse göndersin, sipariş verilirken günü ve saati yeniden kontrol eder. Hediye ödemesi her zaman günü ve saati sorar.

Bağlı bir platformda bir saatin siparişleri uygulamada başlatılan ödemelerden sayılır ve ek ücreti alınmaz: ücretlerini platformun ödeme sayfası alır.

## Nereye teslim ediyorsunuz ve ne kadar tutuyor

**Nereye teslim ediyorsunuz ve ne kadar tutuyor** bölümünde en fazla dört ülke, sonra tüm şehirlerini ya da bazılarını seçin, her satıra bir şehir. Sayfa Türkiye, Mısır, Suudi Arabistan, Birleşik Arap Emirlikleri, Kuveyt, Katar, Bahreyn ve Umman'ın en büyük şehirlerini önerir; istediğiniz şehrin adını da yazabilirsiniz. Sonra **Kargo fiyatı**'nı seçin:

- **Her yere tek fiyat**: **Ürünler** sayfasındaki **Mağaza ayarları**'nda yer alan **Kargo ücreti**; oradaki tutarın üzerinde ücretsiz.
- **Şehre göre fiyat**: her şehrin fiyatı ve **Diğer şehirler** için bir fiyat. Yalnızca fiyatı olan şehirlere teslim etmek için onu boş bırakın.
- **Mesafeye göre**: bir **Taban ücret** ve mağazanızın enlem ve boylamından siparişin gittiği yere kuş uçuşu **Km başına** fiyat, seçtiğiniz **En fazla (km)** mesafeye kadar.

Hepsinde:

- **Kendi fiyatı olan şehirler**: her satıra bir şehir, iki noktadan sonra fiyatıyla. Bir şehrin kendi fiyatı hesaplanan ücretin tamamının yerine geçer.
- **Kg başına fiyat ekle**: ürünlerin ve seçeneklerinin ağırlığı, **Dahil olan ilk kg**'nin üzerinde. Her ürünün **Ağırlık (kg)** değerini **Ürünler**'deki sayfasında, her seçeneğinkini seçeneklerle birlikte ayarlayın; sayfa kaç ürünün ağırlığı olmadığını söyler.
- **En düşük ücret**: hesaplanan ücretin en az tutarı.
- Önceden olduğu gibi, **Mağaza ayarları**'nda belirlenen tutarın üzerinde ücretsiz teslimat.

**Teslimat yerlerini kaydet**'i seçin. Sepet teslimat ücretini kalem kalem gösterir: taban ücret, mesafe, ağırlık, teslimat saatinin ek ücreti ya da tutarınızın üzerinde ücretsiz.

Uygulamada, yalnızca bazı yerlere teslim ettiğinizde ya da fiyatı şehre veya mesafeye göre belirlediğinizde iki ödeme de siparişin nereye gideceğini sorar: standart ödeme **Teslimat yeri** bölümünde, hediye ödemesi alıcı ve adresiyle birlikte. Müşteri ülkeyi (birden fazla ülkeye teslim ediyorsanız) ve şehri seçer; şehir seçtiyseniz listenizden, yoksa yazarak. Mesafeye göre fiyatlandırmada yeri ayrıca bir haritada işaretler: **Teslimat yerini haritada işaretleyin** tam ekran bir harita açar; harita altında kayarken ortada kalan bir iğne, haritanın sunduğu yerlerde adresle arama ve seçeneklerden biri olarak **Konumum** vardır; **Bu yeri kullan** onu kaydeder. Yallapp mesafeyi mağazanızdan iğneye kadar ölçer. Harita olmayan yerlerde uygulama bunun yerine telefonun konumunu alır. Teslimat bölgesi ya da yere göre fiyatı olmayan bir mağazanın ödemesi eskisi gibi kalır.

Bağlı bir platformda kargosunu platformun ödeme sayfası alır: burada uygulamanın adresleri nereden alacağını seçersiniz. WordPress'te kargoyu WooCommerce'in kargo bölgeleri fiyatlar.

## Hediyeler

**Hediyeler** bölümünde müşterilerin ödeme sırasında bir hediye hakkında neler söyleyebileceğini seçin; hepsi onlar için isteğe bağlıdır:

- **Kart mesajı**, belirlediğiniz **En uzun mesaj (karakter)** sınırına kadar, 20 ile 500 arasında.
- **Dokunulacak başlangıçlar**: en fazla 6, her satıra bir tane, örneğin “Doğum günün kutlu olsun!”.
- **Alıcının adı ve telefonu**: standart ödemede müşteri **Başka birine gönder**'i açar.
- **“İsimsiz gönder”**: kart gönderenin adını göstermez.

Hediye ödemesi kartı, alıcıyı ve isimsiz gönderme seçeneğini her zaman sunar.

## Vesileye göre kart mesajları

**Kart mesajlarını yönet**, **Kart mesajları** sayfasını açar: uygulamanızın her dilinde, vesileye göre hazır mesajlar. İlk açtığınızda Yallapp'ın İngilizce, Arapça ve Türkçe başlangıç setiyle dolar: 11 vesilenin her biri için iki ya da üç mesaj (aşk, doğum günü, yıl dönümü, tebrikler, yeni bebek, geçmiş olsun, teşekkürler, özür, başsağlığı, bayram ve Ramazan, Anneler Günü). O andan itibaren sizindir: her vesile ve her mesaj için **Düzenle**, **Yukarı taşı**, **Aşağı taşı**, **Gizle** ve **Sil** vardır; **Vesile ekle** kendi vesilenizi, **Mesaj ekle** herhangi birine yeni bir mesaj ekler. En fazla 30 vesile, her birinde en fazla 12 mesaj olabilir; her mesaj en fazla 500 karakterdir ve boş bırakılan bir dil uygulamanın ana dilini gösterir.

Ödemede müşteriler bir vesile seçer, kartı doldurmak için bir mesaja dokunup istedikleri gibi değiştirir ya da kendi mesajlarını yazar. Kart mesajları Yallapp'taki ürünlerle, WordPress'le (sitenin bir sonraki lisans kontrolüyle) ve bağlı platformlarla çalışır; kendi API'sindeki bir uygulama ise onları kendi API'sinden okur ve sayfa bunu söyler.

## Hediye ekleri

Çikolata, kart, vazo: bir hediye eki yalnızca başka bir ürünle satılır. Uygulamanın listelerinde, aramasında, ana sayfa bölümlerinde, ilgili ürünlerde ya da bir flaş indirimde asla yer almaz ve tek başına alınmaz. Uygulama onu ürün sayfasında ve sepette, bir seferde en fazla 12 tane olmak üzere **Biraz daha ekleyin** olarak sunar; sepet onu birlikte gittiği ürünün altında gösterir (“… ile”). Ürünü kaldırmak eklerini de kaldırır.

- **Yallapp'taki ürünler**: **Ürünler**'de bir ürünün sayfasında **Yalnızca ek ürün olarak sat (hediye eki)** seçeneğini açın, sonra **Şunlarla sun** altında **Tüm ürünler**, **Bazı kategorilerin ürünleri** ya da **Bazı ürünler**'i seçin. Ürünler sayfası ve siparişin satırları onu **Ek ürün** olarak işaretler.
- **WooCommerce**: WooCommerce ürün sayfasındaki Yallapp kutusunda **Sell only as an add-on in the app**'i işaretleyin ve **Offer it with**'i seçin. Web sitenizin kendi mağazası, siz orada gizlemedikçe (Catalog visibility) onu göstermeye devam eder.
- **Shopify**: bu sayfada **Hediye ekleri** altında eklerinizin Shopify ürün numaralarını, bir Shopify kategorisinin tüm ürünlerini (o kategori uygulamada gizlenir) ya da yallapp-addon gibi bir Shopify etiketi olan ürünleri (en fazla 50 ürün) yazın; sonra neyle sunulacaklarını seçin.
- **Wix, ikas, Ticimax, IdeaSoft, Salla ve Zid**: aynısı, ürün numaralarıyla ya da bir kategoriyle; etiket olmadan.

Bağlı bir platformda ekler orada sıradan ürünler olarak kalır ve platformun kendi ödemesi sepeti olduğu gibi satar.

## Uygulamadaki başlıklar

**Uygulamadaki başlıklar** bölümünde üç başlığı uygulamanın her dilinde, her biri en fazla 40 karakter olmak üzere kendi sözlerinizle yazın: **Ek ürünler (“Biraz daha ekleyin”)**, **Kart mesajı** ve **Teslimat günü ve saati**. Boş bırakılırsa uygulama kendi sözlerini kullanır. Bir Studio projesinde ödeme görünümünün kendi başlıkları olabilir ve önce onlar gelir.

## Flaş indirimler

**Flaş indirimler** bölümünde **Flaş indirim ekle**'yi seçin: iki zaman arasında, uygulamada geri sayımla, şu fiyat yerine bu fiyat.

- **Ad**: uygulamada görünür, örneğin “Anneler Günü gülleri”; uygulamanın diğer her dilinde de adı.
- **Ürünler** ya da **Ya da tüm bir kategori**. Bağlı bir platformda **Ürün numaraları**'nı yazın.
- **İndirim**: 1 ile 90 arasında **Yüzde indirim (%)** ya da **İndirimli fiyat**.
- **Başlangıç** ve **Bitiş**, saat diliminizde.
- **İndirimdeki adet**: “son 12 adet” için bir sayı ya da satıldığı kadar için boş.

Her indirim **Şu an açık**, başlayacağı tarihle, **Bitti** ya da **Tükendi** olarak, kaç adet satıldığıyla birlikte görünür. **Düzenle** onu değiştirir; **Kapat**, **Aç** ve **Sil** adlarının söylediğini yapar.

Uygulamada indirimdeki bir ürün indirimli fiyatını, önceki fiyatın üstü çizili olarak gösterir ve kartlar indirimin geri sayımını gösterir. Ürün sayfasında flaş indirimin kendi kutusu vardır: indirim yüzdesi, fiyat, saat, dakika ve saniye olarak geri sayım ve stok çubuğuyla kalan adet; indirim bitince kaybolur. Studio'da **Flaş indirim** öğesi ve kartlardaki indirim etiketleri indirimlerinizi her sayfada gösterir (bkz. [Studio'nun premium öğeleri](/docs/studio-premium-elements)).

- **Yallapp'taki ürünler**: ödeme, adet kaldıkça flaş fiyatı alır ve bir sipariş adetlerini ödendiğinde sayar.
- **Bağlı bir platform**: uygulama indirimi gösterir ama platformun ödemesi kendi fiyatını alır. Aynı indirimi platformunuzda bir kod olarak yapın ve indirimin indirim kodu alanına yazın: uygulamanın ödemesi onu iletir, müşteriler indirimli fiyatı öder. Kod olmadan müşteriler indirimi uygulamada görür ama platformun fiyatını öder; panel de bunu söyler. Kalan adetler platformun siparişlerinden sayılmaz. Ürünün platformdaki kendi karşılaştırma fiyatı da onun indirimi olarak görünür.
- **WordPress**: flaş indirim, eklentinin ayarlarında, WooCommerce'in kendi indirimli fiyatını ve zamanlamasını kullanır; aynı anda bir tane: onu bir sonrakiyle değiştirmek satılan adetleri sıfırdan başlatır.

## Uygulamadaki indirim kodları

Bir indirim kodu uygulamada Studio'nun kupon öğesinde, kopyalama düğmesiyle görünebilir:

- **Yallapp'taki ürünler**: kodlarınız **Ürünler** sayfasında **Kuponlar** altındadır (bkz. [Ürünler, siparişler ve kargo](/docs/store-orders)). Birini göstermek için **Uygulamada göster**'i açın.
- **Bağlı bir platform**: platformunuzun ödemesi kendi kodlarını uygular, uygulama müşterinin yazdığı kodu iletir. **İndirim kodları** altında uygulamada göstereceğiniz kodları, platformunuzdaki şartlarıyla ekleyin.
- **WooCommerce**: WooCommerce'te bir kuponda **Show in the app**'i işaretleyin.

Bir kod açıkken, başlamışken, bitmemişken ve kullanım hakkı dolmamışken görünür.

## Uygulamadan gelen teslimatlar

Bağlı bir platformda **Uygulamadan gelen teslimatlar**, uygulamada teslimat günü ya da hediye bilgisiyle başlatılan her ödemeyi listeler ve 60 gün saklar: alıcı, gün ve saat, gönderen, adres, kart, isimsiz gönderilip gönderilmediği ve ürünler. Her biri platformun siparişinde olup olmadığını ya da **Yalnızca burada** olduğunu gösterir. Onları platformunuzun siparişleriyle eşleştirin.

## Siparişler

Yallapp'taki ürünlerde bir siparişin teslimatı **Siparişler**'de görünür: gün ve saat, bölge ve ücret, telefonu ve e-postasıyla gönderen, telefonu ve adresiyle alıcı ve kart; istendiyse “İsimsiz gönderildi” ile. Bir hediye eki birlikte gittiği ürünün altında görünür. Ödeme sayfası gönderenin bilgileri ve alıcının adresiyle doldurulur.

## WordPress'te

Eklenti 0.4.44, WordPress'te eklentinin **Store app** ayarlarına, **Ask for a delivery date in the cart** ile en erken ve en geç günlerin yanına şunları ekler:

- **Same-day orders until**, en erken teslimat 0 günken.
- **Delivery times, one a line**, örneğin “10:00-13:00 | 20”: saat, sonra aldığı sipariş sayısı ve ek ücreti, ikisi de isteğe bağlı. Dolu saatler sitenin siparişlerinden sayılır ve uygulamada dolu görünür; ücret ödemeye eklenir.
- **Checkout in the app**: **Standard** ya da hediye ödemesi. Gönderenin bilgileri WooCommerce siparişinin fatura bilgileri, alıcınınkiler teslimat bilgileri olur; ikisi de siparişte ayrıca saklanır.
- **Gift message beginnings, one a line (up to 6)**, **Ask for the recipient's name and phone** ve **Let customers send it anonymously**.

Bir de aynı anda tek bir flaş indirim için **Flash sale** kartı (eklenti 0.4.45'in ayarları bunu söyler; onu bir sonrakiyle değiştirmek satılan adetleri sıfırdan başlatır): **Run a flash sale**, uygulamadaki adı ve uygulamanın diğer dillerindeki adı, **Products** ya da **Or a whole category**, **A share off (%)** ya da **One sale price**, ne zaman **Starts** (sitenin saat dilimi) ve **Ends** olduğu ve **Units on sale**. İndirim açıkken ürünleri her yerde, mağazada, sepette ve ödemede, WooCommerce'in kendi indirimli fiyatı olarak indirimli fiyattan satılır. WooCommerce'in zamanlanmış indirimli fiyatları da bitişlerini uygulamada gösterir.

Bkz. [WordPress eklentisini kurun](/docs/wordpress-plugin).

## Uygulamada

- **Teslimat yeri**: ülke, şehir ve mesafeye göre fiyatlandırmada haritada işaretlenen yer.
- **Ne zaman ulaşsın?**: **Bugün**, **Yarın** ya da **Tarih seç**; son sipariş saatiyle (“Bugün teslimat için saat 14:00'e kadar sipariş verin” ya da “Bugün için siparişler kapandı.”) ve o günün saatleri ek ücretleriyle çipler halinde, dolu olanlar soluk.
- Hediye ödemesi: kimden, kime, ne zaman, kart, sonra ödeme; teslimat ücreti kalem kalem. Studio'nun hediye ödemesi görünümüyle tek ekranda beş adımda (**Kimden**, **Kime**, **Ne zaman**, **Mesaj** ve **Ödeme**), kartın canlı önizlemesiyle.
- Kart: vesileler, hazır mesajları ve **İsimsiz gönder**.
- Ürün sayfasında ve sepette **Biraz daha ekleyin**.
- Geri sayımlarıyla flaş indirimler ve gösterdiğiniz kodlar.

İngilizce, Arapça ve Türkçe, açık ve koyu, Arapçada sağdan sola. Bu özelliklerden önce derlenmiş bir uygulama, bir sonraki derlemesine kadar teslimat tarihini ve kart mesajını eskisi gibi korur.
`,
  },
};
