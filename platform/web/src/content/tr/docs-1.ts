import type { DocTranslation } from "../translation-types";

/** 55 The documentation in Turkish, part 1: getting started and the first content sources. */
export const TR_DOCS_1: Record<string, DocTranslation> = {
  "getting-started": {
    title: "Yallapp'e hoş geldiniz",
    description: "Yallapp'in ne yaptığı, neye ihtiyacınız olduğu ve kayıttan uygulamalarınızın mağazalara çıkmasına kadar izlenecek yol.",
    body: `Yallapp, markanızı taşıyan kendi Android ve iOS uygulamalarınızı oluşturur. Uygulamanız bir **akademi**, bir **mağaza**, bir **randevu** uygulaması ya da bir **emlak** uygulaması olabilir; içeriğini zaten işlettiğiniz web sitesinden, kullandığınız bir çevrimiçi platformdan, kendi API'nizden ya da web siteniz yoksa Yallapp panelinden alır. Bu belgeler sizi her adımda sade bir dille yönlendirir.

## Yallapp nasıl çalışır

- **Uygulamanızı panelde kurarsınız**: türü, içeriğinin nereden geldiği, adı, simgesi, renkleri ve sayfaları.
- **İçeriğiniz olduğu yerde kalır.** Bir web sitesi veya çevrimiçi platformla uygulama içeriği canlı okur. Bunlar yoksa ürünlerinizi, kurslarınızı, hizmetlerinizi veya ilanlarınızı panelden eklersiniz.
- **Uygulamalarınızı biz derleriz.** Google Play, App Store, Samsung Galaxy Store, Huawei AppGallery ve Xiaomi GetApps için dosyaları, imzalama anahtarınızı ve mağaza görsellerinizi alırsınız.
- **Onları kendi adınızla yayımlarsınız**; rehberlerimizle ya da Pro ve Business paketlerinde sizin için biz yayımlarız.
- **Uygulamanızı yeni sürüm olmadan değiştirirsiniz.** Sayfalar, görünüm, diller ve içerik panelden değişir ve uygulama bir sonraki açılışta bunları gösterir.

## Neye ihtiyacınız var

- İçeriğiniz: [desteklenen bir platformda](/integrations) bir web sitesi, kendi API'niz ya da hiçbiri
- Bir Google Play geliştirici hesabı ve iPhone'lar için Apple Developer Program üyeliği ([Geliştirici hesapları](/docs/developer-accounts) rehberine bakın); uygulamanızın Samsung, Huawei ve Xiaomi mağazalarında da olmasını istiyorsanız ücretsiz hesapları
- Uygulama simgeniz (1024 × 1024 piksel, kare bir PNG) ve logonuz
- Anlık bildirimler istiyorsanız ücretsiz bir Firebase projesi ([Firebase ile anlık bildirimler](/docs/push-notifications) rehberine bakın)

## Mağazalara giden yolunuz

1. [Hesabınızı oluşturun](/docs/create-account) ve etkinleştirilmesini sağlayın.
2. [Uygulama türünüzü seçin](/docs/app-types).
3. [İçeriğinizin nereden geleceğini seçin](/docs/content-sources) ve bağlayın.
4. [Kurulum adımlarını](/docs/setup-steps) tamamlayın: marka, mağaza sayfası ve yayın.
5. [Sayfalarınızı ve görünümünüzü](/docs/pages-and-look) oluşturun ve [dilleri](/docs/languages) açın.
6. Uygulamalarınızı [Derlemeler ve indirmeler](/docs/builds) sayfasından indirip [Google Play](/docs/google-play) ve [App Store](/docs/app-store) üzerinde, isterseniz [Samsung Galaxy Store](/docs/galaxy-store), [Huawei AppGallery](/docs/huawei-appgallery) ve Xiaomi GetApps üzerinde de yayımlayın.

## Yardım almak

Panelinizin her sayfasında ekibimizle WhatsApp'ı açan bir **Destek** bağlantısı vardır. Bize e-posta da gönderebilirsiniz. Gördüğünüz şeyin ekran görüntüsünü gönderin, size doğrudan yanıt verelim.
`,
  },
  "create-account": {
    title: "Hesabınızı oluşturun",
    description: "Kaydolun, hesabınızı etkinleştirin, paketinizi kartla ödeyin ve panelinize giriş yapın.",
    body: `Yallapp hesabınız, uygulamalarınızı kurduğunuz, derlediğiniz ve yönettiğiniz yerdir. Oluşturmak bir dakika sürer.

## Başlamadan önce

- E-posta adresiniz ve ülke koduyla WhatsApp numaranız
- Varsa web sitenizin adresi (daha sonra da ekleyebilirsiniz)

## Kaydolun

[Hesap oluşturun](/sign-up) sayfasını açın ve adınızı soyadınızı, e-postanızı, WhatsApp numaranızı ve en az 10 karakterli bir şifre girin. Web sitesi isteğe bağlıdır: uygulamalar Shopify ve diğer platformlardan ya da hiç web sitesi olmadan da oluşturulabilir. Şartları kabul ettiğinizi ve işletmeniz için kaydolduğunuzu onaylayıp **Hesap oluştur**'u seçin.

## Hesabınızı etkinleştirin

Yeni hesaplar etkinleştirilmeyi bekler. Bekleme sayfasında şunları yapabilirsiniz:

- Fiyatlar gösterildiğinde **kartla ödeyin**: paketinizi seçin, fatura şehrinizi ve adresinizi, varsa kupon kodunuzu girin. Ödeme sağlayıcımız Kashier'in güvenli sayfasında Mısır lirasıyla ödersiniz (Mısır dışında fiyat ABD doları olarak gösterilir ve tutarı bankanız dönüştürür); ödeme onaylanır onaylanmaz hesabınız etkinleşir.
- Paketinizi ekibimizle ayarlamak için **WhatsApp'tan bize yazın**. Ödeme onaylandığında hesabınızı etkinleştiririz.

Hesabınız etkinleştiğinde size e-posta göndeririz.

## Panelinize giriş yapın

E-postanız ve şifrenizle [giriş yapın](/sign-in). İlk seferde uygulama türünüzü seçersiniz, ardından kurulum adımları gelir. Şifrenizi mi unuttunuz? Giriş sayfasında **Şifrenizi mi unuttunuz?** seçeneğini seçin; yeni bir şifre belirlemeniz için size bir bağlantı gönderelim.
`,
  },
  "app-types": {
    title: "Uygulama türünüzü seçin",
    description:
      "Akademi, Mağaza, Restoran ve kafe, Randevu, Klinik, Spor salonu ve fitness, Emlak, Haber ve blog, Etkinlik ve bilet ya da Yardım ve bağış: her uygulama türünün ne yaptığı ve içeriğinin nereden gelebileceği.",
    body: `Uygulama türü, uygulamanızın ekranlarını ve alt sekmelerini belirler. Onu bir kez, **Uygulama kurulumu**'nun ilk sayfasında seçersiniz ve daha sonra değiştirebilirsiniz.

## Akademi

Kurslar, dersler, sınavlar, ilerleme ve sertifikalar. Öğrenciler kursları gezer, kaldıkları yerden öğrenmeye devam eder, korumalı videoları izler ve dersleri tamamlandı olarak işaretler. İçerik bir WordPress LMS'inden (Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo veya LearnDash), Teachable'dan, Thinkific'ten, kendi API'nizden ya da panelden eklediğiniz kurslardan gelir. [Akademi çözümüne](/solutions/academy) bakın.

## Mağaza

Ürünler, sepet, ödeme ve siparişler; çiçek ve hediye mağazaları için teslimat tarihleri ve hediye notlarıyla. İçerik WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, kendi API'niz ya da panelden eklediğiniz ürünlerden gelir. [Mağaza çözümüne](/solutions/store) bakın.

## Restoran ve kafe

Yemek için bir mağaza: kategorileri sekmeler halinde menünüz, seçenekli yemekler (boyut, yan ürün, ekstralar), şimdi ya da sonrası için gel-al veya teslimat ve her adımda bildirimle sipariş takibi. Müşteriler Android ve iPhone'da uygulama içinde kartla öder. Seçenekler, çalışma saatleri, gel-al, teslimat ve mutfak şimdilik web sitesi olmayan restoranlar içindir; WooCommerce ile yemekler ürün varyasyonlarını kullanır. [Restoranlar ve kafeler](/docs/restaurants) rehberine ve [Restoran ve kafe çözümüne](/solutions/restaurant) bakın.

## Randevu

Hizmetler, çalışanlar, boş saatler ve randevular. Müşteriler bir saat ayırtır, randevularını görür veya iptal eder; ödeme işletmenizde yapılır. İçerik WordPress'te Amelia, BookingPress veya LatePoint'ten, SimplyBook.me'den, kendi API'nizden ya da panelden eklediğiniz hizmetlerden gelir. [Randevu çözümüne](/solutions/bookings) bakın.

## Klinik

Doktorlar, diş hekimleri, terapistler ve diğer klinikler için, hastaların beklediği kelimelerle randevular: doktorlar, hastalar ve muayeneler. Hastalar her doktorun profilini okur, muayene ayırtır ve ön bilgi sorularınızı yanıtlar. Ön bilgi formu şimdilik web sitesi olmayan klinikler içindir; Amelia, BookingPress veya LatePoint ile hastalar formsuz randevu alır. [Klinikler: doktorlar, muayeneler ve ön bilgi formu](/docs/clinics) rehberine ve [Klinik çözümüne](/solutions/clinic) bakın.

## Spor salonu ve fitness

Spor salonları, stüdyolar ve koçlar için ders programları, yer ayırtma ve üyelikler. Üyeler haftanın derslerini kalan yerlerle görür, yer ayırtır ve kartla üyelik veya ders paketi satın alır. Dersler ve üyelikler şimdilik web sitesi olmayan salonlar içindir; özel seanslar Amelia, BookingPress veya LatePoint'ten de gelebilir. [Spor salonları ve stüdyolar: program, dersler ve üyelikler](/docs/fitness) rehberine ve [Spor salonu ve fitness çözümüne](/solutions/fitness) bakın.

## Emlak

Arama ve filtreler, favoriler ve ofisinize mesajlarla emlak ilanları. İlanlar her zaman Yallapp panelinden yönetilir; bu yüzden web sitesine ihtiyacınız yoktur. [Emlak çözümüne](/solutions/real-estate) bakın.

## Haber ve blog

Haber siteleri, bloglar ve dergiler için haberler, bölümler ve son dakika uyarıları. Okurlar en son haberleri ve bölümleri gezer, arama yapar, haberleri sonra okumak için kaydeder ve paylaşır. İçerik WordPress yazılarınızdan, herhangi bir web sitesinin RSS veya Atom akışından, kendi API'nizden ya da panelde yazdığınız haberlerden gelir. Okumak ücretsizdir: uygulamada ücretli içerik yoktur. [Haber ve blog çözümüne](/solutions/news) ve [Haber ve blog uygulamaları](/docs/news) rehberine bakın.

## Etkinlik ve bilet

Takvimli etkinlik listeleri, ücretsiz kayıtlar ve kapıda kontrol edilen QR kodlu ücretli biletler. İnsanlar biletlerini çevrimdışıyken de uygulamada saklar ve bir etkinlik değiştiğinde haberdar olur. Etkinlikler Yallapp panelinden yönetilir; bu yüzden web sitesine ihtiyacınız yoktur. [Etkinlik ve bilet çözümüne](/solutions/events) ve [Etkinlikler ve biletler](/docs/events) rehberine bakın.

## Yardım ve bağış

Yardım kuruluşları, gıda bankaları, vakıflar ve topluluk grupları için hikâyesi, hedefi ve ilerleme çubuğu olan kampanyalar. Destekçiler bir tutar seçer ve güvenli bağış sayfanızda kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal hesabınıza bağış yapar; e-postayla makbuz alır. Kampanyalar Yallapp panelinden yönetilir; bu yüzden web sitesine ihtiyacınız yoktur. iPhone'da bağış sayfası, Apple'ın gerektirdiği gibi tarayıcıda açılır. [Yardım ve bağış uygulamaları](/docs/donations) rehberine ve [Yardım ve bağış çözümüne](/solutions/charity) bakın.

## Uygulama türünü sonradan değiştirmek

**Uygulama kurulumu**'nu açıp başka bir tür seçin. Bir sonraki derlemeniz yeni türün ekranlarını içerir. Eski tür için hazırlanan içerik, örneğin bir mağaza ya da randevu kurulumu, aktarılmaz: yeni türün içeriğini seçmek için **Web sitesi** adımını yeniden geçin.
`,
  },
  "content-sources": {
    title: "Uygulamanızın içeriği nereden gelir",
    description: "Web sitesi adımındaki her seçenek, her birinin hangi uygulama türlerine uyduğu ve her biriyle insanların nasıl giriş yaptığı.",
    body: `Uygulama kurulumunun **Web sitesi** adımında, uygulamanızın kurslarını, ürünlerini, hizmetlerini veya ilanlarını nereden alacağını seçersiniz. Seçenekler uygulama türünüze bağlıdır.

## Seçenekler

- **WordPress sitem**: Yallapp eklentisini sitenize kurun. Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo, LearnDash, WooCommerce, Amelia, BookingPress ve LatePoint ile çalışır. [WordPress eklentisini kurun](/docs/wordpress-plugin) rehberine bakın.
- **Shopify mağazam** (Mağaza uygulamaları): [Shopify'ı bağlayın](/docs/shopify) rehberine bakın.
- **Başka bir mağaza platformu** (Mağaza uygulamaları): ikas, Ticimax, IdeaSoft, Wix, Salla veya Zid. [ikas'ı bağlayın](/docs/ikas), [Ticimax'i bağlayın](/docs/ticimax), [IdeaSoft'u bağlayın](/docs/ideasoft), [Wix mağazanızı bağlayın](/docs/wix), [Salla mağazanızı bağlayın](/docs/salla) ve [Zid mağazanızı bağlayın](/docs/zid) rehberlerine bakın.
- **Teachable veya Thinkific okulum** (Akademi uygulamaları): [Teachable'ı bağlayın](/docs/teachable) ve [Thinkific'i bağlayın](/docs/thinkific) rehberlerine bakın.
- **SimplyBook.me hesabım** (Randevu uygulamaları): [SimplyBook.me'yi bağlayın](/docs/simplybook) rehberine bakın.
- **Sitemin RSS akışı** (Haber ve blog uygulamaları): herhangi bir web sitesinin RSS veya Atom akışındaki haberler. [Haber ve blog uygulamaları](/docs/news) rehberine bakın.
- **Web sitem yok**: içeriğinizi panelden ekleyin. [Web sitesi olmadan](/docs/no-website) rehberine bakın.
- **Kendi API'm** (Akademi, Mağaza, Randevu ve Haber ve blog uygulamaları): geliştiriciler için. [Kendi API'nizi bağlayın](/docs/my-own-api) rehberine bakın.
- **WordPress'i benim için kurun**: ekibimiz sizin için bir WordPress sitesi kurar ve içeriğinizi taşır.

Emlak uygulamalarının tek bir seçeneği vardır: **Yallapp'te yönetilen ilanlar**; Yardım ve bağış uygulamalarının da tek bir seçeneği vardır: **Yallapp'te yönetilen kampanyalar**.

## İnsanlar uygulamanıza nasıl giriş yapar

- **WordPress**: uygulamanızın adıyla waabek.com üzerinden WhatsApp'tan gönderdiğimiz tek kullanımlık bir kodla. İnsanlar web sitenizdeki hesaplarını, Digits ile oluşturulanlar dahil, aynen kullanır. İsterseniz kodları Digits kendi altyapınızla gönderebilir: [WordPress eklentisini kurun](/docs/wordpress-plugin#sign-in-codes) rehberine bakın.
- **Kendi API'm**: kodu API'niz, kendi sisteminizden SMS veya WhatsApp ile gönderir.
- **Diğer tüm seçenekler**: waabek.com üzerinden WhatsApp'tan gönderdiğimiz tek kullanımlık bir kodla. Giriş kurallarını panelin **Uygulamaya giriş** sayfasında belirlersiniz. [Uygulama kullanıcıları ve giriş](/docs/app-users) rehberine bakın.

## Anahtarlarınız güvende

Platform anahtarları ve token'lar kaydedilmeden önce platformla kontrol edilir, şifreli saklanır ve bir daha gösterilmez. Birini değiştirmek için üzerine yenisini yapıştırın.

## WordPress'i sizin için kuralım

Henüz web siteniz yok ama bir tane mi istiyorsunuz? **WordPress'i benim için kurun** seçeneğini seçin, varsa mevcut web sitenizi girin ve içeriğinizden bahsedin: platformunuz, kaç ürününüz veya kursunuz olduğu ve bugün nerede oldukları. Ekibimiz WhatsApp'tan fiyat ve sonraki adımlarla size yazar. Yeni WordPress siteniz hazır olduğunda geri dönüp **WordPress sitem** seçeneğini seçin.

## Seçiminizi sonradan değiştirmek

Web sitesi adımını yeniden açıp başka bir kaynak seçin. Bir sonraki derlemeniz onu kullanır. Panelden eklediğiniz içerik, geri dönerseniz orada kalır.
`,
  },
  "wordpress-plugin": {
    title: "WordPress eklentisini kurun",
    description: "WordPress web sitenizi uygulamanıza bağlayan Yallapp eklentisini kurun ve ayarlarını seçin.",
    body: `Yallapp eklentisi WordPress web sitenizi uygulamanıza bağlar. Kurs, mağaza veya randevu eklentinizi bulur ve içeriğini uygulamanıza canlı olarak sunar. Onu bir kez kurarsınız ve diğer eklentiler gibi güncellenir.

## Başlamadan önce

- https üzerinde WordPress 6.0 veya üzeri ve PHP 7.4 veya üzeri
- Desteklenen eklentilerden biri: kurslar için Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo veya LearnDash; mağaza için WooCommerce; randevular için Amelia, BookingPress veya LatePoint
- Giriş için hiçbir şey: tek kullanımlık kodları WhatsApp'tan biz göndeririz. Digits isteğe bağlıdır (aşağıdaki [Giriş kodları](#sign-in-codes) bölümüne bakın)
- [Lisans ve eklenti](/dashboard/license) sayfasına erişimi olan etkin bir Yallapp hesabı

## Eklentiyi indirin

Panelinizde **Lisans ve eklenti**'yi açın ve **Eklentiyi indir**'i seçin. Bir .zip dosyası alırsınız. Arşivden çıkarmayın.

## WordPress'e yükleyin

WordPress yönetim panelinde **Plugins › Add New Plugin › Upload Plugin** bölümüne gidin, .zip dosyasını seçin, ardından **Install Now** ve **Activate**'i seçin.

## Lisansınızı etkinleştirin

WordPress yönetim menüsünde bir **Yallapp** öğesi görünür. Lisans anahtarınızı oraya yapıştırıp **Activate**'i seçin. [Lisansınızı etkinleştirin](/docs/wordpress-license) rehberine bakın.

## Eklentinin bulduklarını kontrol edin

**Compatibility status** kartı, bulduğu kurs, mağaza ve randevu eklentilerini sürümleriyle, giriş kodlarını kimin gönderdiğini ve Digits'in etkin olup olmadığını gösterir. Kullandığınız bir şey **Not found** olarak görünüyorsa kurulu ve etkin olduğunu kontrol edin.

## Giriş kodları {#sign-in-codes}

İnsanlar uygulamanıza telefon numaraları ve 6 haneli bir kodla giriş yapar. Eklentinin **Sign-in** ayarlarında kodu kimin göndereceğini seçin:

- **Sent by Yallapp (WhatsApp)**, varsayılan: her kodu uygulamanızın adıyla waabek.com üzerinden WhatsApp'tan biz göndeririz. Kurulacak bir şey yok; yalnızca etkin lisansınız gerekir. Kod web sitenizde oluşturulur ve orada yalnızca özet (hash) olarak, 5 dakika ve 5 deneme boyunca tutulur. Telefon numarasını ve kodu WhatsApp'a iletiriz, hiçbirini saklamayız.
- **Digits**: kodlar Digits'te kurulu SMS veya WhatsApp altyapısıyla gönderilir. Bunun için Digits'in **REST API** eklentisi gerekir; o olmadan bu seçenek kullanılamaz olarak görünür.

Digits'i REST API eklentisi olmadan, örneğin yalnızca Additional SMS Gateways eklentisiyle mi kullanıyorsunuz? O zaman kodları biz göndeririz ve üyeleriniz için hiçbir şey değişmez: uygulama her hesabı Digits'in kaydettiği telefon numarasıyla bulur; böylece insanlar aynı numarayla giriş yapar ve hesaplarını, ilerlemelerini ve siparişlerini korur. Web sitenizdeki Digits girişi de eskisi gibi çalışmaya devam eder.

Kaydettiğiniz seçenek kod gönderemiyorsa (REST API eklentisi olmayan Digits ya da etkin lisans yoksa) eklenti diğerini kullanır ve ayarlar sayfası bunu açıkça söyler.

## Ayarlarınızı seçin

Eklentinin ayarları uygulamanızın nasıl davranacağını belirler. En önemlileri:

- **Sign-in**: giriş kodlarını kimin gönderdiği (yukarıya bakın), uygulamadan yeni hesap açılıp açılamayacağı, kayıtta neler sorulacağı, insanların ne kadar süre girişli kalacağı, cihaz sınırına ulaşıldığında ne olacağı ve **Store review access** (Apple ve Google inceleyicileri için bir test numarası ve sabit kod)
- **Purchases**: Android'deki **Enroll now** düğmesi, ücretsiz kayıt ve ödeme sayfasının uygulama içinde mi yoksa telefonun tarayıcısında mı açılacağı
- **Video & content protection**: ekran görüntüsü ve ekran kaydını engelleme, video filigranı, video bağlantılarının ne kadar geçerli olacağı ve zorunlu izleme süresi
- **Lesson content (HTML & code)**: derslerin nasıl gösterileceği, gömülü araçların yüksekliği ve kod renklendirme
- **Store app**: banner, teslimat tarihleri ve hediye notları
- **Notifications (Firebase)**: [Firebase ile anlık bildirimler](/docs/push-notifications) rehberine bakın
- **Updates & maintenance**: en düşük uygulama sürümü ve mesajlı bakım modu

Değişiklikler, yeni derleme olmadan uygulama bir sonraki açılışında uygulanır.

## Web sitesi adımında WordPress sitem'i seçin

Yallapp panelinizde **Uygulama kurulumu › Web sitesi**'ni açın, **WordPress sitem**'i seçin, web sitenizin https adresini girin ve **Kaydet ve devam et**'i seçin. Adım, eklentinin bağlı olup olmadığını gösterir.

## Üyelikler ve abonelikler

Uygulama, web sitenizin erişim verdiği üyelikleri izler:

- **Paid Memberships Pro**: **Require membership** olarak ayarlanmış bir kursun hangi planlarla açıldığını uygulama söyler. Bunlardan birine sahip olmayan öğrenciler kursa uygulamadan katılamaz; üyeler tek dokunuşla katılır ve üyelikleri sona erdiğinde dersler, web sitenizde olduğu gibi kapanır. Bu kursları LMS'nizde ücretsiz olarak ayarlayın.
- **WooCommerce Subscriptions** ve **LearnDash grupları**: LMS'niz erişimi web sitenizde verdiği gibi verir.

Öğrenciler üyeliklerini, aboneliklerini ve gruplarını ne zaman yenileneceği veya sona ereceğiyle birlikte **Hesap › Üyeliklerim** altında görür. Bunlar yalnızca web sitenizde satılır ve yönetilir: Android'de kurs sayfası web sitenizin üyeliklerini açabilir; iPhone uygulaması ise Apple'ın kuralları gereği onlara hiçbir zaman bağlantı vermez.

## Mağaza siparişleri

WooCommerce ile müşteriler siparişlerini uygulamada görür ve biri değiştiğinde bildirim alır:

- **Kargo takibi**: şimdi yaptığınız gibi **WooCommerce Shipment Tracking** veya **Advanced Shipment Tracking** ile ekleyin. Müşteri bir bildirim alır; uygulamadaki sipariş kargo firmasını, takip numarasını ve **Kargoyu takip et** düğmesini gösterir. Takip bilgisini değiştirmek müşteriyi yeniden bilgilendirir.
- **Tamamlandı, iptal edildi veya iade edildi**: siparişin durumunu değiştirdiğinizde müşteri bir bildirim alır.

- **İadeler**: eklentinin **Settings › Store app** bölümünde **Returns in the app** alanına, bir sipariş tamamlandıktan sonra müşterilerin kaç gün içinde iade isteyebileceğini yazın (iade yoksa 0). Müşteri uygulamadaki siparişte bir neden seçer ve not ekleyebilir. Size e-posta gelir ve talebi **WooCommerce › Orders** içindeki siparişte görürsünüz; orada bir yanıtla onaylar veya reddedersiniz, müşteriye uygulamada bildirilir. Ürün size ulaştığında iadeyi WooCommerce'te yapın. Yallapp eklentisi 0.4.17 veya sonrası.

Müşteriler sipariş güncellemelerini uygulamanın ayarlarından kapatabilir. Yallapp eklentisi 0.4.16 veya sonrası.

> Sayfalarınız, görünümünüz ve dilleriniz Yallapp panelinde oluşturulur; eklenti onları kendi kurslarınız, ürünleriniz ve yazılarınızla doldurur. Eklentinin **App pages and look** kartı yayımlanıp yayımlanmadıklarını gösterir ve onları hemen yenilemenizi sağlar.
`,
  },
  "wordpress-license": {
    title: "Lisansınızı etkinleştirin",
    description: "WordPress eklentisini lisans anahtarınızla Yallapp paketinize bağlayın ve yeni bir alan adına taşıyın.",
    body: `Lisans anahtarınız WordPress eklentisini Yallapp paketinize bağlar. Bir lisans aynı anda tek bir web sitesinde çalışır.

## Lisans anahtarınızı kopyalayın

Panelinizde [Lisans ve eklenti](/dashboard/license) sayfasını açın ve anahtarınızı kopyalayın. Şöyle görünür: **YALL-XXXX-XXXX-XXXX**. Hesabınız etkinleştirildiğinde size e-postayla da göndermiştik.

## Eklentiye yapıştırın

WordPress yönetim panelinde **Yallapp**'i açın, anahtarı lisans alanına yapıştırın ve **Activate**'i seçin.

## Durumu kontrol edin

Eklenti paketiniz ve yenileme tarihinizle birlikte **Active** gösterir; paneliniz de bağlı web sitesini gösterir. Eklenti lisansı 12 saatte bir kontrol eder; web sitenize ulaşılabildiğinde, panelinizdeki bir değişiklikten (uygulama türünüz, insanların nasıl giriş yaptığı, paketiniz veya yayımlanmış sayfalarınız) sonraki bir dakika içinde de kontrol eder. Bir süre bize ulaşamazsa uygulamanız 72 saat çalışmaya devam eder.

> Yeni bir alan adına mı taşınıyorsunuz? Eski sitedeki eklentide lisansı devre dışı bırakın ya da panelinizdeki **Lisans ve eklenti** sayfasından serbest bırakın. Ardından yeni sitede etkinleştirin. Aynı alan adının farklı bir klasöründeki web sitesi ayrı bir site sayılır.
`,
  },
};
