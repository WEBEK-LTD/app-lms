import type { DocTranslation } from "../translation-types";

/** 55 The documentation in Turkish, part 6: courses, listings, news, events, donations, the account and troubleshooting. */
export const TR_DOCS_6: Record<string, DocTranslation> = {
  courses: {
    title: "Web sitesi olmadan kurslar",
    description: "Web siteniz olmadan bir Akademi uygulaması çalıştırın: kurslar, bölümler, dersler, ücretsiz ve ücretli kurslar ve öğrenciler.",
    body: `Web sitesi olmayan akademi uygulamaları kurslarını panelin **Kurslar** sayfasından alır. Değişiklikler uygulamada hemen görünür.

## Kurslar

**Kurs ekle**'yi seçin ve kursa bir başlık, açıklama, kapak görseli (PNG veya JPEG, en fazla 2 MB, ideal olarak 1280 × 720), fiyat (ücretsiz kurs için boş), eğitmen, seviye ve kategoriler verin. Üzerinde çalışırken **Öğrenciler görebilir**'i kapalı tutun.

## Bölümler ve dersler

Bölüm ve bölümlerin içine ders eklemek için bir kursu açın. Bir dersin **video adresi** ([Medya kitaplığınızdan](/docs/media) bir video, YouTube, Vimeo ya da bir video dosyasının https adresi), videonun altında veya dersin tamamı olarak gösterilen bir **metni** ve dakika cinsinden süresi vardır. Herkesin kayıt olmadan önce bir dersi açabilmesi için **Herkese ücretsiz önizleme**'yi açın.

## Ücretsiz ve ücretli kurslar

- **Ücretsiz kurslar**: öğrenciler Android'de ve iOS'ta uygulamadan kaydolur.
- **Ücretli kurslar**: Android'de kartla ödeme sayfası üzerinden satın alınır ([Kartla ödemeler](/docs/card-payments) sayfasına bakın). Apple'ın kuralları gereği iPhone uygulaması satın alma düğmesi göstermez; başka bir yerden satın alan öğrenciler iPhone'da da öğrenir.

Ödenen siparişler **Siparişler** sayfasında görünür.

## Öğrenciyi kendiniz ekleme

Bir kursu başka bir yolla mı sattınız? Kursu açın ve öğrencinin giriş yaptığı numarayla **Telefonla öğrenci ekle**'yi kullanın. Öğrencinin uygulamaya en az bir kez giriş yapmış olması gerekir.

## İlerleme

Öğrencilerin ilerlemesi dersleri tamamladıkça kaydedilir ve herhangi bir cihazda kaldıkları yerden devam ederler.

## Derslerle gelen dosyalar ve sonra açılan dersler

**Dosyalar** alanına bir dersle gelen en fazla 10 dosyayı, her satıra bir tane olacak şekilde \`Ad | adres\` biçiminde ekleyin: [Medya kitaplığınızdaki](/docs/media) bir dosyanın bağlantısı (çalışma kâğıtları, slaytlar, PDF'ler) ya da bir https adresi. Öğrenciler bunları dersten açar.

Bir dersin öğrenci kaydolduktan birkaç gün sonra açılması için **Açılma (gün sonra)** alanını doldurun: 7 yazarsanız bir hafta sonra açılır. O zamana kadar uygulama dersi, açılacağı günle birlikte kilitli gösterir.

## Sınavlar

Bir bölümün derslerinden sonra sınav eklemek için bölümü açın. Sınava bir başlık, bir **geçme notu** (varsayılan %70), **deneme hakkı** (sınırsız için boş) ve dakika cinsinden bir **süre** (sınırsız için boş) verin. Sorularını metin olarak yazın:

\`\`\`
Q: Which planet is the largest?
- Mars
* Jupiter

Q: Pick the vowels
* a
- b
* e
\`\`\`

Her soruya \`Q:\` ile başlayın ve her cevabı ayrı bir satıra yazın: doğru cevabın önüne \`*\`, yanlışın önüne \`-\` koyun. Birden fazla doğru cevabı olan bir soru, öğrencilerden uyanların hepsini seçmelerini ister; yalnızca True ve False cevapları olan soru doğru/yanlış sorusudur. Bir soru, tam olarak doğru cevapları seçildiğinde sayılır. Öğrenciler cevaplarını gönderir göndermez puanlarını görür; doğru cevaplar uygulamaya hiç ulaşmaz.

## Sertifikalar

Kursun ayrıntılarında **Kursu bitiren öğrencilere sertifika ver**'i açın. Tüm dersleri tamamlayıp tüm sınavları geçen öğrenciler, uygulamada adlarının, kursun, tarihin ve uygulamanızın logosu ile renginin yer aldığı, yazdırmaya veya PDF olarak kaydetmeye hazır bir sertifika alır. Her sertifikanın kendi kodu vardır; bağlantıya sahip olan herkes sertifikanın gerçek olduğunu görebilir. Sertifikada yalnızca öğrencinin adı görünür.

## Süresi dolan erişim

Belirli bir süre için satılan kurslarda, kursun her öğrenci için kaydından bu kadar gün sonra kapanması için **Erişim süresi (gün)** alanını doldurun. Uygulama, öğrencilere erişimlerinin ne zaman biteceğini gösterir. Süresiz erişim için boş bırakın.

## Öğrencilerin ilerlemesi

Bir kursun sayfasında, **Öğrenciler** altında **İlerleme ve sınav sonuçları**'nı seçin. Her öğrencinin ilerlemesini, tamamladığı dersleri, her sınavdaki en iyi puanını, en son ne zaman çalıştığını, ne zaman bitirdiğini ve erişiminin ne zaman sona ereceğini görürsünüz. Altında her sınav, kaç öğrencinin girdiğini, kaçının geçtiğini ve ortalama en iyi puanlarını gösterir. Aynı listeyi her sınav için bir sütunla elektronik tablo olarak almak için **CSV indir**'i seçin.

> İstek listesi, Yallapp'te yönetilen kurslarda değil, bir WordPress LMS ile kullanılabilir.
`,
  },
  "real-estate": {
    title: "İlanlar ve talepler",
    description: "Bir Emlak uygulaması çalıştırın: mülk ekleyin, ofisinizi ayarlayın ve mesajları yanıtlayın.",
    body: `Emlak uygulamaları, panelin **İlanlar** sayfasında eklediğiniz mülkleri gösterir. İnsanlar bunları uygulamada arar, favorilerine ekler ve ofisinize mesaj gönderir.

## Ofisiniz

**Ofis adınızı**, **telefonunuzu**, **WhatsApp**'ınızı ve **ofis e-postanızı**, **varsayılan para biriminizi** ve **alan biriminizi** ve **insanların uygulamada ofise mesaj gönderip gönderemeyeceğini** belirleyin. Mesajlar kapalıyken uygulama yalnızca telefonunuzu ve WhatsApp'ınızı gösterir.

## İlanlar

**Yeni ilan**'ı seçin ve şunları doldurun:

- **Temel bilgiler**: bir başlık, **amaç** (aylık veya yıllık kirayla satılık ya da kiralık), **mülk tipi**, bir açıklama ve kendi referansınız
- **Fiyat** ve **pazarlığa açık** olup olmadığı
- **Konum**: şehir, semt, adres ve harita için enlem ve boylam
- **Ayrıntılar**: alan, yatak odası, banyo, kat, eşyalı olup olmadığı, yapım yılı ve özellikler
- Seçtiğiniz sırayla **fotoğraflar** ve isteğe bağlı bir video (YouTube veya Vimeo bağlantısı ya da MP4 dosyası)

Çalışırken **taslak** olarak kaydedin, uygulamada göstermek için **yayınlayın**, ilk sırada göstermek için **öne çıkan** olarak işaretleyin ve satıldığında veya kiralandığında **arşivleyin**. Uygulamada yalnızca yayınlanmış ilanlar görünür.

## Uygulamada arama

İnsanlar amaca, tipe, fiyata, oda sayısına, alana ve yere göre filtreler, sonuçları sıralar ve bir ilanı fotoğrafları, özellikleri, haritası ve benzer ilanlarıyla açar.

## Talepler

Biri size bir ilan hakkında mesaj gönderdiğinde mesaj **Talepler** sayfasında görünür ve bir e-posta alırsınız. Yanıtınız, uygulamasındaki bildirim kutusuna düşer ve telefonuna anlık bildirim olarak gider.
`,
  },
  news: {
    title: "Haber siteleri ve bloglar için uygulamalar",
    description: "WordPress yazılarınızdan, sitenizin RSS akışından ya da panelde yazdığınız makalelerden bir Haber ve blog uygulaması çalıştırın ve son dakika haberleri gönderin.",
    body: `Haber ve blog uygulamaları makalelerinizi gösterir: ana ekranda manşetler, en yeniler ve her bölüm için bir sıra; her makale kendi ekranında; arama ve okurların makaleleri telefonlarında daha sonra okumak için sakladığı bir **Kaydedilenler** sekmesi. Okurlar her makaleyi paylaşabilir. Okumak herkes için ücretsizdir: uygulamada ücretli içerik yoktur.

## WordPress sitenizden

Yallapp eklentisini kurun ([WordPress eklentisini kurun](/docs/wordpress-plugin) sayfasına bakın). Uygulama, **yayınlanmış yazılarınızı** öne çıkan görselleri, kategorileri ve yazarlarıyla gösterir. Özel ve şifre korumalı yazılar asla görünmez. Sabit yazılar manşetlerdir. Makaleler sitenizdeki gibi görünür: görseller, YouTube ve Vimeo videoları ve gömülü içerikler telefona göre boyutlandırılır.

Okurlara yeni yazılardan haber vermek için eklentinin ayarlarında (**Yallapp › Settings › Notifications**) **Notify app users about new posts**'u açın. Böylece her yeni yazı, yazının **In the app** kutusunda **Don't notify app users about this post**'u işaretlemediğiniz sürece uygulamaya giriş yapmış kişilere anlık bildirim olarak gönderilir. Anlık bildirimler için Firebase projeniz gerekir ([Firebase ile anlık bildirimler](/docs/push-notifications) sayfasına bakın).

## Sitenizin RSS akışından

RSS veya Atom akışı olan her web sitesi çalışır: WordPress (/feed adresinde), Ghost, Blogger, Substack, Medium ve çoğu haber sistemi. Web sitesi adımında **Sitemin RSS akışı**'nı seçin ve akışınızın adresini yapıştırın; kaydetmeden önce kontrol etmek için akışı okuruz. Yeni makaleler, akışınızda göründükten birkaç dakika sonra uygulamada görünür. Akış https üzerinde olmalı ve adresi son adres olmalıdır (yönlendirmeleri izlemeyiz).

Akışlar bir makalenin ne zaman yeni olduğunu bize söyleyemez, bu yüzden son dakika haberleri otomatik olarak gönderilmez. Gerektiğinde **Uygulama bildirimleri**'nden kendiniz bir uyarı gönderin.

## Yallapp'te yazılan makaleler

Web sitesi adımında **Web sitem yok**'u seçin, ardından **Makaleler** sayfasında yazın:

- bir **başlık**, isteğe bağlı bir **özet** (boş bırakırsanız makaleden oluşturulur) ve uygulamada gösterilen **yazar**
- **makalenin** kendisi: paragraflar, başlıklar, listeler, alıntılar, bağlantılar ve https adreslerinden görseller; YouTube ve Vimeo videoları oynatıcı olarak görünür
- bir **görsel** (PNG veya JPEG, en fazla 5 MB) ve makalenin **bölümleri**

Çalışırken **taslak** kaydedin, uygulamada göstermek için **yayınlayın** ve yeniden kaldırmak için **yayından kaldırın**. Önemli olanları **manşet** olarak işaretleyin. Yayınlarken makaleyi okurlarınızın telefonlarına anlık bildirim olarak göndermek için **Son dakika olarak gönder**'i işaretleyin; bildirim kutularına da düşer ve makaleyi açar.

Aynı sayfada **bölümlerinizi** ve makalelerin **yazarı** ve **tarihi** gösterip göstermeyeceğini belirlersiniz.

## Sayfalarınız

Ana sayfa bir arama kutusu, manşetler, bölümler ve en yeni makalelerle başlar. Bunu **Sayfalar ve görünüm**'de değiştirin: liste blokları en yeni makaleleri, bir bölümün makalelerini, manşetleri ya da seçtiğiniz makaleleri gösterebilir.
`,
  },
  events: {
    title: "Etkinlikler ve biletler",
    description: "Bir Etkinlik ve bilet uygulaması çalıştırın: etkinlik yayınlayın, ücretsiz bilet verin veya ücretli bilet satın ve kapıda QR kodlarını kontrol edin.",
    body: `Etkinlik ve bilet uygulamaları programınızı gösterir: yaklaşan etkinlikler bir listede ve takvimde, kategoriye göre filtreler, her etkinlik görselleri, tarihi ve saati, mekânı veya çevrimiçi bağlantısı ve biletleriyle. İnsanlar ücretsiz biletleri tek dokunuşla alır ya da ücretli biletleri satın alır ve her bileti QR koduyla birlikte, bağlantı olmadan da **Biletlerim** altında saklar.

**Uygulama türü**'nde **Etkinlik ve bilet**'i, ardından Web sitesi adımında **Yallapp'te yönetilen etkinlikler**'i seçin. Etkinlikleriniz burada, panelde yönetilir.

## Etkinlikleriniz

**Etkinlikler** sayfasında bir etkinlik ekleyin:

- bir **başlık**, bir **kategori** (Konserler, Film veya Atölyeler gibi) ve bir **açıklama**: paragraflar, başlıklar, listeler, bağlantılar ve https adreslerinden görseller; YouTube ve Vimeo videoları oynatıcı olarak görünür
- en fazla altı **görsel**, ilki kapaktır
- saat diliminize göre ne zaman **başladığı** ve **bittiği**
- **mekân** (adı, adresi ve harita bağlantısı için enlem ve boylamı) ve/veya bir **çevrimiçi bağlantı**. Çevrimiçi bağlantı yalnızca bilet sahiplerine gösterilir
- uygulamada gösterilen **düzenleyici** ve salonun bir sınırı varsa toplam **yer** sayısı

Çalışırken **taslak** olarak kaydedin ve uygulamada göstermek için **yayınlayın**. Ardından **bilet türlerini** ekleyin: bir ad, bir fiyat (ücretsiz biletler için 0), kaç adet olduğu, satışın ne zaman bittiği ve bir kişinin bir seferde kaç bilet alabileceği. Satış her zaman etkinlik başladığında biter.

## Ücretsiz ve ücretli biletler

Ücretsiz biletler uygulamada alınır. Ücretli biletler güvenli bir ödeme sayfasında kartla ödenir: Etkinlikler sayfasında kendi iyzico, Kashier veya Fawaterk hesabınızla **Kartla ödemeler**'i ayarlayın. Alıcı öderken yerler ayrılır ve biletler ancak sağlayıcı ödemeyi onayladığında düzenlenir. Yerler alındıkça sayılır, bu yüzden son bilet iki kez satılamaz.

**iPhone'larda** Apple, uygulamaların bir mekânda gerçekleşen etkinliklerin biletlerini satmasına izin verir, ancak dijital içerik sayılan yalnızca çevrimiçi etkinliklerin biletlerini satmasına izin vermez. Bu yüzden iPhone uygulamasında mekânı olmayan bir etkinliğin ücretli biletlerinde satın alma düğmesi görünmez; ücretsiz biletler her yerde çalışır. Android'de her şey uygulamada satın alınabilir.

Aynı sayfadaki **Etkinlik ayarları**'nda para biriminizi ve saat diliminizi, etkinliklerin **Haritada aç**'ı gösterip göstermeyeceğini ve insanların uygulamada **ücretsiz biletleri** etkinlikten kaç saat öncesine kadar **iptal edebileceğini** (yerleri yeniden satışa çıkar) seçersiniz. Ücretli biletleri, **Siparişler** sayfasındaki siparişin altındaki **İade** ile siz iade edersiniz: bilet iptal edilir ve yeri yeniden satışa çıkar.

## Satışlar ve katılımcılar

Her etkinliğin sayfası biletlerini listeler: kimde olduğu, türü, kodu ve kullanılıp kullanılmadığı. **Katılımcı listesini indir**, aynı bilgileri bir hesap tablosu için CSV dosyası olarak verir.

Bir etkinliğin saatini, mekânını veya çevrimiçi bağlantısını değiştirirseniz ya da etkinliği **iptal ederseniz**, bilet sahibi herkes bir bildirim alır. Bir etkinliği iptal etmek biletlerini de iptal eder.

## Kapıda giriş kontrolü

Kapıdaki bir telefonda **Giriş kontrolü**'nü açın. **Kamerayla tara**'ya dokunun ve kamerayı biletin QR koduna tutun (bu, Android'deki Chrome gibi QR kod okuyabilen tarayıcılarda çalışır); bunun yerine her zaman biletin kodunu yazabilirsiniz. Geçerli bir bilet kullanıldı olarak işaretlenir ve sahibinin adını gösterir. Her bilet bir kez girer: yeniden taramak, saatiyle birlikte **Zaten kullanıldı** gösterir. QR kodlar uygulamanız için imzalıdır, bu yüzden uydurma bir QR kod reddedilir.

## Sayfalarınız

Ana sayfa bir arama kutusu ve yaklaşan etkinliklerle başlar. Bunu **Sayfalar ve görünüm**'de değiştirin: liste blokları sıradaki etkinliklerinizi ya da seçtiğiniz etkinlikleri gösterebilir.
`,
  },
  donations: {
    title: "Hayır kurumu ve bağış uygulamaları",
    description: "Bir Hayır kurumu ve bağış uygulaması çalıştırın: hedefli kampanyalar, kendi iyzico, Kashier veya Fawaterk hesabınıza gelen bağışlar, makbuzlar, bağışçılar ve iPhone bağışlarının neden tarayıcıda açıldığı.",
    body: `Hayır kurumu ve bağış uygulamaları kampanyalarınızı gösterir: ne için para topladığınızı, hikâyesini ve görsellerini ve hedefine ne kadar yaklaştığını. Destekçiler bir tutar seçer, isimsiz bağış yapabilir ve mesaj bırakabilir, güvenli bağış sayfanızda bağış yapar. Her bağışçı bir makbuz alır ve bağışlarını uygulamada **Bağışlarım** altında bulur.

## İlk bağıştan önce

1. **Uygulama türü**'nde **Hayır kurumu ve bağış**'ı, ardından Web sitesi adımında **Yallapp'te yönetilen kampanyalar**'ı seçin.
2. **Kampanyalar** sayfasında, **Kartla ödemeler** altında sağlayıcınızı (iyzico, Kashier veya Fawaterk) seçin ve anahtarlarınızı yapıştırın ([Kartla ödemeler](/docs/card-payments) sayfasına bakın). Bağışlar doğrudan kendi üye işyeri hesabınıza geçer. Anahtarlarınız kaydedilene kadar kampanyalar uygulamada görünür ama kimse bağış yapamaz.
3. **Uygulamada bağışlar** altında para biriminizi seçin. İlk bağıştan sonra değiştirilemez.

## Kampanyalar

**Kampanya ekle**'yi seçin ve şunları yazın:

- bir **başlık**, **hikâye** (paragraflar, başlıklar, listeler, bağlantılar, görseller ve YouTube veya Vimeo videoları) ve kartı için isteğe bağlı bir **özet**
- bir **hedef** (ya da hiç: uygulama bu durumda çubuk olmadan toplananı gösterir)
- uygulamanın düğme olarak gösterdiği **önerilen tutarlar**, **en küçük bağış** ve insanların kendi tutarlarını yazıp yazamayacağı
- isteğe bağlı bir **bitiş tarihi**; bu tarihten sonra kampanya bağış kabul etmez
- en fazla 5 **görsel**; ilki kapaktır

**Taslak** kaydedin, hazır olduğunda **yayınlayın**, bittiğinde **kapatın** (uygulamada sona ermiş olarak kalır) ve en önemlilerini **öne çıkarın**: öne çıkan kampanyalar ilk sırada gelir. Bağış almış bir kampanya silinemez; böylece bağışçıları makbuzlarını korur.

Toplanan tutar ve bağışçı sayısı **yalnızca onaylanmış ödemeleri** sayar: bir bağış, biri bağış sayfasını açtığında değil, ödeme sağlayıcısı onu onayladığında eklenir.

## iPhone bağışları neden tarayıcıda açılıyor

Apple'ın App Store kuralları (yönerge 3.2.2), bir iPhone uygulamasının bağışları kendisinin toplamasına yalnızca hayır kurumu Apple tarafından kâr amacı gütmeyen kuruluş olarak onaylandığında ve parayı Apple Pay ile aldığında izin verir. Diğer tüm hayır kurumları için bağışlar uygulamanın dışında yapılmalıdır.

Bu yüzden iPhone'da bağış düğmesinde **Web sitemizden bağış yapın** yazar ve bağış sayfanızı Safari'de açar. Bağışçı orada öder ve uygulamaya geri döner; bağış yine **Bağışlarım** altında görünür. iPhone'da hiç bağış düğmesi göstermemeyi tercih ederseniz **Uygulamada bağışlar** altında **iPhone uygulamasında bağış yok**'u seçin.

Android'de bağış sayfası uygulamanın içinde açılır. Google Play'in faturalandırma kuralları hayır kurumlarına yapılan bağışları kapsamaz, bu yüzden bugün buna izin verilir; Google'ın politikası değişebilir ve biz onu izleriz.

## Makbuzlar

Bir bağış onaylandığında bağışçı, uygulamanızın adıyla tutarı, tarihi, kampanyayı ve D-1042 gibi bir referansı içeren bir e-posta ve makbuz sayfasının bağlantısını alır. Makbuz neyin kime verildiğini söyler. Vergi hakkında hiçbir iddiada bulunmaz: size yapılan bağışlar vergiden düşülebiliyorsa bunu bağışçılarınıza kampanya hikâyenizde veya kendi mektuplarınızda söyleyin.

## Bağışlar ve bağışçılar

**Bağışlar** sayfası, ödenmiş her bağışı en yeniden başlayarak kampanyaya göre listeler. **CSV dışa aktar**, bunları bağışçının adı, e-postası, telefonu ve mesajıyla birlikte bir hesap tablosu olarak indirir. İsimsiz bağış yapmayı seçen bağışçılar da listelenir: adlarını yalnızca uygulama gizler. **Bağışçılar** sayfası bağışları e-posta adresine göre gruplar, en cömert olan ilk sırada. Bir bağışı tamamen ya da kısmen altındaki **İade** ile iade edin: bağışçı bir e-posta alır, makbuz ve uygulama bunu gösterir ve bağış artık kampanyanın toplamına sayılmaz ([Kartla ödemeler](/docs/card-payments) sayfasına bakın).

## Bağışçılara güncellemeler

Bir kampanyanın sayfasında **Bağışçılara güncelleme gönder**, uygulamaya giriş yapmışken bu kampanyaya bağış yapan herkese kısa bir mesaj gönderir. Mesaj bildirim kutularına düşer ve kampanyayı açar; telefonlarına anlık bildirim olarak ise yalnızca uygulamanın ayarlarında **Kampanya güncellemeleri**'ni açtılarsa gider. Anlık bildirimler için Firebase projeniz gerekir ([Firebase ile anlık bildirimler](/docs/push-notifications) sayfasına bakın).

## Aylık bağışlar

Uygulama tek seferlik bağış alır. Aylık bağışlar için abonelikte kayıtlı bir kart gerekir ve bu henüz mevcut değildir; mevcut olduğunda uygulamaya ekleyeceğiz.
`,
  },
  "plans-and-billing": {
    title: "Planlar, faturalandırma ve kuponlar",
    description: "Starter, Growth, Pro ve Business planları, plan değiştirme, kartla ödeme, kuponlar, yenilemeler ve iadeler.",
    body: `Her uygulamanın kendi planı vardır. Her plan Android uygulamanızı, anlık bildirimleri, kendi markanızı ve dokümantasyonu içerir.

## Dört plan

- **Starter**: Google Play, Samsung Galaxy Store, Huawei AppGallery ve Xiaomi GetApps için Android uygulaması, bir içerik kaynağı, hazır sayfa şablonları, bir dil ve en fazla 1.000 uygulama kullanıcısı. Uygulamayı adım adım rehberlerimizle kendiniz yayınlarsınız.
- **Growth**: App Store için iOS uygulaması, tam sayfa düzenleyici, üç dil, uygulamada kartla ödemeler, çevrimdışı mod, otomatik yeniden derlemeler ve en fazla 10.000 uygulama kullanıcısı ekler.
- **Pro**: sınırsız uygulama kullanıcısı, tüm diller ve "Sizin için yayınlıyoruz" ekler: uygulamanızı ve her güncellemeyi Google Play, App Store, Samsung Galaxy Store, Huawei AppGallery ve Xiaomi GetApps'te öncelikli destekle biz yayınlarız.
- **Business**: Pro'daki her şey, size özel bir hesap yöneticisi ve istek üzerine özel özelliklerle.

Uygulama kullanıcısı sınırları, bizim barındırdığımız uygulamalara giriş yapan kişileri sayar. WordPress sitenizdeki uygulamalar kullanıcılarını sitenizde, sınırsız olarak tutar. Güncel fiyatlar ve tam karşılaştırma için [fiyatlandırma sayfasına](/pricing) bakın.

## Plan değiştirme

**Lisans ve eklenti**'de (WordPress sitesi olmayan uygulamalarda adı **Paket**'tir) mevcut uygulama için başka bir plan seçin. Daha yüksek bir plan hemen başlar, kartla ödenir ve mevcut planınızda kalan günler hesabınıza yansıtılır. Daha düşük bir plan ödenmiş döneminiz bittiğinde başlar ve o zamana kadar mevcut planınızı koruyabilirsiniz.

## Hatırlatmalar

Bir uygulamanın planı bitmeden 7 gün ve 1 gün önce ve bittiği gün, kartla yenileme bağlantısıyla birlikte size e-posta göndeririz ve panelinizde bir uyarı gösteririz. Bir uygulama, uygulama kullanıcısı sınırına yaklaştığında veya ulaştığında da sizi bilgilendiririz.

## Kartla ödeme

Fiyatlar gösterildiğinde, ödeme sağlayıcımız Kashier'in güvenli sayfasında ödersiniz: hesabınız etkinleşmeden önce bekleme sayfasında, yenilemek için de **Lisans ve eklenti**'de (veya **Paket**'te). Planınızı seçin, fatura şehrinizi ve adresinizi girin ve ödeyin. Ödeme onaylandığında bir e-posta alırsınız; her ödemenin makbuzu aynı sayfada **Ödemeler** altında yer alır. Ödemenizi WhatsApp'tan ekibimizle de ayarlayabilirsiniz.

Fiyatlar Mısır'da Mısır lirası, diğer her yerde ABD doları olarak gösterilir. Her kartla ödeme Mısır lirası olarak tahsil edilir: Mısır dışında form örneğin "EGP 1,500 tahsil edilecek (yaklaşık $30)" der ve bankanız tutarı kendi kuruyla çevirir. Makbuz, lira olarak tahsil edilen tutarı gösterir.

## Kuponlar

Bir kupon kodunuz mu var? Kartla ödeme formuna girin ve **Uygula**'yı seçin. Fiyat siz ödemeden önce güncellenir. Bir kupon bazı planlarla, tarihlerle veya ilk ödemeyle sınırlı olabilir.

## Yenilemeler

Bir ödeme, süresini mevcut planınızın sonuna ekler; böylece erken yenilediğinizde hiçbir gün kaybolmaz. Plan yenilenmezse lisansınız etkin olmaktan çıkar ve yeni derlemeler durur.

## İadeler

Hesabınız etkinleştirildikten sonraki 3 gün içinde iptal ederek tam iade alabilirsiniz. Bankanıza bağlı olarak iadeler 5 ila 14 iş günü sürer. [İade politikası](/refund) sayfasına bakın.

> Google Play ve Apple geliştirici hesaplarının ücretleri bize değil, Google ve Apple'a ödenir.
`,
  },
  "several-apps": {
    title: "Tek hesapta birden fazla uygulama",
    description: "Aynı hesaptan, her birinin kendi planı ve fiyatı olan birden fazla uygulama çalıştırın.",
    body: `Bir Yallapp hesabı birden fazla uygulama barındırabilir; örneğin bir akademi ve bir mağaza ya da her markanız için bir uygulama. Hepsini aynı panelden yönetirsiniz.

## Her uygulama ayrıdır

Her uygulamanın kendi uygulama türü, içerik kaynağı, markası, sayfaları, mağaza sayfası, derlemeleri ve ayarları vardır. Müşterileri, siparişleri ve bildirimleri kendisine aittir.

## Her uygulamanın kendi planı vardır

Her uygulamanın kendi planı ve fiyatı vardır ve ayrı yenilenir. Bir uygulamanız Starter'da, diğeri Pro'da olabilir.

## Uygulama ekleme

Panelinizin üstündeki uygulama menüsünü açın (mevcut uygulamanızı gösterir) ve **Uygulama ekle**'yi seçin. Uygulama türünü seçin; yeni uygulama aynı [kurulum adımlarından](/docs/setup-steps) geçer. Planı **Lisans** sayfasında kartla ödendiğinde ya da ekibimiz tarafından etkinleştirildiğinde başlar. Bir hesap en fazla 20 uygulama barındırabilir.

## Uygulamalar arasında geçiş

Aynı menü tüm uygulamalarınızı durumlarıyla listeler. Birini seçin; panelin her sayfası (kurulum, sayfalar, ürünler, derlemeler, lisans) o uygulama üzerinde çalışır.

> Her uygulama seçtiğiniz mağaza hesapları altında yayınlanır. Tek bir Google Play ve tek bir Apple geliştirici hesabı tüm uygulamalarınızı barındırabilir.
`,
  },
  "account-and-support": {
    title: "Hesabınız ve destek",
    description: "Giriş, şifreler, iletişim bilgileriniz, ekibimizden duyurular ve nasıl yardım alacağınız.",
    body: `## Giriş yapma

E-postanız ve şifrenizle giriş yapın. Şifrenizi mi unuttunuz? [Giriş sayfasında](/sign-in) **Şifrenizi mi unuttunuz?**'u seçin, size e-postayla bir bağlantı gönderelim. Yeni bir şifre seçmek diğer cihazlarınızdaki oturumları kapatır.

## Bilgileriniz

Adınız, WhatsApp numaranız ve web siteniz hesabınızda kayıtlıdır. E-postanızı veya bilgilerinizi değiştirmek için bize WhatsApp'tan yazın.

## Ekibinizle çalışma

Panel giriş bilgilerinizi asla paylaşmayın: sizinle çalışan kişileri **Ekip** sayfasından davet edin, her birine yalnızca ihtiyacı olanı verin. Bkz. [Ekibiniz](/docs/team). Ekibimiz, siz istediğinizde size yardım etmek için panelinizi açabilir; bu sırada üstte bir çubuk görürsünüz ve değişiklikler uygulamanıza uygulanır.

## Duyurular

Yallapp haberlerini, yeni özellikleri ve planlı bakımları panelinizin **Duyurular** sayfasında, bazen de e-postayla paylaşırız.

## Yardım alma

- **WhatsApp**: panelinizdeki **Destek** bağlantısı, bize ulaşmanın en hızlı yolu. İki numaramız var: biri Mısır'daki müşteriler için, diğeri başka her yer için. Panel, hesabınızın ülkesine ait numarayı açar; [İletişim](/contact) sayfası ikisini de gösterir
- **E-posta**: yazılı olarak iletmeyi tercih ettiğiniz her şey için
- Adım adım yanıtlar için bu dokümantasyon

Bize bir ekran görüntüsü ve bulunduğunuz adımı gönderin, size doğrudan yanıt verelim.
`,
  },
  "sign-in-codes": {
    title: "Giriş kodları gelmiyor",
    description: "İnsanlar giriş kodlarını alamadığında neleri kontrol etmelisiniz.",
    body: `Giriş kodlarıyla ilgili sorunların çoğu telefon numarasından veya kodların gönderilme şeklinden kaynaklanır. Bunları sırayla kontrol edin.

## Telefon numarasını kontrol edin

İnsanlar numaralarını doğru ülke koduyla girmelidir. Numarayı hesaplarındaki numarayla karşılaştırın (WordPress'te, WordPress hesaplarındaki numarayla).

## Yallapp'in gönderdiği kodlar: WhatsApp'ı kontrol edin

Kodlar WhatsApp'tan, waabek.com üzerinden gönderilir. Numarada WhatsApp olmalı ve telefon çevrimiçi olmalıdır. Kişiden arşivlenmiş olanlar dahil WhatsApp sohbetlerine bakmasını isteyin.

## WordPress: kodları kimin gönderdiğini kontrol edin

WordPress'te **Yallapp**'i açın ve **Compatibility status** kartındaki **Sign-in codes**'a bakın.

- **Sent by Yallapp (WhatsApp)**: kodlar, web sitesi olmayan uygulamalarda olduğu gibi WhatsApp'tan gider, bu yüzden numarada WhatsApp olmalıdır. Lisansınız etkin olmalıdır: bir kod gönderilemediyse **Sign-in** ayarları nedenini gösterir.
- **Digits**: web sitenizde giriş yapmak için aynı telefon numarasını kullanın. Kod orada da gelmiyorsa sorun Digits'te ya da SMS veya WhatsApp ağ geçidinizdedir: bakiyesini, gönderici adınızı veya onaylı mesaj şablonunuzu ve teslim kayıtlarını kontrol edin. Ya da bunun yerine **Sent by Yallapp (WhatsApp)**'ı seçin.

## Birkaç dakika bekleyin

Kötüye kullanımı önlemek için kodlar telefon numarası ve ağ başına sınırlıdır. Birkaç denemeden sonra insanların yeni bir kod istemeden önce beklemesi gerekir. Bir kod yalnızca birkaç dakika geçerlidir.

---

Hâlâ çalışmıyor mu? Telefon numarası ve denemenin saatiyle bize WhatsApp'tan yazın.
`,
  },
  videos: {
    title: "Videolar oynamıyor",
    description: "Bir ders videosu uygulamada oynamadığında neleri kontrol etmelisiniz.",
    body: `Uygulama, kurslarınızın kullandığı video kaynaklarının aynısını oynatır: yüklenen videolar, [Medya kitaplığınızdaki](/docs/media) videolar, YouTube, Vimeo ve gömülü oynatıcılar.

## Dersi web sitenizde veya platformunuzda oynatın

Dersi öğrenci olarak giriş yapmışken açın. Orada oynamıyorsa önce dersi düzeltin.

## Gömmeye izin verin

YouTube ve Vimeo'da videonun gizlilik ayarları gömmeye izin vermelidir. Belirli alan adlarıyla sınırlı Vimeo videoları için web sitenizin alan adını ekleyin.

## Video sitesinin kendi oynatıcısı

YouTube, Vimeo ve diğer video sitelerinden videolar, sitenin kendi oynatıcısında kontrolleri ve logosuyla oynatılır. **Ekran koruması** sayfasında **Video sitesinin markasını gizle (riski size ait)** seçeneğini seçebilirsiniz: uygulama bu videoları o zaman kendi kontrollerinin arkasında oynatır. YouTube'un şartları uygulamaların markasını gizlemesine izin vermez ve YouTube bu videoların uygulamada oynatılmasını engelleyebilir: YouTube videoları oynamayı bırakırsa bu seçeneği kapatın.

## Dersi yeniden açın

Yüklenen videolar geçici bağlantılardan oynatılır. Bir ders uzun süre açık kaldıysa ya da telefonun tarihi ve saati yanlışsa, dersi kapatıp yeniden açın.
`,
  },
  chat: {
    title: "Uygulamanızda sohbet",
    description: "Uygulamanızı kullananlar size yazar, bir akademinin öğrencileri her kursun grubunda konuşur: yanıtlar, dosyalar, şikâyetler, birini engellemek ve mesajların ne kadar saklandığı.",
    body: `**Pro** ve **Business** planlarında uygulamanızda bir **Sohbet** sekmesi olur. Uygulamanızı kullananlar size oradan yazar; siz de paneldeki **Sohbet** sayfasından ya da Yallapp Business'taki **Sohbet** sekmesinden yanıt verirsiniz. İnsanlar birbirlerine asla özelden yazmaz: herkesin sizinle tek bir sohbeti vardır, akademilerde ise her kursun bir grubu olabilir.

## Kimler sohbet edebilir

Web sitesi olmayan uygulamalar, bir platforma bağlı uygulamalar, WordPress uygulamaları (eklenti 0.4.9 veya sonrası) ve Yallapp ile giriş yapılan kendi API'nizdeki uygulamalar sohbete sahiptir. Sohbet, uygulamanızın bir sonraki derlemesiyle gelir. İnsanlar yazmak için giriş yapar; Sohbet sekmesi bunu ister.

**Sohbet ayarları**'ndan sohbeti kapatıp açarsınız; bir akademide **Kurs grupları**'nı açarsınız: her kursun, öğrencilerinin ve sizin konuştuğu bir grubu olur. Öğrenci, kayıtlı olduğu kursların gruplarına katılır.

## Yanıt vermek

Bir sohbeti açın ve yanıtınızı yazın. Yanıt, uygulamanızın adı ve logosuyla işletmeniz adına görünür: müşterileriniz ekibinizden kimin yazdığını asla görmez (ekibiniz görür). [Medya kitaplığınızdan](/docs/media) bir dosya ekleyebilirsiniz. Bir sohbet açıkken yeni mesajlar birkaç saniyede bir kendiliğinden gelir; Yallapp Business de yeni mesajları telefonunuza bildirir (bildirim ayarlarında **Sohbet mesajları**).

İnsanlar metin, fotoğraf, video (200 MB'a kadar), sesli mesaj ve belge (PDF, Word, Excel, PowerPoint ve metin, 50 MB'a kadar) gönderir. Dosyaları Medya kitaplığınızda **Sohbetten** altında görünür ve uygulamanızın depolama alanından sayılır.

## Şikâyetler ve birini engellemek

İnsanlar bir mesajı şikâyet edebilir, gruplarda da birinin mesajlarını görmemeyi seçebilir. Şikâyetler, Sohbet sayfasındaki **Şikâyetler** bölümünde bekler: mesajı tutun, silin ya da silip göndereninin mesaj göndermesini engelleyin. Herhangi bir mesajı silebilir veya birinin mesaj göndermesini sohbetin içinden de engelleyebilirsiniz; o kişi okumaya devam eder. [Koşullarımızda](/terms) yazdığı gibi, uygulamanızdaki sohbetten ve orada söylenenlerden siz sorumlusunuz.

## Mesajlar ne kadar saklanır

Mesajlar ve dosyalar gönderildikten bir yıl sonra silinir. Bir sohbetin en eski mesajları silinmeden 30 gün önce size haber veririz (panelde, e-postayla ve telefonunuzda); **Bir yıl daha sakla** onları, tek bir sohbet için ya da hepsi için saklar. Bir mesajı veya sohbetin tamamını istediğiniz zaman silebilirsiniz. Biri hesabını sildiğinde sohbeti de silinir.
`,
  },
};
