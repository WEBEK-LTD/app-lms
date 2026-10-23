import { MAIL_PRESET_STEPS } from "../docs";
import type { DocTranslation } from "../translation-types";

/** 55 The documentation in Turkish, part 3: your app. The email services' steps stay as the dashboard shows them. */
export const TR_DOCS_3: Record<string, DocTranslation> = {
  "setup-steps": {
    title: "Kurulum adımları",
    description: "Uygulama kurulumu adım adım: uygulama türü, web sitesi, marka, mağaza sayfası ve yayın.",
    body: `Panelinizdeki **Uygulama kurulumu** sizi beş adımdan geçirir. Her biri **Kaydet ve devam et**'i seçtiğinizde kaydedilir ve herhangi birine daha sonra geri dönebilirsiniz. Son adım tamamlandığında ilk derlemeniz başlar.

## Uygulama türü

**Akademi**, **Mağaza**, **Randevu** veya **Emlak**'ı seçin. [Uygulama türünüzü seçin](/docs/app-types) rehberine bakın.

## Web sitesi

Uygulamanızın içeriğinin nereden geleceğini seçin ve bağlayın. Seçenekler uygulama türünüze bağlıdır: [Uygulamanızın içeriği nereden gelir](/docs/content-sources) rehberine bakın. Kendi API'niz için adımda canlı bir kontrol vardır: [Kendi API'nizi bağlayın](/docs/my-own-api) rehberine bakın.

## Marka

- **Uygulama adı**: en fazla 30 karakter; uygulamada ve mağazalarda gösterilir.
- **Uygulama simgesinin altındaki ad**: en fazla 12 karakter; telefonun ana ekranında gösterilir.
- **Uygulama simgesi**: saydamlık içermeyen, 1024 × 1024 piksel bir PNG.
- **Logo**: giriş ekranında gösterilen bir PNG veya SVG.
- **Ana renk** ve **Açılış ekranı arka planı**: düğmelerin ve vurguların rengi ile uygulama açılırken gösterilen ekranın rengi.
- **Şablon**: Klasik, Cesur veya Sade ve **Yazı tipi**.

Canlı önizleme seçimlerinizi anında gösterir. Sayfalarınız, ikincil renk, köşeler ve kartlar daha sonra [Sayfalar ve görünüm](/docs/pages-and-look) bölümünde ayarlanır.

## Mağaza sayfası

- **Android paket adı** ve **iOS bundle ID**: uygulamanızın kalıcı kimlikleri, örneğin com.yourbrand.app. Noktalarla ayrılmış küçük harfli kelimeler kullanın. Uygulamanız Google Play'e çıktıktan sonra paket adı değiştirilemez; bundle ID de App Store Connect'teki ile aynı olmalıdır.
- **Mağaza başlığı** (en fazla 30 karakter), **Kısa açıklama** (en fazla 80 karakter, Google Play'de başlığın altında gösterilir) ve **Tam açıklama**.
- **Destek e-postası** ve **Gizlilik politikası adresi**: iki mağaza da bunları ister.
- **Ekran görüntüleri**: Google Play için 2 ila 8 telefon ekran görüntüsü ve 1320 × 2868, 1290 × 2796 veya 1260 × 2736 piksel boyutunda en fazla 10 iPhone ekran görüntüsü. Saydamlık içermeyen PNG veya JPEG. iPhone ekran görüntülerinde fiyat veya satın alma düğmesi göstermeyin.

## Yayın

- **App Store Connect API anahtarı**: **App Store Connect › Users and Access › Integrations › App Store Connect API** bölümündeki Issuer ID, Key ID ve özel anahtar (.p8), App Manager rolüyle. iOS uygulamanızı imzalamak için gerekir; o olmadan yalnızca Android uygulamasını alırsınız.
- **Anlık bildirimler** (isteğe bağlı): Firebase'den google-services.json ve GoogleService-Info.plist dosyalarınız. [Firebase ile anlık bildirimler](/docs/push-notifications) rehberine bakın.
- **Pro ve Business paketleri**: uygulamanın yayınını ekibimizden istemediyseniz (**Yayın** sayfası), sizin için Google Play'e yükleyebilmemiz için bir **Google Play hizmet hesabı anahtarı** (JSON) da gerekir. [Google Play'de yayınlayın](/docs/google-play) rehberine bakın.

Anahtarlar şifrelenir, bir daha gösterilmez ve yalnızca başlattığınız derlemeler için kullanılır. Onları istediğiniz zaman kaldırabilirsiniz.

---

Bitirdiğinizde ilk derlemeniz sıraya alınır. [Derlemeler ve indirmeler](/docs/builds) sayfasından izleyin.
`,
  },
  "pages-and-look": {
    title: "Sayfalar ve görünüm",
    description: "Uygulamanızın sayfalarını bloklarla oluşturun, alt sekmeleri ayarlayın, görünümü seçin ve yeni derleme olmadan yayımlayın.",
    body: `Panelinizdeki **Sayfalar ve görünüm** düzenleyicisi, uygulamanızın ekranlarını bir site oluşturucu gibi kurduğunuz yerdir. Yayımladığınızda uygulamanız yeni sayfaları, yeni derleme ya da mağaza güncellemesi olmadan bir sonraki açılışta gösterir.

## Bir tasarımdan başlayın

Her uygulama türünün üç ya da dört hazır tasarımı vardır; örneğin bir akademi için Klasik akademi, Çevrimiçi kurslar, Koçluk ve Çocuk akademisi, bir mağaza için Moda, Market ve Elektronik. Bir tasarım eksiksiz bir başlangıç noktasıdır: alt sekmeler, içinde kendi listeleriniz olan bloklardan bir ana sayfa ve bir görünüm (şablon, köşeler, kartlar, yazı tipi ve ikincil renk).

- **Marka** adımında **Tasarım** altından bir tasarım ya da **Sayfalarımı koru**'yu seçin.
- **Sayfalar ve görünüm**'de **Bir tasarımdan başla**'yı açın ve **Bu tasarımı kullan**'ı seçin.

Tasarım taslağınızın yerini alır, uygulamanızın gösterdiklerinin değil: yayımlanmış sayfalarınız siz yayımlayana kadar kalır. Blokları örnek metinlerle gelir; siz değiştirene kadar düzenleyicide **Örnek metin** olarak işaretlenir. Yayımlamadan önce kendi metinlerinizi yazın. İletişim bloğu bize verdiğiniz web sitesini, e-postayı ve WhatsApp numarasını alır; hiçbiri yoksa çıkarılır.

## Sayfalar ve bloklar

Bir sayfa, üst üste dizilmiş bloklardan oluşur. **Blok ekle**'den bir blok ekleyin, ardından sırasını değiştirmek için yukarı veya aşağı sürükleyin. Düzenleyicinin gösterdiği gruplarıyla bloklar:

**İçerik**
- **Banner**: başlıklı geniş bir görsel
- **Kaydırıcı**: insanların kaydırdığı, isterseniz kendiliğinden ilerleyen, noktalı bannerlar. Görseli olmayan bir slayt metninin arkasında renklerinizi gösterir
- **Metin**: paragraflar, başlıklar ve bağlantılar
- **Görsel** ve **Video**
- **Düğme**: bir sayfa, bir ekran, bir kurs veya ürün ya da bir web adresi açar
- **Duyuru**: bir haber, iyi bir haber veya bir uyarı için isteğe bağlı bağlantılı renkli bir şerit

**Listeler**
- **Liste**: kendi kurslarınız, ürünleriniz, hizmetleriniz, yazılarınız veya ilanlarınız, kartlar halinde
- **Kategoriler** ve **Arama kutusu**
- **Öğrenmeye devam**: öğrencinin şu anki kursu (Akademi uygulamaları)
- **Hızlı bağlantılar**: satırlar halinde ya da kaydırılan tek satırda simgeli ve etiketli kutucuklar
- **Ekip**: fotoğraflı (ya da baş harfleriyle), unvanlı ve birkaç kelimelik kişiler: öğretmenler, doktorlar, koçlar veya çalışanlar
- **Rakamlar**: etiketleriyle iki ila dört büyük rakam

**Etkileşim**
- **Yorumlar**: müşterilerin söyledikleri; adları, unvanları, fotoğrafları ve yıldızlarıyla
- **Sorular**: dokununca yanıtı açılan sorular
- **Geri sayım**: bir tarihe kalan gün, saat, dakika ve saniye. Bittikten sonra onun için yazdığınız metni gösterir ya da gizlenir

**İletişim**
- **İletişim**: aramak, WhatsApp'ta yazışmak, e-posta göndermek, yol tarifi almak (adresinize ya da haritadaki tam konumunuza) ve web sitenizi açmak için düğmeler. Yalnızca istediklerinizi doldurun
- **Çalışma saatleri**: her gün için saatleriniz; telefonun saatine göre **Şimdi açık** veya **Şimdi kapalı** ile. Bir mola için bir günü iki kez ekleyin, tatillerinizi listeleyin ve bir not ekleyin
- **Sosyal bağlantılar**: Instagram, Facebook, X, TikTok, YouTube, LinkedIn, Snapchat, Telegram veya WhatsApp kanalınıza, her biri adıyla düğmeler

**Düzen**
- **Web sayfası**: uygulama içinde bir web sitesinin sayfası
- **Boşluk**: bloklar arasında boşluk

Her blok herkese, yalnızca giriş yapmış kişilere ya da yalnızca giriş yapmamış kişilere gösterilebilir. Bloklardaki metinler, her slaydın, yorumun, sorunun ve kişinin metinleri dahil, uygulamanızdaki her dilde yazılabilir.

## Alt sekmeler

Uygulamanızın altındaki sekmeleri, etiketlerini ve simgelerini ve her birinin ne açacağını seçin: sayfalarınızdan biri ya da kurslar, arama, favoriler, sepet, siparişler, randevular, mesajlar veya hesap gibi yerleşik bir ekran.

## Görünüm

- **Şablon**: Klasik, Cesur veya Sade
- **Açık, koyu ya da telefonun ayarı** ve insanların uygulama ayarlarından değiştirip değiştiremeyeceği
- **Yazı tipi**, ilerleme ve vurgular için bir **ikincil renk**, **köşeler** (keskin, yumuşak veya yuvarlak) ve **kartlar** (düz, çerçeveli veya gölgeli)

Ana renginiz ve logonuz Marka adımından gelir.

## Taslaklar ve yayın

Çalışırken değiştirdiğiniz her şey taslak olarak kaydedilir ve düzenleyici **Yayımlanmamış değişiklikler** gösterir. Hazır olduğunuzda **Yayımla**'yı seçin. Baştan başlamak için taslağı silip yayımlanmış sayfalara dönün. İlk kez yayımlayana kadar uygulamanız türü için hazırlanmış başlangıç sayfalarını gösterir.

> WordPress'te Yallapp eklentisi yayımlanmış sayfalarınızı alır ve kendi içeriğinizle doldurur. Bir değişikliği hemen görmek için eklentinin ayarlarındaki **App pages and look**'u kullanın.

## Yerleşik ekranlar

Kurs sayfaları, dersler, sınavlar, ürün sayfaları, sepet, saat ayırtma, ilan ayrıntıları, filtreli arama ve hesap blok değil yerleşik ekranlardır. Sekmeler, düğmeler ve kartlar onları açar.
`,
  },
  "preview-your-app": {
    title: "Uygulamanızı önizleyin",
    description: "Gerçek uygulamanızı derlemeden önce mevcut kurulumunuz, içeriğiniz ve sayfalarınızla tarayıcınızda veya telefonunuzda deneyin.",
    body: `Panelinizdeki **Uygulamanızı önizleyin**, bir derleme başlatmadan önce gerçek uygulamanızı mevcut kurulumunuz ve içeriğinizle tarayıcınızda çalıştırır. Uygulama türünün, içeriğin, markanın, şablon ve yazı tipinin, sayfaların, alt sekmelerin ve dillerin doğru olduğunu kontrol etmek için kullanın. Önizlemedeki hiçbir şey yayımlanmaz ya da uygulamanızı kullananlara gönderilmez.

## Önizlemeyi açın

1. Panelinizde menüden **Uygulamanızı önizleyin**'i seçin. Genel bakışta, her kurulum adımında ve **Sayfalar ve görünüm**'de de aynı düğme vardır.
2. Uygulamanız bir telefon çerçevesinde açılır. İki görünümü görmek için **Açık** ve **Koyu**'yu, uygulamanızın dilleri arasında geçmek için **Dil**'i kullanın.
3. Bir şeyi değiştirdikten sonra **Değişikliklerden sonra yenile**'yi seçin.

## Telefonunuzda açın

Önizlemenin yanındaki QR kodunu telefonunuzun kamerasıyla tarayın. Bağlantı bir saat geçerlidir: yeni bir bağlantı için önizlemeyi panelde yeniden açın. iPhone'da önizleme iPhone kurallarına uyar; bu yüzden ücretli kurslar satın alma düğmesi göstermez.

## Kurulumunuz tamamlanmadan önce

Önizleme, uygulama türünüzü seçtiğiniz andan itibaren çalışır. Bir adım tamamlanana kadar ad için "Your app" gibi yer tutucular kullanır ve sayfa hâlâ eksik olanları listeler. **Web sitesi** adımında içeriğinizin nereden geleceğini seçene kadar önizleme yalnızca bunu gösterir.

## Yayımlanmış sayfalar ve taslaklar

- İçeriği Yallapp'te yönetilen ya da bağlı bir platformdan gelen uygulamalar **Sayfalar ve görünüm**'deki taslağı gösterebilir: telefonun üstündeki **Sayfalar ve görünüm'deki taslak**'ı seçin.
- WordPress siteleri ve kendi API'niz sayfaları yalnızca yayımladığınızda alır; bu yüzden önizlemeleri yayımlanmış sayfaları gösterir.

## Giriş yapmak

Önizleme asla giriş kodu göndermez. İnsanların giriş yaptıktan sonra gördüğü ekranları denemek için **mağaza inceleme numaranız** ve onun sabit koduyla giriş yapın:

- Yallapp'te yönetilen içerik ya da bağlı bir platform: bunları **Uygulamaya giriş** sayfasında ayarlayın.
- WordPress: bunları Yallapp eklentisinin ayarlarında, mağaza inceleme erişimi altında ayarlayın. Önizleme girişin yalnızca kurulu uygulamada çalıştığını söylüyorsa Yallapp eklentisini güncelleyin.
- Kendi API'niz: [Kendi API'nizi bağlayın](/docs/my-own-api#let-the-app-preview-reach-your-api) rehberine bakın.

## Yalnızca kurulu uygulamada çalışanlar

- Anlık bildirimler
- Web sayfası olarak gösterilen dersler, gömülü videolar, ödeme sayfaları gibi uygulama içindeki web sayfaları. Önizleme orada kısa bir not gösterir ve sayfayı yeni bir sekmede açabilir.
- Ödeme ve ödemeler: önizleme asla ödeme almaz
- Korumalı videolar ve ekran kaydı koruması

Uygulamanızın simgenin altındaki adı, simgesi ve mağaza sayfası bir derlemeyle gelir.

## Önizleme içeriğinize ulaşamıyorsa

- **WordPress:** bir güvenlik eklentisi ya da barındırma firmanız başka adreslerden gelen istekleri engelliyor olabilir. https://yallapp.com.tr adresine izin verin ya da barındırma firmanızdan izin vermesini isteyin.
- **Kendi API'niz:** [Kendi API'nizi bağlayın](/docs/my-own-api#let-the-app-preview-reach-your-api) rehberinin gösterdiği gibi https://yallapp.com.tr'den gelen isteklere izin verin.
- **Henüz etkin olmayan bir WordPress uygulaması:** Yallapp eklentisi bağlandığında ve uygulamanın paketi etkin olduğunda siteniz önizlemeye yanıt verir. Web sitesi olmayan uygulamalar her zaman önizlenebilir.
`,
  },
  languages: {
    title: "Diller ve çeviriler",
    description: "Uygulamanızı her dilde sunun: Yallapp İngilizce, Arapça ve Türkçeyi sizin için çevirir; diğer dilleri kendiniz çevirirsiniz.",
    body: `Her Yallapp uygulaması İngilizcedir. Yallapp onu **Arapça** ve **Türkçe**'ye de çevirir: uygulamanın kendi düğmeleri ve mesajları ile Yallapp'in sizin için yazdığı sekme adları, sayfa başlıkları ve örnek metinler. Uygulamanın gösterebildiği **başka herhangi bir dili**, örneğin Fransızca, Almanca, Farsça veya Urduca'yı ekleyip kendiniz çevirebilirsiniz. İnsanlar dillerini uygulama ayarlarında seçer; orada her dil kendi adıyla görünür.

## Dil ekleyin

Panelinizde **Diller**'i (ya da **Sayfalar ve görünüm › Diller**'i) açın. **Dil ekle**'de bir dil seçip **Ekle**'yi seçin. Ardından:

- **Varsayılan yap**, telefonun dili sizinkilerden biri olmadığında uygulamanızın açılacağı dili belirler. Sayfa metinleriniz onunla birlikte taşınır; hiçbir şey kaybolmaz.
- Oklar uygulamadaki dil seçicinin sırasını belirler.
- Çöp kutusu bir dili kaldırır. Yeniden eklemeniz ihtimaline karşı çevirileri saklanır.

Değişiklikler taslağınıza kaydedilir. Uygulamanıza göndermek için **Yayımla**'yı seçin. Uygulamanızın kaç dili olabileceği, kim çevirirse çevirsin paketinize bağlıdır.

## Metinlerinizi çevirin

Diller sayfasının **Çeviriler** bölümü, seçtiğiniz dilde uygulamanızın gösterdiği her metni, ne kadarının çevrildiğiyle birlikte listeler:

- **Sayfalarınız ve sekmeleriniz**: sekme adları, sayfa başlıkları ve bloklarınızın, slaytlarınızın, sorularınızın ve kişilerinizin metinleri.
- **Uygulamanın kendi metinleri**: düğmeleri, ekranları ve mesajları.

Her metni altındaki kutuya yazın. **Göster: Eksik** hâlâ çeviri gerektirenleri listeler, **Ara** bir kelimeyi, metni veya anahtarı bulur. **İngilizceyi kopyala**, olduğu gibi bıraktığınız marka adları için İngilizceyi doldurur. **Çevirileri kaydet**'i, ardından **Yayımla**'yı seçin. **Şu dilde önizle**, yayımlamadan önce uygulamanızı o dilde açar (web sitesi olmayan uygulamalar; diğerleri yayımlanmış olanı gösterir).

Çevirmediğiniz bir metin Arapça ve Türkçede Yallapp'in çevirisini, aksi halde sayfalarınız için varsayılan dili, uygulamanın kendi metinleri için İngilizceyi gösterir. Sizin çeviriniz her zaman önceliklidir, Yallapp'inkinden de: Arapça ve Türkçede onun metninden başlamak için **Yallapp'inkini değiştir**'i seçin. Yallapp'in yazdığı bir metni, örneğin bir sekme adını değiştirirseniz, onu çevirmek size kalır.

## Yer tutucular ve sayılar

Bazı uygulama metinlerinde **{name}** veya **{count}** gibi süslü parantez içinde **yer tutucular** vardır: uygulama oraya bir ad ya da sayı koyar. Eklemek için kutunun altındaki bir yer tutucuyu seçin ve yalnızca gösterilenleri kullanın. Sayı içeren metinlerin her sayı için bir biçimi olabilir; şöyle yazılır: **{count, plural, =1{1 lesson} other{{count} lessons}}**; dilinizin ihtiyaç duyduğu biçimleri kullanın (**one**, **few**, **many**, **other**). Uygulamanın bilmediği bir yer tutucu içeren metin kaydedilemez; böylece bir hata asla uygulamanıza ulaşmaz.

## Tabloda çalışın

Bir dili **CSV**, **JSON** veya **XLIFF** olarak **dışa aktarın**, çeviri sütununu doldurun (ya da dosyayı bir çevirmene gönderin) ve **Dosya içe aktar** ile geri yükleyin. Satırlar kimlikleriyle eşleştirilir; içe aktarılan metinleri kontrol edip kaydedin.

## Sağdan sola

Arapça, Farsça, İbranice, Urduca, Peştuca ve Uygurca sağdan sola yazılır: biri bunlardan birini seçtiğinde tüm uygulama; menüler, listeler, simgeler ve metinler ters döner.

> Kurs veya ürün adları gibi web sitenizden ya da platformunuzdan gelen metinler orada yazıldığı gibi gösterilir. Emlak ilanları ofisinizin yazdığı gibi gösterilir.
`,
  },
  "push-notifications": {
    title: "Firebase ile anlık bildirimler",
    description: "Bir Firebase projesi oluşturun, uygulamalarınızı ekleyin, Apple anlık bildirimlerini bağlayın ve ilk bildiriminizi gönderin.",
    body: `Anlık bildirimler kendi Firebase projeniz üzerinden gönderilir; böylece müşterilerinizin cihazları bizim değil sizin hesabınız altında kaydedilir. Firebase bu kullanım için ücretsizdir. Bir kez kurun; yaklaşık 20 dakika sürer.

## Başlamadan önce

- Firebase konsolu için bir Google hesabı
- **Mağaza sayfası** adımından Android paket adınız ve iOS bundle ID'niz
- iPhone bildirimleri için bir Apple Developer hesabı

## Bir Firebase projesi oluşturun

Firebase konsolunu (console.firebase.google.com) açın, **Create a project**'i seçin ve markanızın adını verin. Google Analytics isteğe bağlıdır.

## Android uygulamanızı ekleyin

Projede **Add app › Android**'i seçin. **Android paket adınızı** Mağaza sayfası adımındakiyle birebir aynı girin, uygulamayı kaydedin ve **google-services.json**'ı indirin. Firebase'in gösterdiği diğer adımları atlayabilirsiniz.

## iOS uygulamanızı ekleyin

**Add app › Apple (iOS)**'u seçin. **iOS bundle ID'nizi** Mağaza sayfası adımındakiyle birebir aynı girin, uygulamayı kaydedin ve **GoogleService-Info.plist**'i indirin.

## Apple anlık bildirimlerini bağlayın

iPhone'lar bildirimleri yalnızca Apple üzerinden alır; bu yüzden Firebase'in Apple'dan bir anahtara ihtiyacı vardır:

1. Apple Developer hesabınızda **Certificates, Identifiers & Profiles › Keys**'i açın ve **Apple Push Notifications service (APNs)** açık bir anahtar ekleyin. .p8 dosyasını indirin (Apple bir kez indirmenize izin verir) ve **Key ID** ile **Team ID**'nizi not edin.
2. Firebase'de **Project settings › Cloud Messaging**'i açın, **Apple app configuration** altında iOS uygulamanızı bulun ve anahtarı Key ID ve Team ID ile yükleyin.

## İki dosyayı Yallapp'e yükleyin

Panelinizde **Uygulama kurulumu › Yayın**'ı açın ve google-services.json ile GoogleService-Info.plist'i **Anlık bildirimler** altına yükleyin. Her dosyanın paket adınızla veya bundle ID'nizle eşleştiğini kontrol ederiz. Bildirimler bir sonraki derlemenizden itibaren çalışır.

## Mesaj göndermek için bir hizmet hesabı anahtarı oluşturun

Firebase'de **Project settings › Service accounts**'u açın ve **Generate new private key**'i seçin. Bir .json dosyası iner. Gizli tutun: sahibinin uygulamanıza bildirim göndermesini sağlar.

- **Bir platforma bağlı ya da web sitesi olmayan uygulamalar**: panelin **Uygulama bildirimleri** sayfasına yükleyin. Şifreli saklanır.
- **Kendi API'niz**: uygulamanın kaydettiği bildirim token'larına bildirim göndermek için kendi sisteminizde kullanın.
- **WordPress**: WordPress yönetiminde **Yallapp**'i açın ve **Notifications (Firebase)** altına yükleyin. Web sitenizde şifreli saklanır.

## İlk bildiriminizi gönderin

- **Bir platforma bağlı ya da web sitesi olmayan uygulamalar**: **Uygulama bildirimleri**'nde bir başlık ve mesaj yazın ve **Herkese gönder**'i seçin. Herkes onu uygulamanın gelen kutusunda alır; bildirimlere izin veren telefonlar anlık bildirim de alır.
- **WordPress**: hangi olayların otomatik bildirim göndereceğini seçin (yeni bir ders, bir duyuru, onaylanmış bir kayıt, bir soruya yanıt) ya da eklentinin ayarlarında **Send a manual notification** altında bir tane yazın.


## Kampanyalar: seçtiğiniz kişilere

**Uygulama bildirimleri › Kampanyalar**'da (bir platforma bağlı ya da web sitesi olmayan uygulamalar) bir kampanya herkese ya da müşterilerinizin bir kısmına gider: bir şey satın alanlar, bir kursun öğrencileri, üyeliği devam eden üyeler ya da bir süredir uygulamayı açmayanlar. Telefonlarında uygulamanın gösterdiği dile, iPhone ya da Android telefonlara ve oturum açtıkları ülkeye göre daraltabilirsiniz. Medya'nızdan bir resim ekleyin ve neyi açacağını seçin: uygulamayı, sayfalarından birini ya da bir web sayfasını. Şimdi, bir tarih ve saatte ya da her hafta bir gün ve saatte gönderin; daha sonra göndermek için taslak olarak kaydedin. Her kampanya kaç kişiye gittiğini, bildirimin ulaştığı ve ulaşamadığı telefonları ve kaç kişinin açtığını (her gece sayılır) gösterir. Kampanyalar her pakette vardır ve diğer bildirimlerinizle birlikte sayılır, saatte en fazla 10. WordPress'teki uygulamaların da kampanyaları vardır, panelin menüsünde **Kampanyalar** altında: herkese gider; web siteniz onları uygulamanın gelen kutusuna koyar, anlık bildirim olarak gönderir ve kaç telefona ulaştığını geri bildirir (Yallapp eklentisi 0.4.12 veya sonrası).

## Otomatik bildirimler

Bir platforma bağlı ya da web sitesi olmayan uygulamalar kendiliğinden de, her kişinin dilinde bildirim gönderir: bir kursun öğrencilerine yeni ders, onaylanan randevu ve bir gün önce hatırlatması, başlamadan iki saat önce ders, bir gün önce etkinlik, bitmeden üç gün önce üyelik, üç saattir sepette kalan ürünler ve öğrencilerin uygulamada açtığı günlük ders hatırlatması. Her biri her kişiye bir kez gider. **Uygulama bildirimleri › Otomatik bildirimler**'de son 30 günde her birinin kaç kişiye ulaştığını ve kaç kez açıldığını görür, istemediklerinizi kapatırsınız.

---

İnsanlar hangi bildirimleri alacaklarını uygulamanın ayarlarında seçer. Bildirimler iPhone'lara ulaşmıyorsa önce Firebase'in Cloud Messaging ayarlarındaki APNs anahtarını kontrol edin.
`,
  },
  "app-users": {
    title: "Uygulama kullanıcıları ve giriş",
    description: "İnsanlar uygulamanıza nasıl giriş yapar: telefonla, e-postayla ya da ikisiyle; kodlarını gönderen WhatsApp numarası ve e-posta adresi; ve belirlediğiniz giriş kuralları.",
    body: `İnsanlar uygulamanıza telefon numaraları ve tek kullanımlık bir kodla, e-posta adresleriyle ya da ikisinden biriyle giriş yapar: bunu panelin **Uygulamaya giriş** sayfasında seçersiniz.

## Telefon, e-posta ya da ikisi

**Uygulamaya giriş**'te, **İnsanlar nasıl giriş yapar** altında şunlardan birini seçin:

- **Telefon numarası**: WhatsApp'tan 6 haneli bir kod. Varsayılan budur.
- **E-posta adresi**: web sitesi olmadan ya da içerik paneldeyse, uygulamanızın adıyla e-postayla gönderilen 6 haneli bir kod. Yeni kişiler e-posta adresleriyle kaydolur. WordPress'te e-postanın nasıl çalışacağını siz seçersiniz (aşağıya bakın).
- **Telefon numarası veya e-posta adresi**: uygulama bir **Telefon / E-posta** anahtarı gösterir.

Shopify, ikas, Ticimax, IdeaSoft veya SimplyBook.me'ye bağlı uygulamalar telefonla giriş yapar: bu platformlar her müşterinin siparişlerini ve randevularını telefon numarasıyla bulur. Teachable veya Thinkific'e bağlı uygulamalar e-postayla da giriş yapabilir: e-postayla giriş yapan kişi, web sitenizden satın aldıkları dahil, okulunuzdaki o adresli hesabının kurslarını görür.

WordPress'te e-postayla girişin nasıl çalışacağını seçin:

- **E-postayla kod: herkes kaydolabilir.** İnsanlar e-postayla 6 haneli bir kod alır. Web sitenizde hesabı olmayan biri, eklentinin **Allow new accounts to sign up from the app** ayarı açıksa istediğiniz bilgilerle bir hesap alır. Web sitenizi düzenleyebilen hesaplar (çalışanlar) asla kodla giriş yapmaz: web sitesinde giriş yapar. Yallapp eklentisinin 0.3.5 veya üzeri sürümü gerekir.
- **Şifreleriyle: yalnızca mevcut hesaplar.** Web sitenizdeki hesaplarının e-posta adresi ve şifresi; şifreyi WordPress kontrol eder, "Forgot your password?" web sitenizin sıfırlama sayfasını açar. Yeni kişiler telefonla ya da web sitenizde kaydolur.

Web siteniz, ulaşılabildiğinde seçimlerinizi bir dakika içinde, aksi halde bir sonraki kontrolünde (günde iki kez) alır. Yallapp eklentisindeki **Check now** onları hemen alır. Bunlar eklentinin kendi **Sign-in** ayarlarının önüne geçer; burada seçim yapana kadar o ayarlar geçerlidir.

Mağaza inceleme numaranız, uygulama yalnızca e-postayla giriş yapsa da her zaman giriş yapar. Uygulama yalnızca e-postayla giriş yaptığında telefon alanı göstermez; bu yüzden bir mağaza inceleme e-posta adresi de belirleyin (aşağıya bakın).

Uygulamanızın içeriğinin geldiği yeri Shopify'a ya da bağlı başka bir platforma değiştirirseniz uygulama yalnızca telefonla giriş yapar. E-posta adresleriyle kaydolmuş müşteriler varsa **Web sitesi** adımı sizi önceden uyarır: değişiklikten sonra giriş yapamazlar.

## Kodları gönderen WhatsApp numarası

Kodlar uygulamanızın adıyla Yallapp'in WhatsApp numarasından gönderilir. Bunun yerine kendi WhatsApp numaranızdan göndermek için waabek.com'da bir WABEK hesabı açın, numaranızı orada bağlayın, ardından **Uygulamaya giriş**'te WABEK **API anahtarınızı** ve o numaranın **Instance ID**'sini yapıştırıp **Test kodu gönder**'i seçin. Anahtar şifreli saklanır ve bir daha gösterilmez. **Yeniden Yallapp'in numarasını kullan** bizim numaramıza döner.

WordPress'te bu, eklentinin **Sign-in codes are sent by** ayarı **Sent by Yallapp (WhatsApp)** olduğunda geçerlidir.

Numaranız bir kodu gönderemezse (WABEK yanıt vermezse ya da numaranın bağlantısı kesilmişse) o kod bunun yerine Yallapp'in numarasından gönderilir; böylece müşterileriniz yine de alır. Size günde en fazla bir kez e-posta göndeririz ve yeni bir anahtar kaydedene ya da bir test kodu gönderilene kadar **Uygulamaya giriş** bunun olduğu günü gösterir.

## Uygulamanızın e-postalarını kendi adresinizden gönderin

Uygulamanızı kullananlara giden e-postalar, örneğin e-postayla giriş kodları, uygulamanızın adıyla Yallapp'in adresinden gönderilir. Bunları hello@your-site.com gibi kendi adresinizden göndermek için **Uygulamaya giriş**'i açın, **Uygulamanızın e-postası**'na gidin, **Kendi e-posta sunucum**'u seçin ve e-posta hizmetinizi seçin. Sunucu ayarları sizin için doldurulur; hizmetiniz için gösterilen adımları izleyin (panelde göründüğü gibi):

${MAIL_PRESET_STEPS}

Ardından kullanıcı adını ve şifreyi, insanların gördüğü **Gönderen adı**'nı (genellikle uygulamanızın adı) ve **Gönderen adresi**'ni yazıp kaydedin. Şifre şifreli saklanır ve bir daha gösterilmez; daha sonra korumak için boş bırakın. Gönderen adresi olarak posta kutusunun kendi adresini kullanın: birçok hizmet başka adresleri reddeder ve sayfa kullanıcı adından farklı olduğunda sizi uyarır. **Yanıt adresi** isteğe bağlıdır.

**Test e-postası gönder**'i seçin ve ulaştığını kontrol edin (istenmeyen klasörüne de bakın). Ulaşmazsa sayfa nedenini açıkça söyler: kullanıcı adı veya şifre reddedildi, sunucu bulunamadı ya da yanıt vermedi veya güvenli bağlantı kurulamadı.

Sunucunuz daha sonra bir e-postayı gönderemezse o e-posta bunun yerine Yallapp'in adresinden gönderilir; böylece kimse kodunu kaçırmaz. Size günde en fazla bir kez e-posta göndeririz ve ayarları yeniden kaydedene ya da bir test e-postası gönderilene kadar **Uygulamanızın e-postası** günü ve nedeni gösterir. Size ve ekibinize giden e-postalar her zaman Yallapp'ten gelir. WordPress'te bu, Yallapp'in web siteniz için e-postayla gönderdiği kodlar içindir; web sitenizin kendi e-postaları yine WordPress'ten gelir. Kendi API'nizle, API'niz kendi e-postalarını gönderir.

## Telefonla giriş nasıl çalışır

1. Telefon numaralarını ülke koduyla girerler.
2. 6 haneli bir kod göndeririz. Kod 5 dakika geçerlidir, bir dakika sonra yenisi istenebilir ve bir kod birkaç denemeye izin verir.
3. Kodu yazarlar. Yeni bir numara, istediğiniz bilgilerle bir hesap oluşturabilir.

Kodun nasıl gönderildiği içeriğinizin nereden geldiğine bağlıdır:

- **Shopify, ikas, Ticimax, IdeaSoft, Teachable, Thinkific, SimplyBook.me ya da web sitesi yok**: onu **waabek.com üzerinden WhatsApp'tan** göndeririz.
- **WordPress**: onu yine WhatsApp'tan göndeririz (ya da eklentide seçerseniz Digits kendi altyapınızla gönderir) ve insanlar web sitenizdeki hesaplarını kullanır.
- **Kendi API'niz**: API'niz onu kendi sisteminizden gönderir.

## Giriş kuralları

Web sitesi olmayan ya da başka bir platforma bağlı uygulamalarda kurallar panelin **Uygulamaya giriş** sayfasındadır:

- **Yeni müşteriler uygulamada kaydolabilir** ve e-postalarının ya da şehirlerinin sorulup sorulmayacağı
- Giriş ekranında önce gösterilen **ülke kodu**, örneğin Türkiye için 90
- **Müşteri başına cihaz**: sınırdaki bir müşteri önce başka bir cihazda oturumu kapatır; 0 sınır yok demektir
- Uygulamada gösterilen **Destek WhatsApp**'ı ve **Şartlar sayfanız**
- **Uygulama mağazası incelemesi**: Apple ve Google için bir inceleme telefon numarası, bir inceleme e-posta adresi ve sabit bir inceleme kodu (aşağıya bakın)

Değişiklikler yeni derleme olmadan hemen uygulanır. WordPress'te aynı kurallar Yallapp eklentisinin **Sign-in** ayarlarındadır.

## Mağaza inceleyicileri için erişim

Apple ve Google inceleyicilerinin giriş yapabilmesi gerekir ve kodlarınızı alamazlar. Bir inceleme telefon numarası ve sabit bir kod belirleyin ve ikisini de mağazalara verin: Google Play Console'da **App access** altında, App Store Connect'te **App Review Information** altında. Bu olmadan uygulamanız reddedilebilir. Uygulamanız yalnızca e-postayla giriş yapıyorsa bir inceleme e-posta adresi de belirleyin ve mağazalara kodla birlikte o adresi verin: uygulama onlara telefon alanı göstermez. Hiçbirine e-posta ya da mesaj gönderilmez. Uygulamanızı ekibimiz yayımladığında bunları **Yayın** sayfasındaki **Mağaza inceleyicileri için** bölümüne ekleyin.

WordPress'te aynısı eklentinin **Store review access** ayarlarındadır: bir test numarası, bir test e-posta adresi ve sabit bir kod. E-postayla girişte inceleyiciler test e-posta adresini ve şifre olarak sabit kodu yazar. Çalışanlarınızdan birinin hesabına ait olmayan bir adres kullanın.

## Hesap silme

İnsanlar, Apple ve Google'ın gerektirdiği gibi hesaplarını uygulamanın ayarlarından silebilir. Girişleri ve cihazları kaldırılır.
`,
  },
  analytics: {
    title: "Analiz",
    description: "Uygulamanızı kaç kişinin kurup kullandığı, neye baktıkları ve ne satın aldıkları ve bunu saymak için uygulamanın tam olarak ne gönderdiği.",
    body: `İnsanların uygulamanızı nasıl kullandığını görmek için panelinizde **Analiz**'i açın: kurulumlar, günlük, haftalık ve aylık aktif kullanıcılar, oturumlar, kaç kişinin geri döndüğü, kullandıkları telefonlar ve uygulama sürümleri, ülkeleri ve dilleri, açtıkları ekranlar, kurslar, ürünler, hizmetler ve diğer öğeler, kaçının satın almaya, kayda, randevuya veya bağışa ilerlediği, kaçının bildirimlerinizi açtığı ve ne aradıkları. Son 7, 30 veya 90 günü ya da kendi tarihlerinizi seçin; her sayı bir önceki dönemle karşılaştırılır. **CSV dışa aktar** aynı sayıları bir tablo için indirir.

## Sayılar nereden gelir

Uygulamanız, içeriğiniz nereden gelirse gelsin (WordPress, bağlı bir platform, panel ya da kendi API'niz), sayıları kendisi sayar ve Yallapp'e gönderir. Uygulamanızda başka hiçbir şirketin analiz aracı yoktur ve hiçbir şey reklam için kullanılmaz.

- **Kurulumlar**, uygulama ilk açıldığında sayılır. Google Play, App Store ve diğer mağazalar indirme sayılarını bizimle paylaşmaz; bu yüzden mağaza konsollarınız daha fazlasını gösterebilir.
- **Aktif kullanıcılar**, uygulamayı o gün, son 7 günde (haftalık) ya da son 30 günde (aylık) açan kurulumlardır.
- **Oturumlar**, uygulamanın açılışlarıdır: bir başlangıç ya da arka planda 30 dakika veya daha fazla kaldıktan sonra geri dönüş.
- **Elde tutma**, uygulamayı aralığınızda ilk kez açan ve 1, 7 veya 30 gün sonra geri dönen kişilerin oranıdır.
- **Dönüşümler**, kurslarınızın, ürünlerinizin, hizmetlerinizin, etkinliklerinizin veya kampanyalarınızın görüntülenmelerini, bir sonraki adımı (sepete eklendi, kayıt olundu, randevu alındı, bilet alındı veya bağış seçildi) ve ödeme sayfasının açılışını sayar. Ödemenin kendisi ödeme sayfasında yapılır; ödemeler sipariş ve bağış sayfalarınızdadır.
- **Bildirimler**: panelden gönderdiğiniz her bildirim için kaç telefona gittiği ve kaçının uygulamayı ondan açtığı. Web sitenizin gönderdiği bildirimler türlerine göre sayılır.
- **Aramalar**, kimin değil, neyin arandığını gösterir. Bir arama en az iki kez yapıldığında görünür.

Sayılar, biri uygulamayı kullandıktan yaklaşık bir dakika sonra görünür. Günler saat diliminizde gece yarısından gece yarısına kadar sürer: sayfanın üstündeki **Saat dilimi** altında başka birini seçene kadar hesabınızın ülkesinin saat dilimi (zaten sayılmış günler sayıldıkları dilimi korur). Paneldeki uygulama önizlemesi sayılmaz.

## Uygulama ne gönderir

Uygulama açıkken her 30 saniyede bir ve arka plana geçtiğinde, o zamandan beri olanları gönderir:

- açıldığını ve ilk kez olup olmadığını;
- açılan ekranın türünü (Ana sayfa, bir kurs, sepet…), asla adresini değil;
- açılan kursları, ürünleri ve diğer öğeleri adları ve numaralarıyla, ve yukarıdaki işlemleri varsa tutarlarıyla;
- neyin arandığını ve kişinin açtığı bildirimi;
- uygulamanın oluşturduğu rastgele bir kurulum numarasını, platformu (Android veya iOS), uygulama ve sistem sürümlerini ve uygulamanın dilini.

Sayılar geldiğinde ülkeyi bağlantıdan çıkarırız ve IP adresini asla saklamayız. Uygulama hiçbir ad, telefon numarası, e-posta adresi, hesap veya reklam kimliği göndermez; kurulum numarası da kişinin hesabı değildir: paylaşımı kapatıp yeniden açtıklarında değişir.

## Kapatmak

İnsanlar uygulamanın **Ayarlar**'ında **Kullanım istatistiklerini paylaş**'ı kapatabilir. Uygulama o zaman göndermeyi durdurur ve henüz göndermediklerini unutur. Varsayılan olarak açıktır ve ne yaptığını söyleyen kısa bir not vardır.

## Ne kadar saklanır

Uygulamanın gönderdikleri (her açılış, ekran veya arama) her planda 90 gün saklanır. Bunlardan hesaplanan günlük toplamlar planınızın belirlediği süre boyunca saklanır: Starter'da 3 ay, Growth'ta 1 yıl, Pro'da 2 yıl ve Business'ta 3 yıl (süreyi **Lisans ve eklenti** sayfasındaki plan ayrıntılarınız ve [fiyatlar sayfası](/pricing) gösterir) ve Analiz sayfası daha geriye gitmez. Uygulamanız silindiğinde her şey silinir. Uygulamanızın gizlilik politikası birinci taraf kullanım istatistikleri kullandığınızı belirtmelidir: [Google Play'de yayınlayın](/docs/google-play) ve [App Store'da yayınlayın](/docs/app-store) rehberlerindeki mağaza yanıtlarına bakın.

---

Analiz her pakette vardır. Geldikten sonra yaptığınız ilk derlemeden itibaren sayar: başlamak için yeni bir sürüm derleyip yayımlayın.
`,
  },
};
