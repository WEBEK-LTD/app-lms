import type { SiteContentTranslation } from "../translation-types";

/**
 * 55 The Turkish defaults of the texts the team edits in the admin (Website
 * content), by page key. {kinds}, {steps}, {plugins} and {platforms} are the
 * counts from the registries (lib/content/site.ts fills them in).
 */
export const TR_SITE: SiteContentTranslation = {
  home: {
    badge: "{kinds} farklı işletme türü için Android ve iOS uygulamaları",
    title: "İşletmeniz, kendi mobil uygulamanız olarak.",
    intro:
      "Yallapp, zaten işlettiğiniz web sitesinden, Shopify ve diğer platformlardan ya da hiç web sitesi olmadan markanızı taşıyan Android ve iOS uygulamaları oluşturur. Adınız, renkleriniz, sayfalarınız; kendi mağaza hesaplarınızla yayımlanır.",
    primaryCta: "WhatsApp'tan başlayın",
    secondaryCta: "Nasıl çalıştığını görün",
    solutionsTitle: "Tek platform, {kinds} uygulama türü",
    solutionsText: "İşletmenize uyan uygulamayı seçin. Her birinin, müşterilerinizin yaptıkları için tasarlanmış kendi ekranları var.",
    featuresTitle: "Uygulamanızın ihtiyacı olan her şey",
    featuresText: "Markanız, sayfalarınız ve dilleriniz; mağaza kurallarına uyan giriş, bildirimler ve ödemelerle.",
    integrationsTitle: "Zaten kullandıklarınızla çalışır",
    integrationsText: "İçeriğiniz olduğu yerde kalır. Uygulama onu web sitenizden, platformunuzdan ya da Yallapp panelinden canlı okur.",
    dashboardTitle: "Uygulamanızı tek bir panelden yönetin",
    dashboardText: "Uygulamanızı adım adım kurun, sayfalarını sürükle-bırakla oluşturun ve her derlemeyi indirin. Kod yok, her değişiklik için yeni mağaza sürümü yok.",
    compareTitle: "Sıradan bir uygulama oluşturucu ve Yallapp",
    compareText: "Başka yerlerde genellikle sunulanlar ile her Yallapp uygulamasının yaptıkları yan yana.",
    stepsTitle: "{steps} adımda kayıttan uygulama mağazalarına",
    plansTitle: "Her uygulama için bir paket",
    plansText: "Android ile başlayın, hazır olduğunuzda iOS ekleyin; kendiniz uğraşmak istemezseniz uygulamalarınızı sizin için biz yayımlayalım.",
  },
  "contact-band": {
    title: "İşletmenizi müşterilerinizin cebine taşımaya hazır mısınız?",
    text: "İşletmenizi WhatsApp'tan bize anlatın ya da hesabınızı oluşturup kuruluma bugün başlayın.",
  },
  solutions: {
    eyebrow: "Çözümler",
    title: "İşletmenizin çalışma şekline uygun bir uygulama",
    intro: "Akademiler, mağazalar, restoranlar, klinikler, spor salonları, etkinlikler, yardım kuruluşları ve daha fazlası; web siteli ya da web sitesiz, aynı platformda kendi ekranlarıyla.",
  },
  "solution-academy": {
    eyebrow: "Akademi uygulamaları",
    title: "Akademiniz, öğrencilerinizin cebinde",
    intro: "Kurslar, korumalı dersler, sınavlar ve ilerleme kendi uygulamanızda; WordPress LMS'inizden, Teachable, Thinkific, kendi API'nizden ya da panelden eklediğiniz kurslardan.",
  },
  "solution-store": {
    eyebrow: "Mağaza uygulamaları",
    title: "Mağazanız bir dokunuş uzağınızda",
    intro:
      "Markanızı taşıyan bir uygulamada ürünler, sepet ve kendi ödeme sayfanız; WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla, Zid, kendi API'nizden ya da panelden kartla ödemeyle eklediğiniz ürünlerden.",
  },
  "solution-restaurant": {
    eyebrow: "Restoran ve kafe uygulamaları",
    title: "Menünüz, müşterilerinizin telefonlarından sipariş ediliyor",
    intro: "Seçenekleriyle yemekler, gel-al veya teslimat, şimdi ya da sonra, kartla ödeme ve müşterilere siparişlerinin nerede olduğunu söyleyen bir mutfak ekranı; restoranınızın adını taşıyan bir uygulamada.",
  },
  "solution-bookings": {
    eyebrow: "Randevu uygulamaları",
    title: "Randevular, kendi uygulamanızdan alınıyor",
    intro: "Hizmetler, ekibiniz ve gerçek boş saatler; Amelia, BookingPress, LatePoint, SimplyBook.me, kendi API'niz ya da paneldeki kurulumdan. Müşteriler saniyeler içinde randevu alır ve işletmenizde öder.",
  },
  "solution-clinic": {
    eyebrow: "Klinik uygulamaları",
    title: "Kliniğiniz, hastalarınızın telefonlarından randevu alıyor",
    intro: "Hastalar bir doktor ve boş bir saat seçer, ön bilgi sorularınızı yanıtlar ve muayenelerini görür; kliniğinizin adını taşıyan bir uygulamada. Yanıtları yalnızca kliniğiniz görür.",
  },
  "solution-fitness": {
    eyebrow: "Spor salonu ve fitness uygulamaları",
    title: "Dersleriniz, üyelerinizin telefonlarından ayırtılıyor",
    intro: "Üyeler haftalık programınızı görür, ders dolana kadar yer ayırtır ve üyeliklerini kartla satın alır; salonunuzun adını taşıyan bir uygulamada.",
  },
  "solution-services": {
    eyebrow: "Hizmet ve şirket uygulamaları",
    title: "Şirketiniz, müşterilerinizin telefonundan randevuyla",
    intro: "Hizmetleriniz, ekibiniz ve kampanyalarınız adınızı taşıyan bir uygulamada: müşteriler sizi tanır, kampanyaları görür ve randevu alır; randevu sisteminizden ya da paneldeki bir kurulumdan.",
  },
  "solution-real-estate": {
    eyebrow: "Emlak uygulamaları",
    title: "İlanlarınız; arama, favoriler ve mesajlarla",
    intro: "Mülklerinizi panelden ekleyin. İnsanlar filtrelerle arar, favorilerini kaydeder ve ofisinize mesaj gönderir; adınızı taşıyan bir uygulamada.",
  },
  "solution-news": {
    eyebrow: "Haber ve blog uygulamaları",
    title: "Haberleriniz, okurlarınızın ana ekranında",
    intro: "Kendi uygulamanızda haberler, bölümler ve son dakika uyarıları; WordPress sitenizden, RSS akışı olan herhangi bir siteden, kendi API'nizden ya da panelde yazdığınız haberlerden.",
  },
  "solution-events": {
    eyebrow: "Etkinlik ve bilet uygulamaları",
    title: "Etkinlikleriniz ve biletleri her cepte",
    intro: "Programınızı kendi uygulamanızda yayımlayın. İnsanlar ücretsiz bilet alır ya da ücretli bilet satın alır, biletlerini QR koduyla telefonlarında saklar; siz de kapıda kontrol edersiniz.",
  },
  "solution-charity": {
    eyebrow: "Yardım ve bağış uygulamaları",
    title: "Kampanyalarınız, bağışa bir dokunuş uzaklıkta",
    intro: "Hikâyesi ve ilerlemesiyle kampanyalar, kendi iyzico, Kashier, Fawaterk, Stripe veya PayPal hesabınıza ödenen bağışlar ve her bağışçıya bir makbuz; adınızı taşıyan bir uygulamada.",
  },
  features: {
    eyebrow: "Özellikler",
    title: "Uygulamanızın ihtiyacı olan her şey, hazır",
    intro: "Markanız ve sayfalarınız, üç dil, kodla giriş, anlık bildirimler, ödemeler ve yayın. Android ve iOS için tek uygulama; yeni sürüm olmadan panelinizden değişir.",
  },
  integrations: {
    eyebrow: "Entegrasyonlar",
    title: "İçeriğiniz, nerede olursa olsun",
    intro: "{plugins} desteklenen eklentiyle WordPress, {platforms} çevrimiçi platform, RSS akışları, kendi API'niz ya da hiç web sitesi olmadan. İçeriğiniz olduğu yerde kalır, uygulamanız onu canlı okur.",
  },
  "how-it-works": {
    eyebrow: "Nasıl çalışır",
    title: "{steps} adımda kayıttan uygulama mağazalarına",
    intro: "İşletmenizi bugün nasıl yönetiyorsanız öyle yönetmeye devam edersiniz. Yallapp onu kendi Android ve iOS uygulamalarınıza dönüştürür.",
  },
  pricing: {
    eyebrow: "Fiyatlar",
    title: "Her uygulama için bir paket",
    intro: "Android ile başlayın, iOS'a geçin; hazır olduğunuzda yayını sizin için biz yapalım. Her uygulamanın kendi paketi vardır. Panelinizden kartla ödeyin ya da WhatsApp'tan ekibimizle ayarlayın.",
  },
  faq: {
    eyebrow: "SSS",
    title: "Sorular ve yanıtları",
    intro: "Aradığınızı bulamadınız mı? Belgeleri okuyun ya da WhatsApp'tan bize yazın, size doğrudan yanıt verelim.",
  },
  contact: {
    eyebrow: "İletişim",
    title: "Bizimle konuşun",
    intro: "Yallapp hakkında sorular, işletmeniz için bir paket ya da uygulamalarınızla ilgili yardım: buradayız.",
  },
  docs: {
    eyebrow: "Belgeler",
    title: "Yallapp belgeleri",
    intro: "Uygulamanızı kurmak, yayımlamak ve yönetmek için ihtiyacınız olan her şey; adım adım ve sade bir dille.",
  },
  developers: {
    eyebrow: "Geliştiriciler için",
    title: "Yallapp API referansı",
    intro: "Kendi web sitelerinden Yallapp API'sini sunan geliştiriciler için uygulamanızın çağırdığı her uç nokta. Adım adım rehberle başlayın, ardından bu referansı kullanın.",
  },
};
