import type { LegalTranslation } from "../translation-types";

/** 55 The legal pages (src/content/legal.ts) in this language. */
export const TR_LEGAL: Partial<Record<"privacy" | "terms" | "refund", LegalTranslation>> = {
  privacy: {
    title: "Gizlilik politikası",
    updated: "20 Ekim 2026",
    body: `## 1. Biz kimiz

Yallapp'in merkezi Kahire, Mısır'dadır ve burada açıklanan kişisel verilerin veri sorumlusudur. Pek çok ülkede işletmelerle çalışıyoruz; bu yüzden işlediğimiz verilere uygulanan veri koruma yasalarına uyuyoruz: Mısır Kişisel Verilerin Korunması Kanunu (2020 tarihli 151 sayılı Kanun) ve uygulandıkları durumlarda AB Genel Veri Koruma Tüzüğü (GDPR) ile 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK). İletişim: [{{contact_email}}](mailto:{{contact_email}}).

## 2. Müşterilerimizden topladığımız veriler

- **Hesap bilgileri:** ad, e-posta, WhatsApp numarası ve güvenli şekilde özetlenmiş (hash) bir şifre.
- **Web sitesi ve uygulama bilgileri:** web sitenizin adresi, uygulama adı, logo, simgeler, renkler ve mağaza sayfası metni.
- **Yayın kimlik bilgileri:** eklemeyi seçerseniz Google Play, App Store Connect, Samsung Galaxy Store ve Huawei AppGallery anahtarları. Bunlar şifreli olarak saklanır.
- **Fatura kayıtları:** planınız, tarihleri ve ödeme notları.
- Bize gönderdiğiniz **mesajlar** ve IP adresi, tarayıcı ve giriş zamanları gibi **teknik kayıtlar**.

## 3. Uygulamanızın kullanıcılarına ait veriler

Uygulama kullanıcılarınızın verilerinin nasıl işlendiği, uygulamanın içeriğini nereden aldığına bağlıdır:

- **WordPress web siteniz (Yallapp eklentisi):** kullanıcılarınızın hesapları, telefon numaraları, ilerlemeleri ve siparişleri web sitenizin veritabanında kalır ve Yallapp bunları almaz. Lisans kontrolleri yalnızca web sitenizin adresini, eklenti sürümünü ve lisans anahtarını gönderir. Yallapp uygulamanızın giriş kodlarını gönderdiğinde, web siteniz o tek mesaj için telefon numarasını veya e-posta adresini ve kodu bize gönderir; bunları WhatsApp veya e-postayla iletiriz ve hiçbirini saklamayız, yalnızca kötüye kullanımı sınırlamak için numaranın veya adresin tek yönlü, anahtarlı bir parmak izini bir gün tutarız.
- **Başka bir platform veya kendi API'niz:** uygulama doğrudan o platformla veya API ile konuşur. Yalnızca bize verdiğiniz bağlantı bilgilerini şifreli olarak saklarız.
- **Web sitesi yok (Yallapp panelinde yönetilen içerik):** kullanıcılarınızın adları, telefon numaraları, girişleri, siparişleri, randevuları ve talepleri gibi uygulamanızın ihtiyaç duyduğu verileri ve eklediğiniz içeriği biz barındırırız. Bu veriler için veri sorumlusu sizsiniz, Yallapp ise veri işleyeninizdir: bunları yalnızca uygulamanızı çalıştırmak için ve talimatlarınız doğrultusunda kullanır, güvende tutar ve hesabınız sona erdiğinde veya siz istediğinizde sileriz.
- **Kullanım istatistikleri (her uygulama):** uygulamanızın nasıl kullanıldığını görebilmeniz için uygulama, içinde olanları Yallapp'e gönderir: uygulamanın açılışları (ve ilk açılış olup olmadığı), açılan ekranın türü, açılan kurslar, ürünler veya diğer öğeler ve adları, sepete ekleme, kayıt olma, randevu alma, bağış yapma veya ödeme sayfasını açma gibi işlemler (varsa tutarıyla), arama metinleri, açılan bildirimler ve paylaşımlar; bunlarla birlikte uygulamanın oluşturduğu rastgele bir kurulum numarası (kullanıcının hesabıyla bağlantılı değildir ve paylaşımı kapatıp yeniden açtığında yenilenir), platform, uygulama ve sistem sürümleri ve uygulamanın dili. Ülkeyi, veriler geldiğinde bağlantıdan çıkarırız ve IP adresini saklamayız. Hiçbir ad, telefon numarası, e-posta adresi veya reklam kimliği gönderilmez; uygulamalarda üçüncü taraf analiz veya reklam araçları yoktur ve hiçbir şey insanları uygulamalar veya web siteleri arasında izlemek için kullanılmaz. Arama metinleri yalnızca gün başına sayılır, asla kurulum numarasıyla birlikte saklanmaz. Raporlar size yalnızca toplamları gösterir. Uygulama kullanıcılarınız, uygulamanın ayarlarında "Kullanım istatistiklerini paylaş"ı kapatabilir; uygulama bu durumda göndermeyi durdurur ve henüz göndermediklerini siler. Bu istatistikler için veri sorumlusu sizsiniz, Yallapp ise veri işleyeninizdir.

Her durumda, uygulama kullanıcılarınıza kendi gizlilik bildiriminizi sunmaktan siz sorumlusunuz. Anlık bildirimler kendi Firebase projeniz üzerinden gönderilir. Giriş kodları waabek.com aracılığıyla WhatsApp'tan (bizim numaramızdan ya da bağlarsanız sizinkinden) veya e-posta sunucumuzdan e-postayla (ya da kurarsanız kendi e-posta sunucunuz üzerinden; şifresini şifreli olarak saklarız) gönderilebilir. Kullanıcılarınızdan biriyle ilgili bir sorunda bizden yardım isterseniz, yalnızca bizimle paylaştığınız verileri ve yalnızca talimatlarınız doğrultusunda kullanırız.

## 4. Verilerinizi neden kullanıyoruz ve hukuki dayanağımız

- Hesabınızı sağlamak, uygulamalarınızı derlemek ve istediğinizde yayınlamak (sözleşmenin ifası).
- Size destek olmak ve hizmeti güvende tutmak (meşru menfaat).
- Muhasebe ve vergi kayıtlarını tutmak (hukuki yükümlülük).
- Hesabınız ve derlemeleriniz hakkında hizmet e-postaları göndermek (sözleşmenin ifası).

## 5. Kimlerle paylaşıyoruz

Verileri yalnızca Yallapp'i çalıştırmamıza yardım eden sağlayıcılarla paylaşırız: web sitesi, veritabanı, web sitesi olmayan uygulamalar ve derleme dosyaları için barındırma (webek.org), giriş kodları için WhatsApp mesajlaşması (waabek.com), uygulamalarınızı derleyen derleme hizmeti ve sizin adınıza yayınladığımızda Apple veya Google. Yasa gerektirdiğinde verileri profesyonel danışmanlarla veya yetkili makamlarla da paylaşabiliriz. Kişisel verileri asla satmayız.

## 6. Uluslararası aktarımlar

Merkezimiz Mısır'dadır ve pek çok ülkeden müşterilerle çalışırız. Sağlayıcılarımızdan bazıları Amerika Birleşik Devletleri gibi başka ülkelerdedir. Kişisel veriler bir ülkeden diğerine aktarıldığında, uygulanan yasanın gerektirdiği güvenceleri kullanırız; örneğin uygulandıkları durumlarda GDPR kapsamındaki standart sözleşme maddeleri ve KVKK'nın 9. maddesindeki aktarım kuralları.

## 7. Ne kadar süre saklıyoruz

Hesap verilerini hesabınız etkin olduğu sürece ve kapandıktan sonra en fazla 12 ay saklarız. Fatura kayıtları, muhasebe ve vergi yasalarının gerektirdiği süre boyunca saklanır. İmzalama anahtarları, hesabınız sona erdikten sonra silmemizi isteyene kadar saklanır. Teknik kayıtlar en fazla 12 ay saklanır. Uygulamanızdan gelen kullanım istatistikleri 40 gün saklanır; ardından uygulamanız silinene kadar yalnızca günlük toplamlar kalır.

## 8. Güvenlik

Tüm bağlantılar HTTPS kullanır. Yayın kimlik bilgileri ve imzalama anahtarları saklanırken şifrelenir ve yalnızca erişmesi gereken kişiler erişebilir.

## 9. Haklarınız

Verilerinize erişmeyi, bunları düzeltmeyi veya silmeyi, bunları nasıl kullandığımızı kısıtlamayı veya buna itiraz etmeyi ve taşınabilir bir biçimde bir kopyasını almayı talep edebilirsiniz. GDPR veya KVKK (11. madde) uygulandığında, verilerinizin kimlerle paylaşıldığını öğrenme hakkı dahil bu hakları size tanır. Bir ay içinde yanıt veririz. [{{contact_email}}](mailto:{{contact_email}}) adresine yazın. Yallapp hesabınızı ve uygulamalarının verilerini silmek için giriş yapıp panelinizden isteyin ya da giriş yapamıyorsanız [Yallapp hesabınızı silme](/delete-account) sayfasındaki adımları izleyin. Ayrıca ülkenizin veri koruma makamına, örneğin Kişisel Verileri Koruma Kurumu'na (kvkk.gov.tr) veya AB ülkenizdeki makama şikâyette bulunabilirsiniz.

## 10. Çerezler

Yalnızca oturumunuzu açık tutmak için gereken çerezleri ve seçtiğiniz site dilini hatırlayan bir çerezi kullanırız. Reklam veya izleme çerezleri kullanmayız.

## 11. Değişiklikler ve iletişim

Değişiklikleri burada yayınlar, önemli olanlar hakkında size e-posta göndeririz. Sorularınız için: [{{contact_email}}](mailto:{{contact_email}}) veya WhatsApp [{{contact_whatsapp}}]({{contact_whatsapp_url}}).
`,
  },
  terms: {
    title: "Hizmet koşulları",
    updated: "15 Ekim 2026",
    body: `## 1. Bu koşullar hakkında

Bu koşullar Yallapp'i kullanımınızı kapsar: yallapp.com.tr'deki web sitesi, müşteri paneli, Yallapp WordPress eklentisi ve sizin için derlediğimiz mobil uygulamalar. Yallapp'in merkezi Kahire, Mısır'dadır. Bu koşullarda "biz" ifadesi Yallapp anlamına gelir. Bir hesap oluşturarak bu koşulları kabul etmiş olursunuz.

## 2. Yallapp kimler için

Yallapp; akademiler, eğitmenler, mağazalar, hizmet sağlayıcılar, emlak işletmeleri ve diğer kuruluşlar için bir işletme hizmetidir. Bir hesap oluşturarak Yallapp'i bir tüketici olarak değil, işiniz, ticaretiniz veya mesleğiniz için kullandığınızı onaylarsınız.

## 3. Yallapp ne sunar

Yallapp, içeriğini WordPress web sitenizden, desteklenen bir platformdan, kendi API'nizden veya Yallapp panelinde yönettiğiniz içerikten alan, markanızı taşıyan Android ve iOS uygulamaları derler. Planınıza bağlı olarak WordPress eklentisini, web sitesi olmayan uygulamalar için barındırmayı, uygulama derleme dosyalarınızı, yayın rehberlerini ve sizin adınıza uygulama mağazalarında yayını sağlarız. Hesabınızdaki her uygulamanın kendi planı vardır.

## 4. Hesabınız

Kaydolurken doğru bilgiler vermelisiniz. Hesabınız, planınızı onayladıktan sonra etkinleşir. Şifrenizi gizli tutun. Hesabınızdaki etkinliklerden siz sorumlusunuz.

## 5. Planlar, ödeme ve yenileme

Planlar ve fiyatlar fiyatlandırma sayfamızda gösterilir ya da ödeme yapmadan önce ekibimizle kararlaştırılır. Fiyatlar Mısır'da Mısır lirası, diğer yerlerde ABD doları olarak gösterilir. Yallapp planlarının kartla ödemeleri, nerede olursanız olun Kashier üzerinden Mısır lirası olarak tahsil edilir; ödeme sayfası, ödemeden önce tam tutarı gösterir ve bankanız tutarı kendi kuru ve ücretleriyle çevirebilir. Ödemeyi ekibimizle de ayarlayabilirsiniz. Planınız ödediğiniz dönem boyunca geçerlidir ve yalnızca bir sonraki dönem için ödeme yaptığınızda yenilenir. Planınız yenilenmezse lisansınız etkin olmaktan çıkar ve uygulamalarınız eklenti üzerinden içerik yüklemeyi durdurur.

## 6. İptal ve iadeler

Hesabınız etkinleştirildikten sonraki 3 gün içinde iptal edip tam iade alabilirsiniz. Bundan sonra mevcut dönemin ücreti iade edilmez. Tüm ayrıntılar [İade politikamızda](/refund) yer alır.

## 7. Web siteniz, içeriğiniz ve lisanslarınız

Web sitenizin, içeriğinizin ve markanızın sahibi siz olmaya devam edersiniz. Uygulamanızın kullandığı eklentiler, platformlar ve hizmetler için geçerli lisanslara sahip olmaktan siz sorumlusunuz; örneğin LMS veya mağaza eklentiniz, Digits, WooCommerce ve SMS ya da WhatsApp ağ geçidiniz. Adınızı, logonuzu ve içeriğinizi yalnızca uygulamalarınızı derlemek, yayınlamak ve desteklemek için kullanmamıza izin verirsiniz.

## 8. Uygulama mağazası hesapları ve yayın

Uygulamalarınız, seçtiğiniz her mağazadaki kendi geliştirici hesaplarınız altında yayınlanır: Google Play, App Store, Samsung Galaxy Store, Huawei AppGallery ve Xiaomi GetApps. Yayıncı sizsiniz ve mağaza sayfanız ile gizlilik beyanlarınız dahil her mağazanın politikalarına uymaktan siz sorumlusunuz. Bize mağaza API anahtarları verirseniz bunları yalnızca istediğiniz derlemeleri yüklemek için kullanırız. Bunları istediğiniz zaman iptal edebilirsiniz.

## 9. İmzalama anahtarları

Android imzalama anahtarınızı oluşturur, size bir kopyasını verir ve güncellemelerinizi derleyebilmek için şifreli bir kopyasını saklarız. Kopyanızı güvende tutun. Kaybolan bir anahtar, uygulamanızın gelecekteki güncellemelerini engelleyebilir.

## 10. Kabul edilebilir kullanım

Yallapp'i yasa dışı içerik, haklarına sahip olmadığınız içerik veya kötü amaçlı yazılım için kullanamaz, yazılı onayımız olmadan hizmeti yeniden satamazsınız.

## 11. Erişilebilirlik ve destek

Yallapp'i erişilebilir tutmak için çalışırız ancak kesintisiz hizmet sözü veremeyiz. Planlı bakımları mümkün olduğunda önceden duyururuz. Destek, WhatsApp'ta [{{contact_whatsapp}}]({{contact_whatsapp_url}}) numarasından ve e-postayla [{{contact_email}}](mailto:{{contact_email}}) adresinden sağlanır.

## 12. Hesabınızın sona ermesi

Yallapp'i kullanmayı istediğiniz zaman bırakabilirsiniz. Ödeme yapılmaması veya bu koşulların ihlali durumunda bir hesabı askıya alabilir veya kapatabiliriz. Bir hesap sona erdiğinde, daha önce teslim edilen dosyalar ve imzalama anahtarları sizde kalır, ancak eklenti bağlantısı ve yeni derlemeler durur.

## 13. Sorumluluk

Bu koşullardaki hiçbir şey, ihmalden kaynaklanan ölüm veya yaralanma ya da dolandırıcılık sorumluluğu dahil, yasanın sınırlamamıza izin vermediği sorumluluğu sınırlamaz. Buna tabi olarak, uygulama mağazalarının inceleme kararlarından, üçüncü taraf eklenti veya hizmetlerin yaptığı değişikliklerden ya da kâr kaybı gibi dolaylı veya sonuç olarak ortaya çıkan zararlardan sorumlu değiliz. Toplam sorumluluğumuz, talepten önceki 12 ayda ödediğiniz ücretlerle sınırlıdır.

## 14. Kişisel veriler

Kişisel verileri [Gizlilik politikamızda](/privacy) açıklandığı şekilde işleriz.

## 15. Bu koşullardaki değişiklikler

Bu koşulları güncelleyebiliriz. Önemli değişiklikleri yürürlüğe girmeden en az 14 gün önce size e-postayla bildiririz.

## 16. Anlaşmazlıklar ve haklarınız

Pek çok ülkede işletmelerle çalışıyoruz. Yaptığımız bir şeye itirazınız varsa önce bize [{{contact_email}}](mailto:{{contact_email}}) adresinden bildirin: ikimiz de mesajınızdan sonraki 30 gün içinde iyi niyetle çözmeye çalışırız. Çözülmezse taraflardan her biri konuyu, uygulanan yasaya göre yetkili mahkemelere veya makamlara taşıyabilir. Bu koşullardaki hiçbir şey, ülkenizin yasasının size tanıdığı ve sözleşmeyle vazgeçilemeyen tüketici ve veri koruma hakları dahil hakları ortadan kaldırmaz.

## 17. İletişim

Yallapp, Kahire, Mısır. E-posta: [{{contact_email}}](mailto:{{contact_email}}) · WhatsApp: [{{contact_whatsapp}}]({{contact_whatsapp_url}})
`,
  },
  refund: {
    title: "İade politikası",
    updated: "19 Ekim 2026",
    body: `## 1. Ödemeler nasıl yapılır

Yallapp planlarının ücretini panelinizde kartla, Kashier üzerinden Mısır lirası olarak tahsil edilecek şekilde ya da ekibimizle kararlaştırdığınız şekilde ödersiniz. Otomatik tahsilat yoktur.

## 2. 3 gün içinde iptal

Hesabınız etkinleştirildikten sonraki 3 gün içinde iptal edebilirsiniz. Mevcut dönem için ödediğiniz tutarın tamamını, tahsil edildiği gibi Mısır lirası olarak iade ederiz. Bankanız ödemeyi çevirdiyse geri aldığınız tutar bankanızın kuruna bağlıdır.

## 3. 3 günden sonra

3 günlük sürenin ardından, uygulama dosyalarının teslim edildiği veya uygulamanızın bir mağazaya gönderildiği durumlar dahil, mevcut dönemin ücreti iade edilmez.

## 4. Yenilemeler

Planınız yalnızca bir sonraki dönem için ödeme yaptığınızda yenilenir. Yenilememeye karar verirseniz başka bir ücret alınmaz.

## 5. Mağaza ve üçüncü taraf ücretleri

Apple Developer Program, Google Play kaydı, LMS veya Digits lisansları ve SMS ya da WhatsApp ağ geçitleri gibi diğer sağlayıcılara ödediğiniz ücretler o sağlayıcılara ödenir. Bunları iade edemeyiz.

## 6. Bizim tarafımızda bir sorun olursa

Bizim tarafımızdaki bir sorun nedeniyle çalışan bir derleme teslim edemezsek sorunu düzeltiriz. Düzeltemezsek mevcut döneminizin kullanılmayan kısmını iade ederiz.

## 7. İade nasıl istenir

Hesabınızın e-posta adresinden bize WhatsApp'ta [{{contact_whatsapp}}]({{contact_whatsapp_url}}) numarasından yazın veya [{{contact_email}}](mailto:{{contact_email}}) adresine e-posta gönderin. Bir iadeyi onayladığımızda, iadeyi orijinal ödeme yönteminize göndeririz. Bankanıza bağlı olarak size ulaşması 5 ila 14 iş günü sürer.

## 8. Yasal haklarınız

Yallapp bir işletme hizmetidir. Bu politika, size uygulanan yasa kapsamındaki haklarınızı etkilemez.
`,
  },
};
