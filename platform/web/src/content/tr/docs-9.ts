import type { DocTranslation } from "../translation-types";

/** 103R The documentation in Turkish, part 9: Yallapp Studio. */
export const TR_DOCS_9: Record<string, DocTranslation> = {
  "yallapp-studio": {
    title: "Yallapp Studio: uygulamanı özgürce tasarla",
    description: "Yallapp Studio nedir, projeleri normal uygulamalardan nasıl ayrılır, proje oluşturma, Studio düzenleyicisi, teslimat şirketleri ve Studio'nun kendi planları.",
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

## Studio düzenleyicisi

**Düzenleyiciyi açın**'ı seç. Sayfa ortadaki telefonun içindedir; bir yanda **Öğeler**, **Hazır bölümler**, **Şablonlar** ve **Sayfa katmanları**, öbür yanda seçilen öğenin ayarları vardır.

- **Öğeler**: sayfayı düzenlemek için Satır, Sütun, Katmanlar, Izgara, Kaydırıcı ve Boşluk; Metin, Resim, Düğme, Simge ve Ayırıcı; ürünlerin, kursların, hizmetlerin ya da diğer kayıtların için, tasarladığın bir kartta Liste; Kategoriler, Video, Form, Harita, Puanlar ve Arama. Herhangi bir öğeyi sürükle ve istediğin yere bırak.
- **Boyut ve yer**: her öğe alanı doldurabilir (**Fill**), içeriğine göre olabilir (**İçeriğe göre**) ya da **Sabit** bir boyut alabilir; iç boşluk, dış boşluk ve aradaki boşlukla.
- **Renkler**: bir arka plan, bir geçiş ya da arkasında bir resim ve bir metin rengi; her birinin **Koyu modda** kendi rengiyle. Yazı tipleri, köşeler, gölgeler ve kenarlıklar da.
- **Hareket**: **Göründüğünde** (belirme, kayma ya da büyüme), **Dokunulurken** (küçülme ya da sekme) ve **Sürekli** (nabız, süzülme ya da sallanma) ne olacağı. Hareketi azaltmaya ayarlı telefonlar onu sabit gösterir.
- **Müşteri dokununca**: uygulamanın bir ekranını, bir sayfayı, bir web adresini ya da tek bir kaydı aç.
- **Göründüğü yer**: Android, iOS ya da ikisi; **Kim görür**: herkes, giriş yapanlar ya da giriş yapmayanlar.

Sayfayı küçük bir telefonda, büyük bir telefonda ve bir tablette, açık ve karanlık modda kontrol et. **Geri al** ve **Yinele** geri ve ileri gider, sayfa sen çalışırken kaydedilir. **Telefonda önizle** onu telefonunda denemeni sağlar; **Yayınla** onu uygulamana gönderir, uygulama bir sonraki açılışta gösterir. **Sayfayı kendi şablonum olarak kaydet** onu diğer sayfaların için **Şablonlarım**'da tutar.

## Teslimat şirketleri

Bir teslimat şirketinin projesi yalnızca Studio'da yapılır. Müşteriler alış ve teslim yeriyle bir paket gönderir, yazarken fiyatı görür, nakit ya da kendi ödeme hesabın üzerinden kartla öder ve paketi aşama aşama ya da canlı haritada takip eder. Kuryelerin aynı uygulamada işleriyle birlikte bir **Kurye** sekmesi ya da bunu içeren planlarda kendilerine ait ikinci bir uygulama alır.

Projenin panelinde fiyatlarını ve müşterilerin nasıl ödeyeceğini **Teslimat ayarları**'nda belirle, kuryelerini **Kuryeler**'e ekle ve her gönderiyi **Gönderiler**'de takip et.

## Studio planları

Her Studio planında Studio düzenleyicisi, anlık bildirimler, kendi ödeme hesabın üzerinden kartla ödeme, çevrimdışı indirme, otomatik yeniden derleme, sohbet, sadakat puanları ve uygulama mağazaları üzerinden satılan kurslar ve üyelikler vardır. iOS uygulaması, senin için yayınlama, teslimat ve kuryeler, kuryeler için ikinci bir uygulama, hareket, şablonlar ve bir projedeki Studio sayfası sayısı plan plan seçilir.

Studio planlarını [fiyatlar sayfasında](/pricing) ve [Yallapp Studio](/yallapp-studio)'da gör. **Talep üzerine** yazıyorsa WhatsApp'tan bize yaz, projene uyan planı önerelim.

> [Studio demosu](/demo/studio), uygulamanın kendisinin çizdiği gerçek Studio projelerinden ekranlar gösterir.
`,
  },
};
