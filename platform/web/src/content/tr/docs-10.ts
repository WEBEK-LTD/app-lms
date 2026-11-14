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
- **Fotoğraflı vitrin** ve **Harita başlığı**: üstünde öğeler olan kapaklar; **Premium** grubunda da **Vitrin kaydırıcı**, **Kart karuseli**, **Video vitrin**, **Derinlikli vitrin**, **Cam kart** ve **Profil kartı**. Hepsi [Studio'nun premium öğeleri](/docs/studio-premium-elements) sayfasında.

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
- **Premium** grubunda: **Hikâyeler**, **Kayan şerit**, **Galeri**, **Önce ve sonra**, **İlerleme bölümleri**, **Müşteri yorumları**, **Fiyatlar**, **Rakamlar**, **İlerleme**, **Zaman çizelgesi**, **Bento ızgara**, **Rozet**, **Eylem çubuğu** ve **Haritalar** altında premium görünümleriyle çizilmiş haritalar; aynı sayfada.
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
- **Hareket**: **Göründüğünde** (belirme, yukarı, aşağı, baştan ya da sondan kayma, ya da büyüme), **Süre (ms)** ve **Önce bekle (ms)** ile, öğe kişi sayfayı kaydırırken ekrana ilk geldiğinde bir kez oynar; **Dokunulurken** (küçülme ya da sekme); **Sürekli** (nabız, süzülme ya da sallanma). **Oynat** telefonda gösterir. Hareketi azaltılmış telefonlar onu hareketsiz gösterir.
- **Müşteri dokununca**: **Uygulamanın bir ekranı**, **Bir sayfa**, **Bir web adresi**, **Tek bir kayıt** ya da **Bir kurs**.
- **Göründüğü yer**: Android, iOS ya da ikisi; **Kim görür**: herkes, giriş yapanlar ya da giriş yapmayanlar.
- **Uygulamada gizle (burada kalır)**, **Tuvalde kilitle** ve **Katmanlardaki adı**.

## Telefonlar ve tabletler

Her sayfayı **Küçük telefon**, **Büyük telefon** ve **Tablet**'te, açık ve koyu modda kontrol edin. Tablette değiştirdiğiniz şey **Tablet için değiştiriyorsunuz** olur: genişlikler, yükseklikler, boşluklar, sütunlar, aynı anda görünen slaytlar ve metin. Telefonlar kendi değerlerini korur, **Telefondaki gibi** geri alır.

## Sayfa, üst bilgisi ve sekmeleri

- **Üst bilgi**: **Üst bilgi yok** ya da altıdan biri: **1 Ortada logo**, **2 Başlık + arama**, **3 Logo + sepet + hesap**, **4 Resmin üstünde şeffaf**, **5 Sayfanın başlığı ve düğmeler** ve **6 Kişinin adıyla selam**. Düğmelerini (menü, arama, sepet, bildirimler, sohbet, hesap) ve renklerini koyu modda da seçin. Şeffaf üst bilgi sayfanın ilk öğesinin üstünde, en yukarıdan başlar. Bir **Premium stil** (büyük başlık, buzlu cam, fotoğraflı kapak, ortada marka ya da başlık ve arama) türün yerine çizilir: [Studio'nun premium öğeleri](/docs/studio-premium-elements) sayfasına bakın.
- **Sayfa arka planı**, **Bu sayfanın altında alt sekmeler** ve **Bu sayfanın altındaki uygulama ekranı**: uygulama kendi ekranlarından birini (listelerini, formlarını ya da haritasını) öğelerinizin altına çizer ve üst bilginiz onun başlığı olur.
- **Alt sekmeler**: ona kadar. Çubukta en fazla beşi görünür; daha fazlasında beşincisi Diğer olur ve gerisini tutar. Her sekmenin adı ve simgesi vardır. **Çubuğun görünümü** altında **Tasarım**'ı (Klasik, Hap, Sade, Nokta, Çizgi, Baloncuk, Cam, Çentik, Yükselen, Çerçeve, Kare, Yalnızca adlar, Ada, Bölmeli, Klasör sekmesi, Damla, Parıltı, Renkler, **Yüzen kapsül** ya da **Küçük dok**), **Açık sekme** ve **Diğer sekmeler** renklerini, **Köşeler**'i, **Çevresindeki boşluk (yüzen)**'u, **Adların yazı tipi**'ni, **Adlar**'ı (her zaman, yalnızca açık sekme ya da yalnızca simgeler), **Ortada yuvarlak düğme**'yi ve **Hesap sekmesinde kişinin fotoğrafı görünsün**'ü seçin.
- **Sistem ekranlarının görünümü**, hiçbir şey seçili değilken: uygulamanın kendi ekranlarının (hesap, ayarlar, bildirimler, giriş ve daha fazlası) tüm proje için görünümü.

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
    description: "Studio'nun her proje için premium kitaplığı: kaydırıcılar, hikâyeler, kayan şeritler, video vitrinler, galeriler, yorumlar, planlar, rakamlar, ilerleme, zaman çizelgeleri, bento ızgaralar, cam kartlar, haritalar ve canlı rotalar, canlı kartlar, premium üst bilgiler ve premium uygulama ekranları.",
    body: `Studio'nun demoları ve onların Signature görünümleri bu öğelerden yapılır ve her proje onları kullanabilir: [Studio düzenleyicisi](/docs/studio-elements)'nde **Öğeler** altında bulun; çoğu **Premium** grubunda, haritaları **Haritalar** altında. Her biri, herhangi bir öğe gibi değiştirdiğiniz ayarlardan oluşur. Studio'nun sayfası onları uygulamanın çizdiği gibi, açık ve koyu modda, Arapçada sağdan sola çizer; hareketi azaltmaya ayarlı telefonlar onları sabit gösterir. Giriş yapan kişiden çizilenler Studio'da bir örnek gösterir; uygulamada giriş yapmamış ya da gösterecek bir şeyi olmayan biri için hiçbir şey göstermez.

## Fotoğraflı vitrin

Üstünde gölge ve öğeler olan bir fotoğraf: büyük bir karşılama, altyazılı bir fotoğraf kutusu ya da bir kampanya afişi. **Resim**'i, yüksekliği ve **Köşeler**'i seçin ve üstüne istediğiniz öğeleri ekleyin: yazılar, bir arama kutusu, düğmeler. **Son öğe kapağın altına biner** son öğeyi, bir arama kartı ya da rota kartı gibi fotoğrafın kenarının üstüne sarkıtır. **Fotoğrafta yavaş yakınlaşma** fotoğrafı tekrar tekrar yavaşça büyütür. Üst bilgisi olmayan ve bir kapakla başlayan sayfa onu telefonun durum çubuğunun altında gösterir; şeffaf üst bilgi onun üstünde durur.

## Yazılar için gölge

Üstündeki yazılar okunsun diye bir resmin üstünde gölge: fotoğraflı vitrinde, bir **Resim**'de ya da **Arkadaki resim**'i olan herhangi bir öğede. Rengini, **Başta** ve **Sonda** ne kadar koyu olduğunu seçin; yukarıdan aşağı yerine bir yandan karartmak için **Yatay, baştan**'ı seçin.

## Vitrin kaydırıcı ve kart karuseli

**Kaydırıcı**'nın iki görünümü. **Vitrin kaydırıcı** bir gölge altında ekran genişliğinde fotoğraflar gösterir; her birinde küçük bir satır, büyük bir başlık ve bir düğme, beklerken dolan her slayt için bir çizgi ve **Fotoğraflarda yavaş yakınlaşma** vardır. **Kart karuseli** köşeleri yuvarlak fotoğraf kartları gösterir; bir sonraki kenardan görünür, kartlar birer birer geçer ve noktaları altlarında bir **Buzlu kapsül** içindedir. **Göstergenin yeri** **Üst** ya da **Alt** olur; **Kenardan uzaklık** ve **Rengi** ayarlanır, **Yanında sayı** "1/3" ya da "01/03" gibi bir sayı gösterir. Kaydırıcı ekranın dışındayken kendiliğinden ilerlemez.

**İlerleme bölümleri**, 11'i bitmiş 18 ders gibi kısa bölümlerden bir çubuktur. **Öğrencinin devam eden kursu** ile uygulama öğrencinin kendi derslerini gösterir; devam eden kursu yoksa çubuğu göstermez.

## Hikâyeler

Halkalar içinde yuvarlak fotoğraflardan bir sıra, başlıkları altlarında. Kişi hikâyeyi telefonunda görene kadar halka sizin renklerinizle parlar, sonra sadeleşir; **Halka** ayrıca **Hep parlak (bir fırsat)**, **Sade** ya da **Kesik çizgili (hepsi)** olabilir, kendi **Halka rengi** ile. Bir dokunuş hikâyeleri tam ekranda art arda açar; her biri gösterilirken üstte onun çizgisi dolar (**Her hikâyenin süresi** 2 ile 15 saniye): bir yana dokunmak ileri ya da geri gider, basılı tutmak durdurur, aşağı kaydırmak kapatır. Her hikâyenin fotoğrafı, **Halkanın altındaki başlık**'ı, **Fotoğrafın üzerindeki satır**'ı ve Aç düğmesinin açtığı bir bağlantısı vardır: bir sayfa, uygulamanın bir ekranı, bir kayıt ya da bir web adresi. Fotoğrafı olmayan bir hikâye kendi rengi üstünde baş harfler ya da bir simge gösterir.

## Kayan şerit

**Sözcükler, her biri bir satırda** ya da **Logolar ya da fotoğraflar** ile bitmeyen bir şerit; **Aralarında** bir simgeyle. **Hız**'ını, **Yönü**'nü (**Başa doğru** ya da **Sona doğru**) ve **Basılıyken durur** olup olmadığını seçin. Biraz **Eğim** verilip ekranın kenarlarını aşabilir, **Sözcüklerin arasında nokta** ya da **Her biri çerçeveli bir kapsülde** olabilir. Ekran okuyucular onu bir kez okur; ekranın dışındayken durur.

## Video vitrin ve derinlikli vitrin

**Video vitrin**, Medyanızdan sessiz ve döngülü bir videoyu **Önce görünen kapak** üstünde, bir gölge altında oynatır; üstünde yazılarınız, düğmeleriniz ve oynatıp durdurmak için yuvarlak bir düğme vardır. **Kendiliğinden, sessiz ve döngüde oynar** ile yalnızca ekrandayken oynar; hareketi azaltan ya da veri tasarrufu yapan telefonlarda kapağında bekler.

**Derinlikli vitrin**, fotoğrafı sayfa kayarken sayfadan daha yavaş hareket eden bir fotoğraf afişidir: **Fotoğrafın hızı** sayfanın hızının %10 ile %90'ı arasındadır. İki vitrin de **Yazılar buzlu bir panelde** gösterebilir ve şeffaf bir üst bilginin altında ikisi de, fotoğraflı vitrin gibi, bir kapaktır.

## Galeri

Her biri açıklamasıyla 1 ile 30 arasında fotoğraf: 2 ya da 3 **Sütunlar**'da **Duvar örgüsü**, **Fotoğraf bentosu** ya da yana kayan bir **Film şeridi**. **Fotoğrafların köşeleri**'ni ve **Açıklamalar fotoğrafın üzerinde**'yi, **Gölge üzerinde** ya da **Buzlu bir kapsülde** seçin. Bir dokunuş fotoğrafları tam ekranda açar: kaydırarak gezilir, iki parmakla yakınlaştırılır, her biri açıklamasıyla. Bir fotoğraf bunun yerine bir bağlantı açabilir; örneğin bir mutfağın restoranlarını.

## Önce ve sonra

Biri diğerinin üstünde iki fotoğraf ve aralarında, kişilerin parmakla sürüklediği ya da bir dokunuşla taşıdığı bir ayırıcı; önceki fotoğraf baş taraftadır. Her fotoğrafın **Fotoğraftaki etiket**'i vardır; **Ayırıcının başladığı yer** ayırıcının nereden başlayacağını belirler.

## Kaydırırken hareket

**Hareket** sekmesinde **Göründüğünde**, öğe ekrana ilk geldiğinde bir kez oynar: uygulamada kişi sayfayı kaydırıp ona ulaştığında, Studio'nun sayfasında görünür olduğunda. Hareketi azaltmaya ayarlı telefonlar ve bilgisayarlar onu sabit gösterir.

## Müşteri yorumları

Kişinin fotoğrafı (yoksa baş harfi), adı, görevi ya da şehri, yıldızları ve sözüyle alıntı kartları; **Yan yana, kaydırarak** ya da **Alt alta**. Uygulamanızın her dilinde 12'ye kadar alıntı yazın ya da **Uygulamadaki gerçek yorumları göster**'i seçin: bir kursun ya da ürünün, yazısı olan 4 yıldız ve üstü onaylı yorumları. Hiç yokken sizin alıntılarınız görünür.

## Fiyatlar

Adı, seçtiğiniz **Para birimi**'nde "/ ay" ya da "/ yıl" fiyatı, her birinin içerdikleri bir onay işaretiyle, bir düğme ve iki marka renginizde **En popüler (öne çıkan)** plan ile plan kartları. Üstlerinde bir **Aylık / yıllık geçişi** olabilir. Sizin yerinize hiçbir fiyat doldurulmaz: siz yazana kadar Studio yerinde **Fiyat girin** gösterir, uygulama hiçbir şey göstermez.

## Rakamlar

Etiketleriyle büyük sayılar, öncesinde ve sonrasında sözcükler ("+", "%", " dk") ve bir simge; göründüklerinde bir kez sayarak yükselirler. **Kartlarda** ya da **Aralarında çizgi** ile, biri **İkinci renkte** gösterin. **Değerleri saymadan göster** onları sabit tutar.

## İlerleme

Etiketi ve payıyla çubuklar, payı içinde **Halkalar** ya da **Bölmeli çubuklar**; göründüklerinde bir kez dolarlar. Bir halkanın **Halka boyutu** ve **Kalınlık**'ı vardır; **Çentik işaretleri**, **Sonunda bir topuz** ve **Fotoğrafın üstündeki etiket** ile bir **Halkanın içindeki fotoğraf** olabilir.

## Zaman çizelgesi

Bir çizgi üzerinde her biri bir noktayla adımlar; tarih, başlık ve metinle. **Şu anki adım**'a kadar olan adımlar sizin renginizle tamamlanmış görünür. **Aşağı doğru**, **Yatay** ya da **Yatay, her birinin üstünde çubuk** dizin. Bir okul günü ya da seyahat için **Saatler başta bir sütunda**, **Şu anki adım bir kart olarak** ve **Tarihler eş aralıklı yazı tipinde**'yi kullanın.

## Profil kartı

Bir kişinin ya da bir yerin kartı: kapak fotoğrafı, yuvarlak ya da köşeleri yuvarlak kare bir fotoğraf (**Fotoğraf şekli**), adı ve görevi, herhangi bir öğe gibi değiştirdiğiniz iki rozet ve iki düğme ve 6'ya kadar **Sosyal bağlantılar**.

## Bento ızgara

1 ile 4 sütunda farklı boyutlarda kutular (**Tek hücre**, **Geniş**, **Uzun**, **Büyük** ya da **Tüm genişlik**); her biri bir gölge altında kendi fotoğrafında, bir geçişte ya da yumuşak bir kartta, simgesi, başlığı, metni ve bağlantısıyla. **Kutuların yazıları** **Buzlu camın üstünde** olabilir, **Üstündeki etiket** ile.

## Cam kartlar, biletler ve dokular

Bir **Satır**, **Sütun**, **Katmanlar**, **Izgara** ya da **Profil kartı** bir **Premium kart stili** alabilir: arkasındakini bulanıklaştıran **Buzlu cam** (**Bulanıklık** ve **Beyazlık** ile), **İki renkli kenarlık**, **İç parıltı** ve **Yumuşak gölge**; istediğiniz gibi birlikte. **Delikli bilet**, bir biniş kartı ya da okul kartı gibi, iki kenara aralarında kesik çizgi olan yuvarlak çentikler açar; yatay ya da **Yatay yerine dikey delikli**. **Doku** gren, nokta ızgara, ızgara ya da çizgiler ekler. Premium grubundaki **Cam kart**, iki renkli kenarlığı olan buzlu camdan bir sütundur.

## Rozet

Sözcükleri ve simgesiyle bir rozet: **Hap**, **Çerçeve**, **Geçişli**, **Cam** ya da rozetsiz, iki marka renginizde bir başlık olan **Geçişli yazı**. Bir başlığın yanında bir satıra koyun.

## Eylem çubuğu

Sayfanın altında, kendi yazdığınız bir fiyat gibi etiketiyle, sekmelerin üstünde **Sayfa kayarken altta kalır** bir **Düğmeli çubuk**; bir **Yüzen yuvarlak düğme**; ya da başında bir simge olan bir **Yüzen kart**.

## Harita başlığı

Sayfanın üstünde çizilmiş bir harita; **İşaretler**, **İşaretlerin simgesi**, **İşaretlerin rengi** ve **İşaretlerin zemini** ve **Ortada kişinin noktası** ile. **Uygulamada, kişinin yakınındaki boş taksiler** işaretlerin yerine gerçek taksileri canlı gösterir. **Son öğe kapağın altına biner** ile son öğe haritanın altının üstünde bir pano olur.

## Haritaların premium görünümleri

Bir harita başlığı bir **Haritanın görünümü** alabilir: **Canlı harita** (adasıyla kıvrılan bir nehir, sokaklar, caddeler ve parklar), **Ufuk** (sisin üstünde bir başlığa yer bırakarak sisli bir ufka doğru eğilen şehir), **İki renk** (işaretlerin iki rengiyle basılmış, işaretler tavan tabelası, altında damalı bir şerit) ya da **Radar merceği** (1, 3 ve 5 dakikalık halkaları ve yavaş bir taramasıyla yuvarlak bir radar, çevredeki taksiler izleriyle). Uygulama her birini harita karoları olmadan, gündüz ve gece çizer ve Arapça için çevirir.

Her görünümün **Adlı iğneler**'i (Ev, Ofis), **Haritadaki yazılar**'ı, **Kişinin noktasının yeri** ve **İşaretlerin görünümü** olabilir: simgeli kare, üstten araba, tavan tabelası ya da izli yuvarlak. Premium grubunda **Haritalar** altında hazır olarak bulunurlar: **Canlı harita**, **Ufuklu harita**, **İki renkli harita**, **Radar merceği** ve **Canlı rota haritası**.

## Canlı rota

Herhangi bir harita görünümündeki **Bir rota** noktalarından geçerek çizilir: aracın olduğu yere kadar düz, sonrasında kesik çizgili; araç nabız gibi atar, her uçta bir etiket ve aracın yanında "3 dk" gibi bir baloncuk vardır. **Uygulamada rota şunu izler** **Kişinin yoldaki yolculuğu** ya da **Kişinin yoldaki gönderisi** olduğunda uygulama, kişinin kendi yolculuğunu ya da gönderisini gerçek yerlerinden çizer; yoksa hiçbir şey çizmez.

## Selamlama

Uygulamanın dilinde, kişinin adıyla günaydın ya da iyi akşamlar. Bunun yerine **Sözleri** sizin olabilir, kişinin adının geleceği yerde {name} ile; **İsimsiz** ise giriş yapmamış kişilerin gördüğüdür: "Nereye, Omar?" ve "Nereye?". **6 Kişinin adıyla selam** üst bilgisi selamlamayı ve bugünün tarihini sayfanın en üstüne, düğmelerini yanına koyar.

## Canlı sipariş

Yemek teslimatı ve çok satıcılı uygulamalar için: kişinin yoldaki siparişi; ne olduğu, ne kadar ilerlediği ve kalan dakikalarla. **Hangi sipariş**'i, simgesini ve **Görünüm**'ünü seçin: **Kart**, **Büyük dakika, çubuk aşamalar**, **İlerleme halkasında fotoğraf**, **Takip düğmeli ince hap** ya da **Çizgide adlı aşamalar**; **Vurgu rengi** ve **Gece vurgu rengi** ile.

## Canlı kart

Teslimat, yolculuk, taksi ve seyahat uygulamaları için. **Neyi takip eder**: **Yoldaki gönderisi**, **Yolculuğu**, **Yakınındaki taksiler** ya da **Sıradaki seyahati** (en yakın rezervasyonu: şehri, ona kalan günler, konaklama ve aşamaları). **Görünüşü**: **Aşamalı kart**, **Sürücü ve araç** (fotoğrafı, aracı, puanı ve plakası, bir arama düğmesiyle), **Tek satır**, canlı siparişle aynı premium görünümler, **Bilet** (seyahatin ilk uçuşu bir biniş kartı olarak: havalimanı kodları, saatler, koltuklar ve biniş kartı için bir düğme) ya da **Büyük sayı** (sürücü ve araçla alış noktasına kalan dakikalar ya da çevredeki boş taksi sayısı). **Sürücünün fotoğrafı yokken fotoğraf** sürücü kendi fotoğrafını ekleyene kadar yerini tutar.

## Okul günü

Okullar için: ailenin okul gününün bir bölümü, velinin kendi çocuklarından. **Hangi bölüm**: **Bugünün tarihiyle selamlama**, **Aralarında geçilen çocuklar** ya da seçilen çocuk için **Bugün: giriş, ders ve servis**: kapıdan girişi, şimdiki ve sonraki ders ve eve dönüş servisi.

## Fotoğraf üzerinde öğrenci kartları

Akademilerde **Öğrenci kartı** **Aldığı kurs**'u, **Öğrenme serisi**'ni, **Sıradaki canlı ders**'i ya da **Bu haftanın öğrenme süresi**'ni gösterir. **Görünüm**'ü **Kart**, **Fotoğraf üzerinde** ya da **Altın halka içinde** olabilir. Fotoğraf üzerinde: koyu bir gölge altında kendi resminin üstünde kurs, tek bir etikette ders ve kalan dakikalar, altın renginde ne kadar ilerlendiği ve yuvarlak bir oynat düğmesi; adının üstünde altın renginde canlı dersin saati; tek bir rakam olarak seri. Altın halka içinde: ne kadar ilerlendiği kadar dolan altın bir halkayla yuvarlak bir çerçevede kursun fotoğrafı, bir etikette ders ve devam etmek için bir düğme. Bir serinin altında **Bu haftanın günleri**, öğrenilen günleri altın renginde ve bugünü halka içinde, **Yuvarlak harfler** ya da **Kısa çubuklar** olarak gösterir.

## Kartta puanlar

Bir listenin kendi kartında bir öğenin **Kayıttan gösterir** ayarını **Puan** yapın: öğenin kendi yazısından sonra, bir yıldızla kaydın puanı; örneğin "Omar Farouk · 4.8/5". Puanı olmayan bir kayıt için hiçbir şey görünmez.

## Gece kenarlıkları

Bir öğenin **Kenarlık**'ı olduğunda **Koyu modda** ona gece için kendi kenarlık rengini verir.

## Yüzen çubuklar

**Alt sekmeler** altında iki tasarım kendi renkleriyle sayfanın üstünde yüzer; sayfa altlarında devam eder. **Yüzen kapsül**: açık sekme adıyla dolu bir kapsül, diğerleri yalnızca simge. **Küçük dok**: ortada simgeleri kadar geniş bir kapsül, açık sekme dolu bir daire.

## Küçük kartlar ya da deste halinde yerler ve adres şeridi

Çok satıcılı bir uygulamada yerler **Küçük kartlar** (her yerin fotoğrafı adının, puanının ve süresinin yanında) ya da **Kart destesi** olarak görünebilir: açık yer kulüp avantajı ya da kampanyasıyla önde, sonraki ikisi arkasından görünür ve bir kaydırma sıradakini getirir. Adres ve arama ise açık bir yerin en erken teslim süresiyle bir **Şerit** olarak görünebilir.

## Premium üst bilgiler

Sayfanın **Üst bilgi**'sini seçin ve üst bilginin türü yerine çizilen bir **Premium stil** seçin: **Büyük başlık**, **Başlığın altındaki satır** ile büyük bir başlık; **Buzlu cam**, sayfanın altından kaydığı bir çubuk; **Fotoğraflı kapak**, altına başlık yazılmış, gölge altında bir fotoğraf (**Fotoğrafı seç** ya da ana ve ikinci renkleriniz); **Ortada marka**, ana renginiz üstünde logonuz; ya da **Başlık + arama**, yerinde kalan bir arama kapsülünün üstünde başlık. **Kaydırınca küçük bir çubuğa katlanır** kapalı değilse büyük başlık, fotoğraf ve arama, sayfa kayarken küçük bir çubuğa katlanır. Düğmeleri yuvarlak ve camdır: kişinin okunmamış bildirimleri varken zilde bir nokta olur, hesap onun fotoğrafını gösterir ve sekmelerin üstünde açılan bir sayfanın yuvarlak bir geri düğmesi vardır. **Yok (yukarıdaki tür)** üst bilginin türünü korur.

## Premium görünümlü uygulama ekranları

Hiçbir şey seçili değilken sayfanın ayarlarında tüm proje için **Sistem ekranlarının görünümü** bulunur. Projenizin menüsündeki **Giriş ve hesap** sayfasında, giriş ekranını ve hesap menüsünü tasarladığınız yerde, **Sistem ekranları** altında da vardır. **Uygulamanın kendi görünümü** (her ekran bugünkü gibi), **Büyük başlık**, **Buzlu cam**, **Fotoğraflı giriş** (üstte gölge altında bir fotoğraf: bir tane seçin, yoksa giriş ekranının fotoğrafı görünür) ya da **Markalı giriş** (üstte logonuzla ana renginiz) seçin.

Görünüm şunlar içindir: hesap (bir kartta kişi, kendi verilerinden birkaç sayı ve gruplanmış girişleriniz, en sonda Çıkış yap), ayarlar, bildirimler, dil, profili düzenleme, yardım, hakkında ve yasal sayfalar, sipariş, rezervasyon ve seyahat listeleri, giriş ve kod ekranı, ayrıca renklerinizde parıltıyla yüklenen boş ve yükleniyor durumları. **Bir ekran için başka bir görünüm** bir ekrana kendi görünümünü verir. Uygulama bunu bir sonraki açılışta, yeni derleme olmadan gösterir. Mevcut projeler siz bir görünüm seçene kadar ekranlarını korur; bir demodan, onun görünümlerinden birinden ya da bir tüm tasarımdan yapılan projeler kendi görünümleriyle başlar.
`,
  },
  "studio-templates": {
    title: "Hazır bölümler, şablonlar ve Studio'nun demoları",
    description: "Yallapp Studio'da hazır bölümler ve tüm sayfalar ekleyin, kendi şablonlarınızı ve tasarımlarınızı saklayın, altı premium tüm tasarımı kullanın ve Studio'nun dokuz demosundan biriyle, iki görünümünden hangisiyle isterseniz başlayın; seçmeden önce her birini canlı deneyin.",
    body: `Her sayfayı tek tek öğelerden kurmanız gerekmez. [Studio düzenleyicisi](/docs/studio-elements)'nde **Hazır bölümler** bir sayfanın bütün bir bölümünü, **Şablonlar** bütün bir sayfayı, **Tüm tasarımlar** da tüm sayfaları birden ekler. Yeni bir proje de tüm sayfaları, fotoğrafları ve kayıtlarıyla, iki görünümünden biriyle Studio'nun demolarından biri olarak başlayabilir.

## Hazır bölümler

Bir bölümü sayfaya sürükleyin ya da sonuna eklemek için tıklayın. Her biri tek tek değiştirdiğiniz sıradan öğelerden yapılmıştır.

- **Her proje için**: Karşılama, Kampanya afişi, Kategoriler, Liste, Düğme, Özellikler, Rakamlar, Bir yorum, Bize ulaşın, İletişim formu, Arama çubuğu, Nasıl çalışır, Sorular ve Geri sayımlı kampanya; ve fotoğraf öncelikli bölümler **Üzerinde yazı olan fotoğraf**, **Fotoğraf kutuları** ve **Yuvarlak içinde kişiler**.
- **Mağazalar için**: Büyük slayt, Kart slaytı, Görsel ve yazı slaytı, Kampanya slaytı, Flaş indirim, Görselli kategoriler, Yuvarlak kategoriler, Yeni gelenler, Çok satanlar, İndirimdekiler, Günün fırsatı, Görünümü satın al, Markalar, Neden bizden, Kupon ve Son baktıkların.
- **Her proje türü için**: Kargo gönder, Yemek siparişi, Yolculuk, Eğitmenler, Okul ve Üniversite; çok satıcılı bir uygulamada da adres ve arama, yer türleri, kampanyalar, mutfaklar, market reyonları, kulüp, yakınınızdaki yerler, en yüksek puanlılar, en hızlılar, marketler, ücretsiz teslimat ve tekrar sipariş.

## Şablonlar

**Şablonlar** açık sayfayı bütün bir sayfadan başlatır; öğeleri değişir, **Geri al** onları geri getirir. Önce proje türünüzün şablonları gelir: **Önerilen** olarak işaretli demosu (örneğin **Demomuz: Sofra Eats**), sonra demonun her biri o görünümde uygulamanın tamamı olan iki Signature görünümü, sonra türün diğer şablonları; örneğin **Önce fotoğraf: yemek**, **Fotoğraflı pazar**, **Şehirde kurye**, **Gece yolculuğu**, **Taksi haritası**, **Bugün okulda**, **Gerçek öğretmenler** ya da **Premium akademi**. Bir akademi Ufuq Academy'nin iki görünümüyle başlar: **Gece sineması** ve **Altın halka**. **Marka**, **İletişim** ve **Boş sayfa** her projeye uyar.

Signature görünümleri, her biri resmiyle, Uygulama kurulumunun **Marka** adımında ve yeni bir proje oluştururken de sunulur.

**Sayfayı kendi şablonum olarak kaydet** bir sayfayı diğer sayfalarınız için **Şablonlarım**'da saklar.

## Tüm tasarımlar

**Tüm tasarımlar** tüm sayfaları, üst bilgiyi ve görünümü birden değiştirir. Studio'da demosu olan bir proje türünde önce demo (**Demomuz gibi: …**), sonra kendi adıyla ikinci görünümü gelir. Ardından, hangisi olursa olsun proje türünüz için yapılmış altı premium tasarım gelir:

- **Altın saat**: üst bilginin kapağı olarak türünüzün fotoğrafı, hikâyeler, canlı kart, başlıklı bir geçişli kart, fotoğraf kartlarında liste, fotoğraflardan bir bento ve yorumlar.
- **Bahçe**: büyük bir başlık, kaydırılan fotoğraf kartları, türünüzün küçük kartları, canlı kart, ızgarada liste, zaman çizelgesi olarak nasıl çalışır ve yorumlar.
- **Gün batımından sonra**: yavaş yakınlaşmasıyla bir vitrin kaydırıcının üstünde cam bir çubuk, eğik altın bir kayan şerit, canlı kart, uzun kartlar, bir film şeridi ve yorumlar.
- **Berrak su**: aramasıyla başlık, yazıları cam üstünde derinlikli bir fotoğraf, hikâyeler, canlı kart, yumuşak satırlarda liste, cam bir kartta nasıl çalışır ve bir bento.
- **Editoryal**: büyük bir başlık, altın geçişli yazıyla manşet, fotoğraflı bir hikâye, çerçeveli sözcüklerden bir kayan şerit, canlı kart, dizin olarak liste, yerin kartı ve yorumlar.
- **Çiçek**: ortada adıyla markanızın çubuğu, hikâyeler, manşetin üstünde geçişli bir rozet ve iki düğme, canlı kart, fotoğraflardan bir duvar örgüsü, yuvarlak kartlar ve yorumlar.

Her birinin ana sayfası önce gelir, sonra türünüzün kendi sayfaları, bir hakkında sayfası ve iletişim; her sayfada premium bir üst bilgi, gündüz tasarımın renkleriyle ve onun için tasarlanmış bir geceyle. Tüm projeye uygulandığında yüzen çubuğunu (Altın saat ve Çiçek'te kapsül, Gün batımından sonra ve Editoryal'de küçük dok, Bahçe ve Berrak su'da cam), ikinci rengini, yazı tipini ve uygulamanın kendi ekranlarının görünümünü de ayarlar. Fotoğrafları proje türünüz için ücretsiz fotoğraflardır. Hiçbir şey uydurulmaz: sayı, fiyat ya da puan yoktur; yorumları ve vaatleri [köşeli parantez] içinde siz yazarsınız, canlı kartlar yalnızca kişinin kendi siparişini, yolculuğunu, paketini, kursunu ya da çocuğunu gösterir. Bu tasarımlardan birini daha önce uygulamış bir proje kaydettiğini korur; yeniden uygulamak yenisini verir.

**Tüm projenin tasarımını değiştir**'i seçin ya da **Yalnızca açık sayfa için** kullanın; isterseniz **Değiştirdiğim metinleri ve resimleri koru**'yu da seçin. **Bu projeyi tasarım olarak kaydet** onu **Benim** altında saklar. Uygulamada yayınlanan, siz **Yayınla**'yı seçene kadar değişmez; **Geri al** eski tasarımı geri getirir.

## Uygulamanızdaki sözcükler

Bir şablonun, hazır bölümün, tüm tasarımın ya da görünümün uygulamanıza koyduğu sözcükler (başlıkları, düğmeleri, bölüm başlıkları, sekmeleri ve giriş satırları) uygulamanızın kendi sözcükleridir; İngilizce, Arapça ve Türkçe: panelinizin dilinde yazılır, diğerleri çevirileridir. Arapçada, uygulamanızın geri kalanı gibi Modern Standart Arapçadırlar; Studio'nun düzenleyicisi ise panelinizin dilini konuşur.

## Studio'nun dokuz demosu

Her demo Studio'da yapılmış gerçek bir uygulamadır; İngilizce, Arapça ve Türkçe, açık ve koyu, gerçek fotoğraflarla; her biri kendi A görünümüdür. Biriyle başlamak size hepsini verir: sayfalarını, sekmelerini, çubuğunu, görünümünü, giriş ekranını, hesap menüsünü, kayıtlarını, premium üst bilgilerini ve uygulamanın kendi ekranlarının görünümünü.

- **Ufuq Academy**, premium bir akademi: tam ekran öğrencinin aldığı kurs, dersleri altın bölümler halinde, selamlama ve bir oynat düğmesiyle; sıradaki canlı dersinin yanında bu haftanın günleriyle serisi; onun için seçilen kurslar; Blog sekmesi ve yüzen lacivert bir çubukla.
- **Rawaq Academy**, çok öğretmenli bir akademi: "Gerçek öğretmenler. Gerçek beceriler." ile kütüphanenin fotoğrafı, canlı ders verenin işaretlendiği bir dizin halinde öğretmenler ve fotoğraf kartları halinde ayın popüler kursları; Ana sayfa, Eğitmenler, Kurslarım ve Hesap.
- **Sofra Eats**, birçok restorandan yemek teslimatı: bir vitrin kaydırıcıda bu akşamın yemekleri, altının üstünde kişinin yoldaki siparişi, fotoğraf kutuları halinde yakında açık restoranlar ve teslimat ücretiyle menülerden birkaç yemek.
- **Zad**, restoranları ve bir marketi olan çok satıcılı bir uygulama: en erken teslim süresi ve aramayla adres, kodlarıyla yeşil afişlerde bu haftanın kampanyaları, kemer biçiminde fotoğraflı reyonlar ve yakınınızdaki yerler; Ana sayfa, Mağazalar, Sepet, Siparişler ve Hesap.
- **Sahm Express**, bir teslimat şirketi: büyük yazılmış "Şehrin her yerine, bugün.", süreleri ve fiyatlarıyla hizmetleriyle bir irsaliye olarak gönderme formu ve aşamaları bir çizgide adlandırılmış kişinin gönderisi.
- **Masar Rides**, yolculuk: üzerinde kişinin yolculuğu çizilmiş şehrin canlı haritası, yoldaki sürücü, ücretleriyle araç sınıfları ve "Nereye?".
- **Lamha Taxi**, canlı bir taksi uygulaması: iki renkli bir haritada kişinin çevresindeki boş taksiler, en yakınının dakikası, nereye, sınıflar ve havalimanının sabit fiyatı.
- **Nakhla School**, bir okul: aralarında geçilen çocuklar ve ailenin selamlamasıyla okul kapısının fotoğrafı, kayan okul haberleri, seçilen çocuk için bugün okulda ve imzalanacak formlar.
- **Safra**, bir seyahat şirketi: Keşfet, Seyahatler, Uçuşlar ve Kaydedilenler ile tatil köyünün fotoğrafı, biniş kartı olarak kişinin sıradaki seyahati, gecelik fiyatlarıyla şirketin otelleri ve uçuşları.

Her demonun önceki ana sayfası kendi proje türü için de bir şablondur; böylece her proje onun gibi bir sayfa başlatabilir.

## Her demo için iki görünüm

Her demonun iki Signature görünümü vardır. A görünümü demonun kendisidir; B görünümü kendi ana sayfası, sayfaları, sekmeleri, çubuğu, renkleri, yazı tipi, giriş ekranı ve hesap menüsüyle başka bir tam uygulamadır. İkisi de gerçek şablondur: hangisi olursa gerçek bir proje başlatır.

- **Sofra Eats**: **Editoryal menü** ve **Bento sofra** (altın bir halkada sipariş, fotoğraf bentosu olarak mutfaklar, eğik bir yemek şeridi ve koyu yüzen bir kapsül).
- **Zad**: **Pazar kemerleri** ve **Gece reyonu** (ince bir kapsülde sipariş ve kapıya kalan dakikalarla reyonun fotoğrafı, hikâye olarak reyonlar ve deste halinde yerler).
- **Sahm Express**: **İrsaliye** ve **Canlı rota** (canlı bir haritada çizilen gönderi, dakikaları ve aşamalarıyla bir pano, paket gönderme ve fotoğraf olarak hizmetler).
- **Masar Rides**: **Canlı harita** ve **Ufuk** (ufka doğru eğilen şehir, kişinin adıyla büyük "Nereye?", sürücünün dakikaları ve ücretler).
- **Lamha Taxi**: **İki renkli taksi** ve **Bir bakışta radar** (büyük yazılmış boş taksi sayısı, çevredeki taksilerin radarı, sınıflar ve bir dok).
- **Safra**: **Kapak hikâyesi** ve **Bento atlası** (aşamalarının üstünde sıradaki seyahatin günleri, bento olarak konaklamalar, tek fiyata konaklama ve uçuş ve kalkışlar).
- **Nakhla School**: **Sabah baskısı** ve **Aile kartları** (bir kart olarak seçilen çocuğun günü, okul servisi, imzalanacak formlar ve haberler).
- **Rawaq Academy**: **Öğretmen dizini** ve **Yayında** (tam ekran bir kaydırıcıda öğretmenler, halkalarda öğretmenler ve ızgarada popüler kurslar).
- **Ufuq Academy**: **Gece sineması** ve **Altın halka** (altın bir halkada kurs, bu haftanın günleriyle seri, canlı ders ve bir listede seçilen kurslar, bir dokla).

## Bir demoyla başlamak

1. [Uygulamanı seç](/start) sayfasını açın ya da Studio'da **Yeni proje**'yi seçin. Üstteki **Studio**, Uygulama düzenleyicisininkilerden ayrı olarak, altın renkli koyu kartlarla Studio'nun demolarını gösterir. Her kart önde döngüsünü oynatan A görünümünü, arkasında da **2 görünüm** ile B görünümünü gösterir.
2. Sayfasını görmek için birini seçin: üç ekranı, sayfaları, onunla gelenler (kursları, yemekleri, yerleri, araç türleri, sınıfları ya da otelleri), dilleri ve **Başlayabileceğiniz iki görünüm**: her görünümün adıyla ana sayfası. Önce **Görünüm A** seçilidir; **Bu görünümü seç** diğerini alır.
3. **Bu uygulamayla başla**'yı, ardından **Kendinizin yapın**'ı seçin: uygulamanızın adı, logonuz ve logodan alınan renginiz. Yanındaki telefon siz ilerledikçe uygulamanızı seçtiğiniz görünümde gösterir ("Görünüm: Görünüm B · Ufuk"). **Uygulamamı oluştur**'u seçin.

Projeniz Studio'nun düzenleyicisinde o görünümden yapılmış olarak açılır: sayfaları, sekmeleri, çubuğu, giriş ekranı, hesap menüsü, premium üst bilgileri ve uygulamanın kendi ekranlarının görünümü. **İlk adımlarınız** kalanları gösterir: kendi kayıtlarınızı ekleyin, ana sayfada kendi fotoğraflarınız ve mağazalar. **Değiştirmek için uygulamada herhangi bir şeye dokunun**. Demonun kayıtları listelerinizde demodan geldikleri belirtilerek görünür; sizinkiler girince **Demonun şeylerini kaldır** hepsini birden kaldırır.

## Bir demoyu canlı denemek

Bir demonun sayfasında ortadaki telefon gerçek demo uygulamasını çalıştırır: ana sayfasında bir misafir olarak, demo o dildeyse panelinizin dilinde, sayfa gibi açık ya da koyu. Bilgisayarda kendiliğinden başlar; telefonda **Canlı deneyin**'i seçin. **Canlı uygulamayı tam boyutta açın** onu kendi başına açar. **Telefonunuzda deneyin** size giriş için bir numara ve kodla demonun indirmesini verir.

Seçim sayfasındaki her kart, siz onu görürken demosunun A görünümünde kısa ve sessiz bir döngüsünü oynatır: ana sayfası, başka bir sekme ve geri. Hareketi azaltılmış telefonlar yalnızca resmi gösterir.
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

Studio'da seyahat şablonu ve üç tasarımı, Keşfet, Kaçamak ve Sakin yolculuklar; Paketler, Hakkımızda, İletişim ve Sorular sayfalarıyla gelir; oteller herhangi bir sayfada liste olabilir. [Studio demosu](/demo/studio) Safra, otelleri ve uçuşlarıyla bir seyahat uygulaması gösterir; bir seyahat projesi onun iki görünümünden biriyle başlayabilir: **Kapak hikâyesi** (biniş kartı olarak sıradaki seyahat) ya da **Bento atlası** (aşamalarının üstünde sıradaki seyahatin günleri). [Hazır bölümler, şablonlar ve Studio'nun demoları](/docs/studio-templates) sayfasına bakın.

## Otellerin ve uçuşların kendi sistemleri

Oteller ve uçuşlar panelinizde ayarlanır. Bir otelin kendi rezervasyon sistemini, bir otel tedarikçisini ya da canlı bir uçuş sağlayıcısını bağlamak **Yakında**: birine ihtiyacınız varsa bize yazın.
`,
  },
};
