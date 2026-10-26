import type { DocTranslation } from "../translation-types";

/** 55 The documentation in Turkish, part 4: publishing. */
export const TR_DOCS_4: Record<string, DocTranslation> = {
  "developer-accounts": {
    title: "Geliştirici hesapları",
    description: "Google Play ve Apple geliştirici hesaplarınızı açın ve bir şirket hesabı için D-U-N-S numarası alın.",
    body: `Uygulamalarınız kendi adınızla yayımlanır; bu yüzden mağaza hesapları sizindir. Onları erkenden açın: Google ve Apple'ın kontrolleri bir günden birkaç haftaya kadar sürebilir.

## Başlamadan önce

- Her mağaza için kullanmaya devam edeceğiniz bir e-posta adresi
- Doğrudan Google'a ve Apple'a ödenen ücretler için bir ödeme kartı
- Şirketler için: yasal adı, adresi, web sitesi ve bir D-U-N-S numarası

## Bir D-U-N-S numarası alın (şirketler)

D-U-N-S numarası, Dun & Bradstreet'in şirketlere verdiği ücretsiz 9 haneli bir kimliktir. Apple kurum hesapları için ister, Google da sorar. Şirketinizi Apple'ın D-U-N-S arama sayfasında arayın, numarası yoksa oradan talep edin. Gelmesi birkaç gün sürebilir.

## Bir Google Play geliştirici hesabı açın

Bir Google hesabıyla **Google Play Console**'a kaydolun, kişisel veya kurum hesabı seçin, tek seferlik kayıt ücretini ödeyin ve kimliğinizi doğrulayın. Yeni kişisel hesaplar üretime yayımlamadan önce test kullanıcılarıyla kapalı bir test yürütmelidir ([Google Play'de yayınlayın](/docs/google-play) rehberine bakın).

## Apple Developer Program'a katılın

İki adımlı doğrulaması açık bir Apple Hesabıyla developer.apple.com'da kaydolun. **Individual** veya **Organization**'ı (D-U-N-S numaranızla) seçin ve yıllık ücreti ödeyin. Ardından aynı Apple Hesabıyla **App Store Connect**'e giriş yapın.

## Pro ve Business'ta bize erişim verin

Pro ve Business paketlerinde derlemelerinizi sizin için biz yükleriz. Google Play hizmet hesabı anahtarını ve App Store Connect API anahtarını **Yayın** adımına ekleyin: [Kurulum adımları](/docs/setup-steps) rehberine bakın. Samsung Galaxy Store ve Huawei AppGallery anahtarları **Yayın › Diğer Android mağazaları**'na girilir.

## Samsung, Huawei ve Xiaomi

Android uygulamanız her pakette Samsung Galaxy Store, Huawei AppGallery ve Xiaomi GetApps'te de olabilir. Geliştirici hesapları ücretsizdir. [Samsung Galaxy Store'da yayınlayın](/docs/galaxy-store) ve [Huawei AppGallery'de yayınlayın](/docs/huawei-appgallery) rehberlerine bakın.
`,
  },
  "google-play": {
    title: "Google Play'de yayınlayın",
    description: "Uygulamanızı kendi Google Play geliştirici hesabınızla yayımlamak için panelinizdeki dosyaları kullanın.",
    body: `Uygulamanızı kendi Google Play geliştirici hesabınızla yayımlamak için panelinizdeki dosyaları kullanın. Pro ve Business paketlerinde her yeni sürümü sizin için biz yükleriz.

## Başlamadan önce

- Bir Google Play geliştirici hesabı ([Geliştirici hesapları](/docs/developer-accounts) rehberine bakın)
- [Derlemeler ve indirmeler](/dashboard/builds) sayfasından Android App Bundle (.aab) ve imzalama anahtarınız
- Mağaza görselleriniz: simge, öne çıkan görsel ve ekran görüntüleri
- Web sitenizde ya da herkese açık herhangi bir yerde bir gizlilik politikası sayfası

## Play Console'da uygulamayı oluşturun

Google Play Console'u açın, **Create app**'i seçin, uygulama adınızı ve varsayılan dilinizi girin ve **App** ile **Free**'yi seçin.

## Mağaza sayfasını doldurun

Kısa ve tam açıklamayı ekleyin, ardından mağaza görsellerinizden simgeyi (512 × 512), öne çıkan görseli (1024 × 500) ve telefon ekran görüntülerini yükleyin.

## Uygulama içeriği bölümünü tamamlayın

Gizlilik politikası bağlantınızı, içerik derecelendirmesini, hedef kitleyi ve veri güvenliği yanıtlarını ekleyin. Veri güvenliğinde uygulamanızın giriş için telefon numarası topladığını ve uygulamanızın istediği diğer her şeyi (ad, e-posta, şehir, siparişler) beyan edin.

Uygulamanız Yallapp'e kullanım istatistikleri de gönderir ([Analiz](/docs/analytics) rehberine bakın). Veri güvenliği formunda **App activity** altında **App interactions**, **In-app search history** ve **Other actions**'ı; **Device or other IDs** altında rastgele kurulum kimliğini beyan edin. Her biri için: **Collected**, paylaşılmaz (Yallapp sizin için işler), **processed ephemerally: no**, **optional** (insanlar uygulamanın Ayarlar'ından kapatabilir) ve amaç **Analytics**. Veriler aktarım sırasında şifrelenir ve insanlar silinmesini sizin aracılığınızla isteyebilir.

Bildirimler için Yallapp'in barındırılan API'sindeki uygulamalar, oturum açmış her telefonun bildirim jetonunu, uygulamanın orada gösterdiği dili ve oturum açtığı ülkeyi (bağlantıdan çıkarılır, IP adresinin kendisi saklanmaz) tutar; böylece bir dili okuyan ya da bir ülkede yaşayan kişilere kampanya gönderebilirsiniz. Mağazalar ayrıca oturum açmış her kişinin sepetindeki ürün sayısını (ürünleri değil) sepette kalan ürün hatırlatması için alır. **Location** altında **Approximate location**'ı, **Device or other IDs** altında bildirim jetonunu beyan edin. Her biri için: **Collected**, paylaşılmaz, zorunlu, amaç **App functionality**.

> **App access** altında inceleyicilere inceleme telefon numaranızı ve sabit kodunuzu verin: panelin **Uygulamaya giriş** sayfasından ya da WordPress'te eklentinin **Store review access** ayarından. Bu olmadan inceleyiciler giriş yapamaz ve uygulama reddedilebilir.

## Kapalı bir test yürütün

Bir kapalı test sürümü oluşturun ve .aab dosyanızı yükleyin. Yeni kişisel geliştirici hesapları üretime yayımlamadan önce gereken süre boyunca yeterli test kullanıcısıyla kapalı bir test yürütmelidir. Güncel gereksinimi Play Console'da kontrol edin.

## Üretime yayımlayın

Aynı .aab ile bir üretim sürümü oluşturun, sürüm notlarını ekleyin ve incelemeye gönderin. İmzalama anahtarınızı güvende tutun: gelecekteki her güncelleme onunla imzalanmalıdır.

## Pro ve Business: yüklemeyi bize bırakın

Google Cloud'da Play Console'unuzun projesi için bir hizmet hesabı ve ona ait bir JSON anahtarı oluşturun (**IAM › Service accounts › Keys**). Play Console'da **Users and permissions** altında hizmet hesabının e-postasını uygulamanızın sürümlerine erişimle davet edin. JSON anahtarını **Yayın** adımına yükleyin. Bundan sonra her yeni derlemeyi sizin için biz yükleriz.
`,
  },
  "app-store": {
    title: "App Store'da yayınlayın",
    description: "iOS uygulamanızı kendi Apple Developer hesabınızla yayımlayın.",
    body: `iOS uygulamanızı kendi Apple Developer hesabınızla yayımlayın. iOS uygulaması Growth, Pro ve Business paketleriyle gelir; Pro ve Business'ta her derlemeyi sizin için TestFlight'a biz yükleriz.

## Başlamadan önce

- Bir Apple Developer Program üyeliği ([Geliştirici hesapları](/docs/developer-accounts) rehberine bakın)
- **Yayın** adımında App Store Connect API anahtarınız: iOS derlemenizi imzalamak için buna ihtiyacımız var
- [Derlemeler ve indirmeler](/dashboard/builds) sayfasından iOS derlemeniz (.ipa) ya da Pro ve Business'ta bir TestFlight yüklemesi
- Mağaza görselleriniz ve iPhone ekran görüntüleriniz ile bir gizlilik politikası sayfası

## App Store Connect'te uygulamayı oluşturun

App Store Connect'te **Apps**'i açın, **+ › New App**'i seçin, iOS'u işaretleyin ve uygulama adınızı, ana dilinizi, bundle ID'yi ve bir SKU girin. Bundle ID, Mağaza sayfası adımınızdakiyle aynı olmalıdır.

## Derlemeyi yükleyin

Kendiniz yayımladığınızda .ipa dosyasını bir Mac'te Apple'ın **Transporter** uygulamasıyla yükleyin. Pro ve Business'ta onu sizin için TestFlight'a biz yükleriz. Derleme, Apple işledikten sonra App Store Connect'te görünür.

## App Store sayfasını doldurun

Mağaza görsellerinizden alt başlığı, açıklamayı, anahtar kelimeleri, destek adresini ve iPhone ekran görüntülerini ekleyin.

## App Privacy ve inceleme bilgilerini tamamlayın

App Privacy sorularını yanıtlayın (uygulamanız giriş için telefon numarası ve istediğiniz diğer her şeyi toplar) ve gizlilik politikası bağlantınızı ekleyin.

Uygulamanız Yallapp'e kullanım istatistikleri de gönderir ([Analiz](/docs/analytics) rehberine bakın). App Privacy'de **Usage Data › Product Interaction** ve **Search History**'yi, rastgele kurulum kimliği için de **Identifiers › Device ID**'yi ekleyin. Her biri için amaç olarak **Analytics**'i seçin, "linked to the user's identity" sorusuna **No**, "used for tracking" sorusuna **No** yanıtı verin. Uygulama takip izni istemez ve App Tracking Transparency penceresine ihtiyaç duymaz: reklam kimliği kullanmaz ve veri simsarlarıyla hiçbir şey paylaşmaz.

> İnceleyicilerin giriş yapabilmesi için **App Review Information** altına inceleme telefon numaranızı ve sabit kodunuzu ekleyin: panelin **Uygulamaya giriş** sayfasından ya da WordPress'te eklentinin **Store review access** ayarından.

## İncelemeye gönderin

Derlemeyi seçin, **Add for Review**'u seçin ve gönderin. iOS uygulamanız, Apple'ın kurallarının gerektirdiği gibi ücretli kurslar veya dijital ürünler için satın alma düğmesi göstermez; bu yüzden iOS açıklamasında fiyatlardan ya da bunları satın almaktan söz etmeyin.
`,
  },
  "galaxy-store": {
    title: "Samsung Galaxy Store'da yayınlayın",
    description: "Android uygulamanızı kendi satıcı hesabınızla her Samsung telefondaki uygulama mağazası Galaxy Store'a koyun.",
    body: `Android uygulamanızı kendi satıcı hesabınızla her Samsung Galaxy telefon ve tablette bulunan uygulama mağazası Galaxy Store'a koyun. Google Play'deki Android uygulamasının aynısıdır. İlk sürümü kendiniz yüklersiniz; Pro ve Business paketlerinde sonraki her sürümü biz yükleriz.

## Başlamadan önce

- Bir Samsung hesabı ve Galaxy Store Seller Portal'da bir satıcı hesabı
- [Derlemeler ve indirmeler](/dashboard/builds) sayfasından Android uygulamanız (.apk)
- Mağaza görselleriniz: simge, ekran görüntüleri ve sayfa metinleri
- Web sitenizde ya da herkese açık herhangi bir yerde bir gizlilik politikası sayfası

## Satıcı hesabınızı oluşturun

Samsung hesabınızla Galaxy Store Seller Portal'a (seller.samsungapps.com) giriş yapın ve profilinizi tamamlayın. Samsung kayıt ücreti almaz. Bir şirket, Seller Portal'da şirket belgeleriyle ticari satıcı statüsüne başvurur; ücretli uygulama satabilmeniz için Samsung bunları kontrol eder.

## Uygulamanızı ekleyin ve ilk sürümü yükleyin

Seller Portal'da **Add New Application**'ı seçin, **Android**'i işaretleyin ve uygulamanızın varsayılan dilini ve adını girin. **Binary** altında Derlemeler ve indirmeler'deki .apk dosyasını yükleyin. Samsung hiçbir aracın yeni bir uygulama kaydetmesine izin vermez; bu yüzden bu ilk yükleme her zaman elle yapılır.

> App Bundle'ı değil, .apk'yı yükleyin. .apk, uygulamanızın yükleme anahtarıyla, yani sonraki her sürümün kullandığı aynı anahtarla imzalanmıştır.

## Sayfayı doldurun ve gönderin

Mağaza görsellerinizden açıklamayı, simgeyi (512 × 512) ve ekran görüntülerini, gizlilik politikası bağlantınızı ve yaş derecelendirmesini ekleyin. **Country/Region** altında nerede satılacağını seçin. Ardından **Submit**'i seçin. Samsung uygulamayı genellikle birkaç gün içinde inceler.

> İnceleme notlarında inceleyicilere inceleme telefon numaranızı ve sabit kodunuzu verin: panelin **Uygulamaya giriş** sayfasından ya da WordPress'te eklentinin **Store review access** ayarından.

## Pro ve Business: her güncellemeyi bize yükletin

Uygulamanız satışa çıktığında Seller Portal'da **Assistance › API Service**'i açın ve **Publishing** kapsamıyla **Create Service Account**'u seçin. Hizmet hesabı kimliğini ve özel anahtarını kopyalayın. Ardından panelinizde **Yayın › Diğer Android mağazaları**'nı açın ve bunları uygulamanızın **content ID**'siyle (Seller Portal'ın uygulamanız için gösterdiği numara) girin. Bundan sonra başlattığınız her derleme Galaxy Store'a yüklenir ve incelemeye gönderilir.

## Ekibimiz sizin için yayımladığında

**Benim için yayımla** ile **Yayın** sayfasında Samsung Galaxy Store'u işaretleyin. Ardından Seller Portal'da ekibimizin e-postasını uygulamalarınız için yönetici olarak davet edin (hesabınızın yönetici hesaplarından). Samsung daveti bize gönderir, gerisini biz hallederiz. Şifrenizi asla paylaşmazsınız.
`,
  },
  "huawei-appgallery": {
    title: "Huawei AppGallery'de yayınlayın",
    description: "Android uygulamanızı Huawei Push Kit üzerinden anlık bildirimlerle Huawei telefonlar için AppGallery'ye koyun.",
    body: `Son yıllarda satılan Huawei telefonlar Google Play olmadan gelir; bu yüzden sahipleri uygulamaları AppGallery'den kurar. Android uygulamanızı orada kendi geliştirici hesabınızla yayımlayın ve bu telefonlara da bildirimleriniz ulaşsın diye Huawei Push Kit'i ekleyin. İlk sürümü kendiniz gönderirsiniz; Pro ve Business paketlerinde sonraki her sürümü biz yükleriz.

## Başlamadan önce

- Bir HUAWEI ID ve HUAWEI Developers'ta doğrulanmış bir geliştirici hesabı
- [Derlemeler ve indirmeler](/dashboard/builds) sayfasından Android uygulamanız (.apk)
- Mağaza görselleriniz ve bir gizlilik politikası sayfası

## Geliştirici hesabınızı oluşturun

HUAWEI ID'nizle HUAWEI Developers'a kaydolun ve şirket ya da birey olarak kimlik doğrulamasını tamamlayın. Huawei kayıt ücreti almaz; kontrol birkaç gün sürebilir.

## Uygulamanızı AppGallery Connect'e ekleyin

AppGallery Connect'te **My projects**'i açın, bir proje oluşturun ve uygulamanızın paket adıyla (Mağaza sayfası adımınızdan) bir Android uygulaması ekleyin. Paket adı sonradan değiştirilemez.

## Huawei telefonlar için bildirimleri açın

Projede **Grow › Push Kit**'i açın ve etkinleştirin. Ardından **Project settings › App information**'ı açın: **agconnect-services.json**'ı indirin ve **App secret**'ı kopyalayın. Panelinizde **Yayın › Diğer Android mağazaları**'nı açın ve ikisini Huawei AppGallery altına ekleyin. Bir sonraki derlemeniz Huawei bildirimlerini içerir: Google Play olmayan Huawei telefonlarda uygulama Huawei Push Kit'e kaydolur ve bildirimleriniz onlara diğer telefonlar gibi ulaşır.

> Google Play olan telefonlar eskisi gibi Firebase'i kullanmaya devam eder. Huawei bildirimleri yalnızca bunu yapamayan telefonları ekler.

## İlk sürümü yükleyin ve gönderin

AppGallery Connect'te **My apps**'i açın, uygulamanızı ve **Version information**'ı seçin. Derlemeler ve indirmeler'deki .apk dosyasını yükleyin, açıklamayı, simgeyi, ekran görüntülerini, gizlilik politikası bağlantısını ve yaş derecelendirmesini doldurun ve **Submit**'i seçin. Huawei uygulamayı genellikle birkaç gün içinde inceler.

> İnceleyicilerin giriş yapabilmesi için inceleme notlarına inceleme telefon numaranızı ve sabit kodunuzu ekleyin.

## Pro ve Business: her güncellemeyi bize yükletin

AppGallery Connect'te **Users and permissions › API key › Connect API**'yi açın ve **App administrator** rolüyle bir API istemcisi oluşturun. İstemci kimliğini ve anahtarını **Yayın › Diğer Android mağazaları**'na kopyalayın. Bundan sonra başlattığınız her derleme AppGallery'ye yüklenir ve incelemeye gönderilir.

## Ekibimiz sizin için yayımladığında

**Benim için yayımla** ile **Yayın** sayfasında Huawei AppGallery'yi işaretleyin. Ardından AppGallery Connect'te **Users and permissions**'ı açın ve ekibimizin e-postasını **App administrator** ve **Operations** rolleriyle ekip üyesi olarak ekleyin. Huawei daveti bize gönderir; şifrenizi asla paylaşmazsınız.
`,
  },
  "xiaomi-getapps": {
    title: "Xiaomi GetApps'te yayınlayın",
    description: "Android uygulamanızı kendi geliştirici hesabınızla Xiaomi, Redmi ve POCO telefonlardaki uygulama mağazası GetApps'e koyun.",
    body: `Xiaomi, Redmi ve POCO telefonlar Xiaomi'nin kendi uygulama mağazası GetApps ile gelir. Android uygulamanızı orada kendi geliştirici hesabınızla yayımlayın: Google Play'deki Android uygulamasının aynısıdır. İlk sürümü kendiniz gönderirsiniz; Pro ve Business paketlerinde sonraki her sürümü biz yükleriz.

## Başlamadan önce

- Bir Xiaomi hesabı ve Xiaomi geliştirici platformunda bir geliştirici hesabı
- [Derlemeler ve indirmeler](/dashboard/builds) sayfasından Android uygulamanız (.apk)
- Mağaza görselleriniz: simge (512 × 512), ekran görüntüleri ve sayfa metinleri
- Web sitenizde ya da herkese açık herhangi bir yerde bir gizlilik politikası sayfası

## Geliştirici hesabınızı oluşturun

Xiaomi hesabınızla Xiaomi geliştirici platformunda (dev.mi.com) şirket ya da birey olarak geliştirici olarak kaydolun ve Xiaomi'nin kimlik kontrolünü tamamlayın. Xiaomi'nin GetApps için uluslararası bir geliştirici sitesi de vardır (global.developer.mi.com).

## Uygulamanızı ekleyin ve ilk sürümü gönderin

Uygulamanızı paket adıyla (Mağaza sayfası adımınızdan) oluşturun ve Derlemeler ve indirmeler'deki .apk dosyasını yükleyin. Xiaomi uygulamanın size ait olduğunu göstermenizi isteyebilir: verdiği adımları izleyin ve uygulamanızın anahtarıyla imzalanmış bir dosya isterse bize ulaşın.

> App Bundle'ı değil, .apk'yı yükleyin. .apk, uygulamanızın yükleme anahtarıyla, yani sonraki her sürümün kullandığı aynı anahtarla imzalanmıştır.

## Sayfayı doldurun ve gönderin

Açıklamayı, simgeyi, ekran görüntülerini, gizlilik politikası bağlantınızı ve yaş derecelendirmesini ekleyip gönderin. Xiaomi uygulamayı genellikle birkaç iş günü içinde inceler.

> İnceleme notlarında inceleyicilere inceleme telefon numaranızı ve sabit kodunuzu verin: panelin **Uygulamaya giriş** sayfasından ya da WordPress'te eklentinin **Store review access** ayarından.

## Pro ve Business: her güncellemeyi bize yükletin

Uygulamanız GetApps'te yer aldığında, geliştirici platformunun uygulama yönetiminden otomatik yayın API sayfasını açın. Gösterilen **özel anahtarı** kopyalayın ve Xiaomi'nin **genel sertifikasını** indirin. Ardından panelinizde **Yayın › Diğer Android mağazaları**'nı açın ve bunları giriş yaptığınız e-postayla girin. Yenilikleri de yazabilirsiniz; Xiaomi onu güncellemeyle birlikte gösterir. Bundan sonra başlattığınız her derleme Xiaomi GetApps'e yüklenir ve incelemeye gönderilir.

> Xiaomi her yüklemeyi uygulamanızın simgesiyle doğrudan incelemeye gönderir. Xiaomi konsolunda özel anahtarı sıfırlamak eskisini geçersiz kılar: yenisini panelinize girin.

Geliştirici hesabınızda otomatik yayın sayfası yoksa yüklemeler elle kalır: Derlemeler ve indirmeler'den .apk'yı indirin ve yeni bir sürüm olarak gönderin.

## Ekibimiz sizin için yayımladığında

**Benim için yayımla** ile **Yayın** sayfasında Xiaomi GetApps'i işaretleyin. Ardından ekibimizin e-postasını Xiaomi geliştirici hesabınıza uygulamalarınızı yönetebilecek bir üye olarak ekleyin. Üye eklenecek yeri bulamazsanız bize ulaşın, yolu birlikte bulalım. Şifrenizi asla paylaşmazsınız.
`,
  },
  builds: {
    title: "Derlemeler ve indirmeler",
    description: "Derlemelerinizi izleyin ve APK, App Bundle, iOS derlemesi, imzalama anahtarı ve mağaza görsellerinizi indirin.",
    body: `Panelinizdeki **Derlemeler ve indirmeler** sayfası, uygulamanızın her derlemesini sürümü ve durumuyla birlikte ve indirilecek dosyalarla listeler.

## Derlemeler ne zaman başlar

İlk derlemeniz kurulum adımlarını bitirdiğinizde başlar. Bundan sonra yeni bir sürüme ihtiyaç duyduğunuzda **Yeni derleme başlat** ile yenisini başlatın ([Bir güncelleme yayımlayın](/docs/updates) rehberine bakın). Sayfa, bir derleme çalışırken her adımı gösterir.

## Dosyalarınız

- **APK**: denemek için doğrudan bir Android telefona kurun.
- **App Bundle (.aab)**: Google Play'e yüklediğiniz dosya.
- **iOS derlemesi (.ipa)**: App Store Connect'e yüklediğiniz dosya. Pro ve Business'ta sizin için TestFlight'a yüklenir. Growth ve üzeri paketlerle gelir ve Yayın adımında App Store Connect API anahtarı gerektirir.
- **Android yükleme anahtarı**: anahtar deposu ve şifreleri. Google Play'deki gelecekteki her güncelleme bu aynı anahtara ihtiyaç duyar: bir kopyasını güvenli bir yerde saklayın.
- **Mağaza görselleri**: mağaza simgeleri, öne çıkan görsel, ekran görüntüleriniz ve sayfa metniniz.
- WordPress sitelerinde **WordPress eklentisi** (.zip).

İndirme bağlantıları sayfa her açıldığında yeniden oluşturulur ve birkaç dakika sonra geçersiz olur. Yenileri için sayfayı yenileyin.

## İmzalama anahtarınız güvende

Android imzalama anahtarınız ilk derlemenizle oluşturulur, şifreli saklanır ve asla değiştirilmez; böylece uygulamanızı Google Play'de her zaman güncelleyebilirsiniz.

## Yayımlamadan önce deneyin

APK'yı bir Android telefona kurun (telefon sorduğunda tarayıcınızdan veya dosyalar uygulamasından kuruluma izin verin). Pro ve Business'ta iOS derlemesini TestFlight ile deneyin.
`,
  },
  updates: {
    title: "Bir güncelleme yayımlayın",
    description: "Yeni sürüm olmadan neyin değiştiği ve gerektiğinde bir sürümü nasıl derleyip yayımlayacağınız.",
    body: `Çoğu değişiklik yeni bir uygulama sürümü gerektirmez: içerik, fiyatlar, sayfalar, görünüm, diller ve giriş ayarları web sitenizden veya panelinizden gelir ve uygulama bir sonraki açılışta bunları gösterir. Uygulama adınızı, simgenizi veya logonuzu değiştirdiğinizde ya da yeni uygulama özellikleri yayımladığımızda yeni bir sürüm derleyin.

## Yeni bir derleme başlatın

[Derlemeler ve indirmeler](/dashboard/builds) sayfasını açın, **Yeni derleme başlat**'ı seçin ve yeni uygulama sürümünü girin, örneğin 1.0.1. Her derleme otomatik olarak daha yüksek bir sürüm kodu alır.

## Yeni sürümü yayımlayın

Kendiniz yayımladığınızda yeni .aab'yi (ve .ipa'yı) indirin, ardından Google Play Console'da yeni bir sürüm (ve App Store Connect'te yeni bir versiyon) oluşturun. Pro ve Business'ta yeni sürümü sizin için biz yükleriz ve her adımı Derlemeler ve indirmeler sayfasında izleyebilirsiniz. Growth ve üzerinde uygulamanızın ayarlarını değiştirdiğinizde yeni bir derleme kendiliğinden başlar.

> Her zaman aynı Android imzalama anahtarını kullanın. Google Play farklı bir anahtarla imzalanmış güncellemeleri reddeder.

## İnsanlardan güncellemelerini isteyin

İnsanların yeni sürüme güncellemesini sağlamak için en düşük uygulama sürümünü belirleyin: WordPress'te Yallapp eklentisinin **Updates & maintenance** ayarlarında. Uygulama o zaman eski sürümlerden güncellemelerini ister.
`,
  },
  "store-rejections": {
    title: "Mağaza uygulamanızı reddederse",
    description: "Google ve Apple'ın bir uygulamayı reddetmesinin en yaygın nedenleri ve her birinin nasıl düzeltileceği.",
    body: `Apple ve Google her reddi mesajlarında açıklar. En yaygın nedenler ve nasıl düzeltilecekleri şunlardır.

## İnceleyiciler giriş yapamadı

Bir inceleme telefon numarası ve sabit bir kod belirleyin (panelin **Uygulamaya giriş** sayfasında ya da WordPress eklentisindeki **Store review access**'te) ve ikisini de inceleyicilere verin: Google Play Console'da **App access** altında, App Store Connect'te **App Review Information** altında.

## Eksik gizlilik bilgileri

Bir gizlilik politikası sayfası ekleyin, iki mağazada ve Mağaza sayfası adımında bağlantısını verin ve veri güvenliği (Google) ile App Privacy (Apple) yanıtlarını tamamlayın.

## Yetersiz içerik

İnceleme hesabının gerçek içerik görebildiğinden emin olun: dersli kurslar, ürünler, hizmetler veya ilanlar. Boş bir uygulama sınırlı işlevsellik nedeniyle reddedilebilir.

## iOS'ta satın almalar

iOS uygulamanız ücretli kurslar veya dijital ürünler satmaz. Fiyatları ve bunları satın alma bağlantılarını App Store açıklamanızdan ve ekran görüntülerinizden kaldırın.

## Hesap silme

Apple, insanların hesaplarını uygulama içinde silebilmesini şart koşar. Yallapp uygulamalarında bu, hesap ayarlarındadır; sorarlarsa inceleyiciyi oraya yönlendirin.

## Web sitesine benzeyen içerik

Apple, bir çerçevedeki web sayfasına benzeyen uygulamaları reddedebilir. Ana sayfanızı [Sayfalar ve görünüm](/docs/pages-and-look) bölümünde bloklarla oluşturun ve tek bir web sayfası yerine içeriğinizin yerel listelerini kullanın.

---

Hâlâ takıldınız mı? Ret mesajını WhatsApp'tan bize gönderin, yanıt vermenize yardım edelim.
`,
  },
};
