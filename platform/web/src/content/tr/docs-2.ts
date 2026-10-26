import type { DocTranslation } from "../translation-types";

/** 55 The documentation in Turkish, part 2: the online platforms and no website. */
export const TR_DOCS_2: Record<string, DocTranslation> = {
  shopify: {
    title: "Shopify'ı bağlayın",
    description: "Shopify mağazanızı bir Storefront API token'ıyla Mağaza uygulamasına bağlayın; sipariş geçmişi için isteğe bağlı bir Admin API token'ı ekleyin.",
    body: `Mağaza uygulamanız ürünlerini, koleksiyonlarını, fiyatlarını ve ödeme sayfasını Shopify mağazanızdan alabilir. Müşteriler, uygulama içinde Shopify'ın kendi ödeme sayfasında öder.

## Başlamadan önce

- Bir Shopify mağazası ve onun için uygulama geliştirme izni (mağaza sahibinde vardır)
- Yallapp uygulama türünüzün **Mağaza** olarak seçilmiş olması

## Shopify'da bir uygulama oluşturun

Shopify yönetim panelinizde **Settings › Apps and sales channels › Develop apps** bölümünü açın. Shopify isterse özel uygulama geliştirmeye izin verin. **Create an app**'i seçin ve bir ad verin, örneğin "Mobile app".

## Storefront API'yi açın

Uygulamanın yapılandırmasında ürünleri ve koleksiyonları okuma ve ödeme oluşturma izinleriyle **Storefront API** erişimini açın. Kaydedin, ardından **Install app**'i seçin. **API credentials** sekmesinde **Storefront API access token**'ı kopyalayın.

## İsteğe bağlı: sipariş geçmişi

Müşterilere siparişlerini uygulamada göstermek için aynı uygulamada **read_orders** ve **read_customers** izinleriyle **Admin API** erişimini açın, ardından **Admin API access token**'ı kopyalayın. Siparişler müşterilerin giriş yaptığı telefon numarasıyla eşleştirilir; bu yüzden mağazanızda aynı numarayı kullanmaları gerekir. Bir siparişi takip numarasıyla gönderdiğinizde, tamamladığınızda, iptal ettiğinizde veya iade ettiğinizde müşteriler bildirim de alır (15 dakika içinde, uygulamadan ödeme yaptıktan sonraki 30 gün boyunca) ve kargoyu siparişten takip eder.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın ve **Shopify mağazam**'ı seçin. Mağazanızın **myshopify.com** adresini (mağazanız kendi alan adını kullansa bile), web sitenizin adresini, Storefront API token'ını ve varsa Admin API token'ını girin. **Kaydet ve devam et**'i seçin. Token'ı kaydetmeden önce mağazanızla kontrol ederiz.

> Koleksiyonlar uygulamanızın kategorileri olur; **Home page** koleksiyonu da öne çıkan ürünleri olur. iPhone'larda, Apple'ın kurallarının gerektirdiği gibi dijital ürün (kargosuz) içeren sepetlerle ödeme yapılamaz. Shopify uygulamalarında ürün değerlendirmeleri kapalıdır.
`,
  },
  ikas: {
    title: "ikas'ı bağlayın",
    description: "ikas mağazanızı özel bir uygulamanın Client ID ve Client secret bilgileriyle Mağaza uygulamasına bağlayın.",
    body: `Mağaza uygulamanız ürünlerini, fiyatlarını ve stokunu ikas mağazanızdan alabilir. Müşteriler siparişlerini ikas ödeme sayfanızda tamamlar.

## Başlamadan önce

- Bir ikas mağazası ve paneline erişim
- Yallapp uygulama türünüzün **Mağaza** olarak seçilmiş olması

## ikas'ta özel bir uygulama oluşturun

ikas panelinizde **Apps › My Apps** bölümünü açın ve **read_products**, **read_orders**, **read_customers** ve **read_inventories** izinleriyle özel bir uygulama oluşturun. Kaydedin. **Client ID** ve **Client secret** gösterilir.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın, **Başka bir mağaza platformu**'nu ve ardından **ikas**'ı seçin. Şunları girin:

- **Mağaza adı**: ikas adresinizin ilk kısmı. your-store.myikas.com için your-store girin.
- Özel uygulamadaki **Client ID** ve **Client secret**.
- **Mağaza adresi** (isteğe bağlı): müşterilerinizin ziyaret ettiği adres, örneğin www.your-store.com. ikas'ta ayarlı ana adresi kullanmak için boş bırakın.

**Kaydet ve devam et**'i seçin. Anahtarları kaydetmeden önce ikas ile kontrol ederiz.
`,
  },
  ticimax: {
    title: "Ticimax'i bağlayın",
    description: "Ticimax mağazanızı bir web servis yetki koduyla Mağaza uygulamasına bağlayın.",
    body: `Mağaza uygulamanız ürünlerini, fiyatlarını ve stokunu Ticimax mağazanızdan alabilir. Müşteriler siparişlerini mağazanızın web sitesinde tamamlar.

## Başlamadan önce

- Bir Ticimax mağazası ve yönetim paneline erişim
- Yallapp uygulama türünüzün **Mağaza** olarak seçilmiş olması

## Ticimax'te bir web servis yetki kodu oluşturun

Ticimax yönetim panelinizde **Ayarlar › WS Yetki Kodu Yönetimi**'ni açın ve **Yeni Ekle**'yi seçin. Bir ad verin ve **Yetki Kodu Oluştur**'u seçin. Ürün, kategori, üye ve sipariş okuma ile sepet izinlerini açın ve kaydedin.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın, **Başka bir mağaza platformu**'nu ve ardından **Ticimax**'i seçin. **Mağaza adresi**'ni müşterilerin yazdığı gibi girin (örneğin www.your-shop.com) ve **Web servis yetki kodu**'nu yapıştırın. **Kaydet ve devam et**'i seçin. Kodu kaydetmeden önce mağazanızla kontrol ederiz.
`,
  },
  ideasoft: {
    title: "IdeaSoft'u bağlayın",
    description: "IdeaSoft mağazanızı bir API istemcisi ve yenileme token'ıyla Mağaza uygulamasına bağlayın.",
    body: `Mağaza uygulamanız ürünlerini, fiyatlarını, stokunu ve siparişlerini IdeaSoft mağazanızdan alabilir. Müşteriler mağazanızın ödeme sayfasında öder.

## Başlamadan önce

- Bir IdeaSoft mağazası ve ana yönetici hesabı (API istemcilerini yalnızca ana yönetici ekleyebilir)
- Yallapp uygulama türünüzün **Mağaza** olarak seçilmiş olması

## IdeaSoft'ta bir API istemcisi ekleyin

IdeaSoft panelinizde **Entegrasyonlar › API**'yi açın ve bir API istemcisi ekleyin. Herhangi bir ad girin ve **Redirect URI**'yi https://yallapp.com.tr/oauth/ideasoft olarak ayarlayın. Ürünler, kategoriler, para birimleri, siparişler ve üyeler için okuma; hızlı satın alma bağlantıları (**Hızlı Satın Al**) için yazma izni verin. **Client ID** ve **Client Secret**'ı kopyalayın.

## Bir yenileme token'ı alın

[yallapp.com.tr/oauth/ideasoft](/oauth/ideasoft) adresini açın, mağazanızın myideasoft.com adresini, Client ID'yi ve Client Secret'ı girin ve **Continue to IdeaSoft**'u seçin. IdeaSoft'ta erişimi onaylayın. Bir **yenileme token'ı** (refresh token) gösteren sayfaya geri dönersiniz: onu kopyalayın.

> O sayfa bunun yerine kısa bir kod gösterirse, onu Web sitesi adımına yapıştırıp 30 saniye içinde kaydedin ya da kalıcı bir token almak için baştan başlayın.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın, **Başka bir mağaza platformu**'nu ve ardından **IdeaSoft**'u seçin. **Mağaza adresi**'ni (your-store.myideasoft.com), **Client ID**'yi, **Client Secret**'ı ve **Yenileme token'ı**'nı girin. **Kaydet ve devam et**'i seçin. Kaydetmeden önce IdeaSoft ile kontrol eder ve erişimi sizin için yenileriz.
`,
  },
  wix: {
    title: "Wix mağazanızı bağlayın",
    description: "Wix mağazanızı bir Headless Client ID ile Mağaza uygulamasına bağlayın; sipariş geçmişi için isteğe bağlı bir API anahtarı ekleyin.",
    body: `Mağaza uygulamanız ürünlerini, kategorilerini, fiyatlarını ve stokunu Wix mağazanızdan alabilir. Müşteriler, uygulama içinde Wix'in kendi ödeme sayfasında öder.

## Başlamadan önce

- **Wix Stores** olan bir Wix sitesi ve paneline erişim
- Yallapp uygulama türünüzün **Mağaza** olarak seçilmiş olması

## Wix'te bir OAuth uygulaması oluşturun

Wix sitenizin panelinde **Settings**'i ve ardından **Headless Settings**'i açın. **OAuth apps** altında yeni bir OAuth uygulaması oluşturun ve bir ad verin, örneğin "Mobile app". **Client ID**'sini kopyalayın.

Client ID, uygulamanın mağazanızı yalnızca web sitenizin bir ziyaretçisinin gördüğü gibi görmesini sağlar: ürünleriniz ve her sepet için bir ödeme sayfası. Hiçbir şeyi değiştiremez.

## İsteğe bağlı: sipariş geçmişi

Müşterilere siparişlerini uygulamada göstermek için bir API anahtarı oluşturun:

1. Wix'te hesabınızın **API Keys** sayfasını açın (hesap menüsünden) ve **Generate API Key**'i seçin.
2. Bir ad verin ve **Wix Stores** ile **eCommerce** siparişlerini okuma izni verin. Her müşterinin daha fazla siparişini bulmak için **Contacts** okumaya da izin verin.
3. API anahtarını kopyalayın. Wix onu yalnızca bir kez gösterir.
4. **Site ID**'nizi kopyalayın: site panelinizin adresinde, /dashboard/'dan sonra yer alır.

Siparişler müşterilerin giriş yaptığı telefon numarasıyla birebir eşleştirilir; bu yüzden mağazanızda aynı numarayı kullanmaları gerekir.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın, **Başka bir mağaza platformu**'nu ve ardından **Wix**'i seçin. Şunları girin:

- OAuth uygulamasındaki **Client ID**.
- Sipariş geçmişi için **API anahtarı** ve **Site ID** (isteğe bağlı, birlikte). Site ID olarak site panelinizin tam adresini yapıştırabilirsiniz.
- **Mağaza adresi** (isteğe bağlı): müşterilerinizin ziyaret ettiği adres, örneğin www.your-store.com. Alışveriş yapanlar ödemeden sonra buraya döner.

**Kaydet ve devam et**'i seçin. Client ID'yi ve anahtarı kaydetmeden önce Wix ile kontrol ederiz.

> Wix kategorileriniz uygulamanızın kategorileri olur. iPhone'larda, Apple'ın kurallarının gerektirdiği gibi dijital ürün içeren sepetlerle ödeme yapılamaz. Wix uygulamalarında ürün değerlendirmeleri kapalıdır. Hâlâ Wix'in eski ürün kataloğunu kullanan Wix mağazaları henüz bağlanamaz.
`,
  },
  salla: {
    title: "Salla mağazanızı bağlayın",
    description: "Salla mağazanızı birkaç tıklamayla Mağaza uygulamasına bağlayın: Salla'da Yallapp'in erişimini onaylayın, kopyalanacak anahtar yok.",
    body: `Mağaza uygulamanız ürünlerini, kategorilerini, fiyatlarını ve stokunu Salla mağazanızdan alabilir ve müşterilere siparişlerini gösterebilir. Müşteriler her siparişi Salla mağazanızda tamamlar.

## Başlamadan önce

- Bir Salla mağazası ve onu yöneten hesap
- Yallapp uygulama türünüzün **Mağaza** olarak seçilmiş olması

## Salla ile bağlanın

1. Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın, **Başka bir mağaza platformu**'nu ve ardından **Salla**'yı seçin.
2. **Salla ile bağlan**'ı seçin.
3. İsterse Salla'ya giriş yapın, mağazayı kontrol edin ve Yallapp'in ürünlerinize, siparişlerinize ve müşterilerinize erişimini onaylayın.
4. Salla sizi **Bağlı** ve mağazanızın adını gösteren Web sitesi adımına geri getirir. **Kaydet ve devam et**'i seçin.

Kopyalanacak anahtar yok: erişimi sizin için biz yenileriz. Başka bir mağaza bağlamak için **Başka bir Salla mağazası bağla**'yı seçin. Durdurmak için **Bağlantıyı kes**'i seçin ve Yallapp uygulamasını Salla panelinizden de kaldırın.

## Siparişler nasıl işler

Salla diğer uygulamaların alışveriş sepetini doldurmasına izin vermez; bu yüzden ödeme mağazanızda yapılır: uygulamada **Ödeme**, ürünün Salla mağazanızdaki sayfasını tarayıcıda açar; müşteri orada seçeneklerini belirleyip öder. Uygulama mağazanıza her seferinde bir ürün gönderir.

Müşteriler, mağazanızdaki hesaplarıyla aynı cep telefonu numarasıyla (ülke koduyla) giriş yaptıklarında siparişlerini uygulamada görür.

> **Salla** "Henüz kullanılamıyor" gösteriyorsa Salla mağazalarını bağlama hâlâ hazırlanıyordur. WhatsApp'tan bize yazın. Salla kategorileriniz uygulamanızın kategorileri olur. iPhone'larda, Apple'ın kurallarının gerektirdiği gibi dijital ürünler uygulamada satın alınamaz. Salla uygulamalarında ürün değerlendirmeleri kapalıdır.
`,
  },
  zid: {
    title: "Zid mağazanızı bağlayın",
    description: "Zid mağazanızı birkaç tıklamayla Mağaza uygulamasına bağlayın: Zid'de Yallapp'in erişimini onaylayın, kopyalanacak anahtar yok.",
    body: `Mağaza uygulamanız ürünlerini, kategorilerini, fiyatlarını ve stokunu Zid mağazanızdan alabilir ve müşterilere siparişlerini gösterebilir. Müşteriler her siparişi Zid mağazanızda tamamlar.

## Başlamadan önce

- Bir Zid mağazası ve onu yöneten hesap
- Yallapp uygulama türünüzün **Mağaza** olarak seçilmiş olması

## Zid ile bağlanın

1. Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın, **Başka bir mağaza platformu**'nu ve ardından **Zid**'i seçin.
2. **Zid ile bağlan**'ı seçin.
3. İsterse Zid'e giriş yapın ve Yallapp'in ürünlerinize, siparişlerinize ve müşterilerinize erişimini onaylayın.
4. Zid sizi **Bağlı** ve mağazanızın adını gösteren Web sitesi adımına geri getirir. **Kaydet ve devam et**'i seçin.

Kopyalanacak anahtar yok: erişimi sizin için biz yenileriz. Başka bir mağaza bağlamak için **Başka bir Zid mağazası bağla**'yı seçin. Durdurmak için **Bağlantıyı kes**'i seçin ve Yallapp uygulamasını Zid panelinizden de kaldırın.

## Siparişler nasıl işler

Ödeme mağazanızda yapılır: uygulamada **Ödeme**, ürünün Zid mağazanızdaki sayfasını tarayıcıda açar; müşteri orada seçeneklerini belirleyip öder. Uygulama mağazanıza her seferinde bir ürün gönderir.

Müşteriler, mağazanızdaki hesaplarıyla aynı cep telefonu numarasıyla (ülke koduyla) giriş yaptıklarında siparişlerini uygulamada görür.

> **Zid** "Henüz kullanılamıyor" gösteriyorsa Zid mağazalarını bağlama hâlâ hazırlanıyordur. WhatsApp'tan bize yazın. Zid kategorileriniz uygulamanızın kategorileri olur. iPhone'larda, Apple'ın kurallarının gerektirdiği gibi dijital ürünler uygulamada satın alınamaz. Zid uygulamalarında ürün değerlendirmeleri kapalıdır.
`,
  },
  teachable: {
    title: "Teachable'ı bağlayın",
    description: "Teachable okulunuzu bir API anahtarıyla Akademi uygulamasına bağlayın.",
    body: `Akademi uygulamanız kurslarını, derslerini ve öğrencilerin ilerlemesini Teachable okulunuzdan alabilir.

## Başlamadan önce

- **Growth** veya üzeri pakette bir Teachable okulu (API bunu gerektirir)
- Okul sahibinin hesabı (API sayfasını yalnızca sahibi görür)
- Yallapp uygulama türünüzün **Akademi** olarak seçilmiş olması

## Teachable'da bir API anahtarı oluşturun

Teachable okul yönetiminizde **Settings › API**'yi açın ve **Create API Key**'i seçin. Anahtarı kopyalayın.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın ve **Teachable veya Thinkific okulum**'u, ardından **Teachable**'ı seçin. **Okul adresi**'ni (örneğin your-school.teachable.com ya da okulunuzun kendi alan adı) girin ve **API anahtarı**'nı yapıştırın. **Kaydet ve devam et**'i seçin. Anahtarı kaydetmeden önce Teachable ile kontrol ederiz.

> Öğrenciler uygulamaya, kullandıkları telefon numarasına WhatsApp'tan gönderdiğimiz bir kodla giriş yapar. Apple'ın kurallarının gerektirdiği gibi ücretli kurslar iPhone uygulamasında satılmaz.
`,
  },
  thinkific: {
    title: "Thinkific'i bağlayın",
    description: "Thinkific okulunuzu bir API erişim token'ıyla Akademi uygulamasına bağlayın.",
    body: `Akademi uygulamanız kurslarını, derslerini ve ilerlemeyi Thinkific okulunuzdan alabilir; uygulamada ücretsiz kayıtla.

## Başlamadan önce

- **Grow** veya üzeri pakette bir Thinkific okulu (API erişimi bunu gerektirir)
- Yallapp uygulama türünüzün **Akademi** olarak seçilmiş olması

## Thinkific'te bir API erişim token'ı oluşturun

Thinkific yönetiminizde **Settings › Code & analytics › API** bölümüne gidin, bir API erişim token'ı ekleyin ve kopyalayın. Thinkific onu yalnızca bir kez gösterir.

> Thinkific Plus'ta token'ın yanında bir kez **tek oturum açma (SSO) imzalama anahtarı** gösterilir. Onu da kopyalayın: onunla öğrenciler dersleri okulunuza zaten giriş yapmış olarak açar.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın ve **Teachable veya Thinkific okulum**'u, ardından **Thinkific**'i seçin. **Okul alt alan adı**'nı (your-school.thinkific.com için your-school) girin, **Erişim token'ı**'nı ve varsa **SSO imzalama anahtarı**'nı yapıştırın. **Kaydet ve devam et**'i seçin. Token'ı kaydetmeden önce Thinkific ile kontrol ederiz.
`,
  },
  simplybook: {
    title: "SimplyBook.me'yi bağlayın",
    description: "SimplyBook.me hesabınızı API anahtarı ve bir API kullanıcısıyla Randevu uygulamasına bağlayın.",
    body: `Randevu uygulamanız hizmetlerini, ekibini ve boş saatlerini SimplyBook.me'den alabilir. Müşteriler randevularını uygulamada alır, görür ve iptal eder.

## Başlamadan önce

- **API** özel özelliği (ücretli bir özellik) olan bir SimplyBook.me hesabı
- Yallapp uygulama türünüzün **Randevu** olarak seçilmiş olması

## SimplyBook.me'de API'yi açın

SimplyBook.me'de **Custom Features**'ı açın ve **API**'yi etkinleştirin. Ardından ayarlarını açın (yeni yönetimde **Settings › Integrations › API**) ve **API key**'i kopyalayın.

## Bir API kullanıcı anahtarı oluşturun

API özelliğinin ayarlarında, **API user keys** altında şirketinizin bir yönetici kullanıcısı (ya da uygulama için eklediğiniz bir kullanıcı) için anahtar oluşturun. Uygulamadan yapılan randevular bu kullanıcının erişimiyle oluşturulur. Kullanıcının şifresi de çalışır, ancak anahtar daha iyidir.

## Web sitesi adımına girin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın ve **SimplyBook.me hesabım**'ı seçin. Şunları girin:

- **Şirket girişi**: SimplyBook.me'ye giriş yaptığınız ad; aynı zamanda randevu sitenizin adresinin ilk kısmı (mycompany.simplybook.me'deki mycompany)
- **API anahtarı**
- **API kullanıcı girişi** ve **API kullanıcı anahtarı veya şifresi**
- **API sunucusu**: hesabınız simplybook.me dışında başka bir SimplyBook alan adında değilse boş bırakın

**Kaydet ve devam et**'i seçin. Kaydetmeden önce SimplyBook.me ile kontrol ederiz.
`,
  },
  "no-website": {
    title: "Web sitesi olmadan: her şeyi Yallapp'te yönetin",
    description: "Web sitesi olmadan mağaza, restoran, akademi, randevu, emlak, haber, etkinlik veya yardım kuruluşu uygulaması çalıştırın; içeriğiniz Yallapp panelinde.",
    body: `Bir uygulamanız olması için web sitesine ihtiyacınız yok. Web sitesi adımında **Web sitem yok**'u seçin (Emlak uygulamalarında **Yallapp'te yönetilen ilanlar**; Etkinlik ve bilet uygulamalarında **Yallapp'te yönetilen etkinlikler**); içeriğiniz için panelinizin menüsünde yeni sayfalar görünür.

## Uygulama türüne göre neleri yönetirsiniz

- **Mağaza**: **Ürünler** sayfasında ürünler, kategoriler, stok ve kargo; **Siparişler** sayfasında siparişler. Müşteriler iyzico, Kashier, Fawaterk, Stripe veya PayPal üzerinden kartla öder. [Ürünler, siparişler ve kargo](/docs/store-orders) ve [Kartla ödeme](/docs/card-payments) rehberlerine bakın.
- **Restoran ve kafe**: **Menü** sayfasında yemekler, seçenekleri, çalışma saatleri, gel-al ve teslimat; **Mutfak** sayfasında siparişler. [Restoranlar ve kafeler](/docs/restaurants) rehberine bakın.
- **Akademi**: **Kurslar** sayfasında kurslar, bölümler ve dersler; ücretli kursların siparişleri. [Web sitesi olmadan kurslar](/docs/courses) rehberine bakın.
- **Randevu**: **Hizmetler ve ekip** sayfasında hizmetler, ekibiniz, çalışma saatleri ve randevu kuralları; **Randevular** sayfasında randevular. [Hizmetler, ekip ve randevular](/docs/bookings) rehberine bakın.
- **Klinik**: **Doktorlar ve hizmetler** sayfasında hizmetler, doktorlarınız ve ön bilgi formunuz; **Muayeneler** sayfasında muayeneler. [Klinikler: doktorlar, muayeneler ve ön bilgi formu](/docs/clinics) rehberine bakın.
- **Spor salonu ve fitness**: **Dersler ve koçlar** sayfasında dersler ve koçlar, **Program**'da haftalık dersleriniz, **Üyelik paketleri**'nde paketler ve **Üyeler**'de kimin üyeliği olduğu. [Spor salonları ve stüdyolar: program, dersler ve üyelikler](/docs/fitness) rehberine bakın.
- **Emlak**: **İlanlar** sayfasında mülkler, **Talepler** sayfasında mesajlar. [İlanlar ve talepler](/docs/real-estate) rehberine bakın.
- **Haber ve blog**: **Haberler** sayfasında haberler ve bölümler; son dakika haberleri okurlarınızın telefonlarına gönderilir. [Haber ve blog uygulamaları](/docs/news) rehberine bakın.
- **Etkinlik ve bilet**: **Etkinlikler** sayfasında etkinlikler, bilet türleri, satışlar ve katılımcılar; **Giriş** sayfasında kapıda kontrol edilen biletler. [Etkinlikler ve biletler](/docs/events) rehberine bakın.
- **Yardım ve bağış**: **Kampanyalar** sayfasında kampanyalar, **Bağışlar** sayfasında bağışlar ve bağışçılar. [Yardım ve bağış uygulamaları](/docs/donations) rehberine bakın.

## Giriş, bildirimler ve ayarlar

Müşterileriniz WhatsApp'tan gönderdiğimiz bir kodla giriş yapar. Menünüzde iki sayfa daha görünür: giriş kuralları için **Uygulamaya giriş** ([Uygulama kullanıcıları ve giriş](/docs/app-users) rehberine bakın) ve anlık bildirim göndermek için **Uygulama bildirimleri** ([Firebase ile anlık bildirimler](/docs/push-notifications) rehberine bakın).

## Verileriniz nerede tutulur

İçeriğiniz ve müşterilerinizin hesapları, siparişleri ve randevuları Yallapp tarafından webek.org'un barındırdığı sunucularda tutulur. Ödeme anahtarları şifrelenir.

## Değişiklikler hemen görünür

Eklediğiniz veya değiştirdiğiniz şey, yeni derleme olmadan uygulamada hemen görünür.
`,
  },
};
