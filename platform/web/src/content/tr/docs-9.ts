import type { DocTranslation } from "../translation-types";

/** 103R The documentation in Turkish, part 9: Yallapp Studio. */
export const TR_DOCS_9: Record<string, DocTranslation> = {
  "yallapp-studio": {
    title: "Yallapp Studio: uygulamanı özgürce tasarla",
    description: "Yallapp Studio nedir, projeleri normal uygulamalardan nasıl ayrılır, proje oluşturma ya da bir demoyla başlama, Studio düzenleyicisi, teslimat şirketleri, yolcu taşıma ve taksiler, çok öğretmenli akademiler, okullar ve üniversiteler, seyahat şirketleri ve Studio'nun kendi planları.",
    body: `Yallapp Studio, hesabında öğe öğe tasarladığın projeler için ayrı bir alandır: satırlar, sütunlar, katmanlar, resimler, düğmeler ve tasarladığın kartlarda listeler; açık ve karanlık mod renkleri ve hareketle. Tasarladığın şey Android ve iOS uygulamanda web sayfası olarak değil, yerel olarak çizilir. Studio, kuryeleriyle bir teslimat şirketinin uygulaması gibi yalnızca kendisinin sunduğu proje türlerini de yapar.

Panelinin menüsündeki **Yallapp Studio** ile aç. İlk sayfası **Studio'daki projeleriniz**, Studio projelerini normal uygulamalarından ayrı olarak listeler.

## Normal uygulamalar ve Studio projeleri

- **Sayfalar**: normal uygulamalar blokları ve hazır tasarımlarıyla sayfa düzenleyicisini kullanır. Studio projeleri, her öğenin her yere konabildiği Studio düzenleyicisini kullanır.
- **Uygulama türleri**: Studio, Yallapp'ın yaptığı her uygulama türünü ve teslimat şirketleri gibi yalnızca Studio'nun sunduğu proje türlerini yapar.
- **Planlar**: ayrıdırlar. Normal bir uygulama normal bir planla (Starter, Growth, Pro ya da Business), bir Studio projesi ise Studio'nun kendi planlarından biriyle ödenir.
- **Hesabında**: normal uygulamaların panelde kalır; Studio projelerin Studio'dadır, her birinin kendi paneliyle.

Derleme, kurulum adımları ve uygulama mağazalarında yayınlama ikisinde de aynı şekilde işler.

## Proje oluşturma

**Yeni proje**'yi seç. Üç adımdır:

1. **Proje türü**: projenin ne olduğu. Önce **Yalnızca Studio projeleri**, ardından her uygulama türü gelir.
2. **İçerik kaynağı**: içeriğin nereden geldiği, aynı türdeki normal bir uygulamada olduğu gibi. Teslimat şirketlerinin web sitesi yoktur: gönderileri, kuryeleri ve fiyatları projenin panelinden ayarlanır.
3. **Başlangıç**: proje türün için yapılmış bir şablon ya da boş bir sayfa ve projenin adı.

Projenin paneli, kendi türündeki normal bir uygulamayla aynı sayfalarla açılır. Bir plan seçmeden önce tasarlayıp deneyebilirsin. Yayınlamak için Studio planlarından biri gerekir.

Tüm sayfaları, fotoğrafları ve kayıtlarıyla Studio'nun demolarından biriyle de başlayabilir, her birini önce canlı deneyebilirsin: [Hazır bölümler, şablonlar ve Studio'nun demoları](/docs/studio-templates) sayfasına bak.

## Studio düzenleyicisi

**Düzenleyiciyi açın**'ı seç. Sayfa ortadaki telefonun içindedir; bir yanda **Öğeler**, **Hazır bölümler**, **Şablonlar** ve **Sayfa katmanları**, öbür yanda seçilen öğenin ayarları vardır.

- **Öğeler**: sayfayı düzenlemek için Satır, Sütun, Katmanlar, Izgara, Kaydırıcı ve Boşluk; Metin, Resim, Düğme, Simge ve Ayırıcı; ürünlerin, kursların, hizmetlerin ya da diğer kayıtların için, tasarladığın bir kartta Liste; Kategoriler, Video, Form, Harita, Puanlar ve Arama. Herhangi bir öğeyi sürükle ve istediğin yere bırak.
- **Boyut ve yer**: her öğe alanı doldurabilir (**Fill**), içeriğine göre olabilir (**İçeriğe göre**) ya da **Sabit** bir boyut alabilir; iç boşluk, dış boşluk ve aradaki boşlukla.
- **Renkler**: bir arka plan, bir geçiş ya da arkasında bir resim ve bir metin rengi; her birinin **Koyu modda** kendi rengiyle. Yazı tipleri, köşeler, gölgeler ve kenarlıklar da.
- **Hareket**: **Göründüğünde** (belirme, kayma ya da büyüme), **Dokunulurken** (küçülme ya da sekme) ve **Sürekli** (nabız, süzülme ya da sallanma) ne olacağı. Hareketi azaltmaya ayarlı telefonlar onu sabit gösterir.
- **Müşteri dokununca**: uygulamanın bir ekranını, bir sayfayı, bir web adresini ya da tek bir kaydı aç.
- **Göründüğü yer**: Android, iOS ya da ikisi; **Kim görür**: herkes, giriş yapanlar ya da giriş yapmayanlar.

Sayfayı küçük bir telefonda, büyük bir telefonda ve bir tablette, açık ve karanlık modda kontrol et. **Geri al** ve **Yinele** geri ve ileri gider, sayfa sen çalışırken kaydedilir. **Telefonda önizle** onu telefonunda denemeni sağlar; **Yayınla** onu uygulamana gönderir, uygulama bir sonraki açılışta gösterir. **Sayfayı kendi şablonum olarak kaydet** onu diğer sayfaların için **Şablonlarım**'da tutar.

Her öğe ve ayarları [Studio düzenleyicisi: tüm öğeler](/docs/studio-elements) sayfasında, Studio demolarının yapıldığı fotoğraf öncelikli öğeler de [Studio'nun premium öğeleri](/docs/studio-premium-elements) sayfasındadır.

## Teslimat şirketleri

Bir teslimat şirketinin projesi yalnızca Studio'da yapılır. Müşteriler alış ve teslim yeriyle bir paket gönderir, yazarken fiyatı görür, nakit ya da kendi ödeme hesabın üzerinden kartla öder ve paketi aşama aşama ya da canlı haritada takip eder. Kuryelerin, işleriyle birlikte adına yapılmış kendi uygulamalarında ya da Yallapp'ın kurye uygulaması Yallapp Courier'da çalışır: bunu **Teslimat ayarları**'nda, **Kuryeleriniz nerede çalışır** altında seçersin. Müşteri uygulaman kurye ekranlarını hiç göstermez. Yolculuk ve taksi şirketlerinin sürücüleri için de aynısı geçerli. Kuryelerin kendi uygulamasıyla **Derlemeler ve indirmeler** ve kurulum iki uygulamayı da gösterir; her birinin kendi derlemeleri, mağaza sayfası ve inceleyiciler için notları vardır. [Kuryeleriniz için Yallapp Courier](/docs/yallapp-courier) sayfasına bak.

Projenin panelinde fiyatlarını ve müşterilerin nasıl ödeyeceğini **Teslimat ayarları**'nda belirle, kuryelerini **Kuryeler**'e ekle ve her gönderiyi **Gönderiler**'de takip et.

## Yolcu taşıma ve taksiler

Yolcular gidecekleri yeri konumlarından, bir harita bağlantısından ya da haritadan, şimdi ya da daha sonrası için seçer, ücretiyle bir araç türü seçer ve araç ve bir kodla kendilerine gelen sürücüyü takip eder; yolculuğu paylaşabilir ve bir acil durum düğmesi kullanabilirler. Canlı taksi projesi çevredeki taksileri tam ekran haritada gösterir. Sürücüler adına yapılmış kendi uygulamalarında çevrimiçi olur, her seferinde bir teklif alır, her yolculuğun aşamalarını izler, nakdi tahsil eder ve kazançlarını görür. Panelde araç türlerini, ücretleri ve bölgeleri belirle, sürücüleri ve belgelerini onayla, yolculukları ve hesap dökümlerini takip et.

## Çok öğretmenli akademiler

Kursları birkaç öğretmenden gelen bir akademi. Öğretmenlerin uygulamada profilleri, kursları ve dersleri için kendi sekmeleri vardır; gönderdikleri bir kurs sen inceledikten sonra yayımlanır ya da notunla geri gönderilir. Öğrenciler öğretmenleri bulur, takip eder, puanlar ve öğretmenlik için başvurabilir. Her öğretmenin payını sen belirlersin ve istediğin dönem için hesap dökümlerini görürsün. Birkaç kurs birlikte bir paket olarak satılabilir.

## Okullar ve üniversiteler

Öğrenciler, veliler, öğretmenler ve personel için, her birinin kendi bölümünü gördüğü bir okul uygulaması: ders programı, ödevler, notlar, devam, sınavlar, takvim ve duyurular. Velilerin her çocukları için ücretlerle birlikte bir Veli sekmesi vardır. Öğrenciler, öğretmenler ve personel okulun ekranındaki bir kodla kapıda giriş yapar; öğretmenler ve personel izin ister; okul servis güzergâhlarını ve kütüphanesini uygulamada yönetir ve isterse öğretmenlerle aileler arasında mesajlaşmaya izin verir. Maaşlar nakit ya da banka havalesiyle ödendi olarak elle kaydedilir; her kişi için her ay bir bordro olur. Üniversite modundaki bir okul projesi fakülteleri, bölümleri, programları, her dönem ders kaydını ve not ortalamasıyla sonuçları ekler.

## Seyahat şirketleri

Bir seyahat şirketinin uygulaması otellerini, sabit koltuklu uçuşlarını ya da ikisini tek bir seyahat olarak satar. Otelleri odaları, fiyat seçenekleri ve fiyatlarıyla, uçuşları da paketleri ve koltuk haritalarıyla eklersin; yolcular rezervasyon yapar, kendi ödeme sayfanda ya da otelde öder ve seyahatlerini ve biniş kartlarını uygulamada tutar. [Seyahat: oteller ve uçuşlar](/docs/travel) sayfasına bak.

## Studio planları

Her Studio planında Studio düzenleyicisi, anlık bildirimler, kendi ödeme hesabın üzerinden kartla ödeme, çevrimdışı indirme, otomatik yeniden derleme, sohbet, sadakat puanları ve uygulama mağazaları üzerinden satılan kurslar ve üyelikler vardır. iOS uygulaması, senin için yayınlama, teslimat ve kuryeler, kuryeler için ikinci bir uygulama, seyahat, hareket, şablonlar ve bir projedeki Studio sayfası sayısı plan plan seçilir.

Studio planlarını [fiyatlar sayfasında](/pricing) ve [Yallapp Studio](/yallapp-studio)'da gör. **Talep üzerine** yazıyorsa WhatsApp'tan bize yaz, projene uyan planı önerelim.

> [Studio demosu](/demo/studio), uygulamanın kendisinin çizdiği gerçek Studio projelerinden ekranlar gösterir.
`,
  },
  // 104.8 Yallapp Courier.
  "yallapp-courier": {
    title: "Kuryeleriniz için Yallapp Courier",
    description: "Bir teslimat şirketinin kuryeleri Yallapp Courier'da nasıl çalışır: onu seçmek, kuryelerinizi eklemek ve bir kuryenin giriş yapıp teslimat yapmak için yaptıkları.",
    body: `Yallapp Courier, Yallapp'ın kuryeler için kendi uygulamasıdır; [Yallapp Studio](/docs/yallapp-studio)'da yapılmış ve onu seçen her teslimat şirketi içindir. Kuryeleriniz ona bir kez giriş yapar, şirketinizi seçer ve adınız ve logonuzla sizin işleriniz üzerinde çalışır. Onlar için hiçbir şey derlemez ve yayımlamazsınız. Google Play'e ve App Store'a geliyor.

## Yallapp Courier'ı seçmek

Teslimat projenizin panelinde **Teslimat ayarları**'nı açın ve **Kuryeleriniz nerede çalışır** altında **Yallapp Courier'da** seçeneğini seçin. Diğer seçenek, müşteri uygulamanızın yanında derlenip yayımlanan, adınızla kuryelerinizin kendi uygulamasıdır.

## Kuryelerinizi eklemek

**Kuryeler**'de her kuryeyi adı, giriş yapacağı cep numarası ya da e-postası ve aracıyla ekleyin. **Kuryeler**, her birinin Yallapp Courier'a en son ne zaman giriş yaptığını gösterir. Orada duraklattığınız ya da sildiğiniz kuryenin şirketinizdeki oturumu hemen kapanır.

## Bir kuryenin yaptıkları

1. Yallapp Courier'ı indirir.
2. Eklediğiniz cep numarası ya da e-posta ve gelen kodla giriş yapar.
3. Şirketinizi seçer.

Görevde olur ya da görev dışı kalır, bekleyen işleri ve kendi işlerini görür ve her işin adımlarını izler: teslim alındı, yolda, teslim edildi ya da nedeniyle teslim edilemedi. Her iş tahsil edilecek nakdi gösterir; göndereni ya da alıcıyı arayabilir ve harita uygulamasında yol tarifi alabilir. Paket yoldayken ve iş ekranında açıkken müşteri paketin nerede olduğunu görür. Yeni işler bildirim olarak gelir.

Yallapp Courier'da birkaç şirkete teslimat yapan biri bir kez giriş yapar ve **Hesap**'tan şirketler arasında geçiş yapar. Çıkış yapmak o telefondaki tüm şirketlerin oturumlarını kapatır.

## Bir kuryenin hesabını silmek

Kurye, Yallapp Courier hesabını uygulamada **Hesap**'tan siler. Kurye listeniz ve gönderilerinizin kayıtları olduğu gibi kalır. [Yallapp hesabınızı silme](/delete-account) sayfasına bakın.
`,
  },
  "multi-vendor": {
    title: "Çok satıcılı uygulamalar",
    description: "Birçok restoran, süpermarket ve dükkân için tek bir teslimat uygulaması kurun: katılım, her işletmenin paneli, teslimat, ödemeler, kampanyalar, şikâyetler ve dökümler.",
    body: `Çok satıcılı bir uygulama, birçok restoranı, süpermarketi ve dükkânı sizin adınızla tek bir teslimat uygulamasında toplar. Müşteriler her işletmeden sipariş verir, her işletme siparişlerini kendi panelinde alır ve bunları sizin kuryeleriniz ya da işletmenin kendi kuryeleri teslim eder. Bu bir [Yallapp Studio](/docs/yallapp-studio) projesidir ve Studio'nun kendi planlarındadır.

## Projeyi oluşturma

1. Yallapp Studio'da bir proje oluşturun ve çok satıcılı türü seçin. Bir yemek teslimatı projesi de ayarlarından bu türe geçebilir; restoranlarını ve siparişlerini korur.
2. Ana sayfa için hazır tasarımlardan birini seçin, sonra bölümlerini, renklerini ve metinlerini Studio düzenleyicisinde dilediğiniz gibi değiştirin.
3. Projenin ayarlarını açın ve müşterilerin nasıl ödeyeceğini ve sunduğunuz teslimat seçeneklerini belirleyin: gel-al, ileri tarihli siparişler, cüzdan ve kulüp.

## Ödemeler

Müşteriler kuryeye nakit, ödeme sağlayıcınızın sayfasında kartla ya da sağlayıcınız orada sunuyorsa Apple Pay veya Google Pay ile öder. Para sizin ödeme hesabınıza gider; Yallapp asla almaz. Her işletmeyle nasıl hesaplaşacağınız sizinle işletme arasındadır ve dökümler her birinin payını hesaplar.

## İşletme ekleme

- **Katılım formunuzla**: logo dahil istediğiniz alanlarla bir form oluşturun ve bağlantısını gönderin. Her işletme formu doldurur, siz de onaylar ya da reddedersiniz. Onay, işletmeyi ekler.
- **Kendiniz**: işletmeyi bilgileri, saatleri, teslimatı ve personeliyle ekleyin.

Her işletme için yüzde ya da sabit tutar olarak komisyonunu ve vergi oranını belirlersiniz.

## Her işletmenin paneli

İşletmenin personeli web'deki panele e-postalarına gelen bir kodla girer. Orada:

- sesli bildirimle gelen yeni siparişleri alır: süre belirterek kabul eder ya da reddeder, hazırlar ve hazır olarak işaretler;
- işletmeyi bir süreliğine yoğun yapar ya da siparişleri durdurur;
- menüyü ya da kataloğu ve stoku güncel tutar, her ürünün fotoğrafını ekler;
- kataloğu Excel, CSV, TSV, JSON ya da Google Sheets dışa aktarımından, dosya başına 5 MB'a kadar aktarır;
- süpermarket siparişlerini satır satır hazırlar: ağırlığıyla hazırlandı, müşterinin izin verdiği başka bir ürünle değiştirildi ya da yok;
- izin verirseniz, işletmenin karşıladığı kendi kuponlarını ekler;
- dökümlerini ve sizin paylaştığınız şikâyetleri görür.

Her personelin bir rolü vardır: sahip ve yöneticiler her şeyi görür, sipariş alanlar ve hazırlayanlar yalnızca ihtiyaç duyduklarını görür. İşletmeler müşterilerin telefon numaralarını ya da e-postalarını asla görmez.

## Teslimat

Her işletme kimin teslim edeceğini seçer:

- **Sizin kuryeleriniz**: teslimatın maliyetini sabit, yüzde ya da kilometre başına belirlersiniz; müşteri kuryeyi haritada izler.
- **Kendi teslimatı**: işletme kendi ücretini sabit ya da kilometre başına, en düşük sipariş tutarını ve bir siparişteki en az ve en çok ürün sayısını belirler. Müşteri siparişi adımlarıyla izler.

Müşteriler siparişlerini kendileri de alabilir ya da daha sonrası için sipariş verebilir.

## Kampanyalar, cüzdan ve kulüp

- **Kuponlar ve otomatik kampanyalar**: yüzde, tutar ya da ücretsiz teslimat; en düşük sipariş tutarı, kullanım sınırları, tarihler ve geçerli olduğu işletmeler ya da ürünlerle. Her biri indirimi kimin karşılayacağını belirtir: siz ya da işletme.
- **Cüzdan**: müşterilerin sonraki siparişlerinde harcadığı bakiye, örneğin bir iadeden.
- **Teslimat kulübü**: sizin belirlediğiniz fiyatlarla ücretsiz ya da daha ucuz teslimatlı, ödeme sayfanızda ödenen planlar.

## Şikâyetler ve destek

Müşteriler uygulamada sizin desteğinizle konuşur. Siparişi verdikleri andan ulaştıktan 48 saat sonrasına kadar, nedeni, ürünleri ve fotoğraflarıyla şikâyette bulunabilirler. Ekibiniz her şikâyeti şikâyet sırasında üstlenir ve karar verir: karta, cüzdana ya da kupon olarak tam ya da kısmi iade, tazminat ya da reddeden bir yanıt. Müşteri kararı ve nedenini görür.

## Dökümler

Her işletme ve her dönem için: indirimlerden önce ve sonra satışlar, her indirimi kimin karşıladığı, işletmenin komisyonu ve vergisi, teslimat, iadeler ve tazminatlar ve her iki tarafın alacağı. Excel, CSV ya da PDF olarak dışa aktarın.

## Ürün fotoğrafları

Varsayılan olarak fotoğrafı olmayan ürün müşterilere gösterilmez. İşletmeler fotoğrafları tek tek, her ürünün SKU'su ya da barkoduyla adlandırılmış resimlerden oluşan bir ZIP olarak ya da aktarım dosyasında resim bağlantıları olarak ekler. Bunu projenin ayarlarından kapatabilirsiniz.
`,
  },
};
