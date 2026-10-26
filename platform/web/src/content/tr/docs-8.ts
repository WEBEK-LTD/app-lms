import type { DocTranslation } from "../translation-types";

/** 93.2 The documentation in Turkish, part 8: the articles each dashboard page links to that were missing. */
export const TR_DOCS_8: Record<string, DocTranslation> = {
  integrations: {
    title: "Entegrasyonlar: uygulamanızın bağlı olduğu her şey",
    description: "Web sitenizin, ödemelerin, giriş kodlarının, bildirimlerin ve mağaza anahtarlarının çalışıp çalışmadığını görün, test edin ve günlük kontrol bir sorun bulduğunda ne olduğunu öğrenin.",
    body: `Panel menünüzdeki **Entegrasyonlar**, uygulamanızın bağlı olduğu her şeyi tek yerde gösterir: her bağlantı çalışıyor mu, en son ne zaman test edildi ve son zamanlarda ne aksadı. Her bağlantının, onu kurduğunuz sayfaya giden bir bağlantısı vardır: henüz bir şey kaydedilmediyse **Kur**, aksi halde **Değiştir**.

## Ne görürsünüz

Bağlantılar şöyle gruplanır. Yalnızca uygulamanızın kullandıklarını görürsünüz.

- **Web sitesi ve içerik**: **Web sitesi veya platform**, WordPress sitenizdir ve üzerindeki Yallapp eklentisi, Shopify mağazanız veya başka bir platform ya da kendi API'nizdir. Uygulamanızın web sitesi yoksa, içeriğinizin panelde yönetildiğini ve bağlanacak bir şey olmadığını söyler.
- **Kartla ödeme**: **Ödeme sağlayıcısı**, kartla ödeme alan uygulamalar için. Ödemelerin Yallapp üzerinden mi yoksa kendi iyzico, Kashier veya Fawaterk hesabınız üzerinden mi geçtiğini ve anahtarlarınızın canlı mı test anahtarı mı olduğunu gösterir. Bkz. [Kartla ödemeler](/docs/card-payments).
- **Giriş kodları**: **WhatsApp kodları** ve **E-posta kodları**, uygulamanızın giriş kodlarını Yallapp gönderiyorsa. Kodların Yallapp'in numarasından ve e-posta adresinden mi, yoksa kendi WhatsApp numaranızdan ve e-posta sunucunuzdan mı gittiğini gösterir. Bkz. [Uygulama kullanıcıları ve giriş](/docs/app-users).
- **Bildirimler**: **Firebase bildirimleri**, yani Firebase anahtarınız (bkz. [Firebase ile anlık bildirimler](/docs/push-notifications)) ve Huawei Push Kit'i eklediyseniz **Huawei bildirimleri**.
- **Mağazalar**: **Google Play** ve **App Store**; anahtarlarını kaydettiyseniz **Samsung Galaxy Store**, **Huawei AppGallery** ve **Xiaomi GetApps**.

## Her durum ne anlama gelir

- **Bağlı**: kurulmuş ve test edildiyse son testi çalışmış. Kart neye bağlı olduğunu söyler; örneğin sitenizdeki Yallapp eklentisinin en son ne zaman bağlandığını.
- **İlgilenmeniz gerekiyor**: son testi başarısız oldu ya da kendi WhatsApp numaranız veya e-posta sunucunuz bir kod gönderemedi. Kendi numaranız ya da sunucunuz hata verdiğinde kodları onun yerine Yallapp gönderir ve kart bunun ne zaman olduğunu söyler.
- **Kurulmadı**: henüz bir şey kaydedilmedi. Ödeme anahtarları olmadan uygulamanız fiyatları Öde düğmesi olmadan gösterir. Firebase anahtarı olmadan uygulamanızın kullanıcılarına bildirim gitmez. Mağaza anahtarı olmadan uygulamayı kendiniz yüklersiniz ya da biz sizin için yükleriz.
- **Bekleniyor**: ekibimiz WordPress'i sizin için hâlâ kuruyor ya da siteniz kayıtlı ama Yallapp eklentisi orada henüz etkin değil.

## Bir bağlantıyı test edin

Web siteniz veya platformunuz, kendi ödeme anahtarlarınız, Firebase anahtarınız ve Huawei Push Kit için bir **Test et** düğmesi vardır. Karşı tarafa şimdi sorar ve kimseye bir şey gönderilmez. Ardından kart, tarihi ve sonucuyla **Son test** bilgisini, başarısız olduysa da ayrıntıları gösterir. Başarısız bir testten sonra bağlantı, bir test yeniden çalışana kadar **İlgilenmeniz gerekiyor** durumunda kalır. Arka arkaya çok kez test ederseniz, bir sonrakinden önce birkaç dakika bekleyin.

Bazı bağlantılar burada test edilemez:

- **WhatsApp kodları** ve **E-posta kodları** için bunun yerine **Test gönder** vardır. **Uygulamada giriş** sayfasını açar; orada kendinize bir test kodu veya test e-postası gönderirsiniz. Ulaştığında uyarı kalkar.
- Mağaza anahtarları, bir derleme onlarla yüklendiğinde kontrol edilir. Bir mağaza anahtarı reddederse **Derlemeler ve indirmeler** bunu söyler: bkz. [Bir derleme veya bağlantı başarısız olduğunda](/docs/builds-and-connections).

## Günlük kontroller

Uygulamanızın paketi etkin olduğu sürece web sitenizi veya platformunuzu, kendi ödeme anahtarlarınızı, Firebase anahtarınızı ve Huawei Push Kit'i günde bir kez kontrol ederiz. Yanıt vermeyen bir web sitesi, sayılmadan önce ikinci kez denenir; böylece kısa bir yavaşlık bildirilmez. WordPress'te Yallapp eklentisi günde iki kez bağlanır: eklentisi üç gündür bağlanmayan bir site de ilgi bekler. Bir ödeme sağlayıcısına hiç ulaşılamazsa kimseye haber verilmez ve ertesi gün yeniden kontrol edilir.

## Bir kontrol başarısız olduğunda

Çalışan ya da hiç test edilmemiş bir bağlantı günlük kontrolde başarısız olduğunda size bir kez haber veririz:

- **Genel bakış** sayfanızda, örneğin "ödeme anahtarlarınız ilgi bekliyor" gibi bir bildirim, **Entegrasyonları aç** bağlantısıyla;
- Yallapp Business'ta telefonunuza bir bildirim;
- panelde kullandığınız dilde, kontrolün ne bulduğunu ve Entegrasyonlar'a bir bağlantıyı içeren bir e-posta.

Ekibimize de haber verilir. Bağlantı başarısız olmaya devam ettiği sürece size her gün yeniden haber verilmez. Bildirim ne yapacağınızı söyler:

- Uygulamanız içeriğini sitenizden yükleyemedi: Entegrasyonlar'ı açın, neyin başarısız olduğunu görün ve yeniden test edin.
- Yallapp eklentisi bağlanmadı: eklentinin etkin olduğundan ve sitenizin açık olduğundan emin olun.
- Ödeme sağlayıcısı anahtarlarınızı kabul etmedi: anahtarları sağlayıcınızın panelinde kontrol edene kadar uygulamanız kartla ödeme alamaz.
- Google, Firebase anahtarınızı kabul etmedi: Firebase'den yeni bir anahtar ekleyin.
- Huawei, Push Kit uygulama kimliğinizi ve gizli anahtarınızı kabul etmedi: düzeltene kadar Huawei telefonlara bildirim gitmez.
- Kayıtlı anahtarlar okunamıyor: onları yeniden kaydedin.

## Yeniden çalıştığında

Bağlantıyı kartının yönlendirdiği sayfada düzeltin, ardından Entegrasyonlar'da **Test et**'i seçin. Test çalıştığında ya da bir sonraki günlük kontrol çalıştığında Genel bakış'taki bildirim kendiliğinden kapanır. Uygulamanız o bağlantıyı artık kullanmıyorsa da kapanır.

## Son hatalar

**Web sitesi veya platform**, **Ödeme sağlayıcısı**, **WhatsApp kodları**, **E-posta kodları** ve **Firebase bildirimleri** kartlarında **Son hatalar** bölümü vardır: uygulamanızın son 30 günde o bağlantıyla yaşadığı sorunlar, en yenisi önce. Her biri kaç kez olduğunu ve en son ne zaman olduğunu gösterir. Hiç yoksa kart "Son 30 günde hata yok." der. Kodlar insanlara ulaşmıyorsa bkz. [Giriş kodları gelmiyor](/docs/sign-in-codes).
`,
  },
  "builds-and-connections": {
    title: "Bir derleme veya bağlantı başarısız olduğunda",
    description: "Her derleme sorununun ne anlama geldiği ve nerede düzeltileceği, duran bir derlemeyle ne yapılacağı ve bir bağlantı ya da mağaza incelemesi başarısız olduğunda nereye bakılacağı.",
    body: `Çoğu sorun panelinizde, ne olduğu ve düzeltmek için bir bağlantıyla birlikte görünür. Bu makale her birini ve nereye gideceğinizi açıklar. Derlemelerin nasıl çalıştığı için bkz. [Derlemeler ve indirmeler](/docs/builds).

## Bir sonraki derlemeden önce

Bir derleme başlamadan önce kullanacaklarını kontrol ederiz. Başarısız olmasına yol açacak her şey **Derlemeler ve indirmeler** sayfasında **Bir sonraki derlemeden önce** altında görünür; **Düzelt**, **Uygulama kurulumu**'nun doğru adımını açar. Bir sorun, düzeltilene kadar derlemeyi durdurur. **Bilginiz olsun** ile işaretli satırlar durdurmaz.

- **Simgeniz**: simge yok, okunamıyor ya da saydamlık içermeyen 1024 × 1024 bir PNG değil. **Marka** adımında yenisini yükleyin.
- **Firebase dosyalarınız**: Android veya iPhone dosyası uygulamanızın paket adıyla ya da paket kimliğiyle eşleşmiyor. **Yayınlama** adımında doğru google-services.json veya GoogleService-Info.plist dosyasını yükleyin.
- **App Store Connect anahtarınız**: anahtar kimliği, issuer ID ya da anahtar dosyası yanlış (App Store Connect'in verdiği .p8 dosyası olmalı). **Yayınlama** adımında yeniden ekleyin.
- **İmzalama anahtarlarınız**: iPhone dağıtım sertifikanız (.p12) veya Android yükleme anahtarınız (keystore) okunamıyor. **Yayınlama** adımında yeniden yükleyin.
- **Bilginiz olsun**: Firebase dosyaları olmadan bildirimler telefonlara ulaşmaz. App Store Connect anahtarı olmadan iPhone uygulaması App Store Connect'e gönderilemez.

## Bir derleme tamamlanmadığında

Derleme **Tamamlanmadı** olarak görünür ve ondan hiçbir şey yayınlanmaz. Bir e-posta ve Yallapp Business'ta bir bildirim alırsınız; ekibimize de haber verilir. Sayfa nedenini sade bir dille söyler; düzeltilecek bir sayfa varsa **Düzelt** bağlantısı da olur. **Derlemenin yazdıkları**, derleme çıktısının sonunu anahtarlarınız ve parolalarınız olmadan gösterir.

Nedeni düzelttikten sonra **Tekrar dene**'yi seçin. Hiçbir şey yayınlanmadığı için derlemeyi aynı uygulama sürümüyle yeniden başlatır. Sayfada bir açıklama yoksa hangi bölümün başarısız olduğunu söyler, örneğin "Android uygulaması derlenemedi." Ekibimiz de konuyu inceler.

## Her açıklama ne anlama gelir

- **Derleme uygulamanızın simgesini kullanamadı**: **Marka** adımında saydamlık içermeyen 1024 × 1024 bir PNG yükleyin.
- **google-services.json dosyanız başka bir Android paket adı için**: uygulamanızın paket adı için Firebase'den yeniden indirin ve **Yayınlama** adımında yükleyin.
- **GoogleService-Info.plist dosyanız başka bir paket kimliği için**: uygulamanızın paket kimliği için Firebase'den yeniden indirin ve **Yayınlama** adımında yükleyin.
- **Android yükleme anahtarı açılamadı**: parolası eşleşmiyor. Keystore dosyasını parolalarıyla birlikte **Yayınlama** adımında yeniden yükleyin.
- **iPhone uygulaması imzalanamadı**: paket kimliğinin Apple Developer hesabınızda olduğunu ve App Store Connect anahtarınızın App Manager rolüne sahip olduğunu kontrol edin.
- **Apple, App Store Connect anahtarınızı kabul etmedi**: App Store Connect › Users and Access › Integrations'ta App Manager rolüyle yeni bir anahtar oluşturun ve **Yayınlama** adımında ekleyin.
- **Apple güncellenmiş bir sözleşmeyi kabul etmenizi bekliyor**: App Store Connect › Business'ta ya da developer.apple.com › Account'ta kabul edin.
- **Mağazada bu sürüm zaten var**: derlemeyi daha yüksek bir uygulama sürümüyle yeniden başlatın.
- **Google Play yüklemeyi reddetti**: hizmet hesabınız bu uygulamayı yayınlayamıyor. Play Console › Users and permissions'ta uygulamanız için Release apps iznini verin.
- **Uygulamanız henüz Google Play'de yok**: Play Console'da uygulamanızın paket adıyla oluşturun ve ilk sürümü elle yükleyin (Derlemeler ve indirmeler'deki App Bundle). Bundan sonra yüklemeler otomatik olur.
- **Derleme makinemizde bir sorun oldu**: sorun uygulamanızda değil. Derlemeyi yeniden başlatın; tekrar olursa ekibimiz bakacak.

Bir mağaza sorunu, durumu **Hazır** olan bir derlemede de görünebilir: dosyalarınız oluşturuldu ama bir mağazaya yükleme çalışmadı. Nedeni düzeltin, ardından yeni bir derleme başlatın.

## Duran bir derleme

Bir derleme genellikle 15 ila 45 dakika sürer. Başlamak için bir günden uzun beklerse ya da derlenirken altı saat boyunca hiçbir şey bildirmezse, sayfa her zamankinden çok daha uzun sürdüğünü ve muhtemelen durduğunu söyler. Ekibimize haber verilir. Yeniden başlatmak için **Tekrar dene**'yi seçin: duran derleme kapatılır ve ondan hiçbir şey yayınlanmaz.

## Bir bağlantı başarısız olduğunda

Web siteniz veya platformunuz, ödeme anahtarlarınız ve bildirim anahtarlarınız her gün kontrol edilir. Biri başarısız olduğunda **Genel bakış** sayfanızda bir bildirim, Yallapp Business'ta bir bildirim ve bir e-posta alırsınız. **Entegrasyonlar**'ı açın, neyin başarısız olduğunu görün, düzeltin ve **Test et**'i seçin. Bkz. [Entegrasyonlar](/docs/integrations). Uygulamanız kendi API'nizi kullanıyorsa ve API son kontrolünü geçemediyse, **Derlemeler ve indirmeler** de bunu, kontrol etmek için bir bağlantıyla söyler. İnsanlara giriş kodları ulaşmıyorsa bkz. [Giriş kodları gelmiyor](/docs/sign-in-codes).

## Bir mağaza uygulamanızı reddettiğinde

Uygulamanızı incelemeye göndermeden önce **Yayınlama** sayfasındaki **Göndermeye hazır mı?** bölümüne bakın: bkz. [Göndermeye hazır](/docs/ready-to-submit). Bir mağaza uygulamanızı yine de reddederse bkz. [Mağaza uygulamanızı reddederse](/docs/store-rejections).

---

Hâlâ takıldınız mı? Uygulamanızın adı ve derleme numarasıyla bize WhatsApp'tan yazın, bakalım.
`,
  },
  "ready-to-submit": {
    title: "Göndermeye hazır: mağazaların kontrol ettikleri",
    description: "Yayınlama sayfasında, Google Play ve App Store'un uygulamanızı kabul etmeden önce kontrol ettiklerinin listesi ve her maddenin nasıl düzeltileceği.",
    body: `Google Play ve App Store bir uygulamayı kabul etmeden önce inceleyenleri birkaç şeyi kontrol eder. **Yayınlama** sayfasındaki **Göndermeye hazır mı?** bunları sizin için kontrol eder; her maddede düzelteceğiniz yere bir bağlantı vardır.

## Nerede bulunur

Uygulamanızı kimin yayınlayacağını seçtikten sonra **Yayınlama** sayfasında görünür: **Kendim yayınlayacağım** veya **Benim için yayınlayın**. **Genel bakış** sayfanızdaki **İlk uygulamanız** rehberi aynı şeyi **Mağazalara hazır** olarak gösterir: mağazaların kontrol ettiği kaç şeyin eksik olduğunu ya da her şeyin yerinde olduğunu. Siz seçmeden önce rehber, uygulamayı kimin yayınlayacağını seçmenizi ister.

## Nasıl okunur

En üstte "Buradaki hiçbir şey incelemeyi durdurmuyor." ya da incelemeyi kaç şeyin durdurduğu yazar. Her maddenin bir işareti vardır:

- **Hazır**: yapacak bir şey yok.
- **Gerekli**: bu, incelemeyi durdurur. **Düzelt**, düzelteceğiniz sayfayı açar.
- **Bilgi**: tek başına incelemeyi durdurmaz ama yapmanız ya da bilmeniz gereken bir şey vardır. **Aç** nerede olduğunu gösterir.

## İnceleyenler için giriş

Apple ve Google giriş yapamadıkları uygulamaları reddeder; inceleyenleri de kod alamaz.

- **Uygulamanıza girişi Yallapp yönetiyorsa**: **Uygulamada giriş** sayfasında bir **İnceleme telefon numarası** veya **İnceleme e-posta adresi** ve bir **İnceleme kodu** belirleyin. Belirleyene kadar bu madde **Gerekli** olur. Ardından inceleyenler bunlarla ve sabit kodla giriş yapar; mesaj gönderilmez. Bkz. [Uygulama kullanıcıları ve giriş](/docs/app-users).
- **WordPress'te**: sitenizdeki Yallapp eklentisinin ayarlarında, sabit kodlu bir test numarası veya e-postasıyla inceleme erişimini açın ve bunu inceleyenler için notlara yazın.
- **Kendi API'nizde**: inceleyenlere giriş yapabilecekleri bir hesabı, inceleyenler için notlarda verin.

Uygulamanızı biz yayınladığımızda bu notları, Yayınlama sayfasındaki mağaza sayfası bilgilerinizde **Mağaza inceleyenleri için (isteğe bağlı)** alanına yazın. Yazıldığında madde **Hazır** olur.

## Gizlilik politikası

İki mağaza da herkese açık bir web sayfasında gizlilik politikası ister. Adresini **Uygulama kurulumu**'nun **Mağaza sayfası** adımında ekleyin. Adres https:// ile başlamalı ve sayfa herkese açık olmalı. O zamana kadar bu madde **Gerekli** olur.

## Hesap silme

Bu madde her zaman **Hazır**'dır. Kullanıcılar hesaplarını uygulamada, **Hesap › Ayarlar › Hesabı sil** bölümünden siler. Google Play'in Veri güvenliği formu, insanların uygulama olmadan hesaplarının silinmesini isteyebilecekleri bir web sayfası da ister. Yallapp uygulamanıza böyle bir sayfa verir: adresi bu maddenin altındadır ve /delete-account ile biter. Onu Veri güvenliği formuna kopyalayın.

## iPhone'da fiyat yok

Bu madde, paketiniz iPhone uygulamasını içerdiğinde görünür ve her zaman **Hazır**'dır: iPhone uygulaması, uygulama türünüz için Apple'ın kuralına uyacak şekilde yapılmıştır. Bir akademide iPhone uygulaması ücretli kurslar için hiçbir zaman satın alma düğmesi göstermez; ücretsiz kayıt iki telefonda da çalışır ve Android uygulamanız ödeme sayfanızı her zamanki gibi açar. Mağazalar, etkinlikler ve bağışlar kendi kurallarına uyar; madde bunu açıkça yazar. Fiyatları ve satın alma bağlantılarını App Store açıklamanızdan ve ekran görüntülerinizden de uzak tutun.

## Mağaza sayfası

Mağazalar, uygulamanızın mağazalardaki adını, bir kısa açıklamayı, bir tam açıklamayı ve bir destek e-postasını ister. Bunları **Uygulama kurulumu**'nun **Mağaza sayfası** adımında eklersiniz. Uygulamanızı biz yayınladığımızda, Yayınlama sayfasındaki mağaza sayfası bilgilerinizde bir Google Play kategorisi, bir App Store kategorisi ve içerik derecelendirme notları da gerekir. Eksik olan her şey "Hâlâ eksik" altında listelenir ve madde **Gerekli** olur.

## Ekran görüntüleri

Google Play en az 2 telefon ekran görüntüsü ister. Paketiniz iPhone uygulamasını içeriyorsa App Store da en az 1 iPhone ekran görüntüsü ister. Bunları **Mağaza sayfası** adımında ekleyin. Kendiniz yayınladığınızda, eksik ekran görüntüleri **Gerekli** olur. Biz yayınladığımızda **Bilgi** olur: gerisini uygulamanızdan biz alırız; isterseniz kendinizinkileri ekleyebilirsiniz.

## Her şey hazır olduğunda

Kendiniz yayınlıyorsanız [Google Play'de yayınlayın](/docs/google-play) ve [App Store'da yayınlayın](/docs/app-store) rehberlerini izleyin. Biz yayınlıyorsak ekibimiz buradan devralır. Bir mağaza uygulamanızı yine de reddederse bkz. [Mağaza uygulamanızı reddederse](/docs/store-rejections). Yolda bir derleme başarısız olursa bkz. [Bir derleme veya bağlantı başarısız olduğunda](/docs/builds-and-connections).
`,
  },
  team: {
    title: "Ekibiniz",
    description: "Sizinle çalışan kişileri davet edin, her birinin neyi görüp yapabileceğini ve hangi uygulamalarda çalışacağını seçin, kimin ne yaptığını görün ve birini ekipten çıkarın.",
    body: `Sizinle çalışan kişileri panelinize davet edin. Her biri web sitesinde ve Yallapp Business'ta kendi e-posta adresi ve şifresiyle giriş yapar ve yalnızca rolünün izin verdiklerini görür. Kenar çubuğunda **Hesap** altındaki **Ekip** sayfasını açın. Bu sayfayı yalnızca siz, yani sahip görürsünüz.

## Roller

- **Sahip**: siz. **Lisans ve eklenti** (WordPress sitesi olmayan uygulamalarda adı **Paket**'tir), ödemeler ve ekip dahil her şey.
- **Yönetici**: **Lisans ve eklenti**, ödemeler, ekip ve bir uygulamanın türünü ya da içeriğinin kaynağını değiştirmek dışında her şey. Yöneticiler ayrıca uygulama ekleyip silemez, depolama paketi satın alamaz ve mağazanızın ya da derneğinizin ödeme aldığı ödeme anahtarlarını değiştiremez.
- **Personel**: yalnızca işaretledikleriniz. Uygulamanın ayarları asla: **Uygulama kurulumu**, **Sayfalar ve görünüm**, **Diller**, **Ekran koruması**, **Uygulamada giriş**, **Derlemeler ve indirmeler**, **Yayınlama** ve diğer ayar sayfaları onlara kapalı kalır.

Ekipteki herkes **Genel bakış**, **Uygulamanızı önizleyin**, **Yallapp'ten haberler**, **Telefonlarınız** ve **Hesabınız** sayfalarını görür. Kenar çubuğu her kişiye yalnızca açabileceği sayfaları gösterir. Başka bir sayfanın adresini açarsa "Buradaki rolünüz o sayfayı kapsamıyor." mesajıyla genel bakışa yönlendirilir.

## Personelin çalışabileceği alanlar

**Personel**'i seçtiğinizde **Personelin çalışabileceği alanlar** altında en az bir alan işaretleyin:

- **Siparişler ve mutfak**: siparişler, iadeleri ve mutfak.
- **Rezervasyonlar ve randevular**: hizmetler, randevular, ders programı, üyelikler ve üyeler.
- **Etkinlikler ve giriş kontrolü**: etkinlikler ve kapıda bilet kontrolü.
- **Bağışlar**: kampanyalar ve bağışlar.
- **Katalog ve içerik**: ürünler, kurslar, makaleler, ilanlar ve kurs yorumları.
- **Medya**: Medya kitaplığınız.
- **Mesajlar**: ilanlarla ilgili sorular ve öğrencilerin kurslardaki soruları.
- **Sohbet**: **Sohbet** sayfası: sohbetleri okumak ve yanıtlamak, şikâyetler, mesaj silmek ve birinin mesaj göndermesini engellemek. Sohbeti açıp kapatmak ve kurs grupları ise yalnızca sizin ve yöneticilerin değiştirebildiği **Sohbet ayarları** altındadır. [Uygulamanızda sohbet](/docs/chat) yazısına bakın.
- **Uygulama kullanıcıları**: uygulamanıza giriş yapan kişiler.
- **Analiz**: Analiz sayfası.
- **Uygulama kullanıcılarına bildirimler**: uygulamanızı kullananlara bildirim göndermek.

Bir alan yalnızca uygulamada varsa işe yarar: örneğin bir mağazada randevu yoktur. Yallapp Business her kişiye aynı alanları gösterir ve alanlarının bildirimlerini gönderir: yeni sipariş **Siparişler ve mutfak** alanı olanlara, yeni sohbet mesajı **Sohbet** alanı olanlara ve benzeri. Tamamlanan derlemeler ve uygulamayla ilgili uyarılar size ve yöneticilerinize, Yallapp'e yapılan ödemeler ise yalnızca size gider.

## Hangi uygulamalar

Hesabınızda [birden fazla uygulama](/docs/several-apps) varsa **Uygulamalar** altında seçin: **Tüm uygulamalar** ya da **Yalnızca bu uygulamalar** ve ardından onları işaretleyin. Bazı uygulamalarla sınırlanan biri diğerlerini hiçbir yerde görmez: ne uygulama menüsünde, ne bildirim zilinde, ne de Yallapp Business'ta. **Tüm uygulamalar**, sonradan eklediğiniz uygulamaları da kapsar. Siz her zaman hepsine sahipsiniz. Tek uygulamanız varsa bu seçim görünmez.

## Birini davet etmek

**Birini davet edin** altında **Ad** ve **E-posta** bilgilerini girin, bir **Rol** seçin (Personel için neler üzerinde çalışacağını da), uygulamaları seçin ve **Davet gönder**'i seçin. Katılması için e-postayla bir bağlantı göndeririz. Bağlantı bir kez ve 7 gün boyunca çalışır. E-posta, Yallapp'i zaten kullanıyorsa onun panel dilinde, kullanmıyorsa sizin dilinizde gider.

Henüz kullanılmamış davetler, bağlantının çalışmayı bırakacağı tarihle birlikte **Bekleyen davetler** altındadır. **Yeniden gönder** 7 gün daha geçerli yeni bir bağlantı gönderir ve eski bağlantı çalışmaz olur. **İptal et** bağlantıyı hemen durdurur.

Kendi e-postanızı, zaten ekipte olan birini ya da bekleyen bir daveti olan bir adresi davet edemezsiniz: bunun yerine o daveti yeniden gönderin. Saatte en fazla 20 davet gönderebilirsiniz. Ekibinizi Yallapp Business'tan da yönetebilirsiniz.

## Ekibe katılmak

Bağlantı, işletmenize katılmak için bir sayfa açar. Yallapp'te yeni olan biri adını girer ve bir şifre seçer. Yallapp'i zaten kullanan biri kendi şifresini girer; hesabının henüz şifresi yoksa önce **Parolanızı mı unuttunuz?** ile bir şifre belirler. Ardından **Ekibe katıl**'ı seçer. İki adımlı giriş kullanıyorsa telefonundan bir kod da girer (bkz. [İki adımlı giriş](/docs/account-security)).

## Erişimi değiştirmek ve birini çıkarmak

**Ekipteki kişiler** altında her kişi rolü, çalıştığı alanlar, uygulamaları, katılma tarihi ve son giriş tarihiyle görünür.

- **Erişimi değiştir** rolünü, alanlarını ve uygulamalarını değiştirir. **Kaydet**'i seçin: hemen geçerli olur.
- **Çıkar** ve ardından **Evet, çıkar** onu ekipten çıkarır. Web sitesinde ve tüm telefonlarda oturumu hemen kapatılır. Giriş bilgileri silinmez: başka bir işletmede de çalışıyorsa, onu açmak için yeniden giriş yapar.

## Etkinlik

**Etkinlik** kimin ne yaptığını en yenisi önce gösterir: sipariş adımları, iadeler, randevular, uygulamanızın kullanıcılarına gönderilen bildirimler ve ekipteki değişiklikler. Tek bir kişininkileri görmek için onu **Kim** altında seçin ve **Göster**'i seçin.

## Birden fazla işletme

Biri birden fazla işletmenin ekibinde olabilir ya da kendi işletmesini de yönetebilir. Aralarında paneldeki **İşletme** menüsünden ya da Yallapp Business'tan geçiş yapar. Her işletmede rolü ve uygulamaları ayrıdır.
`,
  },
  "account-security": {
    title: "İki adımlı giriş ve bir uygulamayı silmek",
    description: "Girişinizi telefonunuzdaki bir kodla koruyun, tüm cihazlardan çıkış yapın ve bir uygulamayı ya da tüm Yallapp hesabınızı silin.",
    body: `Giriş ayarlarınız, kenar çubuğunda **Hesap** altındaki **Hesabınız** sayfasındadır. [Ekibinizdeki](/docs/team) herkesin kendi ayarları vardır ve bunları kendisi kurar.

## İki adımlı giriş

İki adımlı girişte Yallapp, şifrenizden sonra 6 haneli bir kod ister. Kod, telefonunuzdaki Google Authenticator, Microsoft Authenticator ya da 1Password gibi bir doğrulama uygulamasından gelir. Şifrenizi öğrenen biri yine de giriş yapamaz. Siz açana kadar genel bakış sayfanız bunu önerir.

## Açmak

**Hesabınız** sayfasında **İki adımlı girişi kurun**'u seçin. QR kodunu doğrulama uygulamanızla tarayın ya da yanında gösterilen anahtarla uygulamada elle bir hesap ekleyin. Uygulamanın Yallapp için gösterdiği 6 haneli kodu girin ve **Aç**'ı seçin. **Vazgeç**, açılmadan önce kurulumdan çıkar.

Ardından 10 kurtarma kodu alırsınız. Telefonunuzu kaybederseniz her biri, uygulamadaki kod yerine bir kez giriş yapmanızı sağlar. Yalnızca bu kez gösterilirler: parola yöneticiniz gibi güvenli bir yere kaydedin, sonra **Kaydettim**'i seçin. İki adımlı giriş her açıldığında veya kapatıldığında size e-posta göndeririz.

## Onunla giriş yapmak

Şifrenizden sonra **Kodunuzu girin** sayfası uygulamanızdaki kodu ister. Girin ve **Doğrula ve giriş yap**'ı seçin. Telefonunuzu mu kaybettiniz? Bunun yerine kurtarma kodlarınızdan birini girin. Her kod bir kez çalışır.

**Şifrenizi mi unuttunuz?** ile yeni bir şifre seçmek, bir ekibe katılmak ve Yallapp Business'a giriş yapmak da kodu ister. Yallapp Business'ı güncel tutun: eski sürümler iki adımlı girişle giriş yapamaz.

Kod kabul edilmezse telefonunuzun saatinin otomatik ayarlandığını kontrol edin. Birkaç yanlış koddan sonra birkaç dakika bekleyip yeniden deneyin. Kod sayfası çok uzun beklerse e-postanızı ve şifrenizi yeniden girin.

## Kurtarma kodları ve kapatmak

**Hesabınız** sayfası kaç kurtarma kodunuz kaldığını gösterir. **Yeni kurtarma kodları** altında uygulamanızdan bir kod girin ve **Yeni kodlar oluştur**'u seçin: 10 yeni kod alırsınız, eskileri artık çalışmaz.

**İki adımlı girişi kapatın** altında şifrenizi ve uygulamanızdan bir kodu (ya da bir kurtarma kodunu) girin ve **Kapat**'ı seçin. Hem telefonunuzu hem de kurtarma kodlarınızı kaybettiyseniz bize yazın (bkz. [Hesabınız ve destek](/docs/account-and-support)).

## Tüm cihazlardan çıkış yapmak

**Tüm cihazlardan çıkış yapın** altındaki **Her yerden çıkış yap**, bu tarayıcı dahil her tarayıcıda panelden ve her telefonda Yallapp Business'tan çıkış yapmanızı sağlar. Size ait olmayan bir bilgisayarda giriş yaptıktan sonra ya da bir telefonu kaybettiyseniz kullanın. **Şifrenizi mi unuttunuz?** ile yeni bir şifre seçmek de her yerden çıkış yapmanızı sağlar.

## Bir uygulamayı silmek

Bir uygulamayı yalnızca sahibi silebilir. Uygulamayı panelde açın, **Uygulama kurulumu** sayfasına gidin ve sayfanın sonundaki **Bu uygulamayı sil** bölümünü açın. Uygulamanın adını ve **Parolanız** alanını doldurun ve **Bu uygulamayı sil**'i seçin. Diğer uygulamalarınız ve Yallapp hesabınız olduğu gibi kalır.

- Uygulama, kullananlar için hemen durur: içeriği, girişi ve bildirimleri durur; WordPress sitesindeki Yallapp eklentisi lisansını kaybeder.
- Ayarları, sayfaları, içeriği, müşterileri ile onların siparişleri, randevuları ve mesajları, Medya dosyaları, derlemeleri ve istatistikleri silinir.
- Paketi de onunla sona erer: hiçbir şey yenilenmez veya ücretlendirilmez. Yapılmış ödemeler yalnızca [İade politikası](/refund) kapsamında iade edilir; kayıtlarını faturalama için saklarız.
- Kendi geliştirici hesaplarınızdaki Google Play, App Store ve diğer mağazalardaki sayfaları kalır: oradan kaldırın veya yayından çekin.

Uygulamayı bir gün Google Play'de yeniden güncelleyecekseniz, önce Android yükleme anahtarını **Derlemeler ve indirmeler** sayfasından indirin (bkz. [Derlemeler ve indirmeler](/docs/builds)). Fikrinizi mi değiştirdiniz? 7 gün içinde bize yazın, uygulamayı olduğu gibi geri getirebiliriz. Sonrasında dosyalarıyla birlikte kalıcı olarak silinir.

## Yallapp hesabınızı silmek

**Hesabınız** sayfasındaki **Yallapp hesabınızı silin**, hesabınızı tüm uygulamaları ve onların verileriyle birlikte siler. E-posta adresinizi ve şifrenizi yazın, isterseniz neden ayrıldığınızı belirtin ve **Hesabımı sil**'i seçin. Hesabınızla Yallapp Business'a giriş yapmış her telefonun oturumu hemen kapatılır.

Hesabınız, istediğiniz günden 7 gün sonra silinir ve bittiğinde size e-posta göndeririz. O zamana kadar aynı sayfadaki **İsteği iptal et** hesabınızı olduğu gibi tutar. Ekibiniz erişimini kaybeder. Uygulamalarınız siz oradan kaldırana kadar mağazalarda kalır; biz yalnızca yasaların gerektirdiği fatura kayıtlarını ve isteğinizin bir kaydını saklarız.

Hesabı yalnızca sahibi silebilir. Ekibinizdeki biri sizden onu ekipten çıkarmanızı ister; kendi giriş bilgilerini de silmek için [Hesabınızı silin](/delete-account) sayfasını izler.
`,
  },
  protection: {
    title: "Ekran koruması",
    description: "Kurs içeriğinin ya da tüm uygulamanın ekran görüntüsünü ve ekran kaydını engelleyin, insanların Android ve iPhone'da ne gördüğünü öğrenin ve YouTube ile diğer sitelerden videoların nasıl oynatılacağını seçin.",
    body: `Paneldeki **Ekran koruması**, insanların uygulamanızda gördüklerinin ekran görüntüsü ya da ekran kaydıyla alınmasını engeller; örneğin ücretli kursları gizli tutmak için. Bunu siz ve yöneticileriniz değiştirirsiniz; [ekibinizdeki](/docs/team) Personel bu sayfayı açamaz.

## Ekran görüntülerini ve ekran kaydını engellemek

**Ekran görüntülerini ve ekran kaydını engelle** altında birini seçin:

- **Kapalı**: insanlar uygulamanın her yerinde ekran görüntüsü alıp ekranı kaydedebilir. Her uygulama böyle başlar.
- **Yalnızca kurs içeriği** (yalnızca akademiler): dersler, sınavlar, ekleri ve ders videoları (tam ekran dahil) korunur. Uygulamanın geri kalanı korunmaz.
- **Tüm uygulama**: uygulamanın her ekranı korunur.
- **Yallapp eklentisindeki ayara göre** (yalnızca WordPress): web sitenizdeki eklenti ayarlarında bulunan "Block screenshots & screen recording" seçeneğini izler. WordPress uygulamaları, siz başka bir şey seçene kadar bununla başlar (bkz. [WordPress eklentisi](/docs/wordpress-plugin)).

**Kaydet**'i seçin. Uygulama, seçiminizi bir sonraki açılışında uygular. WordPress'te web siteniz, ulaşılabiliyorsa bir dakika içinde, değilse bir sonraki kontrolünde (günde iki kez) alır.

## İnsanların gördükleri

- **Android**: korunan ekranların ekran görüntüleri ve kayıtları siyah çıkar ve uygulama son uygulamalar listesinde gizlenir.
- **iPhone ve iPad**: Apple, uygulamaların ekran görüntüsünü engellemesine izin vermez. Ekran kaydedilirken ya da paylaşılırken korunan ekranlar örtülür. iOS'un izin verdiği yerlerde ekran görüntüleri boş çıkar ve uygulama her birinden sonra kısa bir uyarı gösterir. Uygulama, uygulama değiştiricide bulanık görünür.
- **Ekler** (akademiler): koruma açıkken kurs dosyaları yalnızca uygulamanın kendi görüntüleyicisinde, paylaşma, telefona kaydetme ya da yazdırma olmadan açılır. Kaydedilen dersler her zaman uygulamanın içinde şifreli kalır.

Hiçbir uygulama, birinin ekranı başka bir telefonla çekmesini engelleyemez. Akademilerde ders videolarındaki filigran hesabın kime ait olduğunu gösterir; [Analiz](/docs/analytics) sayfasındaki **Alınan ekran görüntüleri** de korunan derslerde alınan ekran görüntülerini ders ders sayar. Bir ekran görüntüsünü uygulamaya yalnızca iPhone'lar bildirir; Android onları engeller, bu yüzden orada hiçbiri sayılmaz.

Koruma, yüklü uygulamada çalışır. Tarayıcınızdaki önizleme ekran görüntüsünü engelleyemez; bu yüzden koruma açık ya da kapalıyken aynı görünür (bkz. [Uygulamanızı önizleyin](/docs/preview-your-app)).

## YouTube ve diğer video sitelerinden videolar

YouTube, Vimeo, Bunny Stream, Wistia, Dailymotion ve Loom'dan ders videoları ve video blokları, sitelerin istediği gibi her sitenin kendi oynatıcısında, kontrolleri, logosu ve bağlantılarıyla oynatılır.

**Video sitesinin markasını gizle (riski size ait)** işaretliyse uygulama bu videoları kendi kontrollerinin arkasında oynatır ve sitenin başlığını, logosunu, düğmelerini ve bitiş ekranlarını görünmez tutar. Siz açmadıkça kapalıdır. YouTube'un şartları, uygulamaların oynatıcısını veya markasını gizlemesine ya da örtmesine izin vermez: YouTube videolarınızın uygulamada oynatılmasını engelleyebilir veya uygulamanıza karşı işlem yapabilir. Medya'ya yüklediğiniz ya da Bunny Stream'de veya ücretli bir Vimeo planında barındırdığınız videolar bu riski taşımaz. YouTube videoları oynamayı bırakırsa [Videolar oynamıyor](/docs/videos) yazısına bakın.

## Kendi API'nizdeki uygulamalar

Kendi API'nizdeki bir uygulama iki ayarı da o API'den alır: API'nizin \`/config\` yanıtı \`app.screen_protection\` (\`off\`, \`content\` ya da \`app\`) ve \`app.hide_video_branding\` (true ya da false) değerlerini gönderir. Sayfa, seçenekler yerine bunu gösterir. Bkz. [Kendi API'nizi bağlayın](/docs/my-own-api).
`,
  },
  stability: {
    title: "Çökmeler ve kararlılık",
    description: "Uygulamanızın insanların telefonlarında ne kadar iyi çalıştığı: çökmesiz oturumlar, en sık sorunlar ve mağazanın değerlendirme kutusu ile çökme raporları için anahtarlarınız.",
    body: `Uygulamanızın son 30 günde insanların telefonlarında ne kadar iyi çalıştığını görmek için panelinizin menüsünde **Yayın** altındaki **Kararlılık** sayfasını açın. Uygulamanın değerlendirme isteyip istemeyeceğini ve çökme raporları gönderip göndermeyeceğini de orada seçersiniz. Kurmanız gereken bir şey yok: içeriği nereden gelirse gelsin her uygulamada çalışır.

## Çökmesiz oturumlar

**Çökmesiz oturumlar**, son 30 günde çökmeden biten uygulama oturumlarının oranıdır. Bir oturum, uygulamanın açılışından itibaren bir kez çalışmasıdır. Sayılan oturum sayısı altında görünür. %99'un üstü iyidir.

Rakamlar uygulamanın kendisinden gelir ve insanlar uygulamanızın Kararlılık sayfası eklendikten sonra derlenen bir sürümünü kullandıkça görünür: başlamak için yeni bir sürüm derleyip yayınlayın ([Bir güncelleme yayımlayın](/docs/updates)). O zamana kadar sayfa henüz veri olmadığını söyler.

## En sık sorunlar

**En sık sorunlar**, son 30 günde en çok bildirilen en fazla üç sorunu; her birinin kaç kez yaşandığını, en son hangi gün yaşandığını ve uygulama sürümünü gösterir. Uygulamanın bildirdiği şekilde yazıldıkları için teknik notlar gibi görünürler.

Bu raporlar ekibimize gelir ve uygulamadan kaynaklananları yeni bir sürümde düzeltiriz; sizin bir şey yapmanız gerekmez. Ekibimiz bir sorunu düzelttiğinde sorun listeden çıkar, yeniden bildirilirse geri gelir.

## Değerlendirme iste

**Değerlendirmeler ve çökme raporları** altındaki **Değerlendirme iste**, uygulamanın iyi bir andan sonra mağazanın kendi değerlendirme kutusunu göstermesine izin verir: biten bir ders, bir sipariş, bir randevu, biletler ya da bir bağıştan sonra veya biri uygulamayı üçüncü kez açtığında. Uygulama, en az iki gün içinde üç kez açılmadan asla değerlendirme istemez ve dört ayda bir defadan fazla istemez. Kutunun görünüp görünmeyeceğine Google Play ve App Store karar verir ve yılda yalnızca birkaç kez gösterir. Herkes aynı kutuyu görür: uygulama, mağazaların izin vermediği şekilde önce kimin memnun olduğunu sormaz. Değerlendirmeler mağazadaki uygulama sayfanıza gider.

Kapatın ya da açın ve **Kaydet**'i seçin. Uygulama bir sonraki açılışında buna uyar. Siz kapatana kadar açıktır.

## Çökme raporları

**Çökme raporları gönder** açıkken, uygulamada bir şey ters gittiğinde uygulama bize ne olduğunu, uygulama sürümünü, telefon türünü ve sistem sürümünü ve sorunun yaşandığı ekranı gönderir. Asla ad, telefon numarası, e-posta ya da insanların yazdıklarını göndermez: uygulama bunlara benzeyen her şeyi göndermeden önce siler, raporlar geldiğinde biz de yeniden sileriz.

Kapatıp **Kaydet**'i seçin: uygulama bir sonraki açılışında göndermeyi bırakır, yine de gelen raporlar saklanmaz ve Kararlılık sayfası rakam göstermez. Uygulamanızı kullananlar da uygulamanın **Ayarlar**'ında **Hata raporlarını gönder**'i kapatabilir. İki anahtar da varsayılan olarak açıktır. Çökme raporları [Analiz](/docs/analytics)'den ayrıdır: birini kapatmak diğerini kapatmaz.
`,
  },
  "yallapp-business": {
    title: "Yallapp Business, size özel uygulama",
    description: "Yallapp Business ile uygulamanızı telefonunuzdan yönetin: giriş yapmak, gösterdikleri, size gönderdiği bildirimler ve Telefonlarınız sayfasından bir telefonun oturumunu kapatmak.",
    body: `Yallapp Business, Yallapp'te bir uygulama yöneten kişiler için Yallapp'in kendi uygulamasıdır: telefonunuzdaki paneliniz, Android telefonlar ve iPhone'lar için. Panelle aynı hesap ve aynı verilerle çalışır; birinde yaptığınız diğerinde görünür. İçinde hiçbir şey satın alınmaz veya ödenmez: paketiniz ve depolama alanınız olduğu gibi gösterilir, **yallapp.com.tr'de yönetin** web sitesini açar.

## Giriş yapmak

Panelinizin e-posta adresi ve şifresiyle giriş yapın. **Hesabınız** sayfasında iki adımlı girişi açtıysanız uygulama, doğrulama uygulamanızdaki 6 haneli kodu ya da bir kurtarma kodunu da ister. **Şifrenizi mi unuttunuz?** yeni bir şifre seçmeniz için web sitesindeki sayfayı açar.

**Diğer** altında **Parmak izi veya yüzle aç**'ı açabilirsiniz: uygulama o zaman açılırken ve 5 dakika uzak kaldıktan sonra parmak izinizi, yüzünüzü veya telefon kilidinizi ister. Uygulama panelinizin dilini kullanır (İngilizce, Arapça veya Türkçe); dili uygulamada değiştirmek panelde de değiştirir.

Ekibinizdeki kişiler kendi e-posta ve şifreleriyle giriş yapar ve yalnızca rollerinin izin verdiği ekranları ve uygulamaları görür.

## Gösterdikleri

- **Bugün**: uygulamanızda olduğu kadarıyla bugünün rakamları (satışlar, siparişler, randevular, biletler, girişler, bağışlar, yeni kullanıcılar ve uygulama açılışları) ve **Şimdi sizi bekleyenler**: hazırlanan siparişler, onay bekleyen randevular, yanıtınızı bekleyen konuşmalar, yanıtlanacak kurs soruları ve hesabınızla ilgili bildirimler; örneğin bitmek üzere olan bir paket ya da **Entegrasyonlar**'daki günlük kontrolünü geçemeyen bir bağlantı.
- Kabul edilecek, ilerletilecek ve iade edilecek siparişler, restoranlar için **Mutfak modu**; onaylanacak veya taşınacak randevular; kapıda bilet tarayıcısıyla etkinlikler; spor salonları için üye girişi; bağışlar.
- Hızlı düzenlemeler: ürünlerin ve menü öğelerinin fiyatı, stoku ve satışta olup olmadığı, kursları yayınlamak ve ders eklemek, makaleler ve ilanlar. Fotoğraf ve videoları telefondan Medya kitaplığınıza yüklersiniz.
- **Sohbet** ve **Gelen kutusu**: uygulamanızın sohbetinde insanlara ([Uygulamanızda sohbet](/docs/chat)), ilanlarla ilgili mesajlara ve öğrencilerin kurs sorularına ve değerlendirmelerine yanıt verin.
- Uygulamanızın kullanıcıları, son 7, 30 veya 90 gün ya da seçtiğiniz tarihler için **Analitik** ([Analiz](/docs/analytics)), uygulamanızı kullanan herkese **Bildirim gönder** ([Firebase ile anlık bildirimler](/docs/push-notifications)), uygulamanızın önizlemesi ve indirmeleriyle birlikte derlemeleriniz ve mağaza durumları.
- Yallapp'ten haberlerin olduğu zil. Orada okuduklarınız panelde de okunmuş görünür.

Her ekran yalnızca uygulamanızda varsa ve rolünüz izin veriyorsa görünür. Birden fazla uygulamanız varsa üstten birini seçin.

## Telefonunuzdaki bildirimler

Giriş yaptıktan sonra uygulama size bildirim göndermek için izin ister. **Diğer › Bildirimler** altında bu telefonun hangilerini alacağını seçersiniz: **Yeni siparişler**, **Yeni randevular**, **Yeni mesajlar**, **Sohbet mesajları**, **Yeni değerlendirmeler**, **Ödemeler**, **Derlemeler**, **Yallapp'ten haberler** ve **Hesap bildirimleri**. Hesap bildirimleri; paketinizin bitişini, depolama alanınızı, uygulama kullanıcılarınızın paket sınırına yaklaşmasını ve web sitenizin ya da bir bağlantının ilgi beklediğini haber verir: web siteniz, ödeme anahtarlarınız veya bildirim anahtarlarınız günlük kontrolü geçemediğinde bildirim telefonunuza, panelinizin **Genel bakış** sayfasına ve e-postanıza gelir. Ekranını açmak için bir bildirime dokunun.

Birden fazla işletme için çalışıyorsanız başka bir işletmenin bildirimleri o işletmenin adıyla başlar ve birine dokunmak o işletmeye geçer.

## Telefonlarınız

Panelde **Hesap** altındaki **Telefonlarınız**, hesabınızla Yallapp Business'a giriş yapmış telefonları listeler: her telefonun adı, Android mi iPhone mu olduğu, uygulamanın sürümü, ne zaman giriş yaptığı, en son ne zaman kullanıldığı ve bildirim alıyorsa **Bildirimler açık**. Ekibinizdeki kişiler orada kendi telefonlarını görür.

Artık kullanmadığınız veya tanımadığınız bir telefonun yanındaki **Oturumu kapat**'ı seçin; telefon bildirimlerinizi almayı bırakır. **Tüm telefonlarda oturumu kapat** hepsinin oturumunu kapatır. Uygulama aynı telefonları **Diğer › Oturum açık cihazlar** altında listeler. Şifrenizi değiştirmek de tüm telefonlarda oturumu kapatır; **Hesabınız** sayfasındaki **Her yerden çıkış yap** sizi web sitesinden ve tüm telefonlardan çıkarır. Birini ekibinizden çıkarmak onun oturumunu hemen kapatır. [Hesabınız ve destek](/docs/account-and-support) yazısına bakın.
`,
  },
  "app-links": {
    title: "Uygulamanızı açan bağlantılar",
    description: "Uygulamanızdan paylaşılan bağlantılar, uygulama yüklüyse içinde doğru ekranı açar: bağlantı dosyalarının ihtiyaç duyduğu Google Play parmak izi ve Apple Team ID ile Bağlantıları kontrol et.",
    body: `İnsanların uygulamanızdan paylaştığı bağlantılar, uygulama yüklüyse uygulamada, değilse web'de açılır. Uygulamanızın bağlantılarının nasıl göründüğünü görmek, bağlantı dosyalarının ihtiyaç duyduklarını eklemek ve her şeyin yerinde olduğunu kontrol etmek için **Yayınlama** sayfasını açıp **Uygulamanıza bağlantılar**'ı seçin.

## Bağlantılar nasıl çalışır

Uygulamanızdaki Paylaş düğmeleri bir kursa, ürüne, hizmete, ilana, makaleye, etkinliğe, kampanyaya veya sayfaya bağlantı paylaşır. Uygulamanızın yüklü olduğu bir telefonda bağlantı, uygulamada doğru ekranı açar. Bildirim bağlantıları da aynı şekilde çalışır. **Bağlantılar nasıl çalışır** bölümü uygulamanızın örnek bağlantılarını gösterir:

- Her uygulamanın Yallapp'in adresinde bağlantıları vardır: yallapp.com.tr/a/ ve ardından uygulamanızın kimliği. Uygulama yüklü değilse uygulamanızın adını, resmini ve mağaza bağlantılarını içeren bir sayfa açarlar.
- WordPress uygulamalarının web sitenizde de bağlantıları vardır, örneğin yoursite.com/a/…. Uygulama yüklü değilse web sitenizdeki aynı sayfayı açarlar.

Uygulamanızın bir sonraki derlemesi bu adresleri bilir ([Derlemeler ve indirmeler](/docs/builds)).

## Dosyaların ihtiyaç duydukları

Telefonlar bir bağlantıyı uygulamanızda yalnızca adres uygulamanıza güvendiğini söylüyorsa açar; bunu adresin sunduğu iki küçük dosyayla yapar: biri Android, biri iPhone için. Yallapp'in dosyaları her zaman hazırdır ve panelinizin uygulamanız hakkında bildiklerinden oluşur. **Dosyaların ihtiyaç duydukları** altında yalnızca sizin verebileceğiniz iki şeyi eklersiniz:

- **Uygulama imzalama anahtarı sertifikası: SHA-256 parmak izi** (Google Play). Play Console'da uygulamanızı açın, ardından **Test and release › App integrity › App signing** bölümüne gidin ve **App signing key certificate** altındaki **SHA-256 certificate fingerprint** değerini kopyalayın. Google, insanların indirdiği uygulamayı bu anahtarla imzalar; bu yüzden onsuz Google Play'den gelen uygulama bağlantıları tarayıcıda açar. Play Console'un gösterdiği gibi (iki nokta üst üste ile ayrılmış çiftler) yapıştırın; hemen üstündeki SHA-1 parmak izi doğru olan değildir. Yükleme anahtarınızın parmak izini derlemelerimiz ekler. [Google Play'de yayınlayın](/docs/google-play) yazısına bakın.
- **Apple Team ID**, paketiniz iPhone uygulamasını içeriyorsa. Apple Developer hesabınızda **Membership details › Team ID** altındadır: 10 harf ve rakam. iOS derlemeleriniz bunu doldurur, bu yüzden genellikle zaten oradadır; yalnızca uygulamanız başka bir Apple geliştirici hesabına taşındıysa değiştirin. [App Store'da yayınlayın](/docs/app-store) yazısına bakın.

**Kaydet**'i seçin. Bir alanı boşaltmak kaydedileni siler. Telefonlar değişikliği bir gün içinde okur.

## Web sitenizdeki bağlantılar

Bir WordPress uygulamasında web siteniz kendi iki dosyasını Yallapp eklentisi üzerinden sunar ([WordPress eklentisini kurun](/docs/wordpress-plugin)); eklentiyi güncel tutun. Web sitenizdeki bağlantıların uygulamayı açması için:

- web sitenizin adresi https ile başlamalı;
- WordPress bir klasörde değil, alan adının kökünde olmalı (yoursite.com, yoursite.com/shop değil). Değilse Yallapp'in adresindeki bağlantılar yine çalışır;
- sunucunuz /.well-known klasörünü yönlendirmeden WordPress'e iletmeli.

Kaydettikten sonra web sitenizden değişikliği almasını isteriz. **Bağlantıları kontrol et** bir parmak izinin eksik olduğunu söylerse eklenti ayarlarındaki **Check now** düğmesini kullanın.

## Bağlantıları kontrol et

**Bağlantı durumu** altında **Bağlantıları kontrol et**'i seçin. Satır satır şunları kontrol eder:

- **Google Play'in imzalama anahtarı parmak izi**: yukarıda kaydettiğiniz.
- **Yükleme anahtarınızın parmak izi**: bir sonraki derlemenizle eklenir.
- **Apple Team ID**, paketiniz iPhone uygulamasını içeriyorsa. Bunun için **Uygulama kurulumu › Mağaza sayfası** bölümünde iOS paket kimliği de gerekir.
- Bir WordPress uygulamasında **Web sitenizin adresi** ve **Web siteniz alan adının kökünde** olup olmadığı, ardından web sitenizin iki dosyası. Dosyalar telefonların aldığı gibi alınır: https üzerinden, yönlendirme olmadan, JSON olarak sunulmuş, 8 saniye içinde yanıt veren, 256 kB'tan küçük, uygulamanızı ve parmak izlerini içeren.

Her satır başarılı ya da başarısız olur; başarısızsa ne yapmanız gerektiğini söyler. Üstte, kontrol zamanıyla (UTC) birlikte **Bağlantılar uygulamanızı açıyor.** ya da **Bazı bağlantılar henüz uygulamanızı açmıyor.** görürsünüz. **Uygulama kurulumu** da son sonucu kendi **Bağlantıları kontrol et** düğmesiyle gösterir. Arka arkaya çok kez kontrol ederseniz yeniden denemeden önce birkaç dakika bekleyin.
`,
  },
};
