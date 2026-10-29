import type { MarketingTranslation } from "../translation-types";

/** 55 The marketing pages' lists in Turkish (lib/marketing.ts is the English source). */

const STORES = "Google Play, App Store, Samsung Galaxy Store, Huawei AppGallery ve Xiaomi GetApps";
const MORE_ANDROID = "Samsung Galaxy Store, Huawei AppGallery ve Xiaomi GetApps";

export const TR_MARKETING: MarketingTranslation = {
  screenAlt: {
    "academy-home": "Kurslarıyla bir akademi uygulamasının ana ekranı",
    "academy-course": "Dersleriyle bir kurs sayfası",
    "academy-lesson": "Video ve metinden oluşan bir ders",
    "academy-home-ar": "Arapça, sağdan sola bir akademi uygulamasının ana ekranı",
    "academy-home-dark": "Koyu temada bir akademi uygulamasının ana ekranı",
    "store-home": "Ürünleriyle bir mağaza uygulamasının ana ekranı",
    "store-product": "Fiyatı ve seçenekleriyle bir ürün sayfası",
    "store-cart": "Bir mağaza uygulamasının sepeti",
    "store-home-bold": "Cesur şablonda bir mağaza uygulaması",
    "store-home-minimal": "Sade şablonda bir mağaza uygulaması",
    "restaurant-menu": "Kategorileri sekmelerde bir kafenin menüsü",
    "restaurant-dish": "Seçenekleriyle bir yemek: boyut, yan ürün ve ekstralar",
    "restaurant-order": "Alındıdan hazıra bir siparişin adımları",
    "bookings-services": "Bir randevu uygulamasının hizmet listesi",
    "bookings-slots": "Randevu almak için boş saatler",
    "clinic-doctor": "Uzmanlıkları, konuştuğu diller ve tanıtımıyla bir doktor profili",
    "clinic-intake": "Hastanın randevu alırken doldurduğu ön bilgi formu",
    "fitness-timetable": "Her derste kalan yerlerle bir spor salonunun ders programı",
    "fitness-membership": "Kalan dersleriyle bir üyelik ve satıştaki paketler",
    "realestate-search": "Filtrelerle emlak arama",
    "realestate-listing": "Fotoğrafları ve ayrıntılarıyla bir emlak ilanı",
    "realestate-search-ar": "Arapça, sağdan sola emlak arama",
    "news-home": "Manşetleri ve bölümleriyle bir haber uygulamasının ana ekranı",
    "news-article": "Görseli, yazarı ve tarihiyle bir haber",
    "events-list": "Tarih ve fiyatlarıyla yaklaşan etkinlikler listesi",
    "events-ticket": "Girişte göstermeye hazır, QR kodlu bir bilet",
    "charity-home": "Bir yardım kuruluşu uygulamasının kampanyaları ve hedeflerine ne kadar yakın oldukları",
    "charity-campaign": "Hikâyesi, ilerlemesi ve bağış tutarlarıyla bir kampanya",
    "dashboard-pages": "Yallapp panelindeki sayfa ve görünüm düzenleyici",
    "dashboard-setup": "Yallapp panelindeki uygulama kurulum adımları",
    "dashboard-builds": "Yallapp panelindeki derlemeler ve indirmeler",
    "studio-cafe-home": "Yallapp Studio'da tasarlanmış bir kafenin ana sayfası, yemekler için kendi kartlarıyla",
    "studio-cafe-home-dark": "Aynı Studio sayfası karanlık modda, karanlık renkleriyle",
    "delivery-send": "Bir teslimat uygulamasında paket gönderme ekranı: hizmet, alış ve teslim yeri",
    "delivery-shipment": "Yoldaki bir gönderi, kuryesi ve her aşamasıyla",
    "delivery-courier": "Aynı uygulamada bir kuryenin işleri, mesai düğmesiyle",
    "food-restaurants": "Bir yemek siparişi uygulamasının restoranları, mutfakları ve teslimat süreleriyle",
    "food-menu": "Yemek siparişi uygulamasında bir restoranın menüsü",
    "food-order": "Bir yemek siparişini aşamaları ve kuryesiyle takip etmek",
    "rides-where": "Yolculuk istemek: her araç türü ücretiyle",
    "rides-ride": "Yoldaki bir yolculuk: sürücü, araç ve sürücüye söylenecek kod",
    "rides-driver": "Çevrimiçi bir sürücü, sunulan bir yolculuk ve almak için kalan saniyeler",
    "studio-editor": "Yallapp Studio düzenleyicisi: solda öğeler, telefonda sayfa, sağda ayarları",
    "studio-home": "Hesabın projeleriyle Yallapp Studio ana sayfası",
    "studio-project": "Bir Studio projesinin paneli",
  },
  kindNames: {
    Academy: "Akademi",
    Store: "Mağaza",
    "Restaurant & café": "Restoran ve kafe",
    Bookings: "Randevu",
    Clinic: "Klinik",
    "Gym & fitness": "Spor salonu ve fitness",
    "Real estate": "Emlak",
    "News & blog": "Haber ve blog",
    "Events & tickets": "Etkinlik ve bilet",
    "Charity & donations": "Yardım ve bağış",
    "Services & companies": "Hizmetler ve şirketler",
    "Delivery & couriers": "Teslimat ve kurye",
    "Food delivery": "Yemek siparişi",
    "Ride hailing": "Yolcu taşıma",
  },
  solutions: {
    academy: {
      name: "Akademi",
      appsTitle: "Akademi uygulamaları",
      apps: "akademi uygulamaları",
      app: "akademi uygulaması",
      demo: "akademi demosunu",
      demoApp: "akademi demo uygulamamızı",
      summary: "Kurslar, dersler, sınavlar, ilerleme ve sertifikalar.",
      audience: "Çevrimiçi akademiler, eğitim merkezleri, koçlar ve okullar için.",
      sources: [
        "Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo veya LearnDash ile WordPress",
        "Teachable",
        "Thinkific",
        "Kendi API'niz",
        "Web sitesi yok: kurslar Yallapp panelinden yönetilir",
      ],
      highlights: [
        {
          title: "Korumalı video",
          text: "Yüklenen videolar süresi dolan bağlantılardan, öğrencinin numarasıyla filigranlı oynatılır. Android'de ekran görüntüsü ve ekran kaydı engellenir; iOS'ta ekran kaydedilirken video gizlenir.",
        },
        {
          title: "Doğru görünen dersler",
          text: "Metin, görseller, YouTube, Vimeo, gömülü araçlar ve kod blokları telefona göre boyutlandırılır. Telefonun kendi başına gösteremediği sayfalar, öğrenci giriş yapmış olarak tıpkı web sitenizdeki gibi açılır.",
        },
        {
          title: "Sınavlar, ilerleme ve sertifikalar",
          text: "WordPress LMS ile sınavları LMS'iniz değerlendirir, ilerleme web sitenizle eşitlenir; sertifikalar, değerlendirmeler ve eğitmenlere sorular LMS'inizde varsa görünür.",
        },
        {
          title: "Kursları doğru şekilde satmak",
          text: "Ücretsiz kurslar: Android ve iOS'ta tek dokunuşla kayıt. Ücretli kurslar Android'de satın alınır; iOS uygulaması, Apple kurallarının gerektirdiği gibi satın alma düğmesi göstermez.",
        },
      ],
      inTheApp: [
        "Kursları kategoriye göre gezme ve arama",
        "Kaldığı yerden öğrenmeye devam etme",
        "Dersleri izleme, ekleri açma ve dersleri tamamlandı olarak işaretleme",
        "Sınavlara girme ve sonuçları görme (WordPress LMS)",
        "Kursları istek listesine ekleme, değerlendirme ve soru sorma (WordPress LMS)",
        "Yeni dersler ve duyurular hakkında bildirim alma",
      ],
      forYou: [
        "Kurslarınızı bugün nerede yönetiyorsanız orada yönetmeye devam edin ya da panelden ekleyin",
        "Her öğrencinin kaç cihaz kullanabileceğini sınırlayın",
        "Telefon numarasıyla öğrenci ekleyin (Yallapp'te yönetilen kurslar)",
        "Öğrencilerinize anlık bildirim gönderin",
      ],
      docs: ["WordPress eklentisini kurun", "Teachable'ı bağlayın", "Thinkific'i bağlayın", "Web sitesi olmadan kurslar"],
    },
    store: {
      name: "Mağaza",
      appsTitle: "Mağaza uygulamaları",
      apps: "mağaza uygulamaları",
      app: "mağaza uygulaması",
      demo: "mağaza demosunu",
      demoApp: "mağaza demo uygulamamızı",
      summary: "Ürünler, sepet, ödeme ve siparişler.",
      audience: "Fiziksel veya dijital ürün satan mağazalar, çiçekçiler, butikler ve markalar için.",
      sources: [
        "WooCommerce ile WordPress",
        "Shopify",
        "ikas",
        "Ticimax",
        "IdeaSoft",
        "Wix",
        "Salla",
        "Zid",
        "Kendi API'niz",
        "Web sitesi yok: ürünler Yallapp panelinden yönetilir",
      ],
      highlights: [
        {
          title: "Her zaman doğru bir sepet",
          text: "Sepet uygulamada durur ve her seferinde güncel fiyatlar, stok ve adet sınırlarıyla mağazanıza göre fiyatlandırılır.",
        },
        {
          title: "Zaten güvendiğiniz ödeme",
          text: "Müşteriler kendi ödeme sayfanızda öder: WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla veya Zid. Web sitesi yoksa güvenli bir iyzico, Kashier, Fawaterk, Stripe veya PayPal sayfasında kartla öderler.",
        },
        {
          title: "Hediye ve çiçek için tasarlandı",
          text: "WooCommerce ile müşteriler teslimat tarihi seçip hediye notu ekleyebilir; kapalı günleri ve ne kadar ileriye sipariş verilebileceğini siz belirlersiniz.",
        },
        {
          title: "iOS kurallarına baştan uygun",
          text: "Fiziksel ürünler Android ve iOS'ta satılır. Dijital ürünler yalnızca Android'de satılır; böylece iPhone uygulamanız Apple'ın kurallarına uyar.",
        },
      ],
      inTheApp: [
        "Kategorileri, öne çıkan, indirimli ve yeni ürünleri gezme",
        "Seçenekleri belirleyip sepete ekleme",
        "Giriş yaparak ya da mağazanız izin veriyorsa misafir olarak ödeme",
        "Siparişlerini görme",
        "Kampanyalar ve yeni ürünler hakkında bildirim alma",
      ],
      forYou: [
        "Mağazanızı bugün nerede işletiyorsanız orada işletmeye devam edin ya da panelden ürün ekleyin",
        "Web sitesi yok: kargo ücretleri, belirli bir tutardan itibaren ücretsiz kargo, stok ve indirimli fiyatlar",
        "Web sitesi yok: siparişleri görün, tamamlandı veya iade edildi olarak işaretleyin, her ödenen sipariş için e-posta alın",
        "Müşteriler doğrudan kendi ödeme hesabınıza öder",
      ],
      docs: [
        "Shopify'ı bağlayın",
        "ikas'ı bağlayın",
        "Wix mağazanızı bağlayın",
        "Salla mağazanızı bağlayın",
        "Zid mağazanızı bağlayın",
        "Ürünler, siparişler ve kargo",
        "iyzico, Kashier, Fawaterk, Stripe veya PayPal ile kartla ödeme",
      ],
    },
    restaurant: {
      name: "Restoran ve kafe",
      appsTitle: "Restoran ve kafe uygulamaları",
      apps: "restoran ve kafe uygulamaları",
      app: "restoran uygulaması",
      demo: "kafe demosunu",
      demoApp: "kafe demo uygulamamızı",
      summary: "Seçenekli bir menü, gel-al veya teslimat ve sipariş takibi.",
      audience: "Gel-al veya teslimat siparişi alan restoranlar, kafeler, fırınlar ve mutfaklar için.",
      sources: [
        "Web sitesi yok: menü, çalışma saatleri, gel-al ve teslimat Yallapp panelinden yönetilir",
        "WooCommerce ile WordPress (seçenekler varyasyonlardan; gel-al, teslimat ve mutfak şimdilik yalnızca panelde)",
      ],
      highlights: [
        {
          title: "Menü gibi okunan bir menü",
          text: "Kategorileriniz üstte sekmeler halinde, tüm yemekler altında; her biri fotoğrafı, fiyatı ve açıklamasıyla.",
        },
        {
          title: "Yemekler herkesin sevdiği gibi",
          text: "Boyutlar, yan ürünler, soslar ve ekstralar; her biri kendi fiyatıyla. Hangilerinin seçilmesi gerektiğini ve kaç tane seçileceğini siz belirlersiniz. Fiyatları her zaman telefon değil, sunucumuz hesaplar.",
        },
        {
          title: "Gel-al veya teslimat, şimdi ya da sonra",
          text: "Çalışma saatleriniz, hazırlık süreniz, teslimat ücretiniz, en az sipariş tutarınız ve teslimat yaptığınız semtler. Kapalıyken uygulama ne zaman açılacağınızı söyler ve sonraki saatler için sipariş alır.",
        },
        {
          title: "Bir mutfak ekranı",
          text: "Yeni siparişler seçilenlerle birlikte Mutfak sayfanıza düşer. Hazırlanıyor, hazır, yolda ve tamamlandı olarak işaretleyin: her adım müşterinin telefonuna ulaşır.",
        },
      ],
      inTheApp: [
        "Menüyü kategoriye göre gezme",
        "Bir yemeğin seçeneklerini belirleyip fiyatın değişmesini görme",
        "Gel-al veya teslimat için, hemen ya da daha sonraki bir saate sipariş verme",
        "Android ve iPhone'da güvenli bir iyzico, Kashier, Fawaterk, Stripe veya PayPal sayfasında kartla ödeme",
        "Siparişin adımlarını izleme ve her adımda bildirim alma",
      ],
      forYou: [
        "Yemekleriniz, seçenekleri ve fiyatları, fotoğrafları ve kategorileri",
        "Çalışma saatleri, hazırlık süresi, gel-al adresi, teslimat ücreti, en az sipariş tutarı ve teslimat bölgeleri",
        "Mutfak sayfası: seçenekleriyle yeni siparişler ve her sonraki adım için bir düğme",
        "Her ödenen sipariş için bir e-posta",
        "Müşteriler doğrudan kendi ödeme hesabınıza öder",
      ],
      docs: ["Restoranlar ve kafeler: menü, gel-al, teslimat ve mutfak", "iyzico, Kashier, Fawaterk, Stripe veya PayPal ile kartla ödeme"],
    },
    bookings: {
      name: "Randevu",
      appsTitle: "Randevu uygulamaları",
      apps: "randevu uygulamaları",
      app: "randevu uygulaması",
      demo: "randevu demosunu",
      demoApp: "randevu demo uygulamamızı",
      summary: "Hizmetler, çalışanlar, boş saatler ve randevular.",
      audience: "Salonlar, klinikler, stüdyolar, danışmanlar ve randevuyla çalışan herkes için.",
      sources: [
        "Amelia, BookingPress veya LatePoint ile WordPress",
        "SimplyBook.me",
        "Kendi API'niz",
        "Web sitesi yok: hizmetler ve ekip Yallapp panelinden yönetilir",
      ],
      highlights: [
        {
          title: "Gerçek boş saatler",
          text: "Boş saatler, çalışma saatleri, izin günleri ve mevcut randevular dikkate alınarak işletmenizin saat diliminde rezervasyon sisteminizden gelir.",
        },
        {
          title: "Kurallarınız geçerlidir",
          text: "Randevular rezervasyon sisteminizden geçer; e-postaları, onayları ve takvim eşitlemesi her zamanki gibi çalışır. Web sitesi yoksa kuralları panelden belirlersiniz.",
        },
        {
          title: "Bir kişi ya da herhangi biri",
          text: "Müşteriler görmek istedikleri kişiyi ya da ilk boş kişiyi seçer.",
        },
        {
          title: "Daha az gelmeyen müşteri",
          text: "Müşteriler randevularını uygulamada görür ve izin verdiğiniz süreye kadar iptal edebilir.",
        },
      ],
      inTheApp: [
        "Hizmetleri fiyat ve süreleriyle kategoriye göre gezme",
        "Bir gün ve boş bir saat seçme",
        "İsteğe bağlı bir notla randevu alma",
        "Randevularını görme ve izin verildiğinde iptal etme",
      ],
      forYou: [
        "Rezervasyon eklentinizi veya SimplyBook.me'yi kullanmaya devam edin ya da her şeyi panelden kurun",
        "Web sitesi yok: ekibiniz, her kişinin verdiği hizmetler, çalışma saatleri ve izin günleri",
        "Web sitesi yok: onaylayın, reddedin, iptal edin, gerçekleşti veya gelmedi olarak işaretleyin ve her randevu için e-posta alın",
        "Ödeme işletmenizde yapılır; uygulama bir randevu için asla ödeme almaz",
      ],
      docs: ["WordPress eklentisini kurun", "SimplyBook.me'yi bağlayın", "Hizmetler, ekip ve randevular"],
    },
    clinic: {
      name: "Klinik",
      appsTitle: "Klinik uygulamaları",
      apps: "klinik uygulamaları",
      app: "klinik uygulaması",
      demo: "klinik demosunu",
      demoApp: "klinik demo uygulamamızı",
      summary: "Doktorlar, muayeneler, ön bilgi formu ve doktor profilleri.",
      audience: "Hastaları randevuyla kabul eden aile hekimleri, diş hekimleri, fizyoterapistler, terapistler ve diğer klinikler için.",
      sources: [
        "Web sitesi yok: doktorlar, hizmetler ve ön bilgi formu Yallapp panelinden yönetilir",
        "Amelia, BookingPress veya LatePoint ile WordPress (şimdilik ön bilgi formu olmadan)",
        "SimplyBook.me (şimdilik ön bilgi formu olmadan)",
        "Kendi API'niz",
      ],
      highlights: [
        {
          title: "Muayeneden önce bir ön bilgi formu",
          text: "Muayeneden önce bilmeniz gerekenleri sorun: kısa veya uzun yanıtlar, bir tarih ya da listeden bir seçim. Hastalar randevu alırken yanıtlar; hangi soruların zorunlu olduğunu siz seçersiniz.",
        },
        {
          title: "Yalnızca kliniğinizin gördüğü yanıtlar",
          text: "Ön bilgi yanıtlarını yalnızca hasta kendi muayenelerinde, kliniğiniz de panelinde görür. Yanıtlar asla e-postalara veya bildirimlere konmaz.",
        },
        {
          title: "Doktor profilleri",
          text: "Her doktorun unvanı, uzmanlıkları, konuştuğu diller ve hakkında birkaç satır; böylece hastalar kimi görmek istediklerini seçebilir.",
        },
        {
          title: "Gerçek boş saatler",
          text: "Her doktorun çalışma saatleri, izin günleri ve muayeneleri, kliniğinizin saat diliminde boş saatleri belirler. İki muayene asla çakışmaz.",
        },
      ],
      inTheApp: [
        "Hizmetleri ve doktorları fiyat ve süreleriyle gezme",
        "Bir doktorun profilini okuma: uzmanlıklar, diller ve tanıtım",
        "Seçilen bir doktorla ya da ilk boş doktorla bir gün ve boş saat seçme",
        "Randevu alırken ön bilgi sorularını yanıtlama",
        "Muayenelerini yanıtlarıyla görme ve izin verildiğinde iptal etme",
      ],
      forYou: [
        "Doktorlarınız, her birinin verdiği hizmetler, çalışma saatleri ve izin günleri",
        "Ön bilgi sorularınız, seçtiğiniz sırayla",
        "Muayeneler sayfasında hastanın yanıtlarıyla her muayene: onaylayın, iptal edin, gerçekleşti veya gelmedi olarak işaretleyin",
        "Her yeni muayene için, yanıtları içermeyen bir e-posta",
        "Ödeme kliniğinizde yapılır; uygulama bir muayene için asla ödeme almaz",
      ],
      docs: ["Klinikler: doktorlar, muayeneler ve ön bilgi formu", "Hizmetler, ekip ve randevular"],
    },
    fitness: {
      name: "Spor salonu ve fitness",
      appsTitle: "Spor salonu ve fitness uygulamaları",
      apps: "spor salonu ve fitness uygulamaları",
      app: "spor salonu uygulaması",
      demo: "spor salonu demosunu",
      demoApp: "spor salonu demo uygulamamızı",
      summary: "Ders programları, yer ayırtma ve üyelikler.",
      audience: "Spor salonları, yoga ve pilates stüdyoları, spinning ve boks kulüpleri ve grup dersleri veren koçlar için.",
      sources: [
        "Web sitesi yok: dersler, koçlar, haftalık program ve üyelik paketleri Yallapp panelinden yönetilir",
        "Özel seanslar için Amelia, BookingPress veya LatePoint ile WordPress (dersler ve üyelikler şimdilik web sitesi olmayan salonlar için)",
      ],
      highlights: [
        {
          title: "Haftalık bir program",
          text: "Her dersi bir kez ayarlayın: gün, saat, koç ve kaç kişilik olduğu. Uygulama sonraki sekiz haftayı gösterir; siz de her derse kimin geleceğini görürsünüz.",
        },
        {
          title: "Asla fazla rezervasyon yok",
          text: "Pek çok üye aynı anda yer ayırtsa bile yer yalnızca boş yer kaldıkça ayrılır. Üyeler belirlediğiniz süreye kadar yerlerini geri bırakabilir.",
        },
        {
          title: "Üyelikler ve ders paketleri",
          text: "Sınırsız ya da belirli sayıda dersli aylık, üç aylık veya yıllık paketler ve ders paketleri. Üyeler Android ve iPhone'da ödeme sayfanızda kartla öder.",
        },
        {
          title: "Üyeler hemen haberdar olur",
          text: "Bir dersi iptal edin; ayırtan herkes uygulamada bildirim alır, yerini ve ders hakkını geri alır.",
        },
      ],
      inTheApp: [
        "Haftanın derslerini koç ve kalan yerlerle gün gün görme",
        "Tek dokunuşla yer ayırtma ve izin verildiğinde iptal etme",
        "Üyelik veya ders paketi satın alma ve kalan dersleri görme",
        "Bir koçla boş bir saatte özel seans ayırtma",
      ],
      forYou: [
        "Dersleriniz ve koçlarınız, her koçun saatleriyle özel seanslar",
        "Her derse kimin geldiğiyle haftalık programınız",
        "Üyelik paketleriniz ve derslerin üyelik gerektirip gerektirmediği",
        "Kimin hangi üyeliğe sahip olduğu, ders ekleme ya da resepsiyonda ödenen üyeliği ekleme",
        "iyzico, Kashier, Fawaterk, Stripe veya PayPal ile kendi hesabınıza kartla ödeme",
      ],
      docs: ["Spor salonları ve stüdyolar: program, dersler ve üyelikler", "Hizmetler, ekip ve randevular", "iyzico, Kashier, Fawaterk, Stripe veya PayPal ile kartla ödeme"],
    },
    services: {
      name: "Hizmetler ve şirketler",
      appsTitle: "Hizmet ve şirket uygulamaları",
      apps: "hizmet ve şirket uygulamaları",
      app: "hizmet şirketi uygulaması",
      demo: "Hizmet şirketi demo uygulaması",
      demoApp: "hizmet şirketi demo uygulaması",
      summary: "Hizmetleriniz, ekibiniz ve kampanyalarınız, uygulamadan randevuyla.",
      audience: "Temizlik ve tamir şirketleri, ev ve güzellik hizmetleri, danışmanlıklar, ajanslar ve diğer hizmet işletmeleri için.",
      sources: [
        "Amelia, BookingPress veya LatePoint ile WordPress",
        "SimplyBook.me",
        "Kendi API'niz",
        "Web sitesi olmadan: hizmetler ve ekip Yallapp panelinde yönetilir",
      ],
      highlights: [
        {
          title: "Şirketinizi anlatan sayfalar",
          text: "Hazır tasarımlar ana sayfanın yanında bir Hakkımızda ve bir Kampanyalar sayfasıyla gelir; insanlar randevu almadan önce kim olduğunuzu ve neler sunduğunuzu görür.",
        },
        {
          title: "Gerçek boş saatler",
          text: "Boş saatler randevu sisteminizden ya da panelde ekibinizin çalışma saatlerinden, işletmenizin saat diliminde gelir. İki randevu asla çakışmaz.",
        },
        {
          title: "İşinizin arkasındaki ekip",
          text: "Ekibinizi gösterin; müşteriler istedikleri kişiyi ya da ilk müsait kişiyi seçsin.",
        },
        {
          title: "İnsanlara ulaşan kampanyalar",
          text: "Kampanyalarınızı kendi sayfalarına koyun ve birini uygulamanızı kullanan herkese bildirim olarak gönderin.",
        },
      ],
      inTheApp: [
        "Şirketiniz ve kampanyalarınız hakkında okuma",
        "Hizmetlerinize fiyat ve süreleriyle göz atma",
        "İsteğe bağlı bir notla gün ve boş saat seçme",
        "Randevularını görme ve izin verildiğinde iptal etme",
      ],
      forYou: [
        "Hizmet şirketleri için üç tasarımdan biriyle başlayın, sonra her sayfayı düzenleyin",
        "Randevu eklentinizi ya da SimplyBook.me'yi kullanmaya devam edin veya her şeyi panelde kurun",
        "Randevuları panelde onaylayın, iptal edin ya da gerçekleşti olarak işaretleyin; her randevu için bir e-posta alın",
        "Ödeme işletmenizde yapılır; uygulama bir randevu için asla ödeme almaz",
      ],
      docs: ["Hizmetler, ekip ve randevular", "SimplyBook.me'yi bağlayın"],
    },
    real_estate: {
      name: "Emlak",
      appsTitle: "Emlak uygulamaları",
      apps: "emlak uygulamaları",
      app: "emlak uygulaması",
      demo: "emlak demosunu",
      demoApp: "emlak demo uygulamamızı",
      summary: "Arama, filtreler, favoriler ve mesajlarla ilanlar.",
      audience: "Mülk satan veya kiralayan emlak ofisleri ve danışmanlar için.",
      sources: ["Web sitesi gerekmez: ilanlar Yallapp panelinden yönetilir"],
      highlights: [
        {
          title: "Doğru evi bulan arama",
          text: "Satılık veya kiralık, mülk türü, fiyat, oda sayısı, metrekare ve konum filtreleri; sıralama ve sayfalı sonuçlarla.",
        },
        {
          title: "Satan ilanlar",
          text: "Her mülkte sıralı fotoğraflar, bir video bağlantısı, özellikler, harita konumu ve benzer ilanlar.",
        },
        {
          title: "Favoriler",
          text: "İnsanlar beğendikleri evleri kaydeder ve onlara geri döner.",
        },
        {
          title: "Ofisinize mesajlar",
          text: "İnsanlar bir ilan hakkında ofisinize mesaj gönderir. Siz Talepler sayfasından yanıtlarsınız ve yanıtınız telefonlarına bildirim olarak ulaşır.",
        },
      ],
      inTheApp: [
        "Filtrelerle arama ve sonuçları sıralama",
        "Fotoğrafları, ayrıntıları, özellikleri ve harita konumunu görme",
        "Favorilere kaydetme",
        "Ofisinize mesaj gönderme ve yanıtları okuma",
      ],
      forYou: [
        "Mülkleri taslak olarak ekleyin, yayınlayın, öne çıkarın veya arşivleyin",
        "İletişim bilgilerinizi, para biriminizi ve alan biriminizi belirleyin",
        "Mesajları açın veya kapatın",
        "Her yeni mesaj için e-posta alın",
      ],
      docs: ["İlanlar ve talepler"],
    },
    news: {
      name: "Haber ve blog",
      appsTitle: "Haber ve blog uygulamaları",
      apps: "haber ve blog uygulamaları",
      app: "haber uygulaması",
      demo: "haber demosunu",
      demoApp: "haber demo uygulamamızı",
      summary: "Haberler, bölümler, arama ve son dakika uyarıları.",
      audience: "Haber siteleri, yerel gazeteler, dergiler ve bloglar için.",
      sources: [
        "Yallapp eklentisiyle WordPress yazıları",
        "Herhangi bir web sitesinin RSS veya Atom akışı",
        "Kendi API'niz",
        "Web sitesi yok: haberler Yallapp panelinde yazılır",
      ],
      highlights: [
        {
          title: "Cebinizde bir ön sayfa",
          text: "Manşetler, en son haberler ve her bölüm için bir sıra; yayımladığınız her şeyde arama.",
        },
        {
          title: "Son dakika haberleri",
          text: "Önemli haberleri okurlarınızın telefonlarına gönderin: yeni WordPress yazıları için otomatik olarak ya da panelde yayımlarken tek bir işaretle.",
        },
        {
          title: "Doğru görünen haberler",
          text: "Görseller, YouTube ve Vimeo videoları ve gömülü içerikler, akademi uygulamalarındaki dersler gibi telefona göre boyutlandırılır.",
        },
        {
          title: "Sonra okumak için kaydedilir",
          text: "Okurlar haberleri telefonlarına kaydeder ve herhangi birini tek dokunuşla paylaşır.",
        },
      ],
      inTheApp: [
        "Manşetleri ve en son haberleri okuma",
        "Bölümleri gezme ve tüm haberlerde arama",
        "Haberleri sonra okumak için kaydetme ve paylaşma",
        "Son dakika haberlerini bildirim olarak alma",
      ],
      forYou: [
        "WordPress'te ya da akışı olan herhangi bir sitede yayımlamaya devam edin veya panelde yazın",
        "Web sitesi yok: taslaklar, görseller, bölümler, yayımlama ve yayından kaldırma",
        "Haberlerin yazarını ve tarihini gösterip göstermeyeceğini seçin",
        "Okumak ücretsizdir: kurulacak ödeme duvarı veya uygulama içi satın alma yok",
      ],
      docs: ["Haber ve blog uygulamaları"],
    },
    events: {
      name: "Etkinlik ve bilet",
      appsTitle: "Etkinlik ve bilet uygulamaları",
      apps: "etkinlik ve bilet uygulamaları",
      app: "etkinlik uygulaması",
      demo: "etkinlik demosunu",
      demoApp: "etkinlik demo uygulamamızı",
      summary: "Etkinlik listeleri, ücretsiz kayıtlar ve QR kodlu ücretli biletler.",
      audience: "Kültür merkezleri, mekânlar, tiyatrolar, kulüpler, festivaller ve atölye ile söyleşi düzenleyenler için.",
      sources: ["Web sitesi yok: etkinlikler ve biletler Yallapp panelinden yönetilir"],
      highlights: [
        {
          title: "Programınız liste ve takvimde",
          text: "Görselleri, tarihleri, mekânı ve fiyatlarıyla yaklaşan etkinlikler; kategori filtreleri ve gün seçmek için bir takvim.",
        },
        {
          title: "Ücretsiz kayıtlar ve ücretli biletler",
          text: "Ücretsiz biletler tek dokunuşla. Ücretli biletler güvenli bir sayfada kartla ödenir ve ödeme onaylandığında düzenlenir. Bir yer asla iki kez satılmaz.",
        },
        {
          title: "Kapıda giriş kontrolü",
          text: "Her biletin bağlantı olmadan çalışan bir QR kodu vardır. Giriş sayfasında telefon kamerasıyla tarayın ya da kodunu yazın: her bilet yalnızca bir kez girer.",
        },
        {
          title: "Bilet sahipleri değişikliklerden haberdar olur",
          text: "Bir etkinliği erteleyin veya iptal edin; bileti olan herkes bildirim alır.",
        },
      ],
      inTheApp: [
        "Yaklaşan etkinlikleri kategoriye göre ya da takvimde gezme",
        "Ücretsiz bilet alma veya ücretli bilet satın alma",
        "Her bileti QR koduyla Biletlerim'de, çevrimdışıyken de saklama",
        "Etkinliği takvime ekleme ve mekânı haritada bulma",
      ],
      forYou: [
        "Görselli, mekânlı veya çevrimiçi bağlantılı etkinlikler; kendi fiyatı ve sınırı olan bilet türleri",
        "Her etkinlik için satışlar ve katılımcılar, CSV dışa aktarımıyla",
        "Biletleri kapıda bir telefonla kontrol edin, uygulama kurmaya gerek yok",
        "Kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal hesabınıza kartla ödeme",
      ],
      docs: ["Etkinlikler ve biletler"],
    },
    charity: {
      name: "Yardım ve bağış",
      appsTitle: "Yardım ve bağış uygulamaları",
      apps: "yardım ve bağış uygulamaları",
      app: "yardım kuruluşu uygulaması",
      demo: "yardım kuruluşu demosunu",
      demoApp: "yardım kuruluşu demo uygulamamızı",
      summary: "İlerlemesi görünen kampanyalar, bağışlar ve makbuzlar.",
      audience: "Yardım kuruluşları, gıda bankaları, vakıflar, camiler ve topluluk grupları için.",
      sources: ["Web sitesi yok: kampanyalar Yallapp panelinde yazılır", "Bağışlar kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal hesabınıza ödenir"],
      highlights: [
        {
          title: "İnsanların takip ettiği kampanyalar",
          text: "Her kampanyanın hikâyesi, görselleri, hedefi ve bağışlar onaylandıkça ilerleyen bir çubuğu vardır.",
        },
        {
          title: "Her bağış size ulaşır",
          text: "Bağışlar güvenli bir sayfada kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal hesabınıza ödenir. Yallapp paraya asla dokunmaz.",
        },
        {
          title: "Kâğıt işi olmadan makbuzlar",
          text: "Her bağışçı e-postayla makbuz alır ve tüm bağışlarını uygulamada Bağışlarım'da bulur.",
        },
        {
          title: "Bağışçılara ne olduğunu anlatın",
          text: "Bir kampanyaya bağış yapanlara güncelleme gönderin: uygulamalarına ve izin verdilerse telefonlarına ulaşır.",
        },
      ],
      inTheApp: [
        "Kampanyaları gezme ve her birinin hedefe ne kadar yakın olduğunu görme",
        "Bir tutar seçme, isimsiz bağış yapma ve mesaj bırakma",
        "Güvenli bağış sayfanızda bağış yapma (iPhone'da tarayıcıda)",
        "Geçmiş bağışları ve makbuzlarını görme",
      ],
      forYou: [
        "Hedefi, önerilen tutarları ve bitiş tarihi olan kampanyalar yazın",
        "Kampanyaları yayımlayın, kapatın ve öne çıkarın",
        "Tüm bağışları görün ve tablo olarak dışa aktarın",
        "Herkesin ne bağışladığıyla bir bağışçı listesi",
      ],
      docs: ["Yardım ve bağış uygulamaları"],
    },
  },
  integrations: {
    wordpress: {
      title: "Yallapp eklentisiyle WordPress",
      text: "Eklentimizi WordPress sitenize kurun. Aşağıdaki eklentileri bulur ve kurslarınızı, ürünlerinizi veya hizmetlerinizi uygulamanıza canlı olarak sunar. Verileriniz web sitenizde kalır.",
      items: {
        "Tutor LMS": { text: "Ücretsiz ve Pro: kurslar, dersler, sınavlar, sertifikalar, değerlendirmeler ve soru-cevap." },
        LearnPress: { text: "Kurslar, dersler, sınavlar ve ilerleme." },
        LifterLMS: { text: "Kurslar, dersler, sınavlar ve ilerleme." },
        "MasterStudy LMS": { text: "Kurslar, dersler, sınavlar ve ilerleme." },
        "Sensei LMS": { text: "Kurslar, dersler, sınavlar ve ilerleme." },
        Masteriyo: { text: "Kurslar, dersler, sınavlar ve ilerleme." },
        LearnDash: { text: "Kurslar, dersler, sınavlar ve ilerleme." },
        WooCommerce: { text: "Ürünler, kategoriler, değerlendirmeler, sepet fiyatlandırması ve ödeme; teslimat tarihleri ve hediye notlarıyla. Ücretli kursların ödemesi de buradan." },
        Amelia: { text: "Hizmetler, çalışanlar, boş saatler ve randevular." },
        BookingPress: { text: "Hizmetler, boş saatler ve randevular." },
        LatePoint: { text: "Hizmetler, çalışanlar, boş saatler ve randevular." },
        "WordPress posts": { name: "WordPress yazıları", text: "Görselleri, kategorileri ve yazarlarıyla yayımlanmış yazılar ve her yeni yazı için bir bildirim." },
      },
    },
    platforms: {
      title: "Anahtarlarınızla bağlanan çevrimiçi platformlar",
      text: "Platformunuzun yönetim panelindeki anahtarları Web sitesi adımına yapıştırın. Kaydetmeden önce platformla kontrol eder ve şifreli saklarız. Müşterileriniz uygulamaya WhatsApp'tan gönderilen bir kodla giriş yapar.",
      items: {
        Shopify: { text: "Ürünler, koleksiyonlar, sepet fiyatlandırması ve Shopify'ın kendi ödeme sayfası. İsteğe bağlı bir Admin API anahtarıyla sipariş geçmişi." },
        ikas: { text: "Ürünler, fiyatlar ve stok; ödeme ikas mağazanızda." },
        Ticimax: { text: "Ürünler, fiyatlar ve stok; müşteriler siparişlerini mağazanızda tamamlar." },
        IdeaSoft: { text: "Ürünler, fiyatlar, stok ve siparişler; müşteriler mağazanızın ödeme sayfasında öder." },
        Wix: { text: "Wix Stores ürünleri, kategorileri, sepet fiyatlandırması ve Wix'in kendi ödeme sayfası. İsteğe bağlı bir API anahtarıyla sipariş geçmişi." },
        Salla: { text: "Birkaç tıklamayla bağlanan ürünler, kategoriler, fiyatlar ve siparişler; müşteriler siparişlerini Salla mağazanızda tamamlar." },
        Zid: { text: "Birkaç tıklamayla bağlanan ürünler, kategoriler, fiyatlar ve siparişler; müşteriler siparişlerini Zid mağazanızda tamamlar." },
        Teachable: { text: "Okulunuzun kursları, dersleri ve öğrenci ilerlemesi." },
        Thinkific: { text: "Kurslar, dersler ve ilerleme; uygulamada ücretsiz kayıtla." },
        "SimplyBook.me": { text: "Hizmetler, ekip ve boş saatler; müşteriler randevularını uygulamada alır, görür ve iptal eder." },
        "RSS and Atom feeds": { name: "RSS ve Atom akışları", text: "Herhangi bir web sitesinin akışındaki haberler: Ghost, Blogger, Substack, Medium ve çoğu haber sistemi." },
      },
    },
    own: {
      title: "Kendi API'niz ya da hiç web sitesi olmadan",
      text: "Bir geliştiriciniz mi var? Belgelenmiş API'mizi herhangi bir web sitesinden sunun. Web siteniz yok mu? Her şeyi Yallapp panelinden ekleyin.",
      items: {
        "Your own API": { name: "Kendi API'niz", text: "Web siteniz Yallapp API'sini sunar. Web sitesi adımındaki canlı kontrol neyin eksik olduğunu söyler." },
        "Products in Yallapp": { name: "Yallapp'te ürünler", text: "Ürünler, kategoriler, stok ve kargo; iyzico, Kashier, Fawaterk, Stripe veya PayPal ile kartla ödeme ve paneldeki siparişlerle." },
        "Courses in Yallapp": { name: "Yallapp'te kurslar", text: "Video ve metinli kurslar, bölümler ve dersler; ücretsiz ve ücretli kurslar." },
        "Services in Yallapp": { name: "Yallapp'te hizmetler", text: "Hizmetler, ekip, çalışma saatleri, izin günleri ve randevu kuralları. Klinikler doktor profilleri ve ön bilgi formu ekler." },
        "Listings in Yallapp": { name: "Yallapp'te ilanlar", text: "Fotoğrafları, özellikleri, harita konumu ve mesajlarıyla mülkler." },
        "Articles in Yallapp": { name: "Yallapp'te haberler", text: "Görselli ve bölümlü haberler; hazır olduğunuzda yayımlanır, son dakika haberleriyle." },
        "Events in Yallapp": { name: "Yallapp'te etkinlikler", text: "Bilet türleri, ücretsiz kayıtlar, ücretli biletler, katılımcılar ve kapıda giriş kontrolüyle etkinlikler." },
        "Campaigns in Yallapp": { name: "Yallapp'te kampanyalar", text: "Hedefi ve ilerlemesi olan kampanyalar, kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal hesabınıza bağışlar, makbuzlar ve bağışçı listesi." },
      },
    },
    services: {
      title: "Sizin getirdiğiniz hesaplar",
      text: "Uygulamalarınız kendi hesaplarınızda çalışır; böylece müşterileriniz, ödemeleriniz ve mağaza sayfalarınız sizin kalır.",
      items: {
        "Google Play Console": { text: "Kendi geliştirici hesabınızla yayımlanan Android uygulamanız." },
        "App Store Connect": { text: "Kendi Apple Developer hesabınızla yayımlanan iOS uygulamanız." },
        "Samsung Galaxy Store": { text: "Kendi satıcı hesabınızla her Samsung Galaxy telefonda Android uygulamanız." },
        "Huawei AppGallery": { text: "Huawei Push Kit üzerinden anlık bildirimlerle Huawei telefonlar için Android uygulamanız." },
        "Xiaomi GetApps": { text: "Kendi geliştirici hesabınızla Xiaomi, Redmi ve POCO telefonlarda Android uygulamanız." },
        Firebase: { text: "Kendi Firebase projeniz üzerinden anlık bildirimler. Bu kullanım için ücretsiz." },
        iyzico: { text: "Web sitesi olmayan uygulamalarda, kendi iyzico üye işyeri hesabınıza kartla ödeme." },
        Kashier: { text: "Web sitesi olmayan uygulamalarda, kendi Kashier hesabınıza Mısır lirasıyla kartla ödeme." },
        Fawaterk: { text: "Web sitesi olmayan uygulamalarda, kendi Fawaterk hesabınıza Mısır lirasıyla kartla ödeme." },
      },
    },
  },
  features: {
    brand: {
      title: "Markanız, görünümünüz",
      text: "Uygulamanız adınızı, logonuzu ve renklerinizi taşır ve kendi geliştirici hesaplarınızla yayımlanır.",
      features: [
        {
          title: "Üç şablon",
          text: "Klasik, Cesur ve Sade; her birinin kendi düzeni ve varsayılan yazı tipi vardır.",
          details: [
            "Uygulama simgeniz, logonuz, ana renginiz ve açılış ekranı renginiz",
            "Seçebileceğiniz altı yazı tipi",
            "Keskin, yumuşak veya yuvarlak köşeler; düz, çerçeveli veya gölgeli kartlar",
            "Vurgular ve ilerleme için ikincil bir renk",
          ],
        },
        {
          title: "Açık ve koyu",
          text: "Açık, koyu ya da telefonun kendi ayarıyla açılır; isterseniz insanların uygulama ayarlarından değiştirmesine izin verin.",
          details: ["Açık, koyu veya telefona göre", "İzin verirseniz insanlar değiştirebilir", "Her şablon iki modu da destekler"],
        },
        {
          title: "Kendi uygulamanız olarak yayımlanır",
          text: `Android ve iOS uygulamalarınız ${STORES} üzerinde kendi hesaplarınızla yayımlanır.`,
          details: ["Kendi paket adınız ve bundle ID'niz", "Kendi mağaza başlığınız, açıklamalarınız ve ekran görüntüleriniz", "İndirmeye hazır Android imzalama anahtarınız"],
        },
      ],
    },
    pages: {
      title: "Yeni derleme olmadan sayfalar ve görünüm",
      text: "Uygulamanızın ekranlarını panelde bir site oluşturucu gibi kurun. Yayımlayın; uygulama bir sonraki açılışta güncellenir.",
      features: [
        {
          title: "Sürükle-bırak sayfalar",
          text: "Blokları üst üste ekleyin, sıraya sürükleyin ve canlı önizlemeyi görün.",
          details: [
            "11 blok: banner, metin, görsel, video, düğme, liste, kategoriler, arama kutusu, öğrenmeye devam, web sayfası ve boşluk",
            "Kendi kurslarınız, ürünleriniz, hizmetleriniz, yazılarınız veya ilanlarınızla dolan listeler",
            "Bir bloğu herkese ya da yalnızca giriş yapmış veya yapmamış kişilere gösterin",
            "Alt sekmeleriniz: etiketler, simgeler ve her birinin ne açtığı",
          ],
        },
        {
          title: "Taslaklar ve yayımlama",
          text: "Çalışırken değişiklikleriniz taslak olarak kaydedilir. Hazır olduğunuzda yayımlayın ya da taslağı silin.",
          details: ["Düzenledikçe taslak kaydedilir", "Tek tıkla yayımlama", "İstediğiniz an yayımlanmış sayfalara dönün"],
        },
      ],
    },
    languages: {
      title: "Sağdan sola dahil üç dil",
      text: "Her uygulama İngilizce konuşur. Arapça ve Türkçeyi açın ve kendi metinlerinizi her biri için çevirin.",
      features: [
        {
          title: "İngilizce, Arapça ve Türkçe",
          text: "İnsanlar dillerini uygulama ayarlarından seçer. Arapça sağdan sola gösterilir.",
          details: [
            "Uygulamanın kendi düğmeleri ve mesajları üç dilde",
            "Sayfa metinleriniz her dil için çevrilir, çeviri yoksa varsayılan dilinize döner",
            "Varsayılan dili ve insanların seçebileceği dilleri belirleyin",
          ],
        },
      ],
    },
    "sign-in": {
      title: "Şifreyle değil, kodla giriş",
      text: "İnsanlar telefon numaraları ve tek kullanımlık bir kodla giriş yapar. Hatırlanacak, sıfırlanacak bir şey yok.",
      features: [
        {
          title: "Tek kullanımlık kodlar",
          text: "Kodu WordPress siteleri dahil uygulamanızın adıyla waabek.com üzerinden WhatsApp'tan göndeririz. Kurulacak SMS altyapısı veya ek eklenti yok; bir WordPress sitesi bunun yerine Digits kullanabilir.",
          details: [
            "İstediğiniz bilgilerle uygulamadan kayıt",
            "Kişi başına cihaz sınırı, sizin belirlediğiniz",
            "Apple ve Google inceleyicileri için bir inceleme numarası ve sabit kod",
            "Mağazaların istediği gibi insanlar hesaplarını uygulamadan silebilir",
          ],
        },
        {
          title: "Anlık bildirimler",
          text: "Kendi Firebase projeniz üzerinden insanların telefonlarına ulaşın ve her mesajı uygulamanın bildirim kutusunda saklayın.",
          details: [
            "Panelden herkese gönderin (bir platforma bağlı ya da web sitesi olmayan uygulamalar)",
            "Yeni dersler, duyurular ve yanıtlar için WordPress'ten otomatik mesajlar",
            "Uygulamada bir bildirim kutusu",
            "İnsanlar hangi bildirimleri alacaklarını seçer",
          ],
        },
      ],
    },
    commerce: {
      title: "Mağaza kurallarına uyan satış",
      text: "Kendi ödeme sayfanızda ya da web sitesi olmadan kartla satın. Satın alma düğmeleri Apple ve Google kurallarına otomatik olarak uyar.",
      features: [
        {
          title: "iyzico, Kashier, Fawaterk, Stripe veya PayPal ile kartla ödeme",
          text: "Web sitesi olmayan mağazalar ve akademiler, kendi üye işyeri hesaplarına güvenli bir iyzico, Kashier, Fawaterk, Stripe veya PayPal sayfasında kartla ödeme alır.",
          details: [
            "Denemek için test anahtarlarıyla kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal anahtarlarınız",
            "Müşteriler doğrudan kendi ödeme hesabınıza öder",
            "Paneldeki siparişler ve her ödenen sipariş için bir e-posta",
            "Her ürün için paylaşılabilir bir web sayfası",
          ],
        },
        {
          title: "iOS kuralları yerleşik",
          text: "iPhone uygulaması ücretli kurslar veya dijital ürünler için asla satın alma düğmesi göstermez; böylece App Store incelemesi sorunsuz geçer.",
          details: ["Ücretli kurslar Android'de satın alınır", "Fiziksel ürünler Android ve iOS'ta satılır", "Ücretsiz kurslar: ikisinde de tek dokunuşla kayıt"],
        },
      ],
    },
    builds: {
      title: "Derleme, imzalama ve yayımlama",
      text: `Uygulamalarınızı ${STORES} için derler, imzalar ve paketleriz. İndirip rehberlerimizi izleyin ya da sizin için biz yayımlayalım.`,
      features: [
        {
          title: "İhtiyacınız olan her dosya",
          text: "Android APK ve App Bundle, iOS derlemesi, imzalama anahtarınız ve mağaza görselleriniz.",
          details: [
            "Telefona kurup denemek ve Galaxy Store, AppGallery ve GetApps için APK",
            "Google Play için App Bundle (AAB)",
            "iOS derlemesi (Growth ve üzeri); Pro ve Business'ta TestFlight'a yüklenir",
            "Mağaza simgesi, öne çıkan görsel, ekran görüntüleriniz ve mağaza metni",
          ],
        },
        {
          title: "Güvende tutulan anahtarlar",
          text: "Mağaza anahtarlarınız ve imzalama anahtarlarınız şifreli saklanır; kaydedilmiş bir Android imzalama anahtarı asla değiştirilmez, böylece uygulamanızı her zaman güncelleyebilirsiniz.",
          details: ["Birkaç dakika sonra geçersiz olan indirme bağlantıları", "Mağaza anahtarları kaydedildikten sonra bir daha gösterilmez", "Her güncelleme için aynı imzalama anahtarı"],
        },
      ],
    },
  },
  comparison: [
    {
      topic: "İçeriğiniz",
      typical: "Çoğu zaman oluşturucuya elle kopyalanır, sonra iki yerde güncel tutulur",
      yallapp: "Web sitenizden veya platformunuzdan canlı okunur ya da panelde bir kez yönetilir",
    },
    {
      topic: "Ekranlar",
      typical: "Çoğu zaman bir web görünümüne sarılmış web siteniz",
      yallapp: "Kurslar, ürünler, randevular ve ilanlar için yerel ekranlar; karmaşık dersler web sitenizdeki gibi gösterilir",
    },
    {
      topic: "Uygulama kimin",
      typical: "Bazen oluşturucunun hesabıyla yayımlanır",
      yallapp: "Beş uygulama mağazasının hepsinde kendi hesaplarınızla yayımlanır; imzalama anahtarınızı indirebilirsiniz",
    },
    {
      topic: "Uygulamayı değiştirmek",
      typical: "Düzen değişiklikleri çoğu zaman yeni bir mağaza sürümü gerektirir",
      yallapp: "Sayfalar, görünüm ve diller yeni derleme olmadan panelden değişir",
    },
    {
      topic: "Diller",
      typical: "Tek dil, soldan sağa",
      yallapp: "İngilizce, Arapça (sağdan sola), Türkçe ve eklediğiniz her dil, kendi çevirilerinizle",
    },
    {
      topic: "Giriş",
      typical: "E-posta ve şifre",
      yallapp: "Telefon numarası ve tek kullanımlık kod; cihaz sınırları ve mağazalar için bir inceleme numarasıyla",
    },
    {
      topic: "Mağaza kuralları",
      typical: "Doğru yapmak size kalır",
      yallapp: "iOS'ta dijital içerik için satın alma düğmesi yok, uygulamada hesap silme, inceleme erişimi yerleşik",
    },
    {
      topic: "Ödemeler",
      typical: "Çoğu zaman yalnızca oluşturucunun kendi ödeme sağlayıcısıyla",
      yallapp: "Kendi ödeme sayfanız ya da kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal hesabınıza kartla ödeme",
    },
  ],
  steps: [
    {
      title: "Hesabınızı oluşturun",
      short: "Bir dakikada kaydolun ve bir paket seçin.",
      text: "Bir dakikada kaydolun. Paketinizi kartla ödeyin ya da WhatsApp'tan ekibimizle ayarlayın; hesabınızı biz etkinleştiririz.",
      details: ["Web siteniz olsun ya da olmasın yallapp.com.tr'de kaydolun", "Her uygulama için Starter, Growth, Pro veya Business seçin", "Kartla ödeyin ya da WhatsApp'tan bize yazın"],
    },
    {
      title: "İçeriğinizi bağlayın",
      short: "Web siteniz, kullandığınız bir platform ya da hiç web sitesi olmadan.",
      text: "Uygulama türünüzü ve içeriğinin nereden geleceğini seçin: web siteniz, bir çevrimiçi platform, kendi API'niz ya da hiçbiri.",
      details: [
        "Akademi, Mağaza, Restoran ve kafe, Randevu, Klinik, Spor salonu ve fitness, Emlak, Haber ve blog, Etkinlik ve bilet ya da Yardım ve bağış",
        "WordPress eklentisi, Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla, Zid, Teachable, Thinkific veya SimplyBook.me",
        "Web siteniz yok mu? Ürünleri, kursları, hizmetleri veya ilanları panelden ekleyin",
      ],
    },
    {
      title: "Markalayın ve sayfalarınızı kurun",
      short: "Logonuz, renkleriniz, sayfalarınız ve dilleriniz.",
      text: "Simgenizi ve logonuzu yükleyin, renklerinizi ve şablonunuzu seçin, ardından sayfalarınızı kurup dilleri açın.",
      details: ["Uygulama adı, simgesi, logosu ve renkleri", "Düzenleyicide sayfalar, sekmeler ve görünüm", "İngilizce, Arapça ve Türkçe"],
    },
    {
      title: "Mağaza bilgilerinizi ekleyin",
      short: "Mağaza metinleri, ekran görüntüleri ve bildirimler.",
      text: "Paket adı, bundle ID, mağaza metinleri ve ekran görüntüleri. Anlık bildirimler için Firebase'i hazır olduğunuzda ekleyin.",
      details: ["Mağaza başlığı ve açıklamalar", "Telefon ve iPhone ekran görüntüleri", "Anlık bildirimler için Firebase dosyaları"],
    },
    {
      title: "Derleyin ve yayımlayın",
      short: "Uygulamalarınızı indirin ya da sizin için biz yayımlayalım.",
      text: "Kurulum tamamlanır tamamlanmaz uygulamalarınız derlenir. İndirip rehberlerimizle yayımlayın ya da sizin için biz yayımlayalım.",
      details: ["Starter ve Growth: dosyalarınızı indirin ve adım adım rehberleri izleyin", `Pro ve Business: her yeni sürümü ${STORES} üzerinde biz yayımlarız`],
    },
  ],
  requirements: [
    "İçeriğiniz: desteklenen bir platformda web sitesi, kendi API'niz ya da hiçbiri",
    "Bir Google Play geliştirici hesabı (Google'a tek seferlik ücret)",
    "iOS için Apple Developer Program üyeliği (Apple'a yıllık ücret)",
    `Uygulamanızın orada da olmasını istiyorsanız ${MORE_ANDROID} satıcı hesapları (ücretsiz)`,
    "Anlık bildirimler için ücretsiz bir Firebase projesi",
    "Web sitesi olmadan kartla ödeme almak için iyzico, Kashier, Fawaterk, Stripe veya PayPal üye işyeri hesabı (isteğe bağlı)",
  ],
  faq: [
    {
      title: "Başlarken",
      items: [
        {
          q: "Yallapp ne yapar?",
          a: `Yallapp; akademiler, mağazalar, restoranlar, klinikler, spor salonları, emlak ofisleri, haber siteleri, etkinlikler, yardım kuruluşları ve daha fazlası için markanızı taşıyan Android ve iOS uygulamaları oluşturur. Uygulamanız içeriğini web sitenizden, zaten kullandığınız bir çevrimiçi platformdan, kendi API'nizden ya da web siteniz yoksa Yallapp panelinden alır. Uygulamaları biz derleriz; siz de onları ${STORES} üzerinde kendi adınızla yayımlarsınız ya da sizin için biz yayımlarız.`,
        },
        {
          q: "Web siteme ihtiyacım var mı?",
          a: "Hayır. Ürünlerinizi, kurslarınızı, hizmetlerinizi veya emlak ilanlarınızı Yallapp panelinden ekleyebilirsiniz; uygulamanız bunları gösterir. Desteklenen bir platformda web siteniz varsa uygulamanız bunun yerine onu canlı okur.",
        },
        {
          q: "Hangi tür uygulamalar oluşturabilirim?",
          a: "Her birinin kendi ekranları olan on bir tür: Akademi, Mağaza, Restoran ve kafe, Randevu, Klinik, Spor salonu ve fitness, Hizmetler ve şirketler, Emlak, Haber ve blog, Etkinlik ve bilet ile Yardım ve bağış. Her birinin ne yaptığı için [Çözümler](/solutions) sayfasına bakın.",
        },
        {
          q: "Uygulamalarım ne zaman hazır olur?",
          a: "Panelinizdeki kurulum adımlarını bitirir bitirmez uygulamalarınız derlenmeye başlar. Google ve Apple incelemeleri, gönderdikten sonra genellikle birkaç gün sürer.",
        },
        {
          q: "Kod yazmayı bilmem gerekiyor mu?",
          a: "Hayır. Her şey panelden yapılır ve mağazalar için adım adım rehberler vardır. Yalnızca “Kendi API'm” seçeneği bir geliştirici gerektirir.",
        },
        {
          q: "Uygulamamı derlenmeden önce deneyebilir miyim?",
          a: "Evet. Paneldeki Uygulama önizlemesi gerçek uygulamanızı mevcut kurulumunuz, içeriğiniz, sayfalarınız ve dillerinizle, açık ve koyu temada tarayıcınızda çalıştırır. Telefonunuzda açmak için QR kodunu tarayın. Kurulum tamamlanmadan çalışır; asla giriş kodu göndermez ve ödeme almaz.",
        },
      ],
    },
    {
      // 103R Yallapp Studio, apart from the regular apps.
      title: "Yallapp Studio",
      items: [
        {
          q: "Yallapp Studio nedir?",
          a: "Yallapp hesabında, görsel bir düzenleyicide özgürce tasarladığın projeler için ayrı bir alan: satırlar, sütunlar, katmanlar, resimler, düğmeler ve tasarladığın kartlarda listeler; açık ve karanlık mod renkleri ve hareketle, Android ve iOS uygulamanda yerel olarak çizilir. Studio, kuryeleriyle bir teslimat şirketinin uygulaması gibi yalnızca kendisinin sunduğu proje türlerini de yapar. Bkz. [Yallapp Studio](/yallapp-studio).",
        },
        {
          q: "Studio planları normal planlardan nasıl farklı?",
          a: "Ayrıdırlar. Bir Studio projesi Studio'nun kendi planlarından biriyle, normal bir uygulama ise normal bir planla (Starter, Growth, Pro ya da Business) ödenir. Her Studio planında Studio düzenleyicisi, anlık bildirimler, kartla ödeme, sohbet ve sadakat puanları vardır; iOS uygulaması, senin için yayınlama, teslimat ve kuryeler, hareket, şablonlar ve Studio sayfası sayısı plan plan seçilir. Bkz. [Fiyatlar](/pricing).",
        },
        {
          q: "Normal bir uygulama için Studio gerekli mi?",
          a: "Hayır. Normal uygulamalar sayfa düzenleyicilerini ve hazır tasarımlarını korur ve panelinde kalır. Studio projelerin ise Studio'da, her biri kendi paneliyle ayrı tutulur.",
        },
        {
          q: "Başlamadan önce bir Studio projesi görebilir miyim?",
          a: "Evet. [Studio demosu](/demo/studio), uygulamanın kendisinin çizdiği gerçek Studio projelerinden ekranlar gösterir: düzenleyicide tasarlanmış bir kafenin ana sayfası, açık ve karanlık modda, bir teslimat şirketinin müşteri ve kurye ekranları ve düzenleyici. Normal uygulamaların demo uygulamaları [Demo](/demo) sayfasında.",
        },
      ],
    },
    {
      title: "İçerik kaynakları",
      items: [
        {
          q: "Uygulamamın içeriği nereden gelebilir?",
          a: "Yallapp eklentili bir WordPress sitesinden (Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo, LearnDash, WooCommerce, Amelia, BookingPress veya LatePoint), Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla, Zid, Teachable, Thinkific, SimplyBook.me, kendi API'nizden ya da Yallapp panelinden. [Entegrasyonlar](/integrations) sayfasına bakın.",
        },
        {
          q: "İçeriğimi bir yere taşımam gerekiyor mu?",
          a: "Hayır. Bir web sitesi veya platformla içeriğiniz olduğu yerde kalır ve uygulama onu canlı okur. Yallapp'e yalnızca web siteniz yoksa eklersiniz.",
        },
        {
          q: "WordPress kullanıyorum. Ne kurmalıyım?",
          a: "Panelinizin **Lisans ve eklenti** sayfasından Yallapp eklentisini. Eklenti LMS'inizi, WooCommerce'i veya randevu eklentinizi bulur ve uygulamanıza bağlar. Giriş kodlarını uygulamanızın adıyla WhatsApp'tan göndeririz. [WordPress eklentisini kurun](/docs/wordpress-plugin) rehberine bakın.",
        },
        {
          q: "İnsanlar e-posta adresleriyle giriş yapabilir mi?",
          a: "Evet. Panelinizin **Uygulamaya giriş** sayfasında telefon, e-posta veya ikisini seçin. Web sitesi yoksa uygulamanızın adıyla e-postayla kod göndeririz; WordPress'te insanlar web sitenizdeki hesaplarının e-posta ve şifresini kullanır. Başka bir platforma bağlı uygulamalarda giriş telefonla yapılır. [Uygulama kullanıcıları ve giriş](/docs/app-users) rehberine bakın.",
        },
        {
          q: "Kodlar kendi WhatsApp numaramdan gelebilir mi?",
          a: "Evet, bir WABEK hesabıyla (waabek.com): **Uygulamaya giriş** sayfasına API anahtarını ve numaranızın instance ID'sini ekleyip bir test kodu gönderin. Aksi halde kodlar uygulamanızın adıyla bizim WhatsApp numaramızdan gelir.",
        },
        {
          q: "Digits gerekli mi?",
          a: "Hayır. Digits isteğe bağlıdır. Uygulamanızın giriş kodlarını WhatsApp'tan göndeririz; SMS altyapısına ya da ek eklentiye gerek yoktur. Web siteniz zaten Digits kullanıyorsa insanlar uygulamaya aynı numarayla girer ve hesaplarını korur. REST API eklentisi kuruluysa kodları göndermek için Digits'i de seçebilirsiniz. [WordPress eklentisini kurun](/docs/wordpress-plugin#sign-in-codes) rehberine bakın.",
        },
        {
          q: "Shopify ya da başka bir mağaza platformu kullanıyorum. Nasıl bağlarım?",
          a: "Web sitesi adımında platformunuzu seçin ve yönetim panelindeki anahtarları yapıştırın. Kaydetmeden önce platformla kontrol eder ve şifreli saklarız. Her platformun [belgelerde](/docs/content-sources) adım adım bir rehberi vardır.",
        },
        {
          q: "Web sitem bu platformların hiçbirinde değil.",
          a: "Bir geliştirici belgelenmiş API'mizi web sitenizden sunabilir: [Kendi API'nizi bağlayın](/docs/my-own-api) rehberine bakın. Ya da “Web sitem yok” seçeneğini seçip içeriğinizi panelden yönetin.",
        },
        {
          q: "İçeriğin nereden geldiğini sonra değiştirebilir miyim?",
          a: "Evet. Web sitesi adımını yeniden açıp başka bir kaynak seçin. Bir sonraki derlemeniz onu kullanır.",
        },
      ],
    },
    {
      title: "Uygulama mağazalarında yayımlama",
      items: [
        {
          q: "Uygulamam hangi uygulama mağazalarında olabilir?",
          a: `${STORES}. Her paket Google Play, Galaxy Store, AppGallery ve GetApps için Android uygulamasını derler; App Store için iOS uygulaması Growth ve üzeri paketlerde gelir.`,
        },
        {
          q: "Kendi Apple ve Google geliştirici hesaplarım gerekli mi?",
          a: "Evet. Uygulamalarınız kendi adınızla yayımlanır. Google tek seferlik, Apple yıllık bir ücret alır; bu ücretler doğrudan onlara ödenir. Şirketlerin ikisi için de D-U-N-S numarası gerekir. Samsung, Huawei ve Xiaomi hesapları ücretsizdir ve yalnızca uygulamanızın onların mağazalarında olmasını istiyorsanız gerekir. [Geliştirici hesapları](/docs/developer-accounts) rehberine bakın.",
        },
        {
          q: "Uygulamaları kim yayımlar?",
          a: `Starter ve Growth'ta dosyaları indirip adım adım rehberlerimizle siz yayımlarsınız. Pro ve Business'ta uygulamanızı ve her yeni sürümünü ${STORES} üzerinde sizin için biz yayımlarız.`,
        },
        {
          q: "Apple uygulamamı kabul eder mi?",
          a: "Gerçek içerik gösteren ve kurallara uyan uygulamalar genellikle geçer. Yallapp sık görülen sorunları sizin için çözer: iOS'ta dijital içerik için satın alma düğmesi yok, uygulamada hesap silme ve inceleyicilerin giriş yapabilmesi için sabit kodlu bir inceleme telefon numarası. [Mağaza uygulamanızı reddederse](/docs/store-rejections) rehberine bakın.",
        },
        {
          q: "Her değişiklik için yeni bir sürüm gerekir mi?",
          a: "Hayır. İçerik, sayfalar, görünüm, diller ve giriş ayarları yeni derleme olmadan değişir. Yalnızca yeni bir ad, simge veya logo ya da yeni uygulama özellikleri için yeniden derlersiniz.",
        },
        {
          q: "iPhone uygulamasında ücretli kurs satabilir miyim?",
          a: "Hayır. Apple'ın kuralları kendi uygulama içi satın alma sistemi olmadan buna izin vermez; bu yüzden iOS uygulaması ücretli kurslar veya dijital ürünler için satın alma düğmesi göstermez. Öğrenciler Android'de ya da web sitenizden satın alır ve ikisinde de öğrenir. Fiziksel ürünler ikisinde de satılır.",
        },
      ],
    },
    {
      title: "Anlık bildirimler ve Firebase",
      items: [
        {
          q: "Anlık bildirimler dahil mi?",
          a: "Evet, her pakette. Bu kullanım için ücretsiz olan kendi Firebase projeniz üzerinden gönderilir.",
        },
        {
          q: "Firebase'den neye ihtiyacım var?",
          a: "Bir Android ve bir iOS uygulaması olan bir Firebase projesi, iki dosyası (google-services.json ve GoogleService-Info.plist), mesaj göndermek için bir hizmet hesabı anahtarı ve iPhone'lar için Apple'dan bir APNs anahtarı. [Firebase ile anlık bildirimler](/docs/push-notifications) rehberi her adımı gösterir.",
        },
        {
          q: "Nasıl bildirim gönderirim?",
          a: "Bir platforma bağlı ya da web sitesi olmayan uygulamalar: panelin **Uygulama bildirimleri** sayfasından. WordPress siteleri: yeni dersler, duyurular ve yanıtlar için otomatik olarak ya da Yallapp eklentisinin ayarlarından elle.",
        },
        {
          q: "Bildirimler neden iPhone'lara ulaşmıyor?",
          a: "Genellikle APNs anahtarı Firebase projenizin Cloud Messaging ayarlarında eksiktir. Oraya yükleyip yeniden deneyin.",
        },
      ],
    },
    {
      title: "Uygulamanızda ödemeler",
      items: [
        {
          q: "Müşteriler nasıl öder?",
          a: "Mağazanız WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla veya Zid üzerindeyse kendi ödeme sayfanızda. Web sitesi yoksa güvenli bir iyzico, Kashier, Fawaterk, Stripe veya PayPal sayfasında, kendi üye işyeri hesabınıza kartla öderler.",
        },
        {
          q: "Ödeme hesabım yok. Yine de satabilir miyim?",
          a: "Bir hesaba ihtiyacınız var: müşteriler her zaman kendi hesabınıza öder, asla Yallapp'inkine değil. iyzico (Türkiye), Kashier, Fawaterk (Mısır), Stripe veya PayPal'da bir hesap açın ve anahtarlarını Ürünler sayfanıza yapıştırın. O zamana kadar müşteriler ürünlerinizi uygulamada görür ama ödeme yapamaz.",
        },
        {
          q: "Yallapp satışlarımdan pay alır mı?",
          a: "Hayır. Müşterileriniz size kendi ödeme sayfanız veya kendi ödeme hesabınız üzerinden öder ve Yallapp bu satışların tarafı değildir. Yallapp'e yalnızca paketiniz için ödeme yaparsınız.",
        },
        {
          q: "Müşteriler randevular için uygulamada ödeme yapabilir mi?",
          a: "Hayır. Randevu uygulamaları zamanı ayırtır; ödeme varsa işletmenizde yapılır.",
        },
      ],
    },
    {
      title: "Diller",
      items: [
        {
          q: "Uygulamalar hangi dilleri destekler?",
          a: "İngilizce, Arapça ve Türkçe. İngilizce her zaman açıktır; diğerlerini siz açar ve varsayılanı seçersiniz.",
        },
        {
          q: "Arapça sağdan sola mı gösterilir?",
          a: "Evet. Biri Arapçayı seçtiğinde tüm uygulama sağdan sola geçer.",
        },
        {
          q: "Kendi metinlerimi çevirebilir miyim?",
          a: "Evet. Sayfa düzenleyicide sayfa metinlerinizi her dilde yazabilirsiniz. Çevirisi olmayan metinler varsayılan dilinizde gösterilir.",
        },
      ],
    },
    {
      title: "Paketler ve faturalama",
      items: [
        {
          q: "Paketler arasındaki fark nedir?",
          a: "Starter, 1.000 uygulama kullanıcısına kadar hazır sayfalı Android uygulamasıdır. Growth; iOS uygulaması, tam sayfa düzenleyici, üç dil, kartla ödeme, çevrimdışı mod ve 10.000 uygulama kullanıcısına kadar ekler. Pro sınırsız uygulama kullanıcısı ekler ve yayını sizin için biz yaparız. Business size özel bir hesap yöneticisi ekler. Tam karşılaştırma için [fiyatlar sayfasına](/pricing) bakın.",
        },
        {
          q: "Nasıl öderim?",
          a: "Fiyat gösterildiğinde panelinizden kartla ya da doğrudan WhatsApp'tan ekibimizle ayarlayarak. Ödeme onaylanır onaylanmaz hesabınızı etkinleştiririz.",
        },
        {
          q: "Fiyatlar hangi para biriminde?",
          a: "Mısır'da Mısır lirası, diğer her yerde ABD doları. Kartla ödemeler Kashier üzerinden yapılır ve nerede olursanız olun Mısır lirası olarak tahsil edilir: ödeme sayfası ödemeden önce tam tutarı lira olarak gösterir, bankanız da kendi kuruyla dönüştürür.",
        },
        {
          q: "Kuponlarınız var mı?",
          a: "Bazen. Kodu kartla ödeme formuna girin; fiyat ödemeden önce güncellenir.",
        },
        {
          q: "Paketim bittiğinde ne olur?",
          a: "Panelinizden yenileyin. Her ödeme süresini mevcut paketinizin sonuna ekler; böylece hiçbir gün kaybolmaz. Paket yenilenmezse lisans pasif olur ve yeni derlemeler durur.",
        },
        {
          q: "Kendi videolarımı ve görsellerimi yükleyebilir miyim?",
          a: "Evet. Her paket sunucularımızda videolar, görseller ve PDF'ler için depolama içerir: Starter'da 2 GB, Growth'ta 20 GB, Pro'da 100 GB ve Business'ta 500 GB. Ders videolarınız uygulamanızın kendi oynatıcısında, nerede barındırıldığı görünmeden ve yalnızca izleme hakkı olanlar için oynatılır. Daha fazla alan mı lazım? Panelinizin Medya sayfasından bir depolama paketi alın; paketinizle birlikte yenilenir. Bir paket sona erdiğinde dosyalarınız depolamanızdan fazla yer kaplıyorsa hiçbir şey silinmez: yeni yüklemeler siz yer açana veya depolama ekleyene kadar bekler.",
        },
        {
          q: "İptal edebilir miyim?",
          a: "Hesabınız etkinleştirildikten sonraki 3 gün içinde iptal ederek tam iade alabilirsiniz. Bankanıza bağlı olarak iadeler 5 ila 14 iş günü sürer. [İade politikamıza](/refund) bakın.",
        },
      ],
    },
    {
      title: "Tek hesapta birden fazla uygulama",
      items: [
        {
          q: "Birden fazla uygulamam olabilir mi?",
          a: "Evet. Tek bir hesapta, örneğin bir akademi ve bir mağaza gibi birkaç uygulama olabilir. Hepsini aynı panelden yönetirsiniz.",
        },
        {
          q: "Birden fazla uygulama nasıl faturalandırılır?",
          a: "Her uygulamanın kendi paketi ve fiyatı vardır ve ayrı yenilenir. [Tek hesapta birden fazla uygulama](/docs/several-apps) rehberine bakın.",
        },
        {
          q: "Uygulamalarım bir şey paylaşır mı?",
          a: "Giriş bilgileriniz ve iletişim bilgileriniz. Her uygulamanın kendi türü, içerik kaynağı, markası, mağaza sayfası, derlemeleri ve ayarları vardır.",
        },
      ],
    },
    {
      title: "Güvenlik ve veriler",
      items: [
        {
          q: "Verilerim nerede saklanır?",
          a: "Bir web sitesiyle, müşterilerinizin verileri web sitenizde veya platformunuzda kalır; uygulama doğrudan onunla konuşur. Web sitesi olmayan uygulamalarda Yallapp verileri webek.org tarafından barındırılan sunucularda tutar.",
        },
        {
          q: "Anahtarlarım nasıl korunur?",
          a: "Mağaza, platform, ödeme ve imzalama anahtarları kaydedilmeden önce şifrelenir ve bir daha gösterilmez. İndirme bağlantıları birkaç dakika sonra geçersiz olur.",
        },
        {
          q: "Giriş kodları nasıl gönderilir?",
          a: "Uygulamanızın adıyla waabek.com üzerinden WhatsApp'tan: WordPress siteleri, bir platforma bağlı uygulamalar ve web sitesi olmayan uygulamalar için. Bir WordPress sitesi bunun yerine Digits'i ve kendi altyapısını seçebilir. Kendi API'nizle kodları kendi sisteminiz gönderir. Kodlar kısa ömürlüdür ve deneme sayısı sınırlıdır.",
        },
        {
          q: "İnsanlar hesaplarını silebilir mi?",
          a: "Evet, uygulama mağazalarının istediği gibi uygulamanın hesap ekranından.",
        },
      ],
    },
    {
      title: "Destek",
      items: [
        {
          q: "Nasıl yardım alırım?",
          a: "WhatsApp'tan ya da e-postayla bize yazın. [Belgelerimiz](/docs) çoğu soruyu adım adım yanıtlar.",
        },
        {
          q: "WordPress'i benim için kurabilir misiniz?",
          a: "Evet. Web sitesi adımında “WordPress'i benim için kurun” seçeneğini seçip içeriğinizden bahsedin. Ekibimiz fiyat ve sonraki adımlarla size yazar.",
        },
        {
          q: "Mağaza uygulamamı reddetti. Şimdi ne yapmalıyım?",
          a: "Ret mesajını WhatsApp'tan bize gönderin, yanıt vermenize yardım edelim. Çoğu reddin hızlı bir çözümü vardır: [Mağaza uygulamanızı reddederse](/docs/store-rejections) rehberine bakın.",
        },
      ],
    },
  ],
  demos: {
    lms: {
      summary: "Tasarım, iş, dil ve programlama kursları olan bir çevrimiçi akademi.",
      tryThis: [
        "Bir kursu açıp ücretsiz bir önizleme dersini izleyin",
        "Ücretsiz Excel kursuna kaydolup dersleri tamamlandı olarak işaretleyin",
        "Android'de ücretli bir kurs satın alın: demo ödeme sayfası kart istemez",
        "Ayarlar'dan uygulamayı Arapça veya Türkçeye geçirin",
      ],
    },
    store: {
      summary: "Kategorileri, indirimli fiyatları ve belirli bir tutarın üzerinde ücretsiz teslimatı olan bir çiçek ve hediye mağazası.",
      tryThis: ["Kategorileri gezip bir ürün açın", "Sepete çiçek ve bir hediye kutusu ekleyin", "Ödemeye geçin: demo ödeme sayfası siparişi kartsız verir", "Siparişi Hesap › Siparişler altında bulun"],
    },
    restaurant: {
      summary: "Gel-al veya teslimat için kahvaltı, ana yemekler, tatlılar ve içecekler sunan bir mahalle kafesi.",
      tryThis: [
        "Menüyü açıp seçenekleri olan bir yemek seçin: boyut, yan ürün, ekstralar",
        "Gel-al veya teslimat ve bir saat seçip ödemeye geçin: demo ödeme sayfası kart istemez",
        "Siparişin adımlarını Hesap › Siparişler altında izleyin",
      ],
    },
    booking: {
      summary: "Hizmetleri, üç kişilik ekibi ve çalışma saatleriyle bir kuaför ve güzellik stüdyosu.",
      tryThis: ["Bir hizmet seçip boş saatleri görün", "Kimi istediğinizi seçip bir saat ayırtın", "Randevuyu Randevular altında bulup iptal edin"],
    },
    clinic: {
      summary: "Aile hekimi, diş hekimi ve fizyoterapisti olan, kısa bir ön bilgi formu kullanan bir aile kliniği.",
      tryThis: [
        "Bir doktorun profilini açın: uzmanlıklar, diller ve hakkında birkaç satır",
        "Bir muayene ayırtıp ön bilgi formunu doldurun (uydurma yanıtlar kullanın: bu hesabı herkes paylaşıyor)",
        "Muayeneyi yanıtlarınızla birlikte Muayeneler altında bulup iptal edin",
      ],
    },
    fitness: {
      summary: "Bir haftalık dersi, üç koçu ve iki üyelik paketi olan bir yoga, spinning ve kuvvet stüdyosu.",
      tryThis: [
        "Dersler'i açıp bir gün seçin: her ders koçunu ve kalan yerleri gösterir",
        "Demo ödeme sayfasında bir üyelik satın alın: kart istenmez",
        "Bir derste yer ayırtın, kalan derslerinizin azaldığını görün ve geri almak için iptal edin",
      ],
    },
    real_estate: {
      summary: "Filtreleri, favorileri ve mesajlarıyla satılık ve kiralık evleri olan bir emlak ofisi.",
      tryThis: ["Filtrelerle arayın: kiralık, 2+ yatak odası, bir fiyat aralığı", "Bir evi favorilerinize kaydedin", "Bir ev hakkında ofise mesaj gönderin ve yanıtın gelişini görün"],
    },
    news: {
      summary: "Manşetleri; şehir, ekonomi, kültür, spor ve yemek bölümleri ve son dakika haberleri olan yerel bir haber sitesi.",
      tryThis: ["Bir manşeti açıp paylaşın", "Bir bölümü gezin ya da \"ferry\" diye arayın", "Bir haberi kaydedip Kaydedilenler altında bulun", "Ayarlar'dan uygulamayı Türkçeye geçirin"],
    },
    events: {
      summary: "Konserler, bir film kulübü, bir seramik atölyesi ve çevrimiçi söyleşiler sunan bir şehir kültür merkezi: ücretsiz kayıtlar ve ücretli biletler.",
      tryThis: [
        "Film kulübü için ücretsiz bilet alın ve QR koduyla birlikte Biletlerim altında bulun",
        "Bir konser bileti satın alın: demo ödeme sayfası kart istemez",
        "Takvime geçip bir gün seçin",
        "Bir iPhone'da çevrimiçi ustalık sınıfını açın: ücretli çevrimiçi etkinlikler orada satın alma düğmesi göstermez",
      ],
    },
    donations: {
      summary: "İki kampanyası, ilerlemeleri ve insanların yaptığı bağışlarla yerel bir gıda bankası.",
      tryThis: [
        "Bir kampanyayı açıp hikâyesini okuyun",
        "Bir tutar seçip bağış yapın: demo bağış sayfası hiçbir şey tahsil etmez",
        "Bağışınızı ve makbuzunu Bağışlarım altında bulun",
        "Bir iPhone'da bağış sayfasının tarayıcıda nasıl açıldığını görün",
      ],
    },
    delivery: {
      summary: "Kahire'de bir kargo şirketi: şehrin öbür ucuna paket gönderin, nakit ödeyin ve takip edin, sonra şirketin kuryesi olarak kendiniz teslim edin.",
      tryThis: [
        "Gönder'e dokunun: bir hizmet seçin, alış ve teslim noktalarını (konumunuz veya bir harita bağlantısı) belirleyin ve fiyatı görün",
        "Nakit gönderin ve aşamalarını Gönderilerim'de takip edin",
        "Hesap › Kurye modu'nu açın, mesaiye başlayın ve kendi paketinizi teslim edin: alındı, yolda, teslim edildi",
      ],
    },
    food: {
      summary: "Üç restorandan yemek siparişi: sipariş verin, takip edin, sonra restoranın personeli olarak alın ve kurye olarak teslim edin.",
      tryThis: [
        "Bir restoran açın, boyutu ve ekstralarıyla bir yemek seçin ve nakit ödeyin",
        "Restoran sekmesinde siparişinizi gereken dakikalarla kabul edin, sonra hazır olarak işaretleyin",
        "Hesap › Kurye modu'nda işi alıp teslim edin ve her aşamayı Siparişlerim'de görün",
      ],
    },
    rides: {
      summary: "Kahire'de bir yolculuk hizmeti: yolculuk isteyin ve önce her araç türünün ücretini görün, sonra şirketin sürücüsü olarak kendi yolculuğunuzu yapın.",
      tryThis: [
        "Alış ve bırakış noktalarını belirleyin, Ekonomi, Konfor ve Van'ı karşılaştırın ve nakit yolculuk isteyin",
        "Hesap › Sürücü modu'nu açın, çevrimiçi olun ve süre bitmeden yolculuğunuzu kabul edin",
        "Geldim'e dokunun, yolculuğunuzdaki kodla başlatın, bitirin ve sürücünüzü puanlayın",
      ],
    },
  },
  plans: {
    starter: {
      tagline: "Rehberlerimizle sizin yayımladığınız bir Android uygulaması",
      highlights: [
        "Android uygulaması (APK ve AAB)",
        "Google Play, Galaxy Store, AppGallery ve GetApps için",
        "1 bağlı platform",
        "1.000 uygulama kullanıcısına kadar",
        "1 uygulama dili",
        "Anlık bildirimler",
        "Hazır sayfa şablonları",
        "Adım adım yayımlama rehberleri",
        "E-posta desteği",
      ],
    },
    growth: {
      tagline: "Sizinle büyüyen Android ve iOS uygulamaları",
      highlights: [
        "Android ve iOS uygulamaları",
        "10.000 uygulama kullanıcısına kadar",
        "3 uygulama dili",
        "Tam sayfa düzenleyici",
        "Uygulama içinde kartla ödeme",
        "Çevrimdışı mod",
        "Ayarları değiştirdiğinizde otomatik yeniden derleme",
        "WhatsApp desteği",
      ],
    },
    pro: {
      tagline: "Uygulamalarınızı sizin için biz yayımlarız",
      highlights: ["Growth'taki her şey", "Sınırsız uygulama kullanıcısı", "Tüm uygulama dilleri", "Beş uygulama mağazasının hepsinde biz yayımlarız", "Otomatik mağaza güncellemeleri", "Uygulamada müşterilerinizle sohbet", "Öncelikli destek"],
    },
    business: {
      tagline: "Uygulamanız için bir ortak",
      highlights: ["Pro'daki her şey", "Size özel bir hesap yöneticisi", "Talep üzerine özel özellikler", "Birden fazla ekip üyesi", "En hızlı destek"],
    },
  },
};
