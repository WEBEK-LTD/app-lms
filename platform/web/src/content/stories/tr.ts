import type { StoryCopy } from "@/site/story/types";

/** Yallapp Studio hikâye sayfaları Türkçe, İngilizcesiyle (./en.ts) madde madde aynı. */
export const STORIES_TR: StoryCopy = {
  ui: {
    studio: "Yallapp Studio",
    tryDemo: "Demoyu deneyin",
    seePlans: "Paketlere bakın",
    readStory: "Hikâyeyi okuyun",
    scroll: "Başlamak için kaydırın",
    chapter: "Bölüm",
    inTheApp: "Uygulamada",
    everything: "Yaptığı her şey",
    realScreen: "Demodan gerçek ekranlar",
    plansTitle: "Studio paketleri",
    plansText: "Bu paket bir Yallapp Studio projesidir. Size uyan paketi seçin, ekip sizinle birlikte kursun.",
    allPlans: "Tüm paketler ve fiyatlar",
    compareLabel: "Bu tür uygulamaları yapan şirketlerle karşılaştırma",
    compareChecked: "Kendi sitelerinde yazdığı gibi, Kasım 2026'da kontrol edildi. Teklifleri değişir: bugünkü şartlar için sayfalarına bakın.",
    compareSources: "Her satırın kaynağı",
    compareRows: {
      kind: "Nedir",
      apps: "Dahil uygulamalar",
      ownName: "Kendi adınızla",
      pricing: "Fiyatlandırma",
      published: "Fiyatlar yayınlanmış",
      arabic: "Arapça belirtilmiş",
    },
    yallapp: "Yallapp Studio",
    agency: "Bir ajansa özel yaptırmak",
    creditsTitle: "Fotoğraf künyesi",
    creditsText: "Bu sayfadaki fotoğraflar, belirtilen lisanslarla bu fotoğrafçılara ait. Teşekkürler.",
    creditsNone: "Bu sayfa henüz dışarıdan fotoğraf kullanmıyor: içindeki her görsel uygulamanın gerçek bir ekranı.",
    photoBy: "Fotoğraf: {creator}",
    photoSource: "Kaynak",
    otherStories: "Yallapp Studio'dan diğer hikâyeler",
    demoTitle: "Şimdi kendiniz deneyin",
    demoText: "Demoyu telefonunuza kurun ve demo numarasıyla giriş yapın. Hikâyenin her rolünü siz oynarsınız, yaptığınız hiçbir şey gerçek bir kişiye ulaşmaz.",
    solutionLink: "Kısa hâli",
    fromStudioTitle: "Altı uygulama, altı hikâye",
    fromStudioText: "Studio'da yapılan her uygulamayla bir günü, sahne sahne, gerçek uygulama ekranlarıyla izleyin; her parçası anlatılmış ve başkalarıyla karşılaştırılmış olarak.",
    storyOfThis: "Hikâyenin tamamı, sahne sahne",
    now: "şimdi",
    art: {
      gate: "Kapı",
      gateNote: "Her 30 saniyede yeni bir kod",
      present: "Var",
      late: "Geç",
      absent: "Yok",
      fareParts: ["Açılış ücreti", "Kilometre başına", "Dakika başına", "Asla en düşük ücretin altında değil"],
      priceWays: ["Mesafeye göre", "Bölgeye göre", "Tek sabit fiyat"],
      newRide: "Yeni yolculuk isteği",
      secondsLeft: "saniye kaldı",
      accept: "Kabul et",
      running: "Yaklaşık 20 dk gecikmeli: yoğunluk",
      runningNote: "1 saat sonra kendiliğinden biter",
      weighed: "Hazırlanırken tartılır",
      estimate: "Tahmini",
      perKg: "kg başına",
      liveMap: "Haritada canlı",
      registerNames: ["Lina", "Ömer", "Ferida", "Ziyad", "Melek"],
      when: "Ne zaman ulaşsın?",
      today: "Bugün",
      todayClosed: "Bugünün siparişleri 16:00'da kapandı.",
      tomorrow: "Yarın, 15 Kasım",
      pickDate: "Tarih seçin",
      slotFull: "Dolu",
      flashSale: "Flaş indirim",
      flashItem: "Pembe Bahçe · Lüks",
      onlyLeft: "Yalnızca 4 kaldı",
      cardTo: "Kime: Salma Adel",
      cardFrom: "Kimden: Omar Hassan",
      cardMessage: "“İyi ki doğdun! Bu yıl bu çiçekler gibi açsın.”",
      cardOccasion: "Doğum günü",
      codeApplied: "Kod uygulandı",
      feeTitle: "Teslimat ücreti",
      feeParts: ["Temel ücret", "Mesafe · 2 km", "Saat aralığı", "Teslimat"],
    },
  },
  stories: {
    school: {
      navName: "Okul uygulaması",
      metaTitle: "Öğrenciler, veliler, öğretmenler ve personel için uygulamalarıyla bir okul uygulaması",
      metaDescription: "Nakhla Okulu'nda bir gün: velinin haritasındaki servis, teslim edilen ödev, saniyeler içinde yoklama, maaşlar ve bordrolar. Bir Yallapp Studio paketi.",
      summary: "Öğrenci ve veliler için okulun uygulaması, personel uygulaması ve ofis için Studio.",
      eyebrow: "Yallapp Studio · Okul paketi",
      title: "Nakhla Okulu'nda bir gün",
      intro: "Güneş Maadi'nin üzerine doğmadan bir anne telefonuna bakar. Ay sonunda ofis maaşları kapatır. Arada bir okul, dört tür insan, iki uygulama ve dakika dakika izleyebileceğiniz bir gün var.",
      cast: "Lina 5-A sınıfında. Annesi Rania hiçbir şeyi kaçırmaz, hiçbir şeyi unutmaz, çünkü onun yerine uygulama hatırlar. Mona Hanım, Lina'nın sınıf öğretmeni. Samia Hanım okulun ofisini yönetiyor. Aşağıdaki her ekran gerçek uygulama; bu akşam deneyebileceğiniz Nakhla Okulu demosundan.",
      chapters: [
        {
          time: "06:40",
          kicker: "Şafaktan önce",
          title: "Ev hâlâ karanlık",
          text: "Lina'nın annesi Rania çay demler ve Veli sekmesini açar. Lina'nın günü orada: beş ders, teslimi gelen iki ödev ve okul bugün onu dedesi Samir'in alacağını bilsin diye dün akşam yazdığı not. Tek dokunuşla küçük kardeşi Adam'ın gününe geçer. Tek hesap, iki çocuk.",
        },
        {
          time: "07:16",
          kicker: "Servis",
          title: "Dört dakika uzakta",
          text: "Lina ayakkabılarını bağlarken Rania'nın telefonu titrer. Servis yaklaştı. Haritayı açar ve onu Victoria Meydanı'ndan dönerken izler: geçtiği duraklarla bekledikleri durak arasında ilerleyen küçük bir otobüs. Lina bindiğinde ikinci mesaj gelir: bindi.",
          push: { app: "Nakhla School", title: "Servis yaklaştı", body: "Lina adlı öğrencinin servisi Road 9, Maadi durağına yaklaşık 5 dk uzakta." },
        },
        {
          time: "07:46",
          kicker: "Kapı",
          title: "Her otuz saniyede değişen bir kod",
          text: "Kapıdaki ekran altı haneli bir kod ve QR kodunu gösterir, her otuz saniyede yenisi gelir. Lina kodu yazar ve içeridedir. Bir dakika önce çekilmiş bir fotoğrafı işe yaramaz; okul ayrıca telefonun okulun sınırları içinde olmasını da isteyebilir. Evde Rania tek bir satır okur.",
          push: { app: "Nakhla School", title: "Lina okula geldi", body: "Lina saat 07:46 itibarıyla giriş yaptı." },
        },
        {
          time: "08:00",
          kicker: "İlk ders",
          title: "Zil susmadan yoklama",
          text: "Mona Hanım personel uygulamasında 5-A'yı açar. Var, var, geç, yok. Her ismin yanında kapıdan geçtiği saat yazar, tahmin etmesine gerek kalmaz. Kaydeder; gelmeyen çocuğun ailesi tahtaya ilk işlem yazılmadan haberdar olur.",
        },
        {
          time: "12:30",
          kicker: "Ödev",
          title: "Bahçeden teslim edildi",
          text: "Lina kesirleri dün akşam bitirdi. Tek bir satır yazar, dosya eklemez ve ödevi uygulamadan teslim eder. Öğleden sonra Mona Hanım notunu vermiştir: 10 üzerinden 9 ve 7. soruya bir daha bakmasını söyleyen bir not. Rania notu Lina'yla aynı anda görür.",
        },
        {
          time: "13:10",
          kicker: "Kütüphane",
          title: "Atlas için sırada",
          text: "Mısır Atlası Ömer'de, Lina onu ayırır ve sıraya girer. Geri geldiğinde birkaç okul günü onun için tutulur ve uygulama iade tarihinden önce ona hatırlatır. Küçük Prens'i ise şimdi, uygulamanın içinde e-kitap olarak açabilir.",
        },
        {
          time: "16:05",
          kicker: "Okuldan sonra",
          title: "Müze gezisi, akşam yemeğinden önce ödendi",
          text: "Bilim müzesi gezisi 350 E£. Rania Ücretler ekranından, okulun kendi ödeme hesabıyla kartla öder ve makbuz uygulamaya düşer. Eylülde ofiste ödenen dönem ücreti de orada.",
          push: { app: "Nakhla School", title: "Ödeme alındı", body: "Lina için Bilim müzesi gezisi: 350,00 E£. Makbuz uygulamada." },
        },
        {
          time: "30",
          kicker: "Ay sonu",
          title: "Samia Hanım maaşları kapatıyor",
          text: "Samia Hanım Studio'da ayın bordrolarını her kişinin maaşı ve yan ödemelerinden hazırlar. Sistem kapı kayıtlarından kesintiler önerir; birini kabul eder, birini değiştirir, servis görevi için prim yazar ve bir avansın taksitini düşer. Her ödemeyi nakit ya da banka havalesi olarak kaydeder. Uygulamadan hiç para geçmez. Mona Hanım da her öğretmen gibi kendi bordrosunu ve PDF'ini personel uygulamasında açar.",
        },
      ],
      interlude: {
        quote: "Bugün kimse okulu aramadı. Gerek kalmadı.",
        text: "Yukarıdaki her mesajı uygulamalar kendisi gönderdi; doğru kişiye, onun dilinde.",
      },
      statsTitle: "Okul gününü değiştiren küçük sayılar",
      stats: [
        "kapı kodunun değişme süresi; eski bir fotoğrafı işe yaramaz",
        "uygulama tek pakette: okulunki ve personelinki",
        "tür insan, her biri yalnızca kendi kısmını görür",
        "ödeme altyapısından geçer maaşlar: elle kaydedilir",
      ],
      systemsTitle: "Her parçası, ayrıntısıyla",
      systemsText: "Burada taslak yok. Bunlar bir okulun rol rol aldığı ekranlar ve araçlar.",
      systems: [
        {
          name: "Öğrenci",
          title: "Öğrencinin ihtiyacı olan her şey, velinin işi olan hiçbir şey",
          text: "Okul sekmesi günü gösterir, gerisi bir dokunuş uzakta. Öğrenciler ücretleri, izin formlarını ve velilerinin mesajlarını görmez.",
          features: [
            ["Ders programı", "Haftanın dersleri öğretmen ve derslikle, bugünkü en üstte."],
            ["Ödevler", "Teslimi gelenler; bir satır metin ya da dosyayla teslim, tarihten sonra geç olarak işaretlenir, ardından not ve öğretmenin geri bildirimi."],
            ["Sınavlar ve notlar", "Derslik ve kapsamıyla sınav programı; her kısa sınav, sınav ve ödevin notu."],
            ["Giriş ve devam", "Kapının altı haneli kodu uygulamaya yazılır; bugünün saatleri ve ayın günleri."],
            ["Karne", "Dönemin sonuçları ders ders, devamla birlikte."],
            ["Kütüphane", "Başlık, yazar ya da ISBN ile arama, kitap ayırma, sırada bekleme, uygulamada e-kitap okuma, iade tarihinden önce hatırlatma."],
            ["Mesajlar", "Okul izin verirse, okulun belirlediği saatlerde kendi öğretmenlerine yazma."],
            ["Duyurular ve takvim", "Okulun ve sınıfın duyuruları, etkinlikler, tatiller ve sınav günleri; telefonun takvimine eklenir."],
            ["Davranış", "Öğretmenlerden gelen takdirler ve notlar, toplam puanıyla."],
            ["Servis", "Hattı, durağı ve yoldaki servis."],
          ],
        },
        {
          name: "Öğretmen",
          title: "Bir öğretmenin gerçek sabahı için Sınıf sekmesi",
          text: "Öğretmenler, okulun onları eklediği numarayla personel uygulamasında çalışır. Sınıfları, günleri ve kendi maaşları tek yerde.",
          features: [
            ["Bugünün dersleri", "Günün her sınıfı ve dersi, sırayla, dersliğiyle."],
            ["Yoklama", "Her öğrenci için var, yok ya da geç; her ismin yanında kapı saati. Gelmeyenlerin velilerine haber verilir."],
            ["Ödev verme ve okuma", "Bir sınıfa dosyalarıyla ödev verme; gelenleri okuma, notlama ve geri bildirim yazma."],
            ["Notlar ve not defteri", "Kısa sınav, sınav ve ödev notlarını girme; sınıfın dönemlik not defterini görme."],
            ["Davranış", "Okulun kategorilerinden takdir ve not verme; kendi verdiğini aynı gün geri alma."],
            ["Müfredat", "Plandaki her konuyu bir tarihte işlendi olarak, notla işaretleme."],
            ["Raporlar", "Bir öğrenci ya da sınıf hakkında rapor yazma, taslak olarak tutma, gönderme ve ofisin yorumlarına yanıt verme."],
            ["Mesajlar", "Okulun izin verdiği saatlerde tek bir aileye ya da tüm sınıfa birden yazma."],
            ["Servis görevi", "Şoför ve refakatçi seferi başlatır, servisin konumunu paylaşır, binen ve inenleri işaretler."],
            ["Giriş ve izin", "Kapıda giriş yapma; raporun fotoğrafı ya da PDF'iyle hastalık veya yıllık izin isteme."],
            ["Bordrolar", "Her ayın bordrosu, ne ödendiği ve nasıl, ve PDF'i."],
          ],
        },
        {
          name: "Veli",
          title: "Yalnızca velilerin gördüğü bir Veli sekmesi",
          text: "Okuldaki tüm çocuklar için tek hesap. Sunucu veli ekranlarını başka herkese kapatır.",
          features: [
            ["Birkaç çocuk, tek hesap", "Üstten çocuklar arasında geçiş; her birinin kendi günü."],
            ["Geliş ve çıkış", "Çocuk giriş ya da çıkış yaptığında, geç kaldığında veya erken çıktığında bildirim."],
            ["Devam ve notlar", "Her çocuğun günleri, son notları ve karnesi."],
            ["Ücretler", "Ödenecek ve ödenmiş olanlar; okulun kendi hesabıyla kartla ödeme, makbuzlarıyla."],
            ["Haritada servis", "Canlı servis, çocuğun durağı ve ne kadar kaldığı; yaklaştığında, çocuk binip indiğinde bildirim."],
            ["İzin formları", "Son tarihe kadar adınızla evet ya da hayır imzalama; önceki akşam hatırlatma."],
            ["Devamsızlık mazeretleri", "Bir ya da birkaç gün, sebep ve doktor raporunun fotoğrafı; okul uygulamada yanıtlar."],
            ["Teslim alma", "Çocuğu kimlerin alabileceği ve bugünün notu: \"Bugün onu dedesi alacak.\""],
            ["Kütüphane kitapları", "Her çocuğun kitapları ve iade tarihleri."],
            ["Öğretmen raporları", "Okulun paylaşmayı seçtiği raporlar."],
            ["Mesajlar", "Okul izin verirse çocuklarınızın öğretmenlerine yazma."],
            ["Takvim, sınavlar, davranış", "Çocuk başına etkinlikler ve sınavlar, bir gün önceden hatırlatmalar, okulun seçtiği gibi davranış notları."],
          ],
        },
        {
          name: "Yönetim ve personel",
          title: "Ofis, kapı, servisler ve kitaplar",
          text: "Müdür ve ofis web'de Studio'da çalışır; ofis çalışanları, hizmetliler ve servis ekipleri aynı paketteki personel uygulamasını, Nakhla School Staff'ı da kullanır.",
          features: [
            ["Personel uygulaması", "Öğretmenler, ofis çalışanları ve servis ekipleri için mağazada ayrı bir uygulama; ailelerin uygulamasından ayrı."],
            ["Kapı ve giriş panosu", "Kapının ekranı, günün panosu (içeride, geç, henüz gelmedi, çıktı, yok, mazeretli, izinli), ayın CSV raporu ve sebebiyle düzeltmeler."],
            ["Maaşlar ve bordrolar", "Maaşlar ve yan ödemeler, ayın bordroları, kabul edilen ya da değiştirilen önerilmiş kesintiler, primler, taksitle geri alınan avanslar, kilitlenen ay, bir CSV ve her bordro için PDF."],
            ["İzinler", "Talepler belgeleriyle gelir; notla onaylanır ya da reddedilir, onaylanan günler izin sayılır."],
            ["Öğretmen raporları", "Raporların gelen kutusu: yorumlama, düzeltme için geri gönderme, onaylama ve velilerle paylaşma."],
            ["Müfredat ilerlemesi", "Her sınıf planına göre; geride kalanlar önce."],
            ["Servisler", "Hatlar, saatleriyle haritadaki duraklar, her duraktaki öğrenciler, her seferin geçmişi ve şu an çalışan servislerin canlı haritası."],
            ["Kütüphane masası", "Öğrencinin ve kopyanın koduyla ödünç verme ve iade, gecikenler listesi, alınmayı bekleyen ayrılmış kitaplar ve CSV'den içe aktarılan kitaplar."],
            ["Duyurular", "Tüm okul, bir sınıf ya da yalnızca öğretmenler ve personel için."],
            ["Mesajlar", "Bir öğretmene, hepsine ya da bir bölüme yazma; öğretmenlerin ve ailelerin birbirine yazıp yazamayacağını, ne zaman ve dosyalı mı yalnızca metin mi olacağını belirleme."],
            ["Takvim ve sınavlar", "Okul, bir kademe, bir sınıf ya da personel için etkinlikler, tatiller ve sınav günleri; sınav programını yayınlayınca ailelere haber verilir."],
            ["Ücretler", "Öğrenci başına ücretler; ofiste ya da uygulamada kartla ödenir, makbuzlarıyla."],
            ["Tablodan kişiler", "Sınıflar, öğrenciler, veliler, öğretmenler ve personel bir tablodan içe aktarılır."],
          ],
        },
        {
          name: "Üniversiteler",
          title: "Aynı proje, üniversite modunda",
          text: "Bir Okul projesi üniversite de yönetebilir: fakülteler, programlar, kayıt ve sonuçlar; öğretim üyeleri ve danışmanlarla.",
          features: [
            ["Fakülteler ve programlar", "Derecesi, mezuniyet kredisi ve ders planıyla bölümler ve programlar."],
            ["Uygulamada kayıt", "Kalan kontenjanla şubeler, çakışmayan dersler, geçilmiş ön koşullar ve programın kredileri."],
            ["Bekleme listeleri", "Dolu şubenin bekleme listesi olur; uyan ilk öğrenci boşalan yeri alır."],
            ["Danışmanlar", "Her kayıt öğrencinin danışmanına gider; danışman onaylar ya da notla geri gönderir."],
            ["Öğretim üyeleri", "Şubeleri, her dersin yoklaması ve üniversitenin ölçeğinde notlar."],
            ["Sonuçlar ve transkript", "Dönem ve genel not ortalamasıyla döneme göre sonuçlar; transkript uygulamada ve PDF olarak."],
            ["Ders planı", "Tamamlanan, devam eden ve kalan."],
            ["Veliler", "Çocuklarının sonuçlarını yalnızca görüntüler."],
          ],
        },
      ],
      bundleTitle: "Birbiriyle konuşan iki uygulama ve bir panel",
      bundleText: "Ailelerin uygulaması ve personel uygulaması, tek bir Studio projesinden, okulun adıyla yapılıp yayınlanır. Birinde olan diğerinde hemen görünür.",
      bundleNodes: [
        ["Nakhla School", "Öğrenciler ve veliler"],
        ["Yallapp Studio", "Müdür ve ofis, web'de"],
        ["Nakhla School Staff", "Öğretmenler, ofis çalışanları ve servis ekipleri"],
      ],
      bundleFlows: [
        "Sınıf sekmesinde verilen ödev öğrenciye ve veliye ulaşır",
        "Kapıdaki giriş veliye haber verir",
        "Ekibin telefonu servisi velinin haritasında yürütür",
        "Studio'da hazırlanan bordro öğretmenin uygulamasında açılır",
        "Yalnızca personele yönelik duyurular ailelere asla ulaşmaz",
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Okul uygulaması satan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'in ve bir ajansa yaptırmanın yanında.",
      finale: {
        title: "Haziranda salon dolu",
        text: "Bunun gibi sabahlarla geçen bir yıl, ailelerle dolu bir salonda biter. Notlar, günler, kitaplar ve geziler uygulamada; okul eylüle yeniden kuracak hiçbir şey olmadan başlar.",
      },
      photos: {
        "school-dawn": "Sabah okula el ele yürüyen iki çocuk",
        "school-bus": "Yanında bekleyen çocuklarla eski, kırmızı-beyaz bir okul otobüsü",
        "school-gate": "Bir okul binasının önündeki kaldırımda bir anne ve oğlu",
        "school-teacher": "Dolu bir sınıfın önünde, tahtada bir öğretmen",
        "school-homework": "Defterine yazan bir kız, elinin yanında bir bardak su",
        "school-library": "Kitap raflarının önünde açık bir kitap okuyan biri",
        "school-office": "Masaları, dosyaları ve tahtasıyla bir okulun öğretmenler odası",
        "school-graduation-1": "Gün batımında keplerini göğe fırlatan mezunlar",
        "school-graduation-2": "Mezun kalabalığının üstünde havaya fırlatılan kepler",
      },
    },
    rides: {
      navName: "Yolcu taşıma uygulaması",
      metaTitle: "Sürücü uygulamasıyla bir yolcu taşıma ve taksi uygulaması",
      metaDescription: "Kahire'de bir gece yolculuğu: etraftaki taksilerle harita, istemeden önce ücret, saniye saniye yaklaşan sürücü ve güvenle eve varış. Bir Yallapp Studio paketi.",
      summary: "Yolcu uygulaması, adınızla sürücü uygulaması ve ekibiniz için Studio.",
      eyebrow: "Yallapp Studio · Yolcu taşıma paketi",
      title: "Gece yarısından sonra eve",
      intro: "Saat 23:40, son metro gitti. Ahmed, şarjı bitmek üzere olan telefonu ve uzun bir eve dönüş yoluyla kaldırımda duruyor. Şehrin bir yerinde Hany'nin telefonu arabasının torpidosunda. Sonraki yarım saatte iki uygulama onları buluşturacak ve Ahmed'i kapısına götürecek.",
      cast: "Ahmed yolcu. Hany sürücü. Ekranlar iki demomuzdaki gerçek uygulamalardan: haritada canlı taksi Lamha Taxi ve Masar Rides.",
      chapters: [
        {
          time: "23:40",
          kicker: "Kaldırımda",
          title: "Harita etrafında uyanıyor",
          text: "Ahmed uygulamayı açar, uygulama onun merkezde olduğu haritayla açılır. Yakındaki sokaklarda küçük taksiler canlı olarak hareket eder. Sokağının adını yazmaz: alış için Konumum'a dokunur ve gideceği yerin adını yazar.",
        },
        {
          time: "23:41",
          kicker: "Nereye",
          title: "İstemeden önce ücreti biliyor",
          text: "Her araç türü ücreti ve ne kadar sürede gelebileceğiyle görünür. Bu ücretleri şirket kendisi belirledi: bir açılış, kilometre ve dakika başına bir tutar, asla en düşük ücretin altında değil. Ahmed en ucuzunu seçer, şimdi, sonra değil, ve ister.",
        },
        {
          time: "23:41",
          kicker: "Hany'nin telefonu",
          title: "Evet demek için yirmi saniye",
          text: "İstek önce en yakın boştaki sürücüye gider. Hany'nin telefonu çalar ve teklif geri sayar: alış noktası ve kalan saniyeler. Bırakırsa teklif sonraki sürücüye geçer ve ona bir daha sorulmaz. Kabul et'e dokunur.",
          push: { app: "Lamha Taxi Driver", title: "Yeni yolculuk isteği", body: "R-2001: Talaat Harb Street adresinden alış. Uygulamada kabul edin." },
        },
        {
          time: "23:44",
          kicker: "Araba geliyor",
          title: "Saniye saniye, sokakta",
          text: "Ahmed arabayı sokakta görmeden önce ekranında köşeyi dönerken görür. Hany'nin adı, araba, rengi ve plakası, bir de dört haneli bir kod. Ahmed kodu söylemeden Hany yolculuğu başlatmaz.",
          push: { app: "Lamha Taxi", title: "Sürücünüz yolda", body: "Hany Saeed, R-2001 yolculuğunu kabul etti (White Compact sedan · TX 4821)." },
        },
        {
          time: "23:52",
          kicker: "Arka koltuk",
          title: "Evden izleyen biri de var",
          text: "Ahmed yolculuğu hâlâ uyanık olan kız kardeşiyle paylaşır. Kardeşi arabayı tarayıcısındaki bir sayfadan izler, uygulamaya gerek yok. Yolculuk ekranında şirketin seçtiği numarayı arayan bir acil durum düğmesi var. Bu gece gerekmeyecek.",
        },
        {
          time: "00:14",
          kicker: "Ev",
          title: "Kapı, ücret, yıldızlar",
          text: "Uygulama ücreti sonda gösterir. Ahmed Hany'ye nakit öder; başka bir gece şirketin kendi ödeme sayfasından kartla ödeyebilir. Beş yıldız verir. Hany'nin gecelik kazancı günlük, haftalık ve aylık olarak artar.",
          push: { app: "Lamha Taxi", title: "Vardınız", body: "R-2001 sona erdi. Ücret 85,00 E£. Sürücünüzü uygulamada değerlendirin." },
        },
      ],
      interlude: {
        quote: "İki yabancı, bir şehir, otuz dört dakika.",
        text: "Eşleştirme, ücret, canlı harita, kod, makbuz ve kazanç: hepsi şirketin kendi kurallarıyla kendiliğinden işledi.",
      },
      statsTitle: "Kurallar sizin",
      stats: [
        "haneli kod; açarsanız yolcu bunu sürücüye söyler",
        "uygulama: yolcular ve sürücüler için, ikisi de sizin adınızla",
        "önce, sonraya ayrılmış yolculuk sürücü aramaya başlar",
        "her ücretten Yallapp'e: ücretler ve sizin payınız sizin",
      ],
      systemsTitle: "Her parçası, ayrıntısıyla",
      systemsText: "Yolcu uygulaması, sürücü uygulaması ve şirketin araçları, bugünkü hâliyle.",
      systems: [
        {
          name: "Yolcu uygulaması",
          title: "Harita ana sayfa",
          text: "Yolcular \"Nereye?\" ile başlar ve istemeden önce her şeyi görür.",
          features: [
            ["Önce harita", "Uygulama yolcunun bulunduğu yerde haritayla açılır; taksi şirketi için etraftaki boş taksiler hareket ederken."],
            ["Nereye", "Bir yerin adı, Konumum, yapıştırılan bir harita bağlantısı ya da haritada bir nokta."],
            ["Şimdi ya da sonra", "Şimdi yolculuk ya da şirket izin verirse bir saate rezervasyon."],
            ["Araç türleri", "Her tür ücreti ve ne kadar sürede gelebileceğiyle."],
            ["Gelen sürücü", "Sürücünün adı, fotoğrafı, arabası ve plakası, haritada izlenir."],
            ["Kod", "Şirket açarsa, yolcunun başlamak için sürücüye söylediği dört haneli kod."],
            ["Yolculuğu paylaşma", "Evdeki biri için, herhangi bir tarayıcıda açılan bir bağlantı."],
            ["Acil durum düğmesi", "Yolculuk ekranında; şirketin acil numarasını ya da telefonun kendi acil numarasını arar."],
            ["İptal", "Bir sebeple; ilk dakikalarda ücretsiz, sonra şirketin kuralına göre."],
            ["Ödeme", "Sürücüye nakit ya da şirketin kendi ödeme sayfasında ödenen kartlı yolculuk."],
            ["Değerlendirme", "Sonda sürücüye yıldız."],
            ["Yolculuklarım", "Ücretiyle her yolculuk."],
          ],
        },
        {
          name: "Sürücü uygulaması",
          title: "Her seferinde bir teklif ve gecenin kazancı",
          text: "Sürücülerin şirketin adıyla kendi uygulaması var; teklifleri, yolculukları ve paraları burada.",
          features: [
            ["Çevrimiçi ve çevrimdışı", "Sürücünün konumu yalnızca çevrimiçiyken ve uygulama açıkken gönderilir."],
            ["Geri sayımlı teklifler", "Sesli ve kalan saniyeleriyle her seferinde bir teklif; kabul et ya da sonraki sürücüye bırak."],
            ["Yol tarifi", "Alış ve bırakış noktaları telefonun kendi harita uygulamasında açılır."],
            ["Yolculuğun aşamaları", "Vardım, yolcunun koduyla başladı, bitti."],
            ["Ücret", "Sonda gösterilir: yolculuktan önce verilen ücret ya da mesafe ve dakikalardan hesaplanan."],
            ["Tahsil edilecek nakit", "Nakit yolculukta yolcudan alınacak tutar."],
            ["Kazanç", "Günlük, haftalık ve aylık."],
            ["Kendi uygulaması", "\"Lamha Taxi Driver\": kendi mağaza sayfası, simgesi ve bildirimleri."],
          ],
        },
        {
          name: "Şirket, Studio'da",
          title: "Fiyatlandırma, eşleştirme ve yolun kuralları",
          text: "Şirket her şeyi web'de Studio'dan yönetir. Yallapp hiçbir tutarı belirlemez: her ücret ve bedel şirketindir.",
          features: [
            ["Araç türleri ve ücretleri", "Açılış, kilometre başına, dakika başına, en düşük ücret ve ücretsiz dakikalardan sonra ücretli bekleme."],
            ["Sabit ya da taksimetre", "Yolculuktan önce gösterilen ücret ücrettir ya da sonda mesafe ve dakikalardan hesaplanır."],
            ["Eşleştirme", "Önce o türden en yakın boştaki sürücü, sizin belirlediğiniz saniye kadar, sonra sıradaki; ya da ekibiniz her yolculuğu bir sürücüye verir."],
            ["İptaller", "Yolcu için ücretsiz dakikalar, sonrasında bir ücret ve sürücü bekledikten sonra gelmeme ücreti."],
            ["Hizmet bölgeleri", "Alışların nerede olabileceği ya da her yer."],
            ["Sonraya yolculuklar", "Ayrılmış yolculuk saatinden 15 dakika önce sürücü aramaya başlar."],
            ["Sürücüler", "Belgeleri, arabası ve plakası; onaylama ya da askıya alma."],
            ["Şu anki yolculuklar", "Çevrimiçi sürücüler, her yolculuğun aşaması; bir yolculuğu sürücüye verme ya da iptal etme."],
            ["İndirim kodları", "Ücretten bir pay, bir sınıra kadar."],
            ["Hesap dökümleri", "Her ücretten şirketin payı; tüm sürücüler ya da tek bir sürücü için."],
            ["Acil numarası", "Yolculuktaki acil durum düğmesinin aradığı numara."],
          ],
        },
        {
          name: "Haritada canlı taksi",
          title: "Lamha Taxi: her şey olduğu anda hareket eder",
          text: "Taksi şirketleri için, aynı yolculuk altyapısında kendine ait bir tür.",
          features: [
            ["Tam ekran harita", "Yolcunun etrafındaki boş taksiler, hareket hâlinde."],
            ["Canlı, kendi veritabanınızda", "Konumlar şirketin kendi Firebase Realtime Database'inde; o yoksa uygulama her beş saniyede sorar."],
            ["Sizin haritalarınız", "Kendi anahtarınızla Google Maps ya da kendi OpenStreetMap tile sunucunuz; yer arama ve rotalarla."],
            ["Şirketin canlı haritası", "Boştaki ve yolculuktaki sürücüler ile bekleyen yolculuklar panelde."],
          ],
        },
      ],
      bundleTitle: "İki uygulama ve bir panel",
      bundleText: "Yolcuların ve sürücülerin mağazalarda ayrı uygulamaları var; ikisi de şirketin adıyla, tek bir Studio projesinden.",
      bundleNodes: [
        ["Lamha Taxi", "Yolcular"],
        ["Yallapp Studio", "Şirket, web'de"],
        ["Lamha Taxi Driver", "Sürücüler"],
      ],
      bundleFlows: [
        "İstek en yakın boştaki sürücüye gider",
        "Sürücünün konumu arabayı yolcunun haritasında yürütür",
        "Ücret şirketin kurallarına uyar",
        "Kartlı yolculuk şirketin kendi hesabına ödenir",
        "Her ücret sürücünün kazancına ve şirketin dökümüne geçer",
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Yolcu taşıma uygulaması satan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'in ve bir ajansa yaptırmanın yanında.",
      finale: {
        title: "Yarın gece, yine",
        text: "Hany saat onda yeniden çevrimiçi olur. Ahmed ihtiyacı olana kadar uygulamayı düşünmez. Olması gereken de bu.",
      },
      photos: {
        "rides-night-city": "Gece, araba ışıklarıyla dolu şehir sokakları",
        "rides-waiting": "Gece bir bankta tek başına bekleyen biri",
        "rides-driver": "Direksiyonda bir sürücünün elleri",
        "rides-backseat": "Bir arabanın penceresinden dışarı bakan bir yolcu",
        "rides-arrive-home": "Gece ışıklı bir apartman girişi",
      },
    },
    delivery: {
      navName: "Teslimat uygulaması",
      metaTitle: "Adınızla kurye uygulamasıyla bir teslimat ve kurye uygulaması",
      metaDescription: "Küçük bir dükkânın rafından müşterinin kapısına: paket gönderin, fiyatı görün, kuryeyi canlı izleyin, nakit ya da kart. Bir Yallapp Studio paketi.",
      summary: "Müşteri uygulaması, adınızla kurye uygulaması ve sevk için Studio.",
      eyebrow: "Yallapp Studio · Teslimat paketi",
      title: "Hany'nin rafından bir yabancının kapısına",
      intro: "Hany mutfak büyüklüğünde bir dükkânda el yapımı deri ürünler satıyor. Bu sabah gece boyunca on iki sipariş gelmiş. Karim iki sokak ötedeki kurye şirketinde çalışıyor. Öğlene kadar her kutu kapısında olacak ve Hany tek bir telefon görüşmesi yapmayacak.",
      cast: "Dükkân Hany'nin. Kurye Karim. Ekranlar teslimat demomuz Sahm Express'in gerçek uygulamalarından.",
      chapters: [
        {
          time: "09:10",
          kicker: "Dükkân",
          title: "Tezgâhta on iki kutu",
          text: "Hany son kutuyu bantlar ve kâğıda hiçbir şey yazmaz. İhtiyacı olan her şey kurye şirketinin uygulamasında: hizmet, nereden alınacağı, nereye bırakılacağı, kimin teslim alacağı ve içinde ne olduğu.",
        },
        {
          time: "09:25",
          kicker: "Gönder",
          title: "Yazarken fiyat",
          text: "Alış için Konumum'a dokunur, bırakış için müşterinin harita bağlantısını yapıştırır. Fiyat o yazarken, şirketin kendi kuralıyla hesaplanıp görünür: mesafeye göre, bölgeye göre ya da tek sabit fiyat. Nakdi seçer; uygulama kuryeye tam olarak ne tahsil edeceğini gösterecek.",
          push: { app: "Sahm Express", title: "Gönderiniz alındı", body: "S-1001 bir kurye bekliyor. Kurye yola çıkınca size haber vereceğiz." },
        },
        {
          time: "09:31",
          kicker: "Karim",
          title: "İlk kabul eden alır",
          text: "Karim görevde. İş, alış noktası ve tahsil edilecek nakitle telefonunda belirir ve herkesten önce alır. Şirket işleri tek tek kendisi de dağıtabilirdi. Karim, üzerinde şirketin kendi adı olan kurye uygulamasında çalışıyor.",
          push: { app: "Sahm Express Courier", title: "Yeni bir iş bekliyor", body: "Hany's Leather, Nasr City adresinden S-1001. Uygulamadan alın." },
        },
        {
          time: "10:05",
          kicker: "Yolda",
          title: "Köprüden geçen bir nokta",
          text: "Müşteri paketi aşama aşama izler; yolda olduğu ve Karim işi açık tuttuğu sürece haritada da. Uygulaması kapalıyken hiçbir şey paylaşılmaz ve son konum on dakika sonra kaybolur.",
          push: { app: "Sahm Express", title: "Paketiniz yolda", body: "S-1001 teslimat adresine gidiyor." },
        },
        {
          time: "10:32",
          kicker: "Kapı",
          title: "İki el, bir kutu",
          text: "Karim zili çalar, kutuyu teslim eder ve teslim edildi olarak işaretler. Evde kimse olmasaydı, sebebiyle \"teslim edilemedi\" olarak işaretlerdi ve şirket hemen bilirdi.",
          push: { app: "Sahm Express", title: "Teslim edildi", body: "S-1001 teslim edildi. Bizi tercih ettiğiniz için teşekkürler." },
        },
      ],
      interlude: {
        quote: "On iki paket. Hiç telefon yok.",
        text: "Hany yarının siparişlerini paketliyor. Karim üç iş ileride. Şirketin paneli hepsini olduğu anda gösteriyor.",
      },
      statsTitle: "Şirketin kendi kuralları üzerine kurulu",
      stats: [
        "fiyatlandırma yolu: mesafeye göre, bölgeye göre ya da tek sabit fiyat",
        "ödeme yolu: kuryeye nakit ya da kendi hesabınızla kart",
        "son konum haritada kalır, sonra kaybolur",
        "her teslimattan Yallapp'e: fiyatlarınız sizin",
      ],
      systemsTitle: "Her parçası, ayrıntısıyla",
      systemsText: "Müşteri uygulaması, kurye uygulaması ve şirketin sevk ekranı, bugünkü hâliyle.",
      systems: [
        {
          name: "Müşteri uygulaması",
          title: "Gönder, fiyatı gör, izle",
          text: "Şirketle paket gönderen dükkânlar ve kişiler için.",
          features: [
            ["Paket gönderme", "Hizmet, alış, bırakış, alıcı ve paket."],
            ["Saniyeler içinde yerler", "Bir yerin adı, Konumum, yapıştırılan bir harita bağlantısı ya da harita."],
            ["Yazarken fiyat", "Şirketin kuralına göre, onaylamadan önce."],
            ["Kart ya da nakit", "Şirketin kendi ödeme sayfasında kartla ya da kuryeye nakit."],
            ["İzleme", "Her aşama ve yoldayken haritada kurye."],
            ["Gönderilerim", "Tüm gönderiler; birini ödeme ya da iptal etme."],
            ["Bildirimler", "Alındı, yolda, teslim edildi ya da teslim edilemedi."],
          ],
        },
        {
          name: "Kurye uygulaması",
          title: "İşler, adımlar ve tahsil edilecek nakit",
          text: "Kuryeler şirketin adıyla kendi uygulamalarında ya da ana uygulamanın kurye modunda çalışır.",
          features: [
            ["Görevde ve görev dışı", "Tek düğme; bekleyen işler yalnızca görevdeki kuryelere gelir."],
            ["İşlerim", "Kendi işleri, alınmayı bekleyenler ve bitenler."],
            ["Her işin adımları", "Alındı, yolda, teslim edildi, sebebiyle teslim edilemedi ya da geri verme."],
            ["Tahsil edilecek nakit", "Tutar, işin üzerinde."],
            ["Arama ve yol tarifi", "Müşteriyi arama; yolu telefonun harita uygulamasında açma."],
            ["Konum, yalnızca gerektiğinde", "Paket yoldayken ve ekran açıkken paylaşılır."],
            ["Mağazada kendi uygulaması", "\"Sahm Express Courier\": kendi sayfası, simgesi ve bildirimleri; App Store'da listelenmez, yalnızca kuryeleriniz içindir."],
            ["Ya da Yallapp Courier", "Birkaç şirkete çalışan kuryeler için tek uygulama; yakında Google Play ve App Store'da."],
          ],
        },
        {
          name: "Sevk, Studio'da",
          title: "Her paket ve her kurye tek sayfada",
          text: "Şirket teslimatları web'de Studio'dan yönetir: önce bugünün gönderileri ve görevdeki kuryeler.",
          features: [
            ["Gönderiler", "Bir kuryeye verme, sonraki aşamaya geçirme ya da iptal etme."],
            ["Kuryeler", "Cep numarası ya da e-postayla ekleme; kimin aktif, kimin görevde olduğunu görme."],
            ["Fiyatlar", "Mesafeye göre (açılış, kilometre başına, en düşük ve en uzun mesafe), bölgeye göre ya da sabit; bir hizmet üzerine ekleyebilir."],
            ["İşler", "Ekip dağıtır ya da görevdeki ilk kabul eden kurye alır."],
            ["Ödeme", "Nakit, şirketin kendi ödeme altyapısıyla kart ya da ikisi; ödenmiş siparişlerin listesiyle."],
            ["Haritalar", "Yalnızca aşamalar ya da haritada canlı kurye."],
            ["Bildirimler", "Müşterilere her adımda, kuryelere yeni işlerde ve değişikliklerde."],
            ["Diller", "Studio İngilizce, Arapça ve Türkçe; uygulamalar müşterilerinizin dillerinde."],
          ],
        },
      ],
      bundleTitle: "İki uygulama ve bir panel",
      bundleText: "Müşterilerin ve kuryelerin ayrı uygulamaları var; ikisi de şirketin adıyla, tek bir Studio projesinden.",
      bundleNodes: [
        ["Sahm Express", "Müşteriler ve dükkânlar"],
        ["Yallapp Studio", "Sevk, web'de"],
        ["Sahm Express Courier", "Kuryeler"],
      ],
      bundleFlows: [
        "Yeni gönderi görevdeki kuryelere gider",
        "Kuryenin dokunduğu her adım müşteriye haber verir",
        "Kuryenin konumu paketi müşterinin haritasında yürütür",
        "Tahsil edilen nakit ve kart ödemeleri Studio'da görünür",
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Teslimat yazılımı ve kurye uygulaması satan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'in ve bir ajansa yaptırmanın yanında.",
      finale: {
        title: "Yarın, on iki tane daha",
        text: "Hany cüzdanı çok seven bir müşteriye yanıt yazıyor. Karim bir sonraki işinde. Şirketin günü tek sayfada.",
      },
      photos: {
        "delivery-rider": "Teslimat kutusuyla motosikletinin üzerinde oturan bir kurye",
        "delivery-boxes": "Karanlık bir depoda kutuları istifleyen biri",
        "delivery-handover": "Bir çift elden diğerine geçen karton kutu",
        "delivery-shop-owner": "Masasında paket hazırlayan bir adam",
        "delivery-van": "Dar bir sokakta üç tekerlekli bir teslimat bisikleti",
        "delivery-map": "Gece yukarıdan görülen bir şehir",
      },
    },
    "multi-vendor": {
      navName: "Çok satıcılı uygulama",
      metaTitle: "Restoranlar ve marketler için, büyükler gibi bir çok satıcılı uygulama",
      metaDescription: "Kahire'de cuma öğle yemeği: gecikmeli çalışan yoğun bir mutfak, elma tartan bir market, haritada bir kurye ve sofrada bir aile. Bir Yallapp Studio paketi.",
      summary: "Müşteri uygulaması, işletmelerin uygulaması ve web paneli, kurye uygulaması ve sizin için Studio.",
      eyebrow: "Yallapp Studio · Çok satıcılı paket",
      title: "Kahire'de cuma öğle yemeği",
      intro: "Cuma, öğlenden biraz sonra. Şehirdeki her aile aynı anda acıkıyor. Zamalek'te bir ızgaracı siparişlerle yanıyor, Mühendisin'de bir market elma tartıyor, bir dairede de Fathy ailesi kimin ne istediğine karar veriyor. Hepsini tek bir uygulama bir arada tutuyor.",
      cast: "Şef Hasan, Bab El Sharq Grill'i işletiyor. Zad Market market. Mona Fathy'nin ailesi aç. Ekranlar çok satıcılı demomuz Zad'ın gerçek uygulamasından.",
      chapters: [
        {
          time: "12:40",
          kicker: "Oturma odası",
          title: "Beş kişi, beş fikir",
          text: "Mona Fathy Zad'ı açar. Restoranlar ve market tek uygulamada, fırsatlar en üstte, adresi zaten kayıtlı. Öğle için ızgara, hafta için Zad Market'ten meyve ve ekmek; yan yana izleyeceği iki sipariş.",
        },
        {
          time: "13:05",
          kicker: "Mutfak",
          title: "Şef Hasan kapatmıyor",
          text: "Izgara dolu, siparişler gelmeye devam ediyor. Eskiden dükkânı bir saatliğine kapatırdı. Şimdi Gecikmeli'ye dokunur: yirmi dakika daha, \"yoğunluk\", bir saatliğine. Müşteriler uzayan süreyi ve kartındaki notu görür, sipariş vermeye devam eder. Gecikme kendiliğinden biter.",
        },
        {
          time: "13:15",
          kicker: "Market",
          title: "Bir buçuk kilo kırmızı elma",
          text: "Zad Market'te hazırlayan kişi elmaları tartar. Yarım kilo adımlarla kiloyla satıldıkları için sepet tahmini bir fiyat göstermişti; tartılan fiyat biraz değişebilir, ama uygulama sahibinin belirlediği yüzdeyi asla aşmaz. Mangolar bitmiş; Fathy Hanım eksik her şey için \"çıkarın\"ı seçmişti.",
        },
        {
          time: "13:40",
          kicker: "Yolda",
          title: "Karim, şehrin öbür ucundan",
          text: "Kuryelerden Karim alışverişi getiriyor. Fathy Hanım motosikletini haritada izliyor. Izgara siparişini kendi şoförüyle getiriyor; onu da aşamalarıyla izliyor. Her işletme teslimatı kimin yapacağını kendisi seçer.",
          push: { app: "Zad", title: "Siparişiniz yolda", body: "Z-1207 size doğru yolda." },
        },
        {
          time: "14:30",
          kicker: "Sofra",
          title: "Herkes yiyor",
          text: "Köfte hâlâ sıcak. Ekmek ılık. Kimse yirmi dakikayı hatırlamıyor. Bir şey eksik olsaydı Fathy Hanım, siparişin gelmesinden sonraki kırk sekiz saate kadar siparişten şikâyet açabilirdi ve uygulamanın kendi destek ekibi karar verirdi: kartına ya da cüzdanına iade, bir kupon ya da bir gerekçe.",
        },
      ],
      interlude: {
        quote: "Mutfak gecikti. Kimse aç kalmadı.",
        text: "İşletmeler kendi saatlerini, gecikmelerini ve fırsatlarını kendileri yönetir. Uygulamanın sahibi her değişikliği görür ve geri alabilir.",
      },
      statsTitle: "Bir şehrin öğle yemeğinin kuralları",
      stats: [
        "tür işletme: restoranlar, marketler ve dükkânlar",
        "rol bir işletmenin ekibinde: sahip, yönetici, sipariş alan, hazırlayan",
        "sipariş geldikten sonra şikâyet için",
        "her siparişten Yallapp'e: komisyon ve ücretler sizinle işletmeler arasında",
      ],
      systemsTitle: "Her parçası, ayrıntısıyla",
      systemsText: "Müşteriler, işletmeler, kuryeler ve uygulamanın sahibi; her birinin kendi uygulaması ya da paneli.",
      systems: [
        {
          name: "Müşteri uygulaması",
          title: "Restoranlar ve market, tek uygulamada",
          text: "Ana sayfa, Arama, Siparişler, Kulüp ve Hesap; sizin renklerinizle ve adınızla.",
          features: [
            ["Gezinme ve arama", "İşletmeler, yemekler ve ürünler; türe, mutfağa ve fırsatlara göre, filtrelerle."],
            ["Seçenekleriyle yemekler", "Her restoranın belirlediği boyutlar, yan ürünler ve ekstralar."],
            ["Adetle ya da kiloyla alışveriş", "Ağırlığa göre fiyatlanan tartılı ürünler ve eksik olduğunda seçim: benzeri, seçilen bir ürün ya da çıkarma."],
            ["Teslimat ya da gel-al, şimdi ya da sonra", "Kodla işletmeden alma ya da işletmenin saatlerinden bir saate sipariş."],
            ["Ödeme", "Nakit, kart ya da ödeme sağlayıcınızın sunduğu yerlerde Apple Pay ve Google Pay."],
            ["Kuponlar ve fırsatlar", "Sizin kodlarınız, otomatik fırsatlar ve işletmelerin kendi fırsatları."],
            ["Kulüp", "Belirlediğiniz fiyatlarla, aylık ya da yıllık ücretsiz veya daha ucuz teslimat."],
            ["Cüzdan", "İadeler ve bakiye; siparişin tamamı ya da bir kısmı için kullanılır."],
            ["Siparişi izleme", "Haritada kurye ya da işletme kendisi getirdiğinde aşamalar."],
            ["Destek ve şikâyetler", "Uygulamada destek ekibinizle konuşma; sipariş geldikten sonra 48 saate kadar şikâyet."],
          ],
        },
        {
          name: "İşletmeler: uygulama ve web paneli",
          title: "Her restoran ve dükkân kendi tezgâhını yönetir",
          text: "Her işletmenin paketin içinde kendi uygulaması, \"Zad Partner\", ve kendi girişiyle web'de kendi paneli var.",
          features: [
            ["Siparişler, canlı", "Sesli yeni siparişler; süreyle kabul, reddetme, hazır ve teslim edildi işaretleme."],
            ["Gecikmeli", "Müşterilerin gördüğü bir sebeple on ila altmış dakika daha; yarım saatten iki saate ya da kendisi bitirene kadar."],
            ["Saatler ve tatil günleri", "Kendi haftalık saatleri, tatil günleri ve hazırlık süresi; hemen uygulanır."],
            ["Menü, katalog ve stok", "Yemekler, bölümler, reyonlar ve ürünler; stokta var ya da yok."],
            ["İçe aktarma", "Excel, CSV ve diğer tablolardan ürünler; fotoğraflar SKU ya da barkoda göre yerleştirilir."],
            ["Fotoğraflar", "Her ürün için bir ana fotoğraf ve sekiz tane daha; fotoğraf gerekenler işaretli."],
            ["Kendi fırsatları", "Bedelini kendisinin ödediği kuponlar ve otomatik fırsatlar."],
            ["Kendi teslimatı", "Kendisi getirdiğinde: ücreti, sabit ya da kilometreyle, ve en küçük sipariş."],
            ["Ekibi", "Sahipler, yöneticiler, sipariş alanlar ve hazırlayanlar; her biri yalnızca kendi kısmını görür."],
            ["Hesap dökümleri", "Satışlar, indirimler, komisyon, vergi ve iadeler; Excel, CSV ya da PDF olarak dışa aktarılır."],
            ["Müşterinin iletişim bilgisi yok", "Yalnızca ilk ad ve sipariş; kendi siparişleriyle ilgili şikâyetler okunmak için."],
          ],
        },
        {
          name: "Kuryeler",
          title: "Uygulamanın kuryeleri ya da işletmenin kendi kuryesi",
          text: "Her işletme seçer: haritada canlı izlenen uygulamanın kuryeleri ya da kendi teslimatı.",
          features: [
            ["İşler", "İşletmelerden alış ve müşterilere bırakış."],
            ["Haritada canlı", "Sipariş yoldayken müşteri kuryeyi izler."],
            ["Tahsil edilecek nakit", "Nakit siparişlerde tutar işin üzerinde."],
            ["Kendi uygulaması", "Kendi sayfası ve bildirimleriyle, adınızla bir kurye uygulaması."],
          ],
        },
        {
          name: "Sahip, Studio'da",
          title: "Şehrin öğle yemeğini tek panelden yönetirsiniz",
          text: "Uygulamanın sahibi, destek ekibi ve yöneticileri web'de Studio'da çalışır.",
          features: [
            ["Katılım", "Kendi katılım formunuz; bir işletmeyi kabul edin, hesabını ve ilk personelini alsın."],
            ["Komisyon ve vergi", "İşletme başına bir yüzde ya da sabit tutar; vergiler dahil ya da eklenmiş."],
            ["Teslimat bölgeleri", "Her işletme adresinden bir yarıçapla ya da sizin adlandırdığınız bölgelerle; bölge yoksa her yere açık. Dışarıda uygulama süre yerine bunu söyler."],
            ["Fırsatlar ve kuponlar", "Kodlar ve otomatik fırsatlar; işletmelerin izin verdiğiniz en yüksek yüzdeye kadar kendi fırsatlarını yapmasına izin verme ve herhangi birini duraklatma."],
            ["Kulüp", "Planları ve fiyatları, aylık ya da yıllık."],
            ["Cüzdanlar", "Müşterilerin cüzdanlarında bakiye ve iadeler."],
            ["Şikâyetler ve iadeler", "Vaka sırası: ödemeye, cüzdana ya da kuponla tam veya kısmi iade, bir telafi ya da gerekçesiyle iade yok."],
            ["Hesap dökümleri", "Her işletmenin herhangi bir dönem için hesabı: satışlar, her indirimi kimin ödediği, komisyon, teslimat, vergi ve iadeler."],
            ["İşletme değiştirdi", "Bir işletme saatlerini, tatil günlerini ya da gecikmesini değiştirdiğinde görürsünüz; korursunuz ya da geri alırsınız."],
            ["Fotoğraf zorunlu", "Her ürünün müşteriler görmeden önce fotoğrafa ihtiyacı olup olmadığı."],
            ["Tüm siparişler", "Her işletmedeki her sipariş ve gerektiğinde müdahale."],
          ],
        },
      ],
      bundleTitle: "Dört uygulama ve bir panel",
      bundleText: "Müşteriler, işletmeler ve kuryeler adınızla kendi uygulamalarına sahip, işletmelerin bir de web paneli var; hepsi tek bir Studio projesinden.",
      bundleNodes: [
        ["Zad", "Müşteriler"],
        ["Yallapp Studio", "Siz ve destek ekibiniz"],
        ["Zad Partner", "Restoranlar ve dükkânlar"],
        ["Zad Courier", "Kuryeler"],
      ],
      bundleFlows: [
        "Sipariş işletmenin tezgâhında çalar",
        "Gecikme ya da yeni saatler müşterinin ekranında hemen görünür",
        "Kuryenin konumu müşterinin haritasında ilerler",
        "Şikâyet işletmenin telefonuna değil, destek ekibinize ulaşır",
        "Her sipariş işletmenin hesap dökümüne geçer",
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Çok satıcılı teslimat uygulaması satan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'in ve bir ajansa yaptırmanın yanında.",
      finale: {
        title: "Gelecek cuma, aynı sofra",
        text: "Şef Hasan'ın gecikmesi saat ikide bitti. Zad Market mangoları yeniliyor. Fathy ailesi gelecek hafta öğle yemeği için yine tartışacak ve uygulama hazır olacak.",
      },
      photos: {
        "zad-family-meal": "Bir aile sofrasında tabaklar, ekmek ve bir tencere yemek",
        "zad-kitchen-rush": "Kalabalık bir mutfağın alevleri üzerinde çalışan aşçılar",
        "zad-grill": "Kömür ızgarada şişler, dumanı yükseliyor",
        "zad-market-aisle": "Bir pazar tezgâhında terazide tartılan limonlar",
        "zad-rider-food": "Teslimat kutusuyla motosikletli bir kurye",
        "zad-cafe": "Bir kafe tezgâhının arkasında çalışan bir barista",
        "zad-friday": "Dışarıda küçük bir masa etrafında yemek paylaşan arkadaşlar",
      },
    },
    academy: {
      navName: "Akademi uygulaması",
      metaTitle: "Canlı dersleriyle bir çevrim içi akademi uygulaması, Yallapp Studio'da tasarlandı",
      metaDescription: "Ufuk Akademi ile bir gün: kahvaltıda hat sanatı, tek ödemede iki kurs, 19:30'da canlı ders ve 12 günlük seri. Yallapp Studio'daki premium akademi şablonu.",
      summary: "Öğrencileri için akademinin kendi uygulaması, kursları Yallapp'te veya WordPress'te, her ekranı Studio'da tasarlanmış.",
      eyebrow: "Yallapp Studio · Premium akademi",
      title: "Üst üste on iki gün",
      intro: "Sara işten önce, yolda, öğle arasında ve akşam yemeğinden sonra, her seferinde birkaç dakika öğreniyor. Akademisinin uygulaması kaldığı yeri tutuyor, dakikalarını sayıyor ve dersin ne zaman başladığını haber veriyor. Bu, sabahın ilk kodundan gecenin son dersine, onun günlerinden biri.",
      cast: "Sara Yılmaz, Leila Haddad ile Arap hat sanatı öğreniyor ve bu akşam Deniz Kaya ile UX tasarımına başlıyor; saat 19:30'da içerik pazarlaması üzerine bir canlı dersi var. Ufuk Akademi, premium akademi şablonunun demosu ve aşağıdaki her ekran gerçek uygulama. Demodaki dersler yazılı; gördüğünüz video oynatıcı, video dersleri olan bir akademinin elde ettiği oynatıcı.",
      chapters: [
        {
          time: "07:20",
          kicker: "Yeni telefon",
          title: "Akılda tutulacak şifre yok",
          text: "Sara'nın eski telefonu geçen hafta bozuldu. Yenisine Ufuk Akademi'yi kuruyor, numarasını ve gelen tek kullanımlık kodu yazıyor; ekrandaki bir halka kodun geçerli kalacağı süreyi sayıyor. Yazılacak şifre yok. Hesabı bıraktığı gibi açılıyor: iki kurs, otuz sekiz saatlik öğrenme, siparişleri ve sınav sonuçları. Her dersteki yerini eski telefon değil, akademi saklamıştı.",
        },
        {
          time: "07:35",
          kicker: "Kahvaltı",
          title: "Günaydın Sara",
          text: "11 Kasım Çarşamba ve en üstte adı. Altında aldığı kurs: Leila Haddad ile Yeni Başlayanlar için Arap Hat Sanatı, 18 dersin 12'ncisi, Nesih'te Elif ve Be, 14 dakika kaldı, %61 bitti ve devam etme düğmesi. On iki günlük öğrenme serisinin yanında bu akşamki canlı ders: İçerik pazarlaması, saat 19:30. Daha aşağıda onun için seçilmiş kurslar.",
        },
        {
          time: "08:10",
          kicker: "Yolda",
          title: "Geçen haftadan dörtte bir fazla",
          text: "Tramvayda haftasına bakıyor: şimdiye kadar 3 sa 20 dk, geçen haftadan %25 fazla; her gün için bir çubuk, derslerde gerçekten geçirdiği süreden hesaplanmış. Bir kurs devam ediyor, biri tamamlandı; hat sanatı kursu bir halkada %61'de, on sekiz dersin on biri geride kaldı.",
        },
        {
          time: "12:30",
          kicker: "Öğle arası",
          title: "Öğrenecek yeni bir şey",
          text: "Keşfet'te arıyor ve bir konuya dokunuyor: Tasarım, İş, Diller, Fotoğrafçılık. Seçim düğmeleri listeyi daraltıyor: tümü, ücretsiz, en yüksek puanlı, en yeni. Her kurs; rozeti, puanı, dersleri, öğretmeni ve fiyatıyla bir satır. Deniz Kaya'nın UX Tasarımın Temelleri kursu Yeni ve 4,9 puanlı; Küçük İşletme Sahipleri için Excel çok satanlardan ve ücretsiz.",
        },
        {
          time: "12:36",
          kicker: "Kursun sayfası",
          title: "Karar vermeden önce",
          text: "Konusu Tasarım, onaylı sertifika etiketi, 418 değerlendirmeden 4,9 puan, 32 ders ve 10 sa 10 dk ile uzun bir kapak. Deniz Kaya kendi kartında. Müfredat, kurs hakkında ve değerlendirmeler birer düğme; üniteleri açıyor ve değerlendirmeleri okuyor. Altta: ₺1.450 ve altın renkli Hemen katıl.",
        },
        {
          time: "12:44",
          kicker: "Sepet",
          title: "İki kurs, tek ödeme",
          text: "Yanına Satış Yapan Sosyal Medya kursunu ekliyor: ikisi ₺2.550, akademinin kuponu için bir alan ve kaydettiği kart; yalnızca markası, son dört hanesi ve son kullanma tarihiyle. Altın renkli düğmede: ₺2.550 güvenle öde. Uygulamada kartla ödeme Android'de, akademi açtığında mümkün; iPhone'da kurslar Apple'ın uygulama içi satın almasıyla alınır ya da hiç satılmaz. Sepet, kupon ve kayıtlı kart, WordPress'te Tutor LMS ile çalışan ve WooCommerce üzerinden satan akademilerde var: kartı sitenin ödeme altyapısı saklar, numarası hiçbir zaman uygulamaya ya da Yallapp'e ulaşmaz. Demo Yallapp'te çalışır; orada Hemen katıl, kart almayan bir deneme ödeme sayfası açar.",
        },
        {
          time: "19:15",
          kicker: "Canlı ders",
          title: "On beş dakika erken",
          text: "Hatırlatma dersten önceki bir saat içinde geldi. Yediyi çeyrek geçe, başlamadan on beş dakika önce, Katıl düğmesi İçerik pazarlaması dersini akademinin kullandığı toplantı uygulamasında açıyor. Kaçırsaydı, ders bittikten sonra kaydı uygulamada olacaktı.",
        },
        {
          time: "21:50",
          kicker: "Gece",
          title: "Yerleşim ilkeleri",
          text: "Gece olduğunda yeni kursunun dördüncü dersinde: 5 dersin 4'üncüsü, Ünite 2, Yerleşim ilkeleri. 04:32'de bir not yazdı; not videodaki anını koruyor: \"Kural: her boşluk için 8 px, bölümler arasında iki katı.\" Notlarının yanında iki dosya, aralarında boşluk rehberi, tartışmada da 24 mesaj var. Sırada 22 dakikalık Izgaralar ve boşluklar; on soruluk Ünite 2 sınavı bu dersten sonra açılıyor.",
        },
      ],
      interlude: {
        quote: "Üst üste on iki gün, her seferinde birkaç dakika.",
        text: "Sara'nın ana ekranındaki her kart gerçekten yaptıklarından geliyor: bitirdiği derslerden, geçirdiği dakikalardan, katıldığı dersten.",
      },
      statsTitle: "Bir öğrencinin gününün ardındaki küçük gerçekler",
      stats: [
        "canlı dersten önce Katıl düğmesi açılır",
        "dersin videosunda tek dokunuşla geri veya ileri",
        "şablonun geldiği dil: İngilizce, sağdan sola Arapça ve Türkçe",
        "uygulamaya ya da Yallapp'e ulaşan kart numarası: kayıtlı kart sitenin ödeme altyapısında kalır",
      ],
      systemsTitle: "Her parçası, tek tek",
      systemsText: "Öğrencinin uygulaması, kurs satın alma, akademinin paneli, Studio'daki tasarım ve bir WordPress sitesinin kattıkları, bugün oldukları gibi.",
      systems: [
        {
          name: "Öğrenci uygulaması",
          title: "Kaldığı yeri bilen bir ana sayfa",
          text: "Ana sayfa, Keşfet, Kurslarım ve Hesap; akademinin renklerinde buzlu, yüzen bir çubuğun altında, açık ve karanlık modda.",
          features: [
            ["Selam ve kendi kartları", "Bugünün tarihi ve öğrencinin adı; aldığı kurs, kaldığı ders, kalan dakikalar ve devam etme düğmesi."],
            ["Öğrenme serisi", "Üst üste öğrendiği günler, bu haftanın günleri üzerinde."],
            ["Bu haftanın öğrenmesi", "Günlere göre çubuklar ve geçen haftaya göre fark; uygulama açıkken derslerde gerçekten geçen süreden."],
            ["Keşfet", "Büyük bir başlık, filtreli arama, simgeleriyle konular ve tümü, ücretsiz, en yüksek puanlı, en yeni düğmeleri."],
            ["Video oynatıcı", "Hız, tam ekran ve on saniye geri veya ileri; video dersleri olan akademiler için."],
            ["Notlar, dosyalar ve tartışma", "Videodaki anlarıyla kendi notları, dersin dosyaları ve tartışması."],
            ["Sınavlar ve sertifikalar", "Derslerinden sonra ünitenin sınavı, puan hemen, kurs bitince bir sertifika."],
            ["Canlı dersler", "Sıradakinin ne zaman başladığı, toplantı uygulamasında on beş dakika önceden katılma ve sonra kaydı."],
            ["Kurslarım", "Öğreniliyor ve tamamlandı, site bir istek listesi tutuyorsa kaydedilenler, sayılarıyla; her kurs ne kadar ilerlediğini gösteren bir halkayla."],
            ["İndirilenler", "Bağlantı olmadığı zamanlar için telefona kaydedilmiş dersler, şifreli; akademi sunuyorsa."],
            ["Hesap", "Kursları, sertifikaları ve öğrenme saatleri; siparişler, sertifikalar, sınav sonuçları, karanlık mod, bildirimler, dil ve ayarlar."],
            ["Telefonla giriş", "Şifre yerine tek kullanımlık kod, kod ekranında bir süre halkası; ya da e-postayla."],
            ["Korunan video", "Yüklenen videolar süresi dolan bağlantılardan, öğrencinin numarasıyla filigranlı oynar."],
          ],
        },
        {
          name: "Kurs satın alma",
          title: "Hemen katıl, mağazaların kurallarıyla",
          text: "Ücretsiz kurslar Android'de ve iPhone'da tek dokunuş uzakta. Ücretliler yalnızca mağazaların kurallarının izin verdiği yerde alınır.",
          features: [
            ["Ücretsiz kurslar", "Android'de ve iPhone'da tek dokunuşla katılım."],
            ["Altın renkli Hemen katıl", "Kursun sayfasında fiyatıyla; indirimdeyse eski fiyat ve tasarrufla."],
            ["Android'de kart", "Android'de uygulama içinde kartla ödeme, akademi açtığında."],
            ["iPhone'da", "Kurslar Apple'ın uygulama içi satın almasıyla alınır ya da uygulamada hiç satılmaz."],
            ["Sepet", "WordPress ve WooCommerce ile tek ödemede birkaç kurs, her biri resmi ve fiyatıyla."],
            ["Sitenin kuponu", "WordPress ve WooCommerce ile, sitenin bir kuponu ve ne kadar düşürdüğü."],
            ["Kayıtlı kart", "WordPress ve WooCommerce ile, sitenin ödeme altyapısında kayıtlı kart: markası, son dört hanesi ve son kullanma tarihi. Kart numaraları hiçbir zaman uygulamaya ya da Yallapp'e ulaşmaz."],
            ["Siparişler", "Her sipariş, öğrencinin hesabında."],
          ],
        },
        {
          name: "Akademinin paneli",
          title: "Kurslar, dersler ve öğrenciler, web'de",
          text: "Web sitesi olmayan bir akademi kurslarını panelin Kurslar sayfasından yönetir; değişiklikler uygulamada hemen görünür.",
          features: [
            ["Kurslar", "Başlık, kapak, fiyat ya da ücretsiz, öğretmen, seviye ve kategoriler; hazırlanırken gizli."],
            ["Bölümler ve dersler", "Yazılı dersler ya da medya kitaplığından, YouTube'dan, Vimeo'dan veya bir dosya adresinden video; dosyalar ve ücretsiz önizlemeler."],
            ["Sınavlar", "Geçme notu, deneme sayısı ve süre sınırı; doğru cevaplar hiçbir zaman uygulamaya ulaşmaz."],
            ["Ödevler ve canlı dersler", "Kursun bölümlerinde, akademinin kendi sırasıyla."],
            ["Sertifikalar", "Her dersi bitirip her sınavı geçen öğrencilere; akademinin logosu ve rengiyle, gerçekliğini kanıtlayan bir kodla."],
            ["Sonra açılan dersler", "Kayıttan birkaç gün sonra ya da bir tarihte; ve seçtiğiniz gün sayısından sonra biten erişim."],
            ["Öğrenme yolları", "Art arda kurslar ve bir başkasından önce bitirilecek kurslar."],
            ["Öğrencilerin ilerlemesi", "Her öğrencinin dersleri, en iyi puanları ve en son ne zaman öğrendiği; hepsi bir CSV dosyası olarak da."],
            ["Telefonla öğrenci ekleme", "Başka yoldan satılan bir kurs için, giriş yaptığı numarayla."],
            ["Cihazlar", "Her öğrencinin kaç cihaz kullanabileceği."],
            ["Bildirimler", "Yeni ders, bir saat kala canlı ders, notlandırılan ödev ve çalışma hatırlatması kendiliğinden gider; sizin mesajlarınız da."],
            ["Sorular ve değerlendirmeler", "Öğrencilerin sorularını yanıtlayın; değerlendirmelere cevap verin ya da gizleyin."],
            ["Puanlar ve rozetler", "Açtığınızda: dersler, sınavlar ve seri günleri için puanlar, rozetler ve yalnızca ilk adlarla sıralamalar."],
          ],
        },
        {
          name: "Yallapp Studio'da tasarlandı",
          title: "Her renk akademinin",
          text: "Premium akademi bir Studio şablonu: başlangıçta lacivert ve altın; her parçasını sahibi değiştirebilir.",
          features: [
            ["Renkler", "Ana renk markanın, altın ikincisi; her renk değiştirilebilir."],
            ["Çubuk", "Her sekmeyi adlandıran buzlu, yüzen bir çubuk; açık sekme akademinin renginde."],
            ["Her ekranın görünümü", "Ana sayfa, Keşfet, kursun sayfası, ders, Kurslarım, hesap ve sepet; her biri Studio'da tasarlanmış."],
            ["Açık ve karanlık", "Her ekran ikisinde de; öğrenci seçer."],
            ["Giriş", "Bir fotoğrafın ya da uygulamanın renklerinin üzerinde karşılama, form bir kartta."],
            ["Kurs kartları", "Rozeti, puanı, dersleri, öğretmeni ve fiyatıyla satırlar ya da altın rozetli kapaklar."],
            ["Üç dil", "İngilizce, sağdan sola Arapça ve Türkçe."],
            ["Sekme olarak bir web sayfası", "WordPress'te sitenin blogu uygulamada, üst ve alt bilgisi gizlenmiş olarak."],
          ],
        },
        {
          name: "Bir WordPress sitesiyle",
          title: "Tutor LMS ve WooCommerce, uygulamayla uyum içinde",
          text: "WordPress'te Tutor LMS ile zaten satış yapan bir akademi sitesini korur: uygulama kurslarını, öğrencilerini ve siparişlerini oradan alır.",
          features: [
            ["Siteden kurslar", "Kursları, dersleri ve sınavları; notları LMS verir."],
            ["Uyumlu ilerleme", "Uygulamada tamamlanan ders sitede de tamamlanmış olur."],
            ["Değerlendirmeler, sorular, istek listesi", "LMS'te varsa."],
            ["Öğretmen takip etme", "WordPress'te ve çok öğretmenli bir akademide: bir öğretmeni takip edin, yeni kursu gelen kutusuna ve telefona gelsin."],
            ["Tek ödeme", "Sepetteki her kurs, kupon ve kayıtlı kart seçili olarak sitenin WooCommerce ödemesine gider."],
            ["Kayıtlı kartlar", "Sitenin ödeme altyapısında saklanır; uygulama yalnızca markasını, son dört hanesini ve son kullanma tarihini gösterir."],
          ],
        },
      ],
      bundleTitle: "Bir uygulama, bir panel ve varsa web siteniz",
      bundleText: "Öğrencilerin uygulaması, tek bir Studio projesinden akademinin adıyla yapılır ve yayınlanır. Kursları Yallapp'ten ya da akademinin WordPress sitesinden gelir.",
      bundleNodes: [
        ["Ufuk Akademi", "Android'de ve iPhone'da öğrenciler"],
        ["Yallapp Studio", "Akademi: tasarımı, kursları ve öğrencileri"],
        ["Akademinin web sitesi", "Varsa, Tutor LMS ile WordPress"],
      ],
      bundleFlows: [
        "Tamamlanan bir ders, kaldığı yeri her cihazda tutar",
        "Dersteki dakikalar bu haftanın öğrenmesine eklenir",
        "Yeni bir ders kursun öğrencilerine ulaşır",
        "Geçilen son sınav sertifikayı getirir",
        "Studio'da yayınlanan tasarım uygulamada görünür",
        "WordPress'te ilerleme ve siparişler siteyle uyumlu kalır",
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Uygulamalı kurs platformları satan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'in ve size bir ajansa uygulama yaptırmanın yanında.",
      finale: {
        title: "Yarın on üç olacak",
        text: "Sara uygulamayı yine kahvaltısıyla açacak; hat sanatında 12'nci derste, tasarım kursunda 4'üncü derste. Leila Haddad gelecek haftanın dersini yazıyor; eklendiğinde öğrencileri haberdar olacak. Bir gün bir sertifika gelecek; ondan önceki sabahlar ise uygulamanın asıl var olma nedeni.",
      },
      photos: {
        "academy-desk": "Masasında dizüstü bilgisayar ve defterle çalışan bir kadın",
        "academy-phone": "Elinde bir fincan kahveyle telefonuna bakan bir kadın",
        "academy-breakfast": "Masasında dizüstü bilgisayar, bir kitap ve kahvaltısıyla genç bir kadın",
        "academy-live": "Akşamın geç saatinde, şehre bakan bir pencerenin önünde dizüstü bilgisayarıyla biri",
        "academy-evening": "Akşam ışıkları yanmış binalar",
        "academy-graduation": "Mezuniyet kepiyle gülen bir mezun",
      },
    },
    flowers: {
      navName: "Çiçekçi uygulaması",
      metaTitle: "Teslimat saatleri ve hediye ödemesiyle bir çiçekçi uygulaması, Yallapp Studio'da tasarlandı",
      metaDescription: "Leqaa ile bir gün: 20:40'ta hatırlanan bir doğum günü, yarının saat aralığı, kartın sözleri ve saat ikiden önce kapıda çiçekler. Studio'daki çiçekçi şablonu.",
      summary: "Saat aralıklarıyla aynı gün ve ertesi gün teslimat, hediye ödemesi, vesileye göre kart mesajları ve flaş indirimler; kendi ürünlerinizle ya da mağazanızın platformuyla.",
      eyebrow: "Yallapp Studio · Çiçekçi",
      title: "Yarın, saat bir ile dört arası",
      intro: "Omar İskenderiye'de çalışıyor. Annesi Kahire'de yaşıyor ve yarın onun doğum günü. Omar bunu saat 20:40'ta, yemeği ocaktayken hatırlıyor. İşte o akşam, adım adım, ertesi gün öğleden sonra annesinin kapısında çiçeğe dönüşüyor.",
      cast: "Omar Hassan, Zamalek'te oturan annesi Salma Adel'e çiçek gönderiyor. Leqaa, çiçekçi şablonunun demosu: Kahire'de, çiçekleri ve fiyatları hayalî bir dükkân; aşağıdaki her ekran gerçek uygulama. Hikâyedeki teslimat günleri, kart mesajları, flaş indirimler ve kodlar her mağaza uygulamasıyla gelir; demoda ödeme sayfası kart almaz.",
      chapters: [
        {
          time: "20:40",
          kicker: "İskenderiye, iş çıkışı",
          title: "Yarın ayın on beşi",
          text: "Omar yemeğini ısıtırken telefonunda tarihi görüyor. Yarın ayın on beşi: annesinin doğum günü. Üç saat uzakta ve saat onda bir toplantısı var. Leqaa, Mart'taki Anneler Günü'nden beri telefonunda. Açıyor; dükkânın vesileleri, gece renkleriyle ekranı birer birer dolduruyor. Bugün gönder kartı, bugünün siparişlerinin 16:00'da kapandığını söylüyor. Yarın açık.",
        },
        {
          time: "20:44",
          kicker: "Flaş indirim",
          title: "İki saat kaldı",
          text: "Biraz aşağıda, nar rengi bir şeritte Flaş indirim yazıyor ve bir sayaç 1:59'dan geriye sayıyor. Dükkânın bu saatlere özel indirimi: Pembe Bahçe dörtte bir indirimli, eski fiyatın üstü çizili ve on iki buketten yalnızca dördünün kaldığını gösteren bir çubuk. Sayaç sıfıra vardığında fiyat eskisine döner. Omar uzun düşünmüyor: açık pembe, annesinin perdelerinin rengi.",
        },
        {
          time: "20:47",
          kicker: "Buketin sayfası",
          title: "Biraz daha ekleyin",
          text: "Pembe Bahçe'nin sayfasında aynı sayaç, indirimli fiyatın ve önceki fiyatın yanında saymaya devam ediyor. Açık pembe güller, lisiyantus ve okaliptüs; teslim edildiği gün hazırlanıyor ve dal sayısına göre üç boyu var: 12 dallı Klasik, 24 dallı Lüks, 36 dallı Büyük. Lüks'ü seçiyor. Biraz daha ekleyin bölümünde dükkânın ekleri var: seramik bir vazo, bir kutu çikolata ve bir kart. Çikolatayı ve kartı ekliyor. Annesi hep çikolata istemediğini söyler, ama hep bitirir.",
        },
        {
          time: "20:52",
          kicker: "Kimden, kime, ne zaman",
          title: "Yarın, öğle yemeğinden sonra",
          text: "Ödeme tek ekranda beş adım: kimden, kime, ne zaman, mesaj, ödeme. Kimden: adı, telefonu ve e-postası; adres yok, çünkü çiçekler ona gitmiyor. Kime: annesinin adı, telefonu ve dükkânın teslim ettiği şehirlerden Kahire'de, Zamalek'teki adresi; Leqaa teslimatı mesafeye göre ücretlendirdiği için kapısı da haritada işaretli. Ne zaman: bugünün üstü çizili. Yarın'a dokunuyor. Sabah aralığı dolu: başkaları daha önce hatırlamış. 13:00–16:00'yı seçiyor.",
        },
        {
          time: "20:55",
          kicker: "Kart",
          title: "Bulamadığı sözler",
          text: "Vesileler arasından Doğum günü'ne dokunuyor; dükkânın hazır mesajları kartlar halinde beliriyor. İlki, sözlerle arası daha iyi olsaydı onun da söyleyeceği şeyi söylüyor. Her kelimesini değiştirebilir ya da kendisi yazabilir. Hiçbir şeyi değiştirmiyor. İsimsiz gönder kapalı kalıyor: annesi onun olduğunu bilmeli. Ekranın üstünde kart çoktan hazır: buketin fotoğrafının yanında Kime: Salma Adel, Kimden: Omar Hassan.",
        },
        {
          time: "20:58",
          kicker: "Ödeme",
          title: "Bir kod ve satır satır ücret",
          text: "Son adım buketi, çikolatayı ve kartı listeliyor; Yarın, 13:00–16:00 hep gözünün önünde. Dükkân kodunu uygulamada gösteriyor, LEQAA10; kopyalıyor ve yüzde on düşüyor. Teslimat ücreti nasıl hesaplandığını söylüyor: temel ücret, dükkândan iki kilometre ve seçtiği aralık için ek ücret yok. Dükkânın ödeme sayfasında kartla ödüyor. Sipariş, yarının saat aralığıyla Siparişler'de. Yemeğini bitiriyor.",
        },
        {
          time: "08:30",
          kicker: "Pazar, dükkânda",
          title: "Günün siparişleri, aralık aralık",
          text: "Mariam, Leqaa'nın o günkü siparişlerini açıyor. Omar'ınkinde 15 Kasım Pazar, 13:00–16:00 ve teslimat ücreti yazıyor. Altında kimden ve kime olduğu, telefonları, Zamalek'teki adres ve kartın sözleri. Mariam sözleri katlanmış bir kartın içine elle yazıyor, yirmi dört dallı Pembe Bahçe'yi hazırlıyor ve pembe kâğıda sarıyor. Saat biri biraz geçe buket, dükkânın kuryesiyle yola çıkıyor.",
        },
        {
          time: "14:05",
          kicker: "Zamalek, üçüncü kat",
          title: "Kapısında",
          text: "Salma kapıyı açınca perdeleriyle aynı renkte bir buket, bir kutu çikolata ve küçük bir kart buluyor. Kartı okuduğunda kurye çoktan merdivenlerden iniyor. Dükkânda Mariam siparişi tamamlandı olarak işaretliyor. İskenderiye'de, iki toplantı arasında Omar'ın telefonu yanıyor.",
          push: { app: "Leqaa", title: "Sipariş 1042", body: "Siparişiniz tamamlandı. Teşekkürler!" },
        },
      ],
      interlude: {
        quote: "20:40'ta hatırladı. Çiçekler saat ikiden önce kapısındaydı.",
        text: "Aradaki her şey dükkânın kendisinindi: son sipariş saati, saat aralıkları ve sınırları, kart mesajları, teklifleri ve teslimat fiyatları. Bir kez ayarlandı ve her siparişte kontrol edildi.",
      },
      statsTitle: "Bir buketin ardındaki küçük gerçekler",
      stats: [
        "adımlık hediye ödemesi: kimden, kime, ne zaman, mesaj ve ödeme",
        "vesileyle başlayan kart mesajları; her biri için İngilizce, Arapça ve Türkçe hazır sözler",
        "saat aralığı, günde en fazla; her birinin kendi sınırı ve kendi ücreti",
        "yolla fiyatlanan teslimat: tek fiyat, şehre göre, kilometreye göre ve kilograma göre",
      ],
      systemsTitle: "Her parçası, tek tek",
      systemsText: "Teslimat günleri ve saatleri, buket ve ekleri, hediye ödemesi, kart mesajları, dükkânın nereye ve kaça teslim ettiği, flaş indirimler ve kodlar, iki görünüm ve ürünlerin nereden geldiği; bugün oldukları gibi.",
      systems: [
        {
          name: "Teslimat günleri ve saatleri",
          title: "Son sipariş saatine kadar bugün, sonra yarın",
          text: "Ne zaman teslim edeceğine dükkân karar verir. Uygulama yalnızca hâlâ seçilebilecek olanı gösterir; sunucu da bunu her siparişte, dükkânın saat diliminde yeniden kontrol eder.",
          features: [
            ["Aynı gün, son saate kadar", "Bugün, belirlediğiniz saate kadar seçilebilir. Sonrasında bugünün üstü çizilir."],
            ["Ertesi gün ve ileri günler", "Yarın ve izin verdiğiniz kadar ileri, en çok 60 gün."],
            ["Kapalı günler", "Teslimat yapmadığınız günler hiç sunulmaz."],
            ["Saat aralıkları", "Günde 8'e kadar, 10:00–13:00 gibi. Bugünün aralıkları başlayana kadar seçilebilir."],
            ["Aralık başına sınır", "Bir aralığın kaç sipariş alacağı. Dolu bir aralık seçilemez; sunucu bunu ödemede yeniden kontrol eder."],
            ["Aralık başına ücret", "Akşam için ek bir ücret; teslimat ücretine eklenir."],
            ["Her zaman sorulur", "Hediye ödemesinde gün ve aralık zorunludur."],
          ],
        },
        {
          name: "Buket ve ekleri",
          title: "Biraz daha ekleyin",
          text: "Hediye için yapılmış bir buket sayfası: boyları, flaş indirimi ve yanına giden küçük ekler.",
          features: [
            ["Boylar", "Dal sayısına göre Klasik, Lüks ve Büyük gibi boylarda bir buket; her birinin kendi fiyatı var."],
            ["Biraz daha ekleyin", "Çikolata, kart, vazo ve benzerleri, buketle birlikte kendi sayfasında sunulur."],
            ["Tek başına satılmaz", "Bir ek yalnızca bir buketle satılır; dükkânda hiçbir zaman ana ürün olarak görünmez."],
            ["Siz karar verirsiniz", "Hangi ürünlerin ek olduğunu ve hangi ürünlerle sunulacaklarını siz işaretlersiniz."],
            ["Sepette ve ödemede", "Ekler sepette ve ödemede yeniden sunulur ve buketle birlikte listelenir."],
            ["Flaş indirimi sayfasında", "Geri sayım, üstü çizili önceki fiyat, indirim oranı ve kaç tane kaldığı."],
            ["Koleksiyonlar ve vesileler", "Her buket kendi koleksiyonunda ve yakıştığı her vesilede."],
          ],
        },
        {
          name: "Hediye ödemesi",
          title: "Beş adım, yalnızca gerekenler",
          text: "Göndermek için yapılmış, her mağaza uygulamasının açabileceği bir ödeme. Başkasına teslimat için tam olarak gerekeni sorar, fazlasını değil.",
          features: [
            ["Tek ekranda beş adım", "Kimden, kime, ne zaman, mesaj ve ödeme; üstte sabit kalan bir adım çubuğunun altında."],
            ["Gönderen", "Ad, telefon ve e-posta. Adres yok: çiçekler ona gitmiyor."],
            ["Alıcı", "Ad, telefon ve adres; yalnızca teslim ettiğiniz ülke ve şehirlerde."],
            ["Haritada kapı", "Teslimat mesafeye göre ücretlendiriliyorsa alıcının kapısı haritada işaretlenir."],
            ["Kartın önizlemesi", "Buketin fotoğrafıyla kart; sözler yazıldıkça değişir."],
            ["İsimsiz gönder", "Kart kimden geldiğini söylemez. Dükkân yine de bilir."],
            ["Ödeme", "Buket ve ekleri, hep görünen gün ve aralık, kod ve satır satır teslimat ücreti."],
            ["Sunucuda kontrol", "Günü, aralığı ya da kişilerin bilgileri eksik bir sipariş, uygulama ne gönderirse göndersin reddedilir."],
          ],
        },
        {
          name: "Kart mesajları",
          title: "Her vesileye hazır sözler",
          text: "Dükkân başlangıçları yazar, müşteri onları kendi sözü yapar. Yeni bir mağaza sıcak bir setle başlar; hiç boş kalmaz.",
          features: [
            ["Başlangıçta on bir vesile", "Aşk, doğum günü, yıl dönümü, tebrik, yeni bebek, geçmiş olsun, teşekkür, özür, başsağlığı, Bayram ve Ramazan, Anneler Günü."],
            ["Kendi vesileleriniz", "Müşterilerinizin çiçek gönderdiği vesileleri ekleyin."],
            ["Hazır mesajlar", "Başlangıçta her vesile için iki ya da üç mesaj; İngilizce, Arapça ve Türkçe."],
            ["Her dilde", "Her mesaj uygulamanın her dilinde; müşterinin dilinde gösterilir."],
            ["Değiştirmek sizin elinizde", "Düzenleyin, sıralayın, gizleyin ya da silin."],
            ["Ya da kendi sözleri", "Müşteri bir mesaja dokunup değiştirir ya da kendisi yazar."],
          ],
        },
        {
          name: "Nereye teslim, kaça",
          title: "Gerçekte nasıl işliyorsa öyle fiyatlanan teslimat",
          text: "Ücret, ödemede dükkânın kendi kurallarıyla hesaplanır ve her parçasıyla gösterilir.",
          features: [
            ["Ülkeler ve şehirler", "Bir ya da birkaç ülke, tüm şehirleri ya da bazıları; Türkiye, Mısır ve Körfez için hazır bir başlangıç listesiyle."],
            ["Tek fiyat", "Teslim ettiğiniz her yerde aynı ücret."],
            ["Şehre göre", "Her şehir için bir fiyat ve diğer şehirler için bir fiyat."],
            ["Kilometreye göre", "Bir temel ücret ve kilometre başına fiyat; dükkândan işarete kuş uçuşu, belirlediğiniz mesafeye kadar."],
            ["Kilograma göre", "Ürünlerin kilogramı başına fiyat, ilk kilolar dahil; diğerlerinden herhangi birinin üstüne."],
            ["Şehre özel fiyat", "Kural ne hesaplarsa hesaplasın, bir şehir için sabit ücret."],
            ["En düşük ücret", "Teslimat hiçbir zaman en düşük ücretin altına inmez."],
            ["Bir tutarın üstü ücretsiz", "Seçtiğiniz sipariş tutarından itibaren ücretsiz teslimat."],
            ["Her parça görünür", "Temel ücret, mesafe, ağırlık ve aralığın eki, satır satır."],
          ],
        },
        {
          name: "Flaş indirimler ve kodlar",
          title: "Söylediği anda biten teklifler",
          text: "Sayaçlı indirimler ve müşterinin aramadan gördüğü kodlar.",
          features: [
            ["Flaş indirimler", "Ürünler ya da bütün bir kategori; yüzde indirim ya da tek bir indirimli fiyat; bir başlangıç saatinden bir bitiş saatine."],
            ["Sayaç", "İndirimin bandında, karuselinde ya da ızgarasında, ürün kartlarında ve ürünün sayfasında canlı geri sayım. İndirim bitince gizlenir."],
            ["Yalnızca birkaç tane", "İsteğe bağlı bir adet sayısı ve kaç tane kaldığını gösteren bir çubuk."],
            ["İndirim rozetleri", "İndirim oranını gösteren bir etiket, köşeden geçen bir şerit ya da iki fiyat; ürün nerede görünürse."],
            ["İndirim kodları", "Yüzde ya da tutar, en düşük sipariş, başlangıç ve bitiş günleri ve kullanım sayısı."],
            ["Uygulamada görünür", "Seçtiğiniz kodlar, kopyalama düğmesiyle bilet ya da cam bir kartta."],
          ],
        },
        {
          name: "Yallapp Studio'da tasarlandı",
          title: "İki görünüm ve her uygulama için yeni parçalar",
          text: "Leqaa iki premium görünümle gelir. Başlıkları, çubukları ve hesap ekranları Studio'da yeni; Studio'da yapılan başka uygulamalar da bunları kullanabilir.",
          features: [
            ["Gül saati", "A görünümü: açık pembe kâğıt ve mürdüm mürekkep, tam ekran hikâyeler olarak vesileler ve mum ışığı pembesiyle aydınlanan mürdüm bir gece."],
            ["Botanik baskı", "B görünümü: adaçayı kâğıt ve orman yeşili mürekkep, şeftali rengiyle; \"Çiçekler kime?\" ve numaralı kartlar halinde seçki."],
            ["Açık ve koyu", "İki görünümün de tasarlanmış bir gecesi var; müşteri seçer."],
            ["Taç yaprağı başlık", "İki rengin yumuşak bir karışımı, ortada ad, ince bir çiçek çizgisi ve kavisli bir taç yaprağı kenarı. Sayfa kaydıkça katlanır."],
            ["Taç yaprağı çubuk", "Yüzen bir çubuk, taç yaprağı biçimli bir yaprağın üstünde açık sekme ve ortada Gönder için yükselen bir çiçek."],
            ["Taç yaprağı hesap ve giriş", "Hesap, giriş ve kod ekranı aynı yumuşak görünümde."],
            ["Hazır bölümler", "Bugün gönder, flaş indirim, koleksiyonlar, Buketini oluştur ve dahası; her mağazaya hazır."],
            ["Üç dil", "İngilizce, sağdan sola Arapça ve Türkçe."],
          ],
        },
        {
          name: "Ürünler nereden gelir",
          title: "Kendi ürünleriniz ya da mağazanızın platformu",
          text: "Leqaa, Yallapp'te tutulan ürünlerle ya da zaten sahip olduğunuz çevrim içi mağazayla çalışır. Her birinin neyi desteklediği aşağıda.",
          features: [
            ["Yallapp'teki ürünler", "Web sitesi gerekmez. Bu sayfadaki her şey çalışır; Yallapp'in ödemesi aralığın ücretini ve teslimatı ayarladığınız gibi tahsil eder."],
            ["WordPress ve WooCommerce", "Yallapp eklentisiyle: son sipariş saati, sınırları ve ücretleriyle aralıklar, hediye ödemesi, kart mesajları, indirimli fiyatlar ve işaretlediğiniz kodlar. Teslimatı WooCommerce'in kendi kargo bölgeleri fiyatlar; bu yüzden kilometreye ya da kilograma göre fiyat yoktur."],
            ["Shopify", "Gün, aralık, kişiler ve kart; sepetin özniteliklerinde ve notunda siparişle birlikte gider. Shopify'ın ödemesi kendi fiyatlarını ve kargosunu tahsil eder."],
            ["Wix", "Aynı bilgiler, alıcının notunda. Wix'in ödemesi kendi fiyatlarını ve kargosunu tahsil eder."],
            ["ikas, Ticimax, IdeaSoft, Salla ve Zid", "Uygulama günü, aralığı ve kişileri kontrol eder. Platformun ödemesi kendi fiyatlarını ve kargosunu tahsil eder."],
            ["Sizin için saklanır", "Bağlı bir platformda, uygulamadan gelen her siparişin hediye bilgileri 60 gün panelinizde kalır."],
            ["Platformda indirimler ve kodlar", "Platformun kendi indirimi olduğu gibi görünür. Yallapp'te yapılan bir flaş indirim uygulamadaki fiyatı değiştirir; ona aynı koşullarla platformun kendi kodunu verin, ödemesi de uygular. Listelediğiniz kodlar uygulamada görünür."],
            ["Kendi API'niz", "Aynı alanlar API sözleşmesinde; hepsi isteğe bağlı."],
          ],
        },
      ],
      bundleTitle: "Bir uygulama, paneliniz ve varsa mağazanız",
      bundleText: "Müşteri uygulaması tek bir Studio projesinden dükkânın adıyla yapılır ve yayımlanır. Ürünleri Yallapp'ten ya da dükkânın kendi platformundan gelir.",
      bundleNodes: [
        ["Leqaa", "Müşteriler, Android ve iPhone'da"],
        ["Yallapp Studio", "Dükkân: görünümü, teslimatı, kart mesajları ve teklifleri"],
        ["Dükkânın web sitesi", "Varsa WooCommerce, Shopify, Wix ya da bir başkası"],
      ],
      bundleFlows: [
        "Bugün, dükkânın saat diliminde son sipariş saatinde kapanır",
        "Dolu bir aralık seçilemez",
        "Dükkânın eklediği bir kart mesajı ödemede her dilde görünür",
        "Bir flaş indirimin sayacı uygulamada bitene kadar işler",
        "Bir sipariş günü, aralığı, göndereni, alıcısı ve kartıyla gelir",
        "Bağlı bir platformda hediye bilgileri siparişle birlikte gider",
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Çevrim içi mağazalar için uygulama yapan şirketler ve çiçek teslimat uygulamaları yapan bir şirket, kendi sitelerinin anlattığı gibi; Yallapp'in ve size bir ajansa uygulama yaptırmanın yanında.",
      finale: {
        title: "Gelecek Mart, beklemeyecek",
        text: "Buket bir hafta boyunca masasında, açılmış çikolata kutusunun yanında duracak. Omar, Anneler Günü'nü takvimine şimdiden yazdı. Dükkânda ise Mariam yarının siparişlerini hazırlıyor, aralık aralık.",
      },
      photos: {
        "flowers-hero": "Koyu pembe bir fonda pembe güller ve lisiyantuslardan bir buket",
        "flowers-blush": "Ahşap bir fıçının üstünde pembe ve beyaz düğün çiçekleri",
        "flowers-card": "Beyaz ve pembe güller",
        "flowers-shop": "Satış için sarılmış çiçek demetleri",
        "flowers-door": "İki elde tutulan, kâğıda sarılı bir buket",
        "flowers-table": "Pembe kâğıda sarılı lale buketleri",
        "flowers-vase": "Beyaz bir vazoda laleler ve güller",
      },
    },
    // 208 Lujain, the clothes shop: a wedding dress bought on a Monday evening, in its look A (LUJAIN); look B (NOUN) in its section.
    clothes: {
      navName: "Giyim mağazası uygulaması",
      metaTitle: "Bedenler, kategori menüsü ve görünümü tamamla ile bir giyim mağazası uygulaması, Yallapp Studio'da tasarlandı",
      metaDescription: "Lujain ile bir gün: perşembe bir düğün, kategori menüsü, bedenine ve rengine göre bir elbise, beden rehberi ve görünümü tamamlayan topuklular.",
      summary: "Her birinin stoğuyla bedenler ve renkler, sıra sıra kategori menüsü, beden tablosu, görünümü tamamla ve değişim, iki premium görünümde.",
      eyebrow: "Yallapp Studio · Giyim mağazası",
      title: "Perşembe, bakır rengi saten",
      intro: "Noura'nın perşembe bir düğünü var ve giymek istediği hiçbir şey yok. Riyad'da pazartesi akşamı. Telefonuyla geçen birkaç dakika, bedenine uygun bir elbiseye ve yanına yakışan topuklulara böyle dönüşüyor.",
      cast: "Noura, Riyad'da bir kadın moda evi olan Lujain'den alışveriş yapıyor. Lujain, giyim mağazası şablonunun demosu: kıyafetleri, adları ve fiyatları uydurma, fotoğrafları gerçek; aşağıdaki her ekran gerçek uygulama.",
      chapters: [
        {
          time: "21:10",
          kicker: "Riyad, akşam yemeğinden sonra",
          title: "Perşembe bir düğün",
          text: "Noura kanepede Lujain'i açıyor. Ana sayfa küçük ve hızlı: arama, yuvarlaklar içinde kategoriler ve kayan kartlarda sezonun koleksiyonları, bir sonrakinin kenarı görünüyor. Altında bu hafta gelenler."
        },
        {
          time: "21:13",
          kicker: "Menü",
          title: "Her kategori bir sıra",
          text: "Zilin yanındaki menüye dokunuyor. Mağazanın her kategorisi fotoğraflı kartlardan bir sıra: önce Elbiseler, ardından kayan Midi, Maksi ve Mini; sonra Abayalar, Mont ve ceketler, Ayakkabılar, Çantalar. Elbiseler sırasını kaydırıp Midi'ye dokunuyor."
        },
        {
          time: "21:17",
          kicker: "Elbisenin sayfası",
          title: "Siyahta M kalmamış",
          text: "İndirimde, bakır rengi saten bir midi elbise. Sayfa açıldığında siyah seçili ve M soluk: siyahta hiç kalmamış. Bakır rengine dokununca M geri geliyor. Bedenlerin yanında Beden rehberi mağazanın tablosunu açıyor: göğüs, bel, kalça ve boy, santimetre olarak."
        },
        {
          time: "21:20",
          kicker: "Görünümü tamamla",
          title: "Topuklu, el çantası, güneş gözlüğü",
          text: "Elbisenin altına mağaza diğer kategorilerinin her birinden bir parça koymuş: bantlı siyah topuklu, rugan el çantası, yuvarlak güneş gözlüğü. Fiyatın altındaki satır, 14 gün içinde değişim ve iadenin ücretsiz olduğunu söylüyor."
        },
        {
          time: "21:24",
          kicker: "Günün fırsatı",
          title: "Topuklular %30 indirimli",
          text: "Ana sayfada koyu bir kart Günün fırsatı diyor, sayacı geri sayıyor. Bantlı topuklular içinde, eski fiyatın üstü çizili. 38 numarasını sepete ekliyor ve ödemede mağazanın kodunu, LUJAIN10'u kopyalıyor."
        },
        {
          time: "09:30",
          kicker: "Salı, mağazada",
          title: "Bakırda M, siyahta 38",
          text: "Lujain'de Reem sabahın siparişlerini açıyor. Noura'nınkinde elbise bakır renginde M beden, topuklular siyahta 38 numara. Her birinin stoğu birer azalıyor, beden beden ve renk renk; kimse olmayan bir elbiseyi alamıyor.",
          push: {
            app: "Lujain",
            title: "Sipariş 2108",
            body: "Siparişiniz yolda. 14 gün içinde değişim ücretsiz."
          }
        }
      ],
      interlude: {
        quote: "Pazartesi dokuzda. Perşembe bakır rengi satenle.",
        text: "Arada olan her şey mağazanın kendisindendi: kategorileri ve sıraları, bedenleri, renkleri ve her birinin stoğu, beden tablosu, fırsatları ve değişimleri; panelde bir kez ayarlandı."
      },
      statsTitle: "Bir elbisenin ardındaki küçük gerçekler",
      stats: [
        "demonun menüsünde ana kategori, her biri bir kart sırası",
        "sıralarında kayan alt kategori",
        "gün içinde değişim ya da iade, her fiyatın altında",
        "dil, Arapça sağdan sola"
      ],
      systemsTitle: "Her parça, ayrıntısıyla",
      systemsText: "Kategori menüsü, bedenler ve renkler, görünümü tamamla ve fırsatlar, iki görünüm ve ürünlerin nereden geldiği.",
      systems: [
        {
          name: "Kategori menüsü",
          title: "Her kategori, bir sıra",
          text: "Zilin yanındaki menü mağazanın bütün kategorilerini birden açar, her biri fotoğraflı kartlardan bir sıra.",
          features: [
            [
              "Kategori başına bir sıra",
              "Her ana kategori yana kayan bir kart sırası."
            ],
            [
              "Önce tamamı",
              "İlk kart kategorinin kendisi, kaç parçası olduğuyla."
            ],
            [
              "Sıradaki alt kategoriler",
              "Midi, Maksi ve Mini Elbiseler'in ardından kayar, her birinin kendi fotoğrafıyla."
            ],
            [
              "Üstte arama",
              "Tek bir alan bütün kategorilerde arar."
            ],
            [
              "Altta hesap",
              "Hesabım, siparişlerim, dil ve mağazaya ulaşma yolu."
            ],
            [
              "Editörde de",
              "Kategori menüsü, Studio kütüphanesinde her mağaza için bir öğe."
            ]
          ]
        },
        {
          name: "Bedenler ve renkler",
          title: "Her bedenin stoğu",
          text: "Bir parça bedenleri ve renkleriyle gelir, mağaza her birinin stoğunu tutar.",
          features: [
            [
              "Renge göre beden",
              "Her renkte her beden ayrı bir stok."
            ],
            [
              "Biten seçilmez",
              "Seçili renkte hiç kalmamış beden soluk görünür ve seçilemez."
            ],
            [
              "Beden rehberi",
              "Bedenlerin yanında mağazanın kendi tablosu bir pencerede açılır."
            ],
            [
              "Üç dilde",
              "Tablonun başlıkları İngilizce, Arapça ve Türkçe; santimetre ya da inç."
            ],
            [
              "Açılışta seçili",
              "Mağazanın seçtiği beden ve renk sayfa açıldığında hazır."
            ],
            [
              "Ayakkabılar da",
              "Ayakkabılar numaralarıyla, çanta ve aksesuarlar tek beden."
            ]
          ]
        },
        {
          name: "Görünümü tamamla ve fırsatlar",
          title: "Yanına ne gider",
          text: "Mağaza yalnızca elbiseyi değil, bütün görünümü satar.",
          features: [
            [
              "Görünümü tamamla",
              "Her parçanın altında, mağazanın diğer ana kategorilerinin her birinden bir parça."
            ],
            [
              "Görünümü al",
              "Numaralı noktalarla bir fotoğraf, her nokta kendi parçasını açar."
            ],
            [
              "Değişim gözünün önünde",
              "Mağazanın değişim ve iade günleri fiyatın altında."
            ],
            [
              "Günün fırsatı",
              "Geri sayımı ve kalan adediyle flaş indirim."
            ],
            [
              "Kodlar",
              "Mağazanın kodu bir bilette, tek dokunuşla kopyalanır."
            ]
          ]
        },
        {
          name: "Yallapp Studio'da tasarlandı",
          title: "İki görünüm, her parçası değiştirilebilir",
          text: "Lujain, yalnızca Studio öğeleriyle kurulmuş iki premium görünümle gelir.",
          features: [
            [
              "LUJAIN",
              "A görünümü: siyah beyaz bir butik, büyük fotoğraflar ve sakin bir yazı."
            ],
            [
              "NOUN",
              "B görünümü: sokak stili, beton grisi üstünde elektrik mavisi, droplar ve bir şerit."
            ],
            [
              "Açık ve koyu",
              "İki görünümün de tasarlanmış bir gecesi var."
            ],
            [
              "Kompakt vitrin",
              "Koleksiyonlar yaklaşık 210 nokta yüksekliğinde kartlarda, bir sonrakinin kenarı görünür."
            ],
            [
              "Yüzen çubuk",
              "Ana sayfa, Alışveriş, Sepet, Siparişler ve Hesap; açık olan adıyla bir hap."
            ],
            [
              "Hazır bölümler",
              "Kategori menüsü, fırsat, görünümü al, beden kartı ve daha fazlası, her mağaza için."
            ],
            [
              "Üç dil",
              "İngilizce, sağdan sola Arapça ve Türkçe."
            ]
          ]
        },
        {
          name: "Ürünler nereden geliyor",
          title: "Ürünleriniz ya da mağazanızın platformu",
          text: "Lujain, Yallapp'te tutulan ürünlerle ya da zaten sahip olduğunuz online mağazayla çalışır.",
          features: [
            [
              "Yallapp'teki ürünler",
              "Bu sayfadaki her şey: kategori içinde kategoriler, beden tablosu ve görünümü tamamla."
            ],
            [
              "WordPress ve diğer platformlar",
              "Kategorileri ve alt kategorileri menüde, bedenleri ve stoğu sayfada."
            ],
            [
              "Sırada",
              "Bağlı bir platformdan beden tablosu ve görünümü tamamla."
            ]
          ]
        }
      ],
      bundleTitle: "Tek uygulama, paneliniz ve varsa mağazanız",
      bundleText: "Müşterilerin uygulaması tek bir Studio projesinden mağazanın adıyla yapılır ve yayımlanır. Ürünleri Yallapp'ten ya da mağazanın kendi platformundan gelir.",
      bundleNodes: [
        [
          "Lujain",
          "Müşteriler, Android ve iPhone'da"
        ],
        [
          "Yallapp Studio",
          "Mağaza: görünümü, kategorileri, bedenleri ve fırsatları"
        ],
        [
          "Mağazanın web sitesi",
          "Varsa WooCommerce, Shopify ya da bir başkası"
        ]
      ],
      bundleFlows: [
        "Yeni bir alt kategori menüdeki sırasında görünür",
        "Biten beden uygulamada soluk görünür",
        "Beden tablosu müşterinin dilinde",
        "Sipariş bedeni ve rengiyle gelir"
      ],
      compareTitle: "Karşılaştırma",
      compareText: "Online mağazalar için uygulama yapan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'in ve bir ajansa uygulama yaptırmanın yanında.",
      finale: {
        title: "Perşembe, dokuzda",
        text: "Elbise tam bedeninde. Topuklular gece yarısından sonra biraz acıtıyor, topukluların yaptığı gibi. Reem yeni sezonun abayalarını sıralarına çoktan ekledi; Riyad'ın bir yerinde bir başkası şimdi onları kaydırıyor."
      },
      photos: {
        "clothes-hero": "Güneşli dar bir geçitte uzun yeşil elbiseli bir kadın",
        "clothes-dress": "Bir verandada bakır rengi saten elbiseli bir kadın",
        "clothes-heels": "Küçük bir çiçeğin yanında bantlı siyah topuklular",
        "clothes-rack": "Askılarda beyaz elbiseler",
        "clothes-street": "Bir şehir sokağında siyah şapkalı, sarı paltolu bir kadın",
        "clothes-walk": "Beyaz kum tepelerinde yürüyen beyazlar içinde bir kadın"
      }
    },
    // 210 Ghurza, the crochet shop.
    crochet: {
      navName: "Tığ işi mağazası uygulaması",
      metaTitle: "Özel siparişler, yapım günleri, ipler ve atölyelerle bir tığ işi ve el yapımı mağaza uygulaması, Yallapp Studio'da tasarlandı",
      metaDescription: "Ghurza ile bir gün: annesinin renklerinde sipariş edilen bir battaniye, kaç günde yapıldığı, onu ören usta, bir başlangıç seti ve cumartesi atölyesinde bir yer.",
      summary: "Kendi talep sayfasıyla özel siparişler, her parçanın kaç günde yapıldığı, ustanın hikâyesi, ipler ve aletler, atölyeler ve elle hediye paketi, iki premium görünümde.",
      eyebrow: "Yallapp Studio · Tığ işi mağazası",
      title: "Zeytin yeşili ve krem, on iki günde",
      intro: "Leyla'nın annesi iki hafta sonra altmış yaşına giriyor ve Leyla ona kimsenin veremeyeceği bir şey vermek istiyor. Maadi'de bir çarşamba akşamı. Telefonla geçen birkaç dakika, annesinin renklerinde elde örülen bir battaniyeye ve kendisi için bir atölye yerine böyle dönüşüyor.",
      cast: "Leyla, Kahire'deki bir tığ işi atölyesi olan Ghurza'dan sipariş veriyor. Ghurza, tığ işi ve el yapımı şablonunun demosudur: parçaları, adları ve fiyatları uydurmadır, fotoğrafları gerçektir ve aşağıdaki her ekran gerçek uygulamadır.",
      chapters: [
        {
          time: "21:30",
          kicker: "Maadi, akşamın geç saati",
          title: "Kimsenin veremeyeceği bir şey",
          text: "Leyla Ghurza'yı balkonda açıyor. Ana sayfa sıcak ve hızlı: arama, yuvarlak kategoriler ve kayan kartlarda kış koleksiyonu, sonraki kart kenardan görünüyor. Altında bir kart, zevkinize göre bir parçanın size özel örüldüğünü, 7 ila 14 günde hazır olduğunu söylüyor."
        },
        {
          time: "21:34",
          kicker: "Özel sipariş",
          title: "Annesinin renklerinde bir battaniye",
          text: "Siparişe başla'ya dokunuyor. Sayfa nasıl çalıştığını dört adımda anlatıyor, sonra soruyor: parça, beden, ipin rengi ve ayrıntılar. Battaniye'yi seçiyor, 120'ye 150 cm yazıyor, annesinin kanepesi gibi zeytin yeşili ve krem, bir köşeye de annesinin adının işlenmesini istiyor. Adı, telefonu ve gönderiyor."
        },
        {
          time: "21:41",
          kicker: "Yapım günleri",
          title: "3 ila 4 günde yapılır",
          text: "Beklerken Atölyeden yeni'deki fitilli atkıyı açıyor. Her kart parçasının kaç günde yapıldığını söylüyor, sayfası da: tarçın, zeytin yeşili ya da kum renginde 3 ila 4 gün. Fiyatın altında mağaza, ustanın yazdığı bir kartla hediye paketini sunuyor."
        },
        {
          time: "22:05",
          kicker: "Usta",
          title: "Yirmi iki yıllık ilmekler",
          text: "Telefon gece için karardı, Ghurza da kahve rengiyle. Ana sayfanın aşağısında atölyeyi yöneten Ümmü Yusuf, her parçanın günlerini, kalbinden de fazlasını aldığını söylüyor. On iki usta, 4.800 parça, hepsi elde."
        },
        {
          time: "22:10",
          kicker: "İp ve bir atölye",
          title: "Kendi ilk ilmeği",
          text: "Leyla hep öğrenmek istemişti. Atkı başlangıç setini, yani ipi, şişleri ve Arapça ile İngilizce bir modeli ekliyor ve ayın ilk cumartesi Zamalek'teki Yeni başlayanlar için tığ işi atölyesinde bir yer ayırtıyor. Dört yer kalmıştı; şimdi üç."
        },
        {
          time: "10:15",
          kicker: "Perşembe, atölyede",
          title: "Zeytin yeşili, krem ve bir ad",
          text: "Ghurza'da Ümmü Yusuf sabahın taleplerini açıyor. Leyla'nınki şunu söylüyor: 120'ye 150 cm battaniye, zeytin yeşili ve krem, bir köşede annesinin adı. Fiyatı ve süreyi, 12 günü söylemek için onu arıyor ve ipi raftan kendisi seçiyor.",
          push: {
            app: "Ghurza",
            title: "Özel siparişiniz",
            body: "Ümmü Yusuf battaniyenizi örmeye başladı. 12 gün içinde hazır olacak."
          }
        }
      ],
      interlude: {
        quote: "Zeytin yeşili ve krem, annesinin kanepesinin renkleri.",
        text: "Aradaki her şey mağazanın kendisindendi: parçaları ve her birinin kaç günde yapıldığı, özel siparişi ve soruları, ipleri ve aletleri, atölyeleri ve yerleri; panelde bir kez ayarlandı."
      },
      statsTitle: "Bir battaniyenin ardındaki küçük gerçekler",
      stats: [
        "demonun menüsündeki ana kategori, atölyeler dahil",
        "demodaki parça, ip, alet ve atölye yeri",
        "bir battaniyeyi elde örmek için en fazla gün",
        "dil, Arapça sağdan sola"
      ],
      systemsTitle: "Her parça, ayrıntısıyla",
      systemsText: "Özel sipariş, yapım günleri, ipler, aletler ve atölyeler, iki görünüm ve ürünlerin nereden geldiği.",
      systems: [
        {
          name: "Özel sipariş",
          title: "Sadece onun için yapılır",
          text: "Ana sayfadaki bir kart mağazanın kendi talep sayfasını açar: önce nasıl çalıştığı, sonra sorular.",
          features: [
            ["Parça", "Battaniye, hırka, atkı, çanta, oyuncak ya da başka bir şey."],
            ["Beden", "Santimetre olarak ya da kendi ölçüleri."],
            ["Renk", "İpin rengi, kendi sözleriyle."],
            ["Mağazaya gider", "Talep her cevap, adı ve telefonuyla gelir."],
            ["Sahibinin telefonunda", "Mağaza onu panelde ve Yallapp Business'ta görür."]
          ]
        },
        {
          name: "Yapım günleri",
          title: "Ne kadar sürdüğü, her kartta",
          text: "Siparişle yapılan bir parça, kaç günde yapıldığını kartında ve sayfasında söyler.",
          features: [
            ["Şu kadar ile şu kadar", "Bir atkı için 3 ila 4 gün, bir battaniye için 10 ila 14."],
            ["Renkler ve bedenler", "Her renk ve beden kendi ip stokuyla."],
            ["Gönderime hazır", "İpler ve aletler gün söylemez: aynı gün yola çıkar."],
            ["Bir kez ayarlanır", "Mağaza günleri panelde ürüne yazar."]
          ]
        },
        {
          name: "İpler, aletler ve atölyeler",
          title: "Kendinizinkini yapmak için her şey",
          text: "Mağaza, örerken kullandığını satar ve nasıl yapıldığını öğretir.",
          features: [
            ["İpe göre alışveriş", "Pamuk, merinos ve rafya; her kart kendi kategorisini açar."],
            ["Tığlar ve setler", "İp, tığ ve modelle başlangıç setleri."],
            ["Atölyeler", "Her atölye mağazada bir yer; atölyede ya da çevrim içi."],
            ["Kalan yerler", "Ayırtılan her yer bir eksiltir; hiçbir atölye fazla dolmaz."],
            ["Elle paketlenir", "Her parçayla bir hediye paketi ve ustanın yazdığı bir kart."]
          ]
        },
        {
          name: "Yallapp Studio'da tasarlandı",
          title: "İki görünüm, her parçası sizin değiştirmeniz için",
          text: "Ghurza, yalnızca Studio'nun öğeleriyle kurulmuş iki premium görünümle gelir.",
          features: [
            ["GHURZA", "A görünümü: sıcak el emeği, bej kâğıt üzerinde kiremit rengi, yumuşak yuvarlak köşeler."],
            ["Açık ve koyu", "İki görünümün de tasarlanmış bir gecesi var: kahve rengi ve mürdüm siyahı."],
            ["Kompakt vitrin", "Koleksiyonlar yaklaşık 210 nokta yüksekliğinde kartlarda, sonraki görünüyor."],
            ["Yüzen çubuk", "Ana sayfa, Mağaza, Sepet, Siparişler ve Hesap; açık olan vurgulu."],
            ["HABKA", "B görünümü: renkli ve eğlenceli, mürdüm ve böğürtlen, kendi parçanı tasarla."],
            ["Üç dil", "İngilizce, sağdan sola Arapça ve Türkçe."]
          ]
        },
        {
          name: "Ürünlerin geldiği yer",
          title: "Sizin ürünleriniz ya da mağazanızın platformu",
          text: "Ghurza, Yallapp'ta tutulan ürünlerle ya da zaten sahip olduğunuz online mağazayla çalışır.",
          features: [
            ["Yallapp'taki ürünler", "Bu sayfadaki her şey: kategori içinde kategoriler, yapım günleri ve özel siparişler."],
            ["WordPress ve diğer platformlar", "Kategorileri ve ürünleri uygulamada."],
            ["Sırada", "Bağlı bir platformdan yapım günleri."]
          ]
        }
      ],
      bundleTitle: "Tek uygulama, paneliniz ve varsa mağazanız",
      bundleText: "Müşterilerin uygulaması tek bir Studio projesinden mağazanın adıyla oluşturulup yayımlanır. Ürünleri Yallapp'tan ya da mağazanın kendi platformundan gelir.",
      bundleNodes: [
        ["Ghurza", "Müşteriler, Android ve iPhone'da"],
        ["Yallapp Studio", "Mağaza: görünümü, parçaları, özel siparişleri ve atölyeleri"],
        ["Mağazanın web sitesi", "Varsa WooCommerce, Shopify ya da başka biri"]
      ],
      bundleFlows: [
        "Özel sipariş her cevabıyla gelir",
        "Yapım günleri her kartta görünür",
        "Ayırtılan her atölye yeri bir eksiltir",
        "Hediye paketi her parçayla sunulur"
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Online mağazalar için uygulama yapan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'ın ve bir ajansa uygulama yaptırmanın yanında.",
      finale: {
        title: "On iki gün sonra",
        text: "Battaniye pamuk kâğıda sarılmış, iple bağlanmış olarak geliyor; üstünde Ümmü Yusuf'un el yazısıyla bir kart. Annesi her şeyden önce köşedeki adını buluyor. Cumartesi Zamalek'te Leyla ilk ilmeğini atıyor, sonra söküyor, sonra yeniden atıyor."
      },
      photos: {
        "crochet-cozy-sweater": "Gri örgü kazağının yakasını yüzüne tutan bir kadın",
        "crochet-fluffy-blanket": "Kabarık beyaz bir battaniyenin üzerinde bir fincan kahve ve açık bir kitap",
        "crochet-knit-flatlay": "Bir defter ve yumak iplerin yanında, tığıyla vizon renkli bir tığ işi",
        "crochet-knit-coffee": "Bir fincan kahve ve bir modelin yanında şişlerindeki örgü",
        "crochet-mittens-coffee": "Gri örgü eldivenli eller, buharı tüten bir fincanın çevresinde",
        "crochet-scarves-stack": "Zeytin yeşili, gri ve krem tığ işi şallar, üst üste katlanmış"
      }
    },
    // 210 Sakan, the home decor shop.
    decor: {
      navName: "Ev dekorasyonu mağazası uygulaması",
      metaTitle: "Görünümü satın al, odalar, tarzlar ve kartlı hediyelerle bir ev dekorasyonu mağazası uygulaması, Yallapp Studio'da tasarlandı",
      metaDescription: "Sakan ile bir gün: yeni bir daire, parça parça alınan bir yemek köşesi, kartıyla hediye gönderilen bir vazo ve Ramazan fenerleri.",
      summary: "Düzenlenmiş bir odada görünümü satın al, odaya ve tarza göre alışveriş, santimetre ölçüler, kartlı hediye paketi ve mevsim afişleri, iki premium görünümde.",
      eyebrow: "Yallapp Studio · Ev dekorasyonu mağazası",
      title: "Cumaya kadar iki kişilik bir köşe",
      intro: "Hessa ve eşi geçen hafta Riyad'da küçük bir daireye taşındı. Yemek köşesi ödünç bir masa ve iki koliden ibaret. Salı akşamı. Telefonla geçen birkaç dakika, yemek yiyecekleri bir köşeye ve kız kardeşine bir hediyeye böyle dönüşüyor.",
      cast: "Hessa, Riyad'daki bir ev dekorasyonu evi olan Sakan'dan alışveriş yapıyor. Sakan, ev dekorasyonu şablonunun demosu: parçaları, adları ve fiyatları uydurma, fotoğrafları gerçek ve aşağıdaki her ekran gerçek uygulama.",
      chapters: [
        {
          time: "20:40",
          kicker: "Riyad, akşam yemeğinden sonra",
          title: "İki koli ve ödünç bir masa",
          text: "Hessa koltukta Sakan'ı açıyor. Ana sayfa küçük ve hızlı: arama, kategoriler ve kayan geniş fotoğraf kartlarında mevsimin koleksiyonları, bir sonraki kenardan görünüyor. Altında dört oda: yatak odası, oturma odası, yemek odası ve okuma köşesi."
        },
        {
          time: "20:44",
          kicker: "Odayı tamamla",
          title: "Orkideye bir dokunuş",
          text: "Aşağıda düzenlenmiş bir yemek köşesi ekranı dolduruyor: beyaz bir masa, iki beyaz sandalye, beyaz saksıda bir orkide. Fotoğraftaki her parçanın numaralı bir etiketi var. Orkideye dokunuyor ve sayfası açılıyor. Fotoğrafın altında üç parça fiyatlarıyla yan yana."
        },
        {
          time: "20:47",
          kicker: "Masanın sayfası",
          title: "80'e 80, sığıyor",
          text: "Masa ölçüsünü santimetre olarak söylüyor: 80 en, 80 derinlik, 75 yükseklik. Hessa çekmeceden aldığı metreyle köşeyi ölçüyor: 85 santimetre. Sandalye beyaz, siyah ve adaçayı yeşili; siyah bitmek üzere, beyazda kalıyor."
        },
        {
          time: "20:52",
          kicker: "Menü",
          title: "Her oda bir sıra",
          text: "Zilin yanındaki menüye dokunuyor. Mağazanın her odası fotoğraflı kartlardan bir sıra: vazoları, yastıkları ve koltuklarıyla oturma odası, nevresim ve lambalarıyla yatak odası, sonra bitkiler, mevsimler ve hediyeler. Oturma odası sırasını kaydırıp Vazolar ve kâseler'e dokunuyor."
        },
        {
          time: "20:58",
          kicker: "Bir hediye",
          title: "Noura için ikiz vazolar",
          text: "Kız kardeşi Noura'nın da yeni bir evi var. Hessa meşe tepsideki ikiz vazoları, ardından kartlı hediye paketini ekliyor. Ödemede kartı kendisi yazıyor: \"Yeni evindeki ilk baharın için.\" Mağazanın kodu SAKAN10'u kopyalayıp ödüyor."
        },
        {
          time: "09:15",
          kicker: "Çarşamba, mağazada",
          title: "Zeytin yeşili kâğıda sarılı",
          text: "Sakan'da sabahın siparişleri açılıyor. Hessa'nınkinde bir masa, iki sandalye, bir orkide ve hediye olarak kartıyla paketlenmiş ikiz vazolar var. Kartın sözleri paket fişine basılıyor. Uygulamanın ana sayfasında Ramazan afişi pirinç fenerlerle çoktan yerinde.",
          push: {
            app: "Sakan",
            title: "Sipariş 3124",
            body: "Parçalarınız yolda. İade 14 gün içinde ücretsiz."
          }
        }
      ],
      interlude: {
        quote: "Salı saat dokuz. Cuma akşam yemeği gerçek bir masada.",
        text: "Arada olan her şey mağazanın kendisindi: odaları ve sıraları, düzenlenmiş köşe ve parçaları, santimetre ölçüler, hediye paketi ve kart; panelde bir kez ayarlandı."
      },
      statsTitle: "Bir yemek köşesinin arkasındaki küçük gerçekler",
      stats: [
        "demonun menüsündeki ana kategori, önce odalar",
        "sıralarında kayan alt kategori",
        "gün içinde iade, kapıdan alınır",
        "dil, Arapça sağdan sola"
      ],
      systemsTitle: "Her parça, ayrıntılı",
      systemsText: "Görünümü satın al, odalar ve tarzlar, hediyeler ve mevsimler, iki görünüm ve ürünlerin nereden geldiği.",
      systems: [
        {
          name: "Görünümü satın al",
          title: "Düzenlenmiş bir oda, her parça bir dokunuş uzakta",
          text: "Her parçasında bir etiket olan bir oda fotoğrafı ve altında parçalar.",
          features: [
            [
              "Fotoğrafta noktalar",
              "Her parçanın numaralı bir etiketi var; bir dokunuş sayfasını açar."
            ],
            [
              "Parçalar bir sırada",
              "Fotoğrafın altında görünümdeki her parça fiyatıyla."
            ],
            [
              "Görünümü satın al",
              "Parçalara tek bir düğme; birlikte ya da tek tek almak için."
            ],
            [
              "Editörde de",
              "Görünümü satın al, her mağaza için Studio kitaplığında bir öğe."
            ]
          ]
        },
        {
          name: "Odalar ve tarzlar",
          title: "İnsanların evini düşündüğü gibi alışveriş",
          text: "Mağazanın kategorileri odaları ve menü hepsini gösteriyor.",
          features: [
            [
              "Odaya göre",
              "Oturma odası, yatak odası, yemek odası ve okuma köşesi için fotoğraf kutuları, her biri kendi odasını açar."
            ],
            [
              "Tarza göre",
              "Doğal, minimal, toprak tonları, klasik: fotoğrafların altında bir sıra seçenek."
            ],
            [
              "Her oda bir sıra",
              "Zilin yanındaki menü: her oda bir kart sırası, alt kategorileri ardından."
            ],
            [
              "Üstte arama",
              "Tek bir alan tüm odalarda arar."
            ]
          ]
        },
        {
          name: "Hediyeler ve mevsimler",
          title: "Elle paketlenir, kartıyla",
          text: "Her parça mağazadan hediye olarak çıkabilir.",
          features: [
            [
              "Hediye paketi",
              "Sepette her parçayla sunulan bir ek."
            ],
            [
              "Kart mesajı",
              "Ödemede yazılır, üç dilde dokunarak seçilen hazır başlangıçlarla."
            ],
            [
              "Mevsimler",
              "Ramazan ve yılbaşı afişleri, her biri kendi kategorisini açar."
            ],
            [
              "Hafta sonu fırsatları",
              "Geri sayımı ve kalan adediyle bir flaş indirim."
            ]
          ]
        },
        {
          name: "Yallapp Studio'da tasarlandı",
          title: "İki görünüm, her parçası sizin",
          text: "Sakan, yalnızca Studio öğeleriyle kurulmuş iki premium görünümle gelir.",
          features: [
            [
              "Teen",
              "B görünümü: sıcak ve sakin, beyaz ve kum rengi üzerinde siyaha yakın mürekkep, meşe ve kil."
            ],
            [
              "Açık ve koyu",
              "İki görünümün de tasarlanmış bir gecesi var."
            ],
            [
              "Kompakt vitrin",
              "Koleksiyonlar yaklaşık 210 nokta yüksekliğinde kartlarda, sonraki görünüyor."
            ],
            [
              "Yüzen çubuk",
              "Ana sayfa, Mağaza, Sepet, Siparişler ve Hesap; açık olan adıyla bir kapsül."
            ],
            [
              "Hazır bölümler",
              "Odayı tamamla, tarza göre alışveriş, mevsimler, koleksiyonlar ve dahası, her mağaza için."
            ],
            [
              "Üç dil",
              "İngilizce, sağdan sola Arapça ve Türkçe."
            ]
          ]
        },
        {
          name: "Ürünlerin nereden geldiği",
          title: "Ürünleriniz ya da mağazanızın platformu",
          text: "Sakan, Yallapp'ta tutulan ürünlerle ya da zaten sahip olduğunuz online mağazayla çalışır.",
          features: [
            [
              "Yallapp'taki ürünler",
              "Bu sayfadaki her şey: oda içinde odalar, stoklu renkler, santimetre ölçüler ve hediye eki."
            ],
            [
              "WordPress ve diğer platformlar",
              "Kategorileri ve alt kategorileri menüde, stokları sayfada."
            ],
            [
              "Santimetre ölçüler",
              "Kartta ve sayfada genişlik, derinlik ve yükseklik."
            ]
          ]
        }
      ],
      bundleTitle: "Tek uygulama, paneliniz ve varsa mağazanız",
      bundleText: "Müşteri uygulaması tek bir Studio projesinden mağazanın adıyla yapılır ve yayınlanır. Ürünleri Yallapp'tan ya da mağazanın kendi platformundan gelir.",
      bundleNodes: [
        [
          "Sakan",
          "Müşteriler, Android ve iPhone'da"
        ],
        [
          "Yallapp Studio",
          "Mağaza: görünümü, odaları, düzenlenmiş köşeleri ve fırsatları"
        ],
        [
          "Mağazanın web sitesi",
          "Varsa WooCommerce, Shopify ya da bir başkası"
        ]
      ],
      bundleFlows: [
        "Yeni bir parça menüde odasının sırasında görünür",
        "Tükenen bir renk uygulamada seçilemez",
        "Hediye kartının sözleri siparişle gelir",
        "Mevsim afişi kendi kategorisini açar"
      ],
      compareTitle: "Nasıl karşılaştırılır",
      compareText: "Online mağazalar için uygulama yapan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'ın ve bir ajansa uygulama yaptırmanın yanında.",
      finale: {
        title: "Cuma, saat sekiz",
        text: "Masa köşeye beş santimetre payla sığıyor. Orkide iki çiçek daha açmış. Noura ikiz vazoların pencere kenarındaki fotoğrafını gönderiyor, kart onlara yaslanmış."
      },
      photos: {
        "decor-hero": "Keten örtü üzerinde beyaz bir balkabağının yanında küçük kil vazoda kuru buğday",
        "decor-room": "İki beyaz sandalye ve bir orkideyle beyaz bir yemek masası",
        "decor-vases": "Meşe tepside pembe çiçekli iki beyaz vazo",
        "decor-lantern": "Masada içinde mum olan pirinç ve camdan bir fener",
        "decor-pottery": "El yapımı seramik kâse ve fincan rafları",
        "decor-reading": "Bükme ahşap koltuk ve siyah yan sehpalı bir okuma köşesi"
      }
    },
    furniture: {
      navName: "Mobilya mağazası uygulaması",
      metaTitle: "Odalar, cm ölçüler, istediğiniz gün teslimat ve kurulumla bir mobilya mağazası uygulaması, Yallapp Studio'da tasarlandı",
      metaDescription: "Rukn ile bir hafta: ilk oturma odası, doğru kumaşta bir kanepe, 240 cm'lik duvara 220 cm, cumartesi teslimat ve kurulum, ölçüye özel bir ünite.",
      summary: "Odalar ve parçaları, her birinin stokuyla kumaşlar ve renkler, cm ölçüler, müşterinin gününde teslimat ve kurulum, ölçüye özel talepler; iki premium görünümde.",
      eyebrow: "Yallapp Studio · Mobilya mağazası",
      title: "Duvara tam oturan bir kanepe",
      intro: "Sara, Riyad'daki ilk dairesinin anahtarlarını aldı; oturma odasında bir halıdan başka bir şey yok. Çarşamba akşamı. Telefonuyla geçen bir hafta, doğru kumaşta, seçtiği gün teslim edilip kurulan bir kanepeye böyle dönüşüyor.",
      cast: "Sara, Riyad'da bir mobilya evi olan Rukn'dan alışveriş yapıyor. Rukn, mobilya mağazası şablonunun demosu: mobilyaları, adları ve fiyatları uydurma, fotoğrafları gerçek; aşağıdaki her ekran gerçek uygulama.",
      chapters: [
        {
          time: "20:40",
          kicker: "Riyad, boş bir oda",
          title: "İçi bomboş bir oturma odası",
          text: "Sara, Rukn'u yerde otururken açıyor. Ana sayfa sakin ve hızlı: arama, yuvarlak odalar, kayan kartlarda sezonun koleksiyonu. Altında yan yana dört vaat: ücretsiz teslimat ve kurulum, garanti, seçtiği teslimat günü ve taksitin yakında geleceğini söyleyen küçük bir etiket."
        },
        {
          time: "20:44",
          kicker: "Menü",
          title: "Her oda bir satır",
          text: "Zilin yanındaki menü bütün evi açıyor: önce Oturma odası, ardından kayan Kanepeler, Berjerler, Sehpalar ve TV üniteleri; sonra Yatak odası, Yemek odası, Çalışma odası ve Bahçe. Kanepeler'e dokunuyor."
        },
        {
          time: "20:52",
          kicker: "Kanepenin sayfası",
          title: "Bukle mi, kadife mi",
          text: "Sadeer kanepe bukle, kadife ya da keten; fildişi, zeytin ya da kum renginde. Zeytin kadifeden son iki tane kalmış. Ekrandan karar veremiyor; ana sayfadan ücretsiz kumaş örneklerini istiyor: beş örnek, üç günde kapısında."
        },
        {
          time: "21:05",
          kicker: "Elde şerit metre",
          title: "240 cm'lik duvara 220 cm",
          text: "Her kart adının altında ölçüsünü yazıyor: W 220 × D 95 × H 82 cm. Pencereyle kapı arasındaki duvarı ölçüyor: 240. Her yanda on santim. Najd orta sehpa da komple takımın fotoğrafında, noktası bir dokunuş uzakta."
        },
        {
          time: "Cumartesi",
          kicker: "Onun günü, onun saati",
          title: "Cumartesi, dokuzdan on ikiye",
          text: "Örnekler pazar günü geldi; karar zeytin kadife. Ödemede, öğleden sonrasının tek yeri de dolmadan cumartesi dokuzla on iki arasını seçiyor. 1.500 SAR üzerinde kurulum ücretsiz; eski berjerin götürülmesini de 199'a ekliyor."
        },
        {
          time: "09:20",
          kicker: "Rukn'un atölyesinde",
          title: "Santimine kadar bir ünite",
          text: "TV duvarı 186 cm ve hiçbir hazır ünite sığmıyor. Sara ölçüye özel bir talep gönderiyor: parça, G × D × Y ölçüsü, meşe ve birkaç kelime. Rukn'da Faisal talebi sabahın siparişlerinin yanında buluyor ve öğleden önce fiyatla arıyor.",
          push: {
            app: "Rukn",
            title: "Sipariş 3104",
            body: "Kanepeniz cumartesi 9 ile 12 arasında geliyor. Ekip kurulumunu yapacak."
          }
        }
      ],
      interlude: {
        quote: "Çarşamba ölçüldü. Cumartesi üstüne oturuldu.",
        text: "Aradaki her şey mağazanın kendisindendi: odaları ve parçaları, kumaşlar, renkler ve her birinin stoku, cm ölçüler, teslimat günleri ve saatleri, kurulum ve talepler; panelde bir kez ayarlandı."
      },
      statsTitle: "Bir kanepenin ardındaki küçük gerçekler",
      stats: [
        "oda, demonun menüsünde, her biri bir kart satırı",
        "parça türü, satırlarında kayıyor",
        "gün öncesine kadar teslimat günü seçilebiliyor",
        "dil, Arapça sağdan sola"
      ],
      systemsTitle: "Her parça, tek tek",
      systemsText: "Odalar ve menü, kumaşlar ve ölçüler, teslimat ve kurulum, ölçüye özel üretim ve iki görünüm.",
      systems: [
        {
          name: "Odaya göre alışveriş",
          title: "Her oda bir satır",
          text: "Mağazanın odaları ana kategorileridir: yuvarlaklar, kutular ve menü onları açar.",
          features: [
            ["Kategori olarak odalar", "Oturma odası, Yatak odası, Yemek odası, Çalışma odası ve Bahçe; her biri kendi parça türleriyle."],
            ["Her odaya bir satır", "Menü her odayı yana kayan bir kart satırı olarak gösterir."],
            ["Açılan kutular", "Bir odanın kutusu o odayı mağazada açar."],
            ["Üstte arama", "Tek alan tüm odalarda arar."]
          ]
        },
        {
          name: "Kumaşlar, renkler ve ölçüler",
          title: "Her kumaşın stoku",
          text: "Bir parça kumaşları ya da malzemeleri ve renkleriyle gelir; mağaza her birinin stokunu tutar.",
          features: [
            ["Kumaş ve malzeme", "Bukle, kadife, keten, meşe ya da ceviz: her biri sayfada bir seçenek."],
            ["Renk renk", "Her renkteki her kumaşın kendi stoku var."],
            ["cm ölçüler", "Genişlik, derinlik ve yükseklik her kartta ve sayfada."],
            ["Biten bitti", "Hiç kalmayan bir seçenek soluk görünür."],
            ["Siparişe özel", "Atölyede yapılan parça kaç günde hazır olduğunu söyler."]
          ]
        },
        {
          name: "Teslimat ve kurulum",
          title: "Müşterinin gününde",
          text: "Müşteri günü ve saati seçer; mağazanın ekibi parçayı getirip kurar.",
          features: [
            ["Günler ve saatler", "Mağazanın sonraki günleri ve saat dilimleri; dolanı dolu görünür."],
            ["Bir tutarın üstünde ücretsiz", "Mağazanın belirlediği tutarın üstünde teslimat ve kurulum ücretsiz."],
            ["Ek hizmetler", "Kurulum ve eski mobilyanın götürülmesi, uydukları parçalarla sunulur."],
            ["Garanti ve iade", "Garanti vaatlerde, iade mağazanın günleri içinde."]
          ]
        },
        {
          name: "Ölçüye özel",
          title: "Tahmin değil, talep",
          text: "Adımlarıyla bir ölçüye özel sayfası ve mağazanın talep olarak sakladığı bir form.",
          features: [
            ["Talep formu", "Parça, G × D × Y ölçüsü, malzeme ya da kumaş, renk ve ayrıntılar."],
            ["Oturan ölçüler", "Müşteri duvarın ölçüsünü yazar, atölye ona göre yapar."],
            ["Panelde", "Her talep panele ve Yallapp Business'a düşer."],
            ["Taksit yakında", "Vaatlerde bir etiket; uygulama henüz taksit almıyor."]
          ]
        },
        {
          name: "Yallapp Studio'da tasarlandı",
          title: "İki görünüm, her parçası değiştirilebilir",
          text: "Rukn, yalnızca Studio öğeleriyle kurulmuş iki premium görünümde gelir.",
          features: [
            ["RUKN", "Görünüm A: modern beyaz ve ceviz, yuvarlak köşeler ve sıcak fotoğraflar."],
            ["Açık ve koyu", "İki görünümün de tasarlanmış bir gecesi var."],
            ["Kompakt vitrin", "Koleksiyonlar yaklaşık 210 nokta yüksekliğinde kartlarda, sonraki kenardan görünür."],
            ["Yüzen çubuk", "Ana sayfa, Mağaza, Sepet, Siparişler ve Hesap; açık olan işaretli."],
            ["KANAF", "Görünüm B: koyu yeşilde sessiz lüks, kanepeni parça parça tasarla ve haritada showroom."],
            ["Üç dil", "İngilizce, sağdan sola Arapça ve Türkçe."]
          ]
        }
      ],
      bundleTitle: "Tek uygulama, paneliniz ve varsa mağazanız",
      bundleText: "Müşteri uygulaması tek bir Studio projesinden mağazanın adıyla yapılır ve yayınlanır. Ürünleri Yallapp'ten ya da mağazanın kendi platformundan gelir.",
      bundleNodes: [
        ["Rukn", "Müşteriler, Android ve iPhone'da"],
        ["Yallapp Studio", "Mağaza: görünümü, odaları, kumaşları ve teslimat günleri"],
        ["Mağazanın sitesi", "Varsa WooCommerce, Shopify ya da bir başkası"]
      ],
      bundleFlows: [
        "Yeni bir parça odasının satırında görünür",
        "Biten bir kumaş uygulamada soluk görünür",
        "Dolan bir teslimat dilimi dolu görünür",
        "Ölçüye özel bir talep panele düşer"
      ],
      compareTitle: "Karşılaştırma",
      compareText: "Çevrim içi mağazalara uygulama yapan şirketler, kendi sitelerinin anlattığı gibi; Yallapp'in ve bir ajansa uygulama yaptırmanın yanında.",
      finale: {
        title: "Cumartesi, saat on bir",
        text: "Ekip kutularla ve eski berjerle çıkıyor. Zeytin kadife ekrandakinden daha sıcak duruyor. Faisal Oturma odası satırına yeni bir berjer eklemiş bile; Riyad'ın bir yerinde biri bir duvarı ölçüyor."
      },
      photos: {
        "furniture-hero": "Aydınlık bir pencerenin yanında desenli minderli açık mavi bir ikili kanepe",
        "furniture-fabric": "Turuncu çiçekli kumaşla kaplı, yüzyıl ortası tarzı bir berjer",
        "furniture-measure": "Aydınlık bir oturma odasında duvarda uzun beyaz bir TV ünitesi",
        "furniture-custom": "Bir avizenin altında gri döşemeli sandalyelerle uzun ahşap bir yemek masası",
        "furniture-terrace": "Denize bakan, ahşap sandalyeli üstü kapalı bir teras",
        "furniture-home": "Bir tablonun altında ekoseli minderli beyaz deri bir kanepe"
      }
    },
  },
};
