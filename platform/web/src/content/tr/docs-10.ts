import type { DocTranslation } from "../translation-types";

/** 129.30 The documentation in Turkish, part 10: Studio's editor, its premium elements, its templates and demos, and Travel. */
export const TR_DOCS_10: Record<string, DocTranslation> = {
  "studio-elements": {
    title: "Studio düzenleyicisi: tüm öğeler",
    description: "Yallapp Studio düzenleyicisinin her öğesi, ne yaptığı ve ayarları: düzen, içerik, listeler ve kartları, sayfanın üst bilgisi ve alt sekmeleri, hareket, dokunma, tabletler ve daha hızlı çalışmak.",
    body: `[Yallapp Studio](/docs/yallapp-studio)'da bir sayfa öğelerden oluşur: **Öğeler**'den birini sürükleyip telefonda istediğiniz yere bırakın ya da **Öğe ara** ile bulun. Sayfada veya **Sayfa katmanları**'nda bir öğe seçin; ayarları telefonun yanında üç sekmede açılır: **Tasarım**, **Hareket** ve **Veri**. Bu sayfa her öğeyi ve her ayarı listeler.

Fotoğraflı vitrin ve canlı sipariş kartı gibi Studio demolarının yapıldığı fotoğraf öncelikli öğeler [Studio'nun premium öğeleri](/docs/studio-premium-elements) sayfasındadır. Hazır bölümler ve tüm sayfalar [Hazır bölümler, şablonlar ve Studio'nun demoları](/docs/studio-templates) sayfasındadır.

## Düzen öğeleri

Başka öğeleri içerir ve yerleştirirler.

- **Satır**: yan yana. **Aradaki boşluk** mesafeyi, **Dağılım** satırı nasıl paylaştıklarını (başta, ortada, sonda, yayılmış ya da eşit) ve **Hizalama** enine nasıl durduklarını (başta, ortada, sonda ya da uzatılmış) belirler. **Yana kayar**, insanların parmakla kaydırdığı, ekrandan geniş bir satır yapar.
- **Sütun**: alt alta, aynı ayarlarla.
- **Katmanlar**: üst üste, bir resmin üstündeki yazılar gibi. İçindeki her öğe, bir fotoğrafta dokunulan bir nokta için yüzde olarak yatay ve dikey **Görseldeki yeri**'ne sahip olabilir ya da bir sütundaki gibi hizalanabilir.
- **Izgara**: **Sütunlar** halinde kutular, **Aradaki boşluk** ile.
- **Kaydırıcı**: insanların kaydırdığı slaytlar. **Aynı anda görünen**, **Slayt başına saniye** (2 ile 10 arası), **Kendiliğinden oynar**, **Konumu gösterir** (noktalar, dolan çizgiler ya da sayı) ve **Oran** (16:9, 4:3 ya da kare). **Slaytlardaki yazılar** ve **Slayt görsellerini karart** tüm slaytları birden değiştirir; her slayt yine de ayrıca değiştirilebilir.
- **Boşluk**: ayarladığınız yükseklikte boş alan.
- **Sorular**: cevabını göstermek için açılan sorular. Her birinin sorusu **Sorusu ya da sekme adı**'ndadır; cevabı içerdiği şeydir.
- **Sekmeler**: insanların aralarında geçtiği bölümler. Her sekmenin adı **Sorusu ya da sekme adı**'ndadır.
- **Fotoğraflı vitrin** ve **Harita başlığı**: üstünde öğeler olan kapaklar, [Studio'nun premium öğeleri](/docs/studio-premium-elements) sayfasında.

**Şunun içine al** Satır, Sütun ya da Katmanlar seçili öğeyi yeni bir öğenin içine koyar.

## İçerik öğeleri

- **Metin**: yazılarınız; **Yazı tipi**, **Kalınlık**, **Boyut**, **Satır yüksekliği**, **Harf aralığı**, **İtalik**, **Altı çizili**, **Üstü çizili** (eski bir fiyat), **Büyük harf**, metnin hizası ve **En fazla satır** ile. **Yazı stili** onu projenin stillerinden birine (başlık, alt başlık, metin ya da düğme) bağlar.
- **Resim**: Medyanızdan ya da Yallapp'ın görsellerinden. **Sığdırma** **Alanı doldur** ya da **Tamamını göster**'dir; **Oran** şeklini korur; **Yoğunluk** ile **Resmin üstünde renk** ve **Yazılar için gölge** üzerindeki yazıları kolay okunur kılar.
- **Düğme**: yazısı, başta ya da sonda bir **Simge** ve **Simge boyutu**, ve **Müşteri dokununca** altında açtığı şey.
- **Simge**: seçtiğiniz boyutta tek bir simge.
- **Liste**: kayıtlarınız, bir kartta. Gösterdiğine göre adlanır: ürünler, kurslar, hizmetler, makaleler, yazılar, ilanlar, etkinlikler, kampanyalar, teslimat hizmetleri, restoranlar, araç türleri, okul haberleri ya da kurs paketleri. Sonraki bölüme bakın.
- **Kategoriler**: kategorileriniz; etiketler, kutular, görseller ya da yuvarlak görseller olarak.
- **Video**: bir YouTube, Vimeo ya da MP4 adresi; isterseniz **Kendiliğinden oynar**.
- **Form**: **Sorular** (kısa ya da uzun yanıt, e-posta, telefon numarası, sayı ya da seçim), her biri zorunlu ya da değil. **Yanıtlar gider** e-postanıza ya da sohbete; **Düğme metni** ve **Gönderimden sonraki metin**'i belirleyin.
- **Harita**: enlem ve boylamla **Yer**, bir yer adıyla.
- **Puanlar**: 0'dan 5'e yarımlarla yıldızlar ve yanındaki yazı.
- **Arama**: içinde gösterilen yazıyla bir arama kutusu.
- **Ayırıcı**: bölümler arasında bir çizgi.
- **Geri sayım**: **Bitiş**'e kadar gün, saat, dakika ve saniye. **Süre dolunca** yazınızı gösterir, boşsa hiçbir şey göstermez.
- Her satırında bir simge olan bir **Liste**: **Her satır ayrı** ve **Her satırın simgesi**.
- **Kupon kodu**: insanların tek dokunuşla kopyaladığı **Kod** (harfler, rakamlar, - ve _).
- **Selamlama**, **Canlı sipariş**, **Canlı kart**, **Okul günü** ve **Öğrenci kartı**: giriş yapan kişiden çizilir, [Studio'nun premium öğeleri](/docs/studio-premium-elements) sayfasında.
- Çok satıcılı bir uygulamada **çok satıcılı bölüm**: adres ve arama, yer türleri, kampanyalar, mutfaklar ve reyonlar, kulüp, yerler ya da tekrar sipariş; yerlerinizden doldurulur. Yerler için görünümü, hangi yerleri (tümü, restoranlar ya da marketler), sırayı, bir etiketi, yalnızca ücretsiz teslimatı, kaç tane (40'a kadar) ve her yerin kartının neyi göstermeyeceğini (kampanya, puan, teslimat süresi, teslimat ücreti ya da en küçük sipariş) seçin.

## Listeler ve kartları

**Veri** sekmesinde bir listenin şunları vardır:

- **Gösterir**: hangi kayıtlar, ve **Görünüm**: ızgara, liste ya da kayan şerit.
- **Kaç tane** ve **Sıra**: en yeni, en popüler, en düşük ya da en yüksek fiyat.
- **Yalnızca öne çıkanlar**, tek bir **Kategori**, **Yalnızca indirimdekiler** ve ürünler için telefonunda tutulan ve bir ürün açana kadar gizli olan **Kişinin son baktıkları**.
- **Kart**: **Uygulamanın kartı** ya da **Kendi kartım**. **Kartı tasarla** bir kaydın kartını açar: onu istediğiniz öğelerle düzenleyin ve her birinin **Kayıttan gösterir** ayarını **Ad**, **Altındaki satır**, **Resim**, **Fiyat**, **Etiket** ya da **Puan** yapın. Her kayıt sizin kartınızla çizilir.

Studio'nun sayfası kendi kayıtlarınızı ya da siz ekleyene kadar örnek kayıtları gösterir; böylece gerçek kartı görürsünüz.

## Her öğenin ayarları

- **Boyut ve yer**: **Genişlik** ve **Yükseklik** alanı doldurur (**Fill**), **İçeriğe göre** olur ya da **Sabit**'tir; **En az yükseklik** ve **Oran**; karşı kenarlarda aynı ya da her kenar ayrı **İç boşluk** ve **Dış boşluk**; üstte ya da altta **Ekranda sabit**.
- **Renkler**: **Arka plan**, **Metin rengi**, bir **Açı** ile iki renkli bir **Geçiş** ve **Arkadaki resim**. **Koyu modda** arka plana, metne ve kenarlığa gece için kendi renklerini verir.
- **Şekil**: **Köşeler** ya da **Her köşe ayrı**; **Gölge** (yok, hafif, orta ya da güçlü); **Kenarlık**; **Opaklık**; **Döndür**.
- **Hareket**: **Göründüğünde** (belirme, yukarı, aşağı, baştan ya da sondan kayma, ya da büyüme), **Süre (ms)** ve **Önce bekle (ms)** ile; **Dokunulurken** (küçülme ya da sekme); **Sürekli** (nabız, süzülme ya da sallanma). **Oynat** telefonda gösterir. Hareketi azaltılmış telefonlar onu hareketsiz gösterir.
- **Müşteri dokununca**: **Uygulamanın bir ekranı**, **Bir sayfa**, **Bir web adresi**, **Tek bir kayıt** ya da **Bir kurs**.
- **Göründüğü yer**: Android, iOS ya da ikisi; **Kim görür**: herkes, giriş yapanlar ya da giriş yapmayanlar.
- **Uygulamada gizle (burada kalır)**, **Tuvalde kilitle** ve **Katmanlardaki adı**.

## Telefonlar ve tabletler

Her sayfayı **Küçük telefon**, **Büyük telefon** ve **Tablet**'te, açık ve koyu modda kontrol edin. Tablette değiştirdiğiniz şey **Tablet için değiştiriyorsunuz** olur: genişlikler, yükseklikler, boşluklar, sütunlar, aynı anda görünen slaytlar ve metin. Telefonlar kendi değerlerini korur, **Telefondaki gibi** geri alır.

## Sayfa, üst bilgisi ve sekmeleri

- **Üst bilgi**: **Üst bilgi yok** ya da altıdan biri: **1 Ortada logo**, **2 Başlık + arama**, **3 Logo + sepet + hesap**, **4 Resmin üstünde şeffaf**, **5 Sayfanın başlığı ve düğmeler** ve **6 Kişinin adıyla selam**. Düğmelerini (menü, arama, sepet, bildirimler, sohbet, hesap) ve renklerini koyu modda da seçin. Şeffaf üst bilgi sayfanın ilk öğesinin üstünde, en yukarıdan başlar.
- **Sayfa arka planı**, **Bu sayfanın altında alt sekmeler** ve **Bu sayfanın altındaki uygulama ekranı**: uygulama kendi ekranlarından birini (listelerini, formlarını ya da haritasını) öğelerinizin altına çizer ve üst bilginiz onun başlığı olur.
- **Alt sekmeler**: ona kadar. Çubukta en fazla beşi görünür; daha fazlasında beşincisi Diğer olur ve gerisini tutar. Her sekmenin adı ve simgesi vardır. **Çubuğun görünümü** altında **Tasarım**'ı (Klasik, Hap, Sade, Nokta, Çizgi, Baloncuk, Cam, Çentik, Yükselen, Çerçeve, Kare, Yalnızca adlar, Ada, Bölmeli, Klasör sekmesi, Damla, Parıltı, Renkler ya da **Yüzen kapsül**), **Açık sekme** ve **Diğer sekmeler** renklerini, **Köşeler**'i, **Çevresindeki boşluk (yüzen)**'u, **Adların yazı tipi**'ni, **Adlar**'ı (her zaman, yalnızca açık sekme ya da yalnızca simgeler), **Ortada yuvarlak düğme**'yi ve **Hesap sekmesinde kişinin fotoğrafı görünsün**'ü seçin.

## Daha hızlı çalışmak

- Başka bir sayfaya ya da projeye de **Kopyala**, **Kes** ve **Yapıştır**; **Çoğalt**; **Stili kopyala** ve **Stili yapıştır**; **Yukarı taşı** ve **Aşağı taşı**; **Kapsayanı seç**.
- Oklar öğeyi komşuları arasında taşır, Delete siler, Ctrl+Z geri alır, Ctrl+D çoğaltır, Ctrl+C ve Ctrl+V kopyalayıp yapıştırır (Mac'te ⌘). Tüm kısayollar için ? tuşuna basın.
- Büyütmek ya da küçültmek için bir öğenin köşesini sürükleyin; şeklini korumak için Shift'e basılı tutun, kendi boyutuna dönmesi için köşeye çift tıklayın.
- **Yazı stilleri**: bir stili bir kez değiştirin, onu kullanan her metin her sayfada değişir.
- **Görseller**: **Görselleriniz**'den ya da **Yallapp'ın görselleri**'nden birini telefona sürükleyin.
- **Tasarım içe aktar…**: tasarım aracınızdan SVG dosyaları, bir Figma bağlantısı ya da bir .yallapp dosyası. **Bu sayfayı dosya olarak dışa aktar**, seçili öğe ya da **Tüm projeyi dosya olarak dışa aktar** tasarımları projeler ve hesaplar arasında taşır.
- **Yayınlanan sürümler**: önceki bir yayını taslağınız olarak **Geri getir**; yayındaki, siz yeniden yayınlayana kadar kalır.

**Geri al** ve **Yinele** geri ve ileri gider, sayfa siz çalışırken kaydedilir. **Yayınla** onu uygulamanıza gönderir; uygulama bir sonraki açılışta gösterir.
`,
  },
  "studio-premium-elements": {
    title: "Studio'nun premium öğeleri",
    description: "Studio demolarının fotoğraf öncelikli öğeleri, her proje için: fotoğraflı vitrin, yazılar için gölge, harita başlığı, selamlama, siparişler, gönderiler, yolculuklar ve okul günü için canlı kartlar, fotoğraf üzerinde öğrenci kartları, puanlar, gece kenarlıkları ve yüzen kapsül çubuk.",
    body: `Studio'nun demoları bu öğelerden yapılır ve her proje onları kullanabilir: [Studio düzenleyicisi](/docs/studio-elements)'nde **Öğeler** altında bulun. Studio'nun sayfası onları uygulamanın çizdiği gibi, açık ve koyu modda, Arapçada sağdan sola çizer. Giriş yapan kişiden çizilenler Studio'da bir örnek gösterir; uygulamada giriş yapmamış ya da gösterecek bir şeyi olmayan biri için hiçbir şey göstermez.

## Fotoğraflı vitrin

Üstünde gölge ve öğeler olan bir fotoğraf: büyük bir karşılama, altyazılı bir fotoğraf kutusu ya da bir kampanya afişi. **Resim**'i, yüksekliği ve **Köşeler**'i seçin ve üstüne istediğiniz öğeleri ekleyin: yazılar, bir arama kutusu, düğmeler. **Son öğe kapağın altına biner** son öğeyi, bir arama kartı ya da rota kartı gibi fotoğrafın kenarının üstüne sarkıtır. Üst bilgisi olmayan ve bir kapakla başlayan sayfa onu telefonun durum çubuğunun altında gösterir; şeffaf üst bilgi onun üstünde durur.

## Yazılar için gölge

Üstündeki yazılar okunsun diye bir resmin üstünde gölge: fotoğraflı vitrinde, bir **Resim**'de ya da **Arkadaki resim**'i olan herhangi bir öğede. Rengini, **Başta** ve **Sonda** ne kadar koyu olduğunu seçin; yukarıdan aşağı yerine bir yandan karartmak için **Yatay, baştan**'ı seçin.

## Harita başlığı

Sayfanın üstünde çizilmiş bir harita; **İşaretler**, **İşaretlerin simgesi**, **İşaretlerin rengi** ve **İşaretlerin zemini** ve **Ortada kişinin noktası** ile. **Uygulamada, kişinin yakınındaki boş taksiler** işaretlerin yerine gerçek taksileri canlı gösterir. **Son öğe kapağın altına biner** ile son öğe haritanın altının üstünde bir pano olur.

## Selamlama

Uygulamanın dilinde, kişinin adıyla günaydın ya da iyi akşamlar. **6 Kişinin adıyla selam** üst bilgisi selamlamayı ve bugünün tarihini sayfanın en üstüne, düğmelerini yanına koyar.

## Canlı sipariş

Yemek teslimatı ve çok satıcılı uygulamalar için: kişinin yoldaki siparişi; ne olduğu, ne kadar ilerlediği ve kalan dakikalarla. **Hangi sipariş**'i ve simgesini seçin.

## Canlı kart

Teslimat, yolculuk ve taksi uygulamaları için. **Neyi takip eder**: **Yoldaki gönderisi**, **Yolculuğu** ya da **Yakınındaki taksiler**. **Görünüşü**: **Aşamalı kart**, **Sürücü ve araç** (fotoğrafı, aracı, puanı ve plakası, bir arama düğmesiyle) ya da **Tek satır**. **Sürücünün fotoğrafı yokken fotoğraf** sürücü kendi fotoğrafını ekleyene kadar yerini tutar.

## Okul günü

Okullar için: ailenin okul gününün bir bölümü, velinin kendi çocuklarından. **Hangi bölüm**: **Bugünün tarihiyle selamlama**, **Aralarında geçilen çocuklar** ya da seçilen çocuk için **Bugün: giriş, ders ve servis**: kapıdan girişi, şimdiki ve sonraki ders ve eve dönüş servisi.

## Fotoğraf üzerinde öğrenci kartları

Akademilerde **Öğrenci kartı** **Aldığı kurs**'u, **Öğrenme serisi**'ni, **Sıradaki canlı ders**'i ya da **Bu haftanın öğrenme süresi**'ni gösterir. **Görünüm**'ü **Kart** ya da **Fotoğraf üzerinde** olabilir: koyu bir gölge altında kendi resminin üstünde kurs, tek bir etikette ders ve kalan dakikalar, altın renginde ne kadar ilerlendiği ve yuvarlak bir oynat düğmesi; adının üstünde altın renginde canlı dersin saati; tek bir rakam olarak seri.

## Kartta puanlar

Bir listenin kendi kartında bir öğenin **Kayıttan gösterir** ayarını **Puan** yapın: öğenin kendi yazısından sonra, bir yıldızla kaydın puanı; örneğin "Omar Farouk · 4.8/5". Puanı olmayan bir kayıt için hiçbir şey görünmez.

## Gece kenarlıkları

Bir öğenin **Kenarlık**'ı olduğunda **Koyu modda** ona gece için kendi kenarlık rengini verir.

## Yüzen kapsül çubuk

**Alt sekmeler** altında **Yüzen kapsül** tasarımı: kendi renkleriyle sayfanın üstünde yüzen bir çubuk; açık sekme adıyla dolu bir kapsül, diğerleri yalnızca simge. Sayfa altında devam eder.

## Küçük kartlar halinde yerler ve adres şeridi

Çok satıcılı bir uygulamada yerler **Küçük kartlar** (her yerin fotoğrafı adının, puanının ve süresinin yanında), adres ve arama ise açık bir yerin en erken teslim süresiyle bir **Şerit** olarak görünebilir.
`,
  },
  "studio-templates": {
    title: "Hazır bölümler, şablonlar ve Studio'nun demoları",
    description: "Yallapp Studio'da hazır bölümler ve tüm sayfalar ekleyin, kendi şablonlarınızı ve tasarımlarınızı saklayın, Studio'nun sekiz demosundan biriyle başlayın ve seçmeden önce her birini canlı deneyin.",
    body: `Her sayfayı tek tek öğelerden kurmanız gerekmez. [Studio düzenleyicisi](/docs/studio-elements)'nde **Hazır bölümler** bir sayfanın bütün bir bölümünü, **Şablonlar** bütün bir sayfayı, **Tüm tasarımlar** da tüm sayfaları birden ekler. Yeni bir proje de tüm sayfaları, fotoğrafları ve kayıtlarıyla Studio'nun demolarından biri olarak başlayabilir.

## Hazır bölümler

Bir bölümü sayfaya sürükleyin ya da sonuna eklemek için tıklayın. Her biri tek tek değiştirdiğiniz sıradan öğelerden yapılmıştır.

- **Her proje için**: Karşılama, Kampanya afişi, Kategoriler, Liste, Düğme, Özellikler, Rakamlar, Bir yorum, Bize ulaşın, İletişim formu, Arama çubuğu, Nasıl çalışır, Sorular ve Geri sayımlı kampanya; ve fotoğraf öncelikli bölümler **Üzerinde yazı olan fotoğraf**, **Fotoğraf kutuları** ve **Yuvarlak içinde kişiler**.
- **Mağazalar için**: Büyük slayt, Kart slaytı, Görsel ve yazı slaytı, Kampanya slaytı, Flaş indirim, Görselli kategoriler, Yuvarlak kategoriler, Yeni gelenler, Çok satanlar, İndirimdekiler, Günün fırsatı, Görünümü satın al, Markalar, Neden bizden, Kupon ve Son baktıkların.
- **Her proje türü için**: Kargo gönder, Yemek siparişi, Yolculuk, Eğitmenler, Okul ve Üniversite; çok satıcılı bir uygulamada da adres ve arama, yer türleri, kampanyalar, mutfaklar, market reyonları, kulüp, yakınınızdaki yerler, en yüksek puanlılar, en hızlılar, marketler, ücretsiz teslimat ve tekrar sipariş.

## Şablonlar

**Şablonlar** açık sayfayı bütün bir sayfadan başlatır; öğeleri değişir, **Geri al** onları geri getirir. Önce proje türünüzün şablonları gelir; demosunun ana sayfası **Önerilen** olarak işaretlidir: örneğin **Önce fotoğraf: yemek**, **Fotoğraflı pazar**, **Şehirde kurye**, **Gece yolculuğu**, **Taksi haritası**, **Bugün okulda**, **Gerçek öğretmenler** ya da **Premium akademi**. **Marka**, **İletişim** ve **Boş sayfa** her projeye uyar.

**Sayfayı kendi şablonum olarak kaydet** bir sayfayı diğer sayfalarınız için **Şablonlarım**'da saklar.

## Tüm tasarımlar

**Tüm tasarımlar** tüm sayfaları, üst bilgiyi ve görünümü birden değiştirir. **Tüm projenin tasarımını değiştir**'i seçin ya da **Yalnızca açık sayfa için** kullanın; isterseniz **Değiştirdiğim metinleri ve resimleri koru**'yu da seçin. **Bu projeyi tasarım olarak kaydet** onu **Benim** altında saklar. Uygulamada yayınlanan, siz **Yayınla**'yı seçene kadar değişmez; **Geri al** eski tasarımı geri getirir.

## Studio'nun sekiz demosu

Her demo Studio'da yapılmış gerçek bir uygulamadır; İngilizce, Arapça ve Türkçe, açık ve koyu, gerçek fotoğraflarla. Biriyle başlamak size hepsini verir: sayfalarını, sekmelerini, görünümünü, giriş ekranını, hesap menüsünü ve kayıtlarını.

- **Ufuq Academy**, premium bir akademi: bugünün tarihiyle bir selamlama, öğrencinin aldığı kurs kendi fotoğrafının üstünde, öğrenme serisi sıradaki canlı dersinin yanında ve öğretmeni ve puanıyla onun için seçilen kurslar; açık sekmesi altın renginde yüzen lacivert bir çubuk ve fotoğraflarıyla kursları.
- **Rawaq Academy**, çok öğretmenli bir akademi: üstünde arama olan kütüphane fotoğrafı, yuvarlak içinde öğretmenler ve öğretmeni ve puanıyla bu ayın popüler kursları; Ana sayfa, Eğitmenler, Kurslarım ve Hesap.
- **Sofra Eats**, birçok restorandan yemek teslimatı: nereye teslim ettiğiyle dolu bir sofranın fotoğrafı, kenarının üstünde arama, yuvarlak fotoğraflar halinde mutfaklar, kişinin yoldaki siparişi ve yemekleri ve puanlarıyla yakında sevilen restoranlar.
- **Zad**, restoranları ve bir marketi olan çok satıcılı bir uygulama: en erken teslim süresiyle adres, bir pazar fotoğrafında haftanın kampanyası, fotoğraf kutuları halinde reyonlar ve küçük kartlar halinde yakınınızdaki yerler; Ana sayfa, Mağazalar, Sepet, Siparişler ve Hesap.
- **Sahm Express**, bir teslimat şirketi: şehirde ilerleyen bir kurye, fotoğrafın altının üstünde rota kartı, aşamalarıyla kişinin gönderisi ve fotoğraf kutuları halinde aynı gün ve ekspres hizmetler.
- **Masar Rides**, yolculuk: kişinin selamlaması ve bir aramayla gece şehir, kayıtlı yerler, yoldaki sürücü ve araç sınıfları.
- **Lamha Taxi**, canlı bir taksi uygulaması: bir haritada kişinin çevresindeki boş taksiler ve nereye gidileceği, en yakın taksi ve havalimanının sabit ücretiyle bir pano.
- **Nakhla School**, bir okul: ailenin selamlamasıyla okulun fotoğrafı, küçük kartlar halinde çocuklar, seçilen çocuk için bugünün kartı ve fotoğraflarla bu hafta okulda.

Her demonun ana sayfası kendi proje türü için de bir şablondur; böylece her proje onun gibi bir sayfa başlatabilir.

## Bir demoyla başlamak

1. [Uygulamanı seç](/start) sayfasını açın ya da Studio'da **Yeni proje**'yi seçin. Üstteki **Studio**, Uygulama düzenleyicisininkilerden ayrı olarak, altın renkli koyu kartlarla Studio'nun demolarını gösterir.
2. Sayfasını görmek için birini seçin: üç ekranı, sayfaları, onunla gelenler (kursları, yemekleri, yerleri, araç türleri ya da sınıfları) ve dilleri.
3. **Bu uygulamayla başla**'yı, ardından **Kendinizin yapın**'ı seçin: uygulamanızın adı, logonuz ve logodan alınan renginiz. Yanındaki telefon siz ilerledikçe uygulamanızı gösterir. **Uygulamamı oluştur**'u seçin.

Projeniz Studio'nun düzenleyicisinde açılır. **İlk adımlarınız** kalanları gösterir: kendi kayıtlarınızı ekleyin, ana sayfada kendi fotoğraflarınız ve mağazalar. **Değiştirmek için uygulamada herhangi bir şeye dokunun**. Demonun kayıtları listelerinizde demodan geldikleri belirtilerek görünür; sizinkiler girince **Demonun şeylerini kaldır** hepsini birden kaldırır.

## Bir demoyu canlı denemek

Bir demonun sayfasında ortadaki telefon gerçek demo uygulamasını çalıştırır: ana sayfasında bir misafir olarak, demo o dildeyse panelinizin dilinde, sayfa gibi açık ya da koyu. Bilgisayarda kendiliğinden başlar; telefonda **Canlı deneyin**'i seçin. **Canlı uygulamayı tam boyutta açın** onu kendi başına açar. **Telefonunuzda deneyin** size giriş için bir numara ve kodla demonun indirmesini verir.

Seçim sayfasındaki her kart, siz onu görürken demosunun kısa ve sessiz bir döngüsünü oynatır: ana sayfası, başka bir sekme ve geri. Hareketi azaltılmış telefonlar yalnızca resmi gösterir.
`,
  },
  travel: {
    title: "Seyahat: oteller ve uçuşlar",
    description: "Yallapp Studio'da yapılmış bir seyahat şirketi uygulamasını yönetin: otelleriniz, odaları ve fiyat seçenekleri, uçuşlarınız, paketleri ve koltuk haritaları, tek bir seyahat olarak konaklama ve uçuş, rezervasyonlar, ödemeler, değişiklikler, iptaller ve iadeler.",
    body: `Seyahat projesi, bir seyahat şirketi için bir [Yallapp Studio](/docs/yallapp-studio) uygulamasıdır: otelleriniz, sabit koltuklu uçuşlarınız (charter, umre, paketler) ya da ikisi; tek bir seyahat olarak rezerve edilir ve uygulamada takip edilir. Her şeyi projenin panelinde **Oteller**, **Uçuşlar**, **Rezervasyonlar** ve **Seyahat ayarları** altında eklersiniz. Seyahat, Studio'nun planlarında plan plan seçilir; her şeyi önceden kurabilirsiniz, uygulama planınızda olduğunda rezervasyon almaya başlar.

## Uygulamanızın yaptığı

Uygulamanız otel, uçuş ya da ikisini birden satar. Bunu Yallapp projeniz için ayarlar; **Seyahat ayarları** onu uygulamanın sekmeleriyle gösterir:

- **Oteller ve uçuşlar**: Keşfet, Konaklama, Uçuşlar, Seyahatler ve Hesap. Ana sayfa bir konaklamayla bir uçuşu birlikte, tek fiyata sunar.
- **Yalnızca oteller**: Keşfet, Kaydedilenler, Rezervasyonlar, Mesajlar ve Hesap. Tek bir otelle uygulama o otelin sayfasında açılır.
- **Yalnızca uçuşlar**: Ara, Alarmlar, Seyahatler, Yardım ve Hesap.

Kapalı bir bölümün ekranları uygulamada hiç görünmez. Değiştirmek için bize WhatsApp'tan yazın.

## Oteller

**Oteller**'de **Otel ekle**'yi seçin: adı, türü (otel, tatil köyü, butik otel, daire, villa, hostel ya da pansiyon), yıldızları, insanların aradığı şekliyle şehir, ülke, bölge, neye yakın olduğu, adres ve haritadaki yeri. Hakkında bilgiyi, **Olanaklar**'ı, insanların filtrelediği **Konaklama türleri**'ni (Plaj ya da Spa gibi), giriş ve çıkış saatlerini, **Vergi ve harçlar (%)**'ı, **Otelde ödenebilir** olup olmadığını, kurallarını, telefonunu ve kartı için bir sözcüğü ekleyin. Fotoğraflarını ekleyin (PNG ya da JPEG, her biri en fazla 3 MB); ilki kapaktır.

**Keşfet'te öne çıkan** onu ana sayfaya koyar; **Uygulamada gösterilir**'i kapatmak onu silmeden gizler. **Yukarı taşı** ve **Aşağı taşı** uygulamanın onları listeleme sırasını belirler. Silinen bir otelin adı rezervasyonlarında kalır.

## Odalar ve fiyat seçenekleri

Bir otelin sayfasında her oda türü için **Oda ekle**'yi seçin: adı, büyüklüğü, yatakları, kaç kişilik olduğu, sizde kaç **Bu türden oda sayısı** olduğu, içinde neler olduğu, **Gecelik** fiyatı ve **En az gece**. **Açılış** ve **Kapanış** tarihlerini, **Kapalı günler**'i (her satıra bir gün) ve tek geceler ya da aralıklar için **Diğer gecelerin fiyatı**'nı belirleyin; örneğin 2026-12-20 to 2026-12-31 = 220.

**Fiyat seçenekleri**, insanların oda için seçtikleridir: yalnızca oda, kahvaltı, kahvaltı ve akşam yemeği, tüm öğünler ya da her şey dahil; her biri gelişten belirli gün öncesine kadar **Ücretsiz iptal**, gecenin üstüne kendi fiyatı, **Otelde** ödenip ödenmediği ile ve biri **En çok seçilen** olarak.

Bir oda aynı anda tek bir rezervasyona tutulur: son oda, aynı anda kaç kişi rezervasyon yaparsa yapsın tek bir kişiye gider. **Yorumlar** misafirlerin konaklamalarından sonra yazdıklarını gösterir; **Gizle** bir yorumu tüm puanların dışında tutar.

## Uçuşlar ve paketler

**Uçuşlar**'da **Uçuş ekle**'yi seçin: uçuş numarası, kısa kodu ve rengiyle havayolu ya da charter, kalktığı ve indiği havalimanları (3 harfli kodları, terminalleri ve şehirleri), yerel saatle ne zaman kalktığı ve indiği ve saat farkı, aktarmaları, uçak ve uçakta olanlar. **Haftalık tekrar (hafta)** aynı uçuşu tek seferde 52 haftaya kadar ekler.

Her uçuş **Paketler** altında en fazla üç paket satar, **Hafif**, **Standart** ve **Esnek**: kişi başı fiyatları, o paketle satılan koltuklar, kabin bagajı, bagajlar ve ağırlıkları, değişiklik ve iadeye izin verilip verilmediği ve ücretleri, ve hangi koltukların dahil olduğu. Rezervasyonu olan bir uçuş hiç silinmez: bunun yerine satışı durur.

## Koltuk haritaları

**İnsanlar koltuklarını seçebilsin**'i açın ve uçağı çizin: **Sıradaki koltuklar** (harfler, her koridor için bir boşluk, örneğin ABC DEF), **İlk sıra** ve **Sıra sayısı**, **Geniş bacak mesafeli sıralar** ve fiyatları, hafif pakette bir koltuğun fiyatı ve **Satılmayan koltuklar**. İnsanlar koltuklarını uygulamadaki haritada seçer; bir koltuk yalnızca tek bir rezervasyona gider.

## Durum, kapı ve biniş

**Durum, kapı ve saat** bir uçuşu güncel tutar: planlandı, zamanında, yeni saatiyle gecikmeli, biniş, kalktı, indi ya da iptal; **Kapı**, **Biniş saati** ve **Yolculara not** ile. Ona rezervasyonu olan herkese telefonunda haber verilir.

Biniş kartları uygulamada uçuş kalkmadan 48 saat önce ya da **Check-in açık**'ı açtığınız anda görünür. Yolcunun telefonunda kalır.

## Tek bir seyahat olarak konaklama ve uçuş

Oteller ve uçuşlarla insanlar bir konaklamayı ve bir uçuşu birlikte, tek bir seyahat olarak, tek fiyata rezerve eder; belirlediğiniz **Konaklama + uçuş indirimi** konaklamadan düşülür ve sunuyorsanız bir **Havalimanı transferi** eklenir. Yalnızca uçuş otelin şehrine giriş günü ya da bir gün önce iniyor ve çıkış günü ya da bir gün sonra dönüyorsa birlikte sunulurlar. İnsanlar belirlediğiniz fiyatlarla ek bagaj ve yemek ekleyebilir.

## Rezervasyonlar ve ödeme

**Rezervasyonlar** her konaklamayı, uçuşu ve seyahati en yeniden başlayarak listeler: **Tümü**, **Onaylı**, **Ödeme bekliyor**, **İptal**, **Tamamlandı** ve **İade edilecek**; referans, ad ya da telefonla arama da vardır. Bir rezervasyon konaklamasını, uçuşlarını ve koltuklarını, yolcuları ve isteklerini, kalem kalem fiyatı, ödemeyi ve olanları gösterir.

İnsanlar sizin ödeme sayfanızda, kendi hesabınıza öder: Yallapp komisyon almaz. İzin verirseniz yalnızca konaklama otelde de ödenebilir. Henüz ödenmemiş bir rezervasyon odalarını ve koltuklarını 30 dakika tutar, sonra geri bırakır. Biri rezervasyonun şu anki tutarından az öderse (ödeme sayfası açıkken tarihleri ya da koltukları değiştiği için), rezervasyon kalanını bekler. **Ödendi olarak işaretle**, tutma süresi bitmiş bir rezervasyonu yalnızca odaları ve koltukları hâlâ boşken onaylar. **Üye fiyatı** giriş yapanlara daha düşük bir fiyat verir.

## Değişiklikler, iptaller ve iadeler

Yolcular tarihlerini, uçuşlarını ya da koltuklarını uygulamada değiştirir ve iptal eder; uygulama, onaylamadan önce bir iptalin neyi iade edeceğini fiyat seçeneğinin ücretsiz iptaline ve paketin kurallarına göre gösterir. Geri ödenecek tutar her zaman, yeni toplamın üstünde ödenmiş olandır.

**Rezervasyonlar**'da **Rezervasyonu iptal et** onu yolcu için iptal eder, ödenen her şey iade edilecek olur ve yolcuya haber verilir. İadeyi ödeme hesabınız üzerinden yapın, ardından **İade edildi olarak işaretle**'yi seçin; sonradan yapılan tam bir iptal yalnızca kalanı iade eder.

## Seyahat ayarları

- **Para birimi** ve ödeme yolları: uygulamada, otelde ya da ikisi.
- Yüzde olarak **Üye fiyatı** ve **Konaklama + uçuş indirimi**.
- **Havalimanı transferi**'nin fiyatı ve notu, ek bavulun ve yemeğin fiyatı.
- **Başlıkların yazı tipi**, uygulamanın seyahat başlıkları için ücretsiz bir yazı tipi.
- **Saat dilimi**: bugün, satış ve iptal son tarihleri, biniş kartları için check-in ve uçuşların saatleri onunla sayılır. Siz seçene kadar uygulamanızınkidir, yoksa İstanbul'unki.
- **Yardım**: uygulamanın yolculara gösterdiği telefon, e-posta ve WhatsApp.

## Uygulamada

Yolcular konaklamayı yere, tarihlere ve misafir sayısına göre arar, otelleri bir listede ya da haritada görür, bir otelin odalarını kendi tarihleri için açar ve uçuşları en iyi, en ucuz ve en hızlı ile ayın fiyat takvimiyle görür. Bir paket, koltuklarını, bagajlarını ve yemeklerini seçer, öder ve her seyahati biniş kartlarıyla **Seyahatler**'de tutar. Konaklamalarından sonra onu değerlendirebilirler. Otelleri kaydeder ve her gün fiyatı kontrol edilen, fiyat düştüğünde telefonlarına haber verilen fiyat alarmları kurarlar. İngilizce, Arapça ve Türkçe, açık ve koyu.

Studio'da seyahat şablonu ve üç tasarımı, Keşfet, Kaçamak ve Sakin yolculuklar; Paketler, Hakkımızda, İletişim ve Sorular sayfalarıyla gelir; oteller herhangi bir sayfada liste olabilir. [Studio demosu](/demo/studio) Safra, otelleri ve uçuşlarıyla bir seyahat uygulaması gösterir.

## Otellerin ve uçuşların kendi sistemleri

Oteller ve uçuşlar panelinizde ayarlanır. Bir otelin kendi rezervasyon sistemini, bir otel tedarikçisini ya da canlı bir uçuş sağlayıcısını bağlamak **Yakında**: birine ihtiyacınız varsa bize yazın.
`,
  },
};
