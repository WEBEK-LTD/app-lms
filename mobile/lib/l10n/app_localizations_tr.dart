// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Turkish (`tr`).
class AppLocalizationsTr extends AppLocalizations {
  AppLocalizationsTr([String locale = 'tr']) : super(locale);

  @override
  String get languageName => 'Türkçe';

  @override
  String get tabHome => 'Ana sayfa';

  @override
  String get tabCourses => 'Kurslar';

  @override
  String get tabMyCourses => 'Kurslarım';

  @override
  String get tabAccount => 'Hesap';

  @override
  String get tabShop => 'Mağaza';

  @override
  String get tabCart => 'Sepet';

  @override
  String get tabBook => 'Randevu al';

  @override
  String get tabAppointments => 'Randevular';

  @override
  String get tabFavorites => 'Favoriler';

  @override
  String get tabMessages => 'Mesajlar';

  @override
  String get loadingPage => 'Sayfa yükleniyor';

  @override
  String get pageEmptyTitle => 'Burada henüz bir şey yok';

  @override
  String get playVideo => 'Videoyu oynat';

  @override
  String get savedItem => 'Kaydedildi';

  @override
  String itemCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count öğe',
      one: '1 öğe',
    );
    return '$_temp0';
  }

  @override
  String get searchListingsHint => 'Yer veya ilan no.';

  @override
  String get filters => 'Filtreler';

  @override
  String filtersActive(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Filtreler, $count etkin',
      one: 'Filtreler, 1 etkin',
    );
    return '$_temp0';
  }

  @override
  String sortBy(String order) {
    return 'Sıralama: $order';
  }

  @override
  String get sortNewest => 'En yeni';

  @override
  String get sortPriceLowHigh => 'Fiyat: düşükten yükseğe';

  @override
  String get sortPriceHighLow => 'Fiyat: yüksekten düşüğe';

  @override
  String get sortLargest => 'Önce en büyük';

  @override
  String get filterAll => 'Tümü';

  @override
  String get filterAny => 'Farketmez';

  @override
  String get forSale => 'Satılık';

  @override
  String get forRent => 'Kiralık';

  @override
  String get featured => 'Öne çıkan';

  @override
  String get negotiable => 'Pazarlığa açık';

  @override
  String pricePerMonth(String price) {
    return '$price / ay';
  }

  @override
  String pricePerYear(String price) {
    return '$price / yıl';
  }

  @override
  String areaSquareMetres(String area) {
    return '$area m²';
  }

  @override
  String areaSquareFeet(String area) {
    return '$area ft²';
  }

  @override
  String bedroomsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count yatak odası',
      one: '1 yatak odası',
    );
    return '$_temp0';
  }

  @override
  String bathroomsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count banyo',
      one: '1 banyo',
    );
    return '$_temp0';
  }

  @override
  String get loadingListings => 'İlanlar yükleniyor';

  @override
  String get loadingMoreListings => 'Daha fazla ilan yükleniyor';

  @override
  String get noListingsTitle => 'İlan bulunamadı';

  @override
  String get noListingsMessage =>
      'Başka kelimeler veya daha az filtre deneyin.';

  @override
  String get propertyType => 'Mülk tipi';

  @override
  String get city => 'Şehir';

  @override
  String get district => 'İlçe';

  @override
  String get priceRange => 'Fiyat';

  @override
  String get areaRange => 'Alan';

  @override
  String get bedrooms => 'Yatak odası';

  @override
  String get bathrooms => 'Banyo';

  @override
  String get minimum => 'En az';

  @override
  String get maximum => 'En çok';

  @override
  String get reset => 'Sıfırla';

  @override
  String get showResults => 'Sonuçları göster';

  @override
  String get loadingListing => 'İlan yükleniyor';

  @override
  String listingReference(String reference) {
    return 'İlan no. $reference';
  }

  @override
  String get keyFacts => 'Temel bilgiler';

  @override
  String get factArea => 'Alan';

  @override
  String get factFloor => 'Kat';

  @override
  String get factYearBuilt => 'Yapım yılı';

  @override
  String get factFurnished => 'Eşyalı';

  @override
  String get yes => 'Evet';

  @override
  String get no => 'Hayır';

  @override
  String get features => 'Özellikler';

  @override
  String get description => 'Açıklama';

  @override
  String get watchVideo => 'Videoyu izle';

  @override
  String get location => 'Konum';

  @override
  String get openInMaps => 'Haritada aç';

  @override
  String get contactOffice => 'Ofisle iletişim';

  @override
  String get call => 'Ara';

  @override
  String get whatsapp => 'WhatsApp';

  @override
  String get email => 'E-posta';

  @override
  String get similarListings => 'Benzer ilanlar';

  @override
  String get messageOffice => 'Ofise mesaj gönder';

  @override
  String inquiryTemplate(String title) {
    return 'Merhaba, \"$title\" ilanıyla ilgileniyorum. Hâlâ müsait mi?';
  }

  @override
  String get writeMessage => 'Bir mesaj yazın';

  @override
  String get send => 'Gönder';

  @override
  String photoOf(int index, int total) {
    return 'Fotoğraf $index / $total';
  }

  @override
  String get saveToFavorites => 'Favorilere ekle';

  @override
  String get removeFromFavorites => 'Favorilerden çıkar';

  @override
  String get loadingFavorites => 'Favoriler yükleniyor';

  @override
  String get noFavoritesTitle => 'Henüz favori yok';

  @override
  String get noFavoritesMessage =>
      'Buraya kaydetmek için bir ilandaki kalbe dokunun.';

  @override
  String get favoritesSignInTitle => 'Beğendiğiniz evleri kaydedin';

  @override
  String get favoritesSignInMessage =>
      'Favorilerinizi tüm cihazlarınızda tutmak için giriş yapın.';

  @override
  String get messagesSignInTitle => 'Ofisle konuşun';

  @override
  String get messagesSignInMessage =>
      'Bir ilan hakkında ofise mesaj göndermek için giriş yapın.';

  @override
  String get signIn => 'Giriş yap';

  @override
  String get loadingMessages => 'Mesajlar yükleniyor';

  @override
  String get noMessagesTitle => 'Henüz mesaj yok';

  @override
  String get noMessagesMessage =>
      'Bir ilan hakkında gönderdiğiniz sorular burada görünür.';

  @override
  String unreadMessages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count okunmamış mesaj',
      one: '1 okunmamış mesaj',
    );
    return '$_temp0';
  }

  @override
  String messageFromYou(String text) {
    return 'Siz: $text';
  }

  @override
  String messageFromOffice(String text) {
    return 'Ofis: $text';
  }

  @override
  String get conversationClosed => 'Bu görüşme kapatıldı.';

  @override
  String get progress => 'İlerleme';

  @override
  String get seeAll => 'Tümünü gör';

  @override
  String get loading => 'Yükleniyor';

  @override
  String get offlineTitle => 'Çevrimdışısınız';

  @override
  String get errorTitle => 'Bir şeyler ters gitti';

  @override
  String get tryAgain => 'Tekrar dene';

  @override
  String get cancel => 'Vazgeç';

  @override
  String durationMinutes(int minutes) {
    return '$minutes dk';
  }

  @override
  String durationHours(int hours) {
    return '$hours sa';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '$hours sa $minutes dk';
  }

  @override
  String get back => 'Geri';

  @override
  String tabPosition(String label, int index, int count) {
    return '$label, sekme $index / $count';
  }

  @override
  String get mainNavigation => 'Ana gezinme';

  @override
  String tabWithCount(String label, int count) {
    return '$label, $count';
  }

  @override
  String get maintenanceTitle => 'Birazdan döneceğiz';

  @override
  String maintenanceMessage(String name) {
    return '$name güncelleniyor. Lütfen biraz sonra tekrar deneyin.';
  }

  @override
  String get updateRequiredTitle => 'Güncelleme gerekli';

  @override
  String updateRequiredMessage(String name) {
    return '$name uygulamasının yeni sürümü çıktı. Öğrenmeye devam etmek için uygulamayı güncelleyin.';
  }

  @override
  String get updateNow => 'Şimdi güncelle';

  @override
  String appPausedTitle(String name) {
    return '$name şu anda duraklatıldı';
  }

  @override
  String appPausedMessage(String name) {
    return '$name uygulamasının sahibi uygulamayı yeniden açabilir. Ayrıntılar için onlarla iletişime geçin veya daha sonra tekrar deneyin.';
  }

  @override
  String contactOwner(String name) {
    return '$name ile iletişime geç';
  }

  @override
  String membersClosedTitle(String name) {
    return '$name şu anda yeni üye kabul etmiyor';
  }

  @override
  String membersClosedMessage(String name) {
    return 'Katılmak için $name ile iletişime geçin. Zaten bir hesabınız varsa, daha önce kullandığınız numarayla giriş yapın.';
  }

  @override
  String get connectionTitle => 'Bağlanamadık';

  @override
  String get done => 'Bitti';

  @override
  String get close => 'Kapat';

  @override
  String get videoQualityAuto => 'Otomatik';

  @override
  String get errorTimeout =>
      'Bağlantı zaman aşımına uğradı. İnternetinizi kontrol edip tekrar deneyin.';

  @override
  String get errorCancelled => 'İstek iptal edildi.';

  @override
  String get errorNetwork =>
      'Bağlanamadık. İnternetinizi kontrol edip tekrar deneyin.';

  @override
  String get error401 => 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';

  @override
  String get error403 => 'Buna erişiminiz yok.';

  @override
  String get error404 => 'Aradığınızı bulamadık.';

  @override
  String get error429 =>
      'Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin.';

  @override
  String get error503 =>
      'Uygulama şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';

  @override
  String get errorGeneric => 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';

  @override
  String get errorInvalidResponse => 'Uygulama okuyamadığı bir yanıt aldı.';

  @override
  String get errorPurchaseNotAllowed =>
      'Bu kurs henüz hesabınızda kullanılamıyor.';

  @override
  String get free => 'Ücretsiz';

  @override
  String get questionSingleChoice => 'Tek seçim';

  @override
  String get questionMultipleChoice => 'Çoktan seçmeli';

  @override
  String get questionTrueFalse => 'Doğru ya da yanlış';

  @override
  String get questionShortAnswer => 'Kısa cevap';

  @override
  String get questionOpenEnded => 'Açık uçlu cevap';

  @override
  String get questionFillInBlank => 'Boşluğu doldurun';

  @override
  String get questionOrdering => 'Sıralama';

  @override
  String get questionMatching => 'Eşleştirme';

  @override
  String get questionImageAnswer => 'Görselli cevap';

  @override
  String get questionOther => 'Soru';

  @override
  String get attemptPassed => 'Geçti';

  @override
  String get attemptFailed => 'Geçemedi';

  @override
  String get attemptPendingReview => 'İnceleme bekleniyor';

  @override
  String countryName(String code) {
    String _temp0 = intl.Intl.selectLogic(code, {
      'AF': 'Afganistan',
      'AL': 'Arnavutluk',
      'DZ': 'Cezayir',
      'AR': 'Arjantin',
      'AU': 'Avustralya',
      'AT': 'Avusturya',
      'AZ': 'Azerbaycan',
      'BH': 'Bahreyn',
      'BD': 'Bangladeş',
      'BE': 'Belçika',
      'BA': 'Bosna-Hersek',
      'BR': 'Brezilya',
      'BG': 'Bulgaristan',
      'CA': 'Kanada',
      'CN': 'Çin',
      'HR': 'Hırvatistan',
      'CY': 'Kıbrıs',
      'CZ': 'Çekya',
      'DK': 'Danimarka',
      'EG': 'Mısır',
      'FI': 'Finlandiya',
      'FR': 'Fransa',
      'GE': 'Gürcistan',
      'DE': 'Almanya',
      'GR': 'Yunanistan',
      'HU': 'Macaristan',
      'IN': 'Hindistan',
      'ID': 'Endonezya',
      'IR': 'İran',
      'IQ': 'Irak',
      'IE': 'İrlanda',
      'IT': 'İtalya',
      'JP': 'Japonya',
      'JO': 'Ürdün',
      'KZ': 'Kazakistan',
      'KE': 'Kenya',
      'XK': 'Kosova',
      'KW': 'Kuveyt',
      'KG': 'Kırgızistan',
      'LB': 'Lübnan',
      'LY': 'Libya',
      'MY': 'Malezya',
      'MX': 'Meksika',
      'MA': 'Fas',
      'NL': 'Hollanda',
      'NZ': 'Yeni Zelanda',
      'NG': 'Nijerya',
      'MK': 'Kuzey Makedonya',
      'NO': 'Norveç',
      'OM': 'Umman',
      'PK': 'Pakistan',
      'PS': 'Filistin',
      'PH': 'Filipinler',
      'PL': 'Polonya',
      'PT': 'Portekiz',
      'QA': 'Katar',
      'RO': 'Romanya',
      'RU': 'Rusya',
      'SA': 'Suudi Arabistan',
      'RS': 'Sırbistan',
      'SG': 'Singapur',
      'SO': 'Somali',
      'ZA': 'Güney Afrika',
      'KR': 'Güney Kore',
      'ES': 'İspanya',
      'SD': 'Sudan',
      'SE': 'İsveç',
      'CH': 'İsviçre',
      'SY': 'Suriye',
      'TN': 'Tunus',
      'TR': 'Türkiye',
      'TM': 'Türkmenistan',
      'UA': 'Ukrayna',
      'AE': 'Birleşik Arap Emirlikleri',
      'GB': 'Birleşik Krallık',
      'US': 'Amerika Birleşik Devletleri',
      'UZ': 'Özbekistan',
      'YE': 'Yemen',
      'other': '$code',
    });
    return '$_temp0';
  }

  @override
  String get pageNotFound => 'Bu sayfa mevcut değil';

  @override
  String get goHome => 'Ana sayfaya dön';

  @override
  String get profileSaved => 'Profil kaydedildi';

  @override
  String get editProfile => 'Profili düzenle';

  @override
  String get save => 'Kaydet';

  @override
  String get fullName => 'Ad soyad';

  @override
  String get enterName => 'Adınızı girin.';

  @override
  String get emailOptional => 'E-posta (isteğe bağlı)';

  @override
  String get enterValidEmail => 'Geçerli bir e-posta adresi girin.';

  @override
  String get enterEmail => 'E-postanızı girin.';

  @override
  String get enterCity => 'Şehrinizi girin.';

  @override
  String get cityOptional => 'Şehir (isteğe bağlı)';

  @override
  String get mobileNumber => 'Cep telefonu numarası';

  @override
  String get mobileNumberLocked =>
      'Cep telefonu numaranızla giriş yaptığınız için burada değiştirilemez.';

  @override
  String signOutDeviceTitle(String device) {
    return '$device cihazından çıkış yapılsın mı?';
  }

  @override
  String get signOutDeviceMessage =>
      'O cihazın tekrar giriş yapması için doğrulama kodu gerekecek.';

  @override
  String get signOut => 'Çıkış yap';

  @override
  String signOutDevice(String device) {
    return '$device cihazından çıkış yap';
  }

  @override
  String get registeredDevices => 'Kayıtlı cihazlar';

  @override
  String deviceLimit(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Bu hesapla $count cihaz kullanabilirsiniz.',
      one: 'Bu hesapla 1 cihaz kullanabilirsiniz.',
    );
    return '$_temp0';
  }

  @override
  String thisDevice(String device) {
    return '$device (bu cihaz)';
  }

  @override
  String lastUsed(String date) {
    return 'Son kullanım $date';
  }

  @override
  String get myCertificates => 'Sertifikalarım';

  @override
  String get noCertificatesTitle => 'Henüz sertifika yok';

  @override
  String get noCertificatesMessage =>
      'Sertifikasını almak için bir kursu tamamlayın.';

  @override
  String get noQuizResultsTitle => 'Henüz sınav sonucu yok';

  @override
  String get noQuizResultsMessage => 'Sınav puanlarınız burada görünecek.';

  @override
  String get quizResults => 'Sınav sonuçları';

  @override
  String get justNow => 'Az önce';

  @override
  String minutesAgo(int minutes) {
    return '$minutes dk önce';
  }

  @override
  String hoursAgo(int hours) {
    return '$hours sa önce';
  }

  @override
  String get yesterday => 'Dün';

  @override
  String daysAgo(int days) {
    return '$days gün önce';
  }

  @override
  String get noNotificationsTitle => 'Henüz bildirim yok';

  @override
  String get noNotificationsMessage =>
      'Yeni dersler, duyurular ve sorularınızın yanıtları burada görünecek.';

  @override
  String get notifications => 'Bildirimler';

  @override
  String get unread => 'Okunmadı';

  @override
  String get noOrdersTitle => 'Henüz sipariş yok';

  @override
  String get noOrdersMessage => 'Satın aldıklarınız burada görünür.';

  @override
  String get myOrders => 'Siparişlerim';

  @override
  String orderNumber(String number) {
    return 'Sipariş no. $number';
  }

  @override
  String lineQuantity(String name, int quantity) {
    return '$name × $quantity';
  }

  @override
  String get logOutTitle => 'Çıkış yapılsın mı?';

  @override
  String get logOutMessage =>
      'Tekrar giriş yapmak için doğrulama kodu gerekecek.';

  @override
  String get logOut => 'Çıkış yap';

  @override
  String get edit => 'Düzenle';

  @override
  String get shopping => 'Alışveriş';

  @override
  String get learning => 'Öğrenme';

  @override
  String get wishlist => 'İstek listesi';

  @override
  String get accountAndApp => 'Hesap ve uygulama';

  @override
  String get settings => 'Ayarlar';

  @override
  String get helpAndSupport => 'Yardım ve destek';

  @override
  String get privacyPolicy => 'Gizlilik Politikası';

  @override
  String get termsAndConditions => 'Şartlar ve Koşullar';

  @override
  String get deleteAccountTitle => 'Hesabınız silinsin mi?';

  @override
  String get deleteAccountMessage =>
      'Hesabınız, ilerlemeniz ve kayıtlarınız silinecek, tüm cihazlarda oturum kapatılacak. Bu işlem geri alınamaz.';

  @override
  String get deleteAccount => 'Hesabı sil';

  @override
  String get accountDeleted => 'Hesabınız silindi.';

  @override
  String get display => 'Görünüm';

  @override
  String get appearance => 'Tema';

  @override
  String get themeSystem => 'Sistem';

  @override
  String get themeLight => 'Açık';

  @override
  String get themeDark => 'Koyu';

  @override
  String get video => 'Video';

  @override
  String get defaultQuality => 'Varsayılan kalite';

  @override
  String get playbackSpeed => 'Oynatma hızı';

  @override
  String get autoplayNext => 'Sonraki dersi otomatik oynat';

  @override
  String get newsAndOffers => 'Haberler ve kampanyalar';

  @override
  String get notifyNewLessons => 'Kurslarımdaki yeni dersler';

  @override
  String get notifyAnnouncements => 'Eğitmen duyuruları';

  @override
  String get notifyDailyReminder => 'Günlük çalışma hatırlatıcısı';

  @override
  String get security => 'Güvenlik';

  @override
  String devicesUsed(int used, int limit) {
    return '$used / $limit';
  }

  @override
  String version(String version) {
    return 'Sürüm $version';
  }

  @override
  String get language => 'Dil';

  @override
  String get notNow => 'Şimdi değil';

  @override
  String get welcome => 'Hoş geldiniz';

  @override
  String get signInIntro =>
      'Cep telefonu numaranızla giriş yapın, size bir doğrulama kodu gönderelim.';

  @override
  String chooseCountryCode(String code) {
    return 'Ülke kodu $code. Ülke kodunu seçin';
  }

  @override
  String get sendCode => 'Kodu gönder';

  @override
  String get signInNewHere =>
      'Yeni misiniz? Doğrulamadan sonra adınızı soracak ve hesabınızı bu numarayla oluşturacağız.';

  @override
  String signInRegisteredOnly(String site) {
    return '$site sitesinde kayıtlı cep telefonu numaranızı kullanın.';
  }

  @override
  String tooManyAttemptsSeconds(int seconds) {
    return 'Çok fazla deneme. $seconds saniye sonra tekrar deneyin.';
  }

  @override
  String logoOf(String name) {
    return '$name logosu';
  }

  @override
  String legalAgreeBoth(String terms, String privacy) {
    return 'Devam ederek $terms ve $privacy metinlerini kabul etmiş olursunuz';
  }

  @override
  String legalAgreeOne(String document) {
    return 'Devam ederek $document metnini kabul etmiş olursunuz';
  }

  @override
  String get searchCountry => 'Ülke veya kod ara';

  @override
  String useCode(String code) {
    return '$code kullan';
  }

  @override
  String get codeExpired => 'Bu kodun süresi doldu. Yeni bir kod isteyin.';

  @override
  String get noAccountForNumber =>
      'Bu numarayla kayıtlı bir hesap yok. Lütfen akademiyle iletişime geçin.';

  @override
  String get newCodeSent => 'Size yeni bir kod gönderdik.';

  @override
  String get enterCode => 'Doğrulama kodunu girin';

  @override
  String codeSentTo(String number) {
    return '$number numarasına bir kod gönderdik';
  }

  @override
  String get changeNumber => 'Numarayı değiştir';

  @override
  String get signInWithPhone => 'Telefon';

  @override
  String get signInWithEmail => 'E-posta';

  @override
  String get signInMethodLabel => 'Giriş yöntemi';

  @override
  String get emailAddress => 'E-posta adresi';

  @override
  String get password => 'Şifre';

  @override
  String get forgotPassword => 'Şifrenizi mi unuttunuz?';

  @override
  String get signInIntroEmail =>
      'E-posta adresinizle giriş yapın, size bir doğrulama kodu gönderelim.';

  @override
  String get signInIntroPassword =>
      'Hesabınızın e-posta adresi ve şifresiyle giriş yapın.';

  @override
  String get signInNewHereEmail =>
      'Yeni misiniz? Doğrulamadan sonra adınızı soracak ve hesabınızı bu e-posta adresiyle oluşturacağız.';

  @override
  String signInPasswordAccountsOnly(String site) {
    return '$site üzerindeki hesabınızın e-posta adresini ve şifresini kullanın.';
  }

  @override
  String get changeEmail => 'E-postayı değiştir';

  @override
  String get noAccountForEmail => 'Bu e-posta adresiyle kayıtlı bir hesap yok.';

  @override
  String get invalidEmail => 'Geçerli bir e-posta adresi girin.';

  @override
  String resendCodeIn(String time) {
    return '$time sonra yeni kod isteyebilirsiniz';
  }

  @override
  String get sending => 'Gönderiliyor…';

  @override
  String get sendNewCode => 'Yeni kod gönder';

  @override
  String get verifyAndSignIn => 'Doğrula ve giriş yap';

  @override
  String codeFieldLabel(int length) {
    return 'Doğrulama kodu, $length haneli';
  }

  @override
  String get createYourAccount => 'Hesabınızı oluşturun';

  @override
  String signupIntro(String site) {
    return 'Numaranız doğrulandı. $site katılımını tamamlamak için adınızı yazın.';
  }

  @override
  String get createAccount => 'Hesap oluştur';

  @override
  String get loadingHome => 'Ana sayfa yükleniyor';

  @override
  String get goodMorning => 'Günaydın';

  @override
  String get goodAfternoon => 'İyi günler';

  @override
  String get goodEvening => 'İyi akşamlar';

  @override
  String get continueLearning => 'Öğrenmeye devam et';

  @override
  String get categories => 'Kategoriler';

  @override
  String get featuredCourses => 'Öne çıkan kurslar';

  @override
  String get latestCourses => 'En yeni kurslar';

  @override
  String notificationsUnread(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Bildirimler, $count okunmamış',
      one: 'Bildirimler, 1 okunmamış',
    );
    return '$_temp0';
  }

  @override
  String get announcement => 'Duyuru';

  @override
  String get searchForCourse => 'Kurs ara';

  @override
  String get welcomeBack => 'Tekrar hoş geldiniz,';

  @override
  String get whatToLearn => 'Ne öğrenmek istersiniz?';

  @override
  String get forYou => 'Sana özel';

  @override
  String get newCourses => 'Yeni';

  @override
  String get learn => 'Öğren';

  @override
  String get searchCourses => 'Kurslarda ara';

  @override
  String get newCoursesShowHere => 'Yeni kurslar burada görünecek.';

  @override
  String get noCoursesYet => 'Henüz kurs yok';

  @override
  String courseCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count kurs',
      one: '1 kurs',
    );
    return '$_temp0';
  }

  @override
  String lessonCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ders',
      one: '1 ders',
    );
    return '$_temp0';
  }

  @override
  String questionCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count soru',
      one: '1 soru',
    );
    return '$_temp0';
  }

  @override
  String answerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count cevap',
      one: '1 cevap',
    );
    return '$_temp0';
  }

  @override
  String ratingCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count puan',
      one: '1 puan',
    );
    return '$_temp0';
  }

  @override
  String reviewCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count yorum',
      one: '1 yorum',
    );
    return '$_temp0';
  }

  @override
  String starCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count yıldız',
      one: '1 yıldız',
    );
    return '$_temp0';
  }

  @override
  String get enrolled => 'Kayıtlı';

  @override
  String ratedOutOf5(String rating) {
    return '5 üzerinden $rating puan';
  }

  @override
  String continueCourseLabel(String title, int percent) {
    return '$title kursuna devam et, %$percent tamamlandı';
  }

  @override
  String continueCourseNextLabel(String title, int percent, String next) {
    return '$title kursuna devam et, %$percent tamamlandı, sıradaki: $next';
  }

  @override
  String lessonsDone(int done, int total) {
    return '$done / $total ders';
  }

  @override
  String get continueAction => 'Devam et';

  @override
  String get sortPopular => 'Popüler';

  @override
  String get sortAtoZ => 'A\'dan Z\'ye';

  @override
  String get allCourses => 'Tüm kurslar';

  @override
  String get searchCoursesHint => 'Kurs veya eğitmen adı';

  @override
  String get filtersAndSorting => 'Filtreler ve sıralama';

  @override
  String get paid => 'Ücretli';

  @override
  String removeFilter(String name) {
    return '$name  ×';
  }

  @override
  String get noCoursesFound => 'Kurs bulunamadı';

  @override
  String get noCoursesFoundFiltered =>
      'Farklı bir arama deneyin veya filtreleri temizleyin.';

  @override
  String get noCoursesPublished => 'Kurslar yayınlandığında burada görünecek.';

  @override
  String get clearFilters => 'Filtreleri temizle';

  @override
  String get loadMoreFailed => 'Daha fazlası yüklenemedi. Tekrar deneyin';

  @override
  String get loadingMoreCourses => 'Daha fazla kurs yükleniyor';

  @override
  String get sortByTitle => 'Sırala';

  @override
  String get category => 'Kategori';

  @override
  String get categoriesFailed => 'Kategoriler yüklenemedi.';

  @override
  String get showCourses => 'Kursları göster';

  @override
  String get enrollToOpen => 'Bu öğeyi açmak için kursa kaydolun.';

  @override
  String get assignmentsOnWebsite =>
      'Ödevler ve canlı dersler şimdilik web sitesinde.';

  @override
  String get enrolledMessage => 'Kaydınız tamam. İyi öğrenmeler!';

  @override
  String get checkout => 'Ödeme';

  @override
  String get checkoutFailed => 'Ödeme sayfası açılamadı.';

  @override
  String get loadingCourse => 'Kurs yükleniyor';

  @override
  String get overview => 'Genel bakış';

  @override
  String get curriculum => 'Müfredat';

  @override
  String get reviews => 'Yorumlar';

  @override
  String get questionsAndAnswers => 'Soru-Cevap';

  @override
  String get removeFromWishlist => 'İstek listesinden çıkar';

  @override
  String get addToWishlist => 'İstek listesine ekle';

  @override
  String get certificate => 'Sertifika';

  @override
  String get instructor => 'Eğitmen';

  @override
  String get noDescription => 'Henüz açıklama yok.';

  @override
  String get aboutInstructor => 'Eğitmen hakkında';

  @override
  String get curriculumEmpty => 'Müfredat burada görünecek.';

  @override
  String get loadingCurriculum => 'Müfredat yükleniyor';

  @override
  String get freePreviewLower => 'ücretsiz önizleme';

  @override
  String get lockedLower => 'kilitli';

  @override
  String get completedLower => 'tamamlandı';

  @override
  String get freePreview => 'Ücretsiz önizleme';

  @override
  String get enrollForFree => 'Ücretsiz kaydol';

  @override
  String get enrollNow => 'Hemen kaydol';

  @override
  String get coursePrice => 'Kurs ücreti';

  @override
  String get askQuestion => 'Soru sor';

  @override
  String get askQuestionHint => 'Bu kurs hakkında ne sormak istersiniz?';

  @override
  String get sendQuestion => 'Soruyu gönder';

  @override
  String get loadingQuestions => 'Sorular yükleniyor';

  @override
  String get noQuestionsTitle => 'Henüz soru yok';

  @override
  String get noQuestionsMessage =>
      'Eğitmene bu kursla ilgili her şeyi sorabilirsiniz.';

  @override
  String get loadingEllipsis => 'Yükleniyor…';

  @override
  String get showMoreQuestions => 'Daha fazla soru göster';

  @override
  String get noAnswersYet => 'Henüz cevap yok';

  @override
  String get writeReply => 'Bir yanıt yazın';

  @override
  String get sendReply => 'Yanıtı gönder';

  @override
  String get answerNotification =>
      'Eğitmen cevap verdiğinde bildirim alacaksınız.';

  @override
  String get loadingQuestion => 'Soru yükleniyor';

  @override
  String get writeReview => 'Yorum yaz';

  @override
  String get editReview => 'Yorumunu düzenle';

  @override
  String get reviewHint =>
      'Neyi beğendiniz? Ne daha iyi olabilirdi? (isteğe bağlı)';

  @override
  String get postReview => 'Yorumu yayınla';

  @override
  String get chooseRating => '1 ile 5 yıldız arasında bir puan seçin.';

  @override
  String get reviewPending =>
      'Teşekkürler! Yorumunuz akademi onayladığında görünecek.';

  @override
  String get reviewThanks => 'Yorumunuz için teşekkürler!';

  @override
  String get loadingReviews => 'Yorumlar yükleniyor';

  @override
  String get noReviewsBeFirst =>
      'Henüz yorum yok. Düşüncelerinizi ilk siz paylaşın.';

  @override
  String get noReviews => 'Henüz yorum yok.';

  @override
  String get showMoreReviews => 'Daha fazla yorum göster';

  @override
  String starsCount(int stars, int count) {
    return '$stars yıldız: $count';
  }

  @override
  String get reviewAwaitingApproval => 'Akademinin onayı bekleniyor.';

  @override
  String personYou(String name) {
    return '$name (siz)';
  }

  @override
  String ratingOutOf5(String rating) {
    return '5 üzerinden $rating';
  }

  @override
  String get inProgress => 'Devam eden';

  @override
  String get completed => 'Tamamlandı';

  @override
  String get noCoursesInProgress => 'Devam eden kurs yok';

  @override
  String get noCompletedCourses => 'Henüz tamamlanan kurs yok';

  @override
  String get noCoursesInProgressMessage =>
      'Kaydolduğunuz kurslar burada görünecek.';

  @override
  String get noCompletedCoursesMessage =>
      'Burada görmek için bir kursu bitirin.';

  @override
  String get browseCourses => 'Kurslara göz at';

  @override
  String courseProgressLabel(String title, int percent) {
    return '$title, %$percent tamamlandı';
  }

  @override
  String courseProgressNextLabel(String title, int percent, String next) {
    return '$title, %$percent tamamlandı, sıradaki: $next';
  }

  @override
  String nextItem(String title) {
    return 'Sıradaki: $title';
  }

  @override
  String get wishlistEmptyTitle => 'İstek listeniz boş';

  @override
  String get wishlistEmptyMessage =>
      'Daha sonrası için kaydetmek üzere bir kurstaki kalbe dokunun.';

  @override
  String get courseComplete => 'Kurs tamamlandı. Tebrikler!';

  @override
  String lessonComplete(int percent) {
    return 'Ders tamamlandı · kursun %$percent kadarı bitti';
  }

  @override
  String get keepWatching => 'İzlemeye devam et';

  @override
  String get watchMore =>
      'Bu dersi tamamlandı olarak işaretlemeden önce videonun daha fazlasını izleyin.';

  @override
  String watchAtLeast(int percent) {
    return 'Bu dersi tamamlandı olarak işaretlemeden önce videonun en az %$percent kadarını izleyin.';
  }

  @override
  String get ok => 'Tamam';

  @override
  String get loadingLesson => 'Ders yükleniyor';

  @override
  String get lessonLocked => 'Bu ders kilitli';

  @override
  String get lessonLockedEnroll => 'Bu dersi açmak için kursa kaydolun.';

  @override
  String get lessonLockedSignIn => 'Bu dersi açmak için giriş yapın.';

  @override
  String lessonPosition(int index, int total) {
    return 'Ders $index / $total';
  }

  @override
  String get lesson => 'Ders';

  @override
  String get lessons => 'Dersler';

  @override
  String get notes => 'Notlar';

  @override
  String get attachments => 'Ekler';

  @override
  String get noAttachments => 'Bu dersin eki yok.';

  @override
  String get previousLesson => 'Önceki ders';

  @override
  String get signInToTrack => 'İlerlemeyi takip etmek için giriş yapın';

  @override
  String get markComplete => 'Dersi tamamla';

  @override
  String get nextLesson => 'Sonraki ders';

  @override
  String get playingNow => 'şimdi oynatılıyor';

  @override
  String sizeBytes(int size) {
    return '$size B';
  }

  @override
  String sizeKilobytes(String size) {
    return '$size KB';
  }

  @override
  String sizeMegabytes(String size) {
    return '$size MB';
  }

  @override
  String get videoFailed => 'Video oynatılamadı.';

  @override
  String get loadingVideo => 'Video yükleniyor';

  @override
  String get screenRecording =>
      'Ekran kaydı açık. İzlemeye devam etmek için kaydı durdurun.';

  @override
  String get videoUnavailable => 'Bu video kullanılamıyor.';

  @override
  String get pause => 'Duraklat';

  @override
  String get play => 'Oynat';

  @override
  String get playAgain => 'Yeniden oynat';

  @override
  String positionOf(String position, String duration) {
    return '$position / $duration';
  }

  @override
  String playbackSpeedIs(String speed) {
    return 'Oynatma hızı $speed';
  }

  @override
  String get exitFullScreen => 'Tam ekrandan çık';

  @override
  String get fullScreen => 'Tam ekran';

  @override
  String get loadingEmbed => 'Gömülü içerik yükleniyor';

  @override
  String embedFrom(String host) {
    return '$host kaynaklı gömülü içerik';
  }

  @override
  String get openFullScreen => 'Tam ekran aç';

  @override
  String get interactive => 'Etkileşimli';

  @override
  String get embeddedContent => 'Gömülü içerik';

  @override
  String get opensFullScreen => 'Bu içerik tam ekranda açılır.';

  @override
  String get open => 'Aç';

  @override
  String get rotateScreen => 'Ekranı döndür';

  @override
  String get code => 'kod';

  @override
  String codeIn(String language) {
    return '$language kodu';
  }

  @override
  String get copyCode => 'Kodu kopyala';

  @override
  String get codeCopied => 'Kod kopyalandı';

  @override
  String get copy => 'Kopyala';

  @override
  String get answerTrue => 'Doğru';

  @override
  String get answerFalse => 'Yanlış';

  @override
  String get submitQuizTitle => 'Sınav gönderilsin mi?';

  @override
  String unansweredQuestions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count soru henüz cevaplanmadı.',
      one: '1 soru henüz cevaplanmadı.',
    );
    return '$_temp0';
  }

  @override
  String get submit => 'Gönder';

  @override
  String get timeUp => 'Süre doldu. Cevaplarınız gönderildi.';

  @override
  String get leaveQuizTitle => 'Sınavdan çıkılsın mı?';

  @override
  String get leaveQuizMessage => 'Cevaplarınız gönderilmeyecek.';

  @override
  String get leave => 'Çık';

  @override
  String get closeQuiz => 'Sınavı kapat';

  @override
  String get loadingQuiz => 'Sınav yükleniyor';

  @override
  String timeLeft(String time) {
    return 'Kalan süre $time';
  }

  @override
  String get quizNoQuestions => 'Bu sınavda henüz soru yok';

  @override
  String questionPosition(int index, int total) {
    return 'Soru $index / $total';
  }

  @override
  String get previous => 'Önceki';

  @override
  String get submitQuiz => 'Sınavı gönder';

  @override
  String get nextQuestion => 'Sonraki soru';

  @override
  String timeLimit(String duration) {
    return '$duration süre sınırı';
  }

  @override
  String passMark(int percent) {
    return 'Geçme notu %$percent';
  }

  @override
  String get unlimitedAttempts => 'Sınırsız deneme';

  @override
  String attemptsUsed(int used, int allowed) {
    return '$allowed denemeden $used kullanıldı';
  }

  @override
  String get lastResult => 'Son sonuç';

  @override
  String get startQuiz => 'Sınava başla';

  @override
  String get startNewAttempt => 'Yeni bir deneme başlat';

  @override
  String get noAttemptsLeft =>
      'Bu sınav için tüm deneme haklarınızı kullandınız.';

  @override
  String get youPassed => 'Geçtiniz';

  @override
  String get notPassedThisTime => 'Bu sefer geçemediniz';

  @override
  String get submittedForReview => 'İncelemeye gönderildi';

  @override
  String yourScore(String score) {
    return 'Puanınız: %$score';
  }

  @override
  String passMarkColon(int percent) {
    return 'Geçme notu: %$percent';
  }

  @override
  String get instructorWillReview => 'Eğitmeniniz cevaplarınızı inceleyecek.';

  @override
  String get backToCourse => 'Kursa dön';

  @override
  String get questionNotSupported => 'Bu soru uygulamada gösterilemiyor.';

  @override
  String get answerBelow =>
      'Aşağıda cevaplayın. İlerlediğinizde cevabınız kaydedilir.';

  @override
  String get chooseAll => 'Uygun olanların hepsini seçin';

  @override
  String get chooseOne => 'Bir cevap seçin';

  @override
  String get quiz => 'Sınav';

  @override
  String get noDeliveryDays => 'Şu anda uygun teslimat günü yok.';

  @override
  String get deliveryDate => 'Teslimat tarihi';

  @override
  String get deliveryDateOptional => 'Teslimat tarihi (isteğe bağlı)';

  @override
  String get emptyCartTitle => 'Sepetiniz boşaltılsın mı?';

  @override
  String get emptyCartMessage => 'Sepetinizdeki her şey kaldırılacak.';

  @override
  String get emptyCart => 'Sepeti boşalt';

  @override
  String get orderPlaced => 'Teşekkürler! Siparişiniz alındı.';

  @override
  String get shopClosedTitle => 'Mağaza şu anda kapalı';

  @override
  String get tryLater => 'Lütfen daha sonra tekrar deneyin.';

  @override
  String get cartEmptyTitle => 'Sepetiniz boş';

  @override
  String get cartEmptyMessage => 'Eklediğiniz ürünler burada görünür.';

  @override
  String get startShopping => 'Alışverişe başla';

  @override
  String get choose => 'Seç';

  @override
  String get giftMessage => 'Hediye notu (isteğe bağlı)';

  @override
  String get giftMessageHint => 'Siparişinize ekleyeceğiz.';

  @override
  String get subtotal => 'Ara toplam';

  @override
  String get deliveryAndTaxes =>
      'Teslimat ve vergiler ödeme sırasında eklenir.';

  @override
  String get fixCartItems =>
      'Devam etmek için yukarıda işaretli ürünleri değiştirin veya kaldırın.';

  @override
  String get chooseDeliveryDate =>
      'Devam etmek için bir teslimat tarihi seçin.';

  @override
  String removeItem(String name) {
    return '$name ürününü kaldır';
  }

  @override
  String get customerReviewsShowHere => 'Müşteri yorumları burada görünür.';

  @override
  String get loadingProduct => 'Ürün yükleniyor';

  @override
  String get addedToCart => 'Sepete eklendi';

  @override
  String get cartFull => 'Sepetiniz dolu.';

  @override
  String get viewCart => 'Sepeti gör';

  @override
  String cartWithItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Sepet, $count ürün',
      one: 'Sepet, 1 ürün',
    );
    return '$_temp0';
  }

  @override
  String get youMayAlsoLike => 'Bunları da beğenebilirsiniz';

  @override
  String get addToCart => 'Sepete ekle';

  @override
  String chooseOptions(String options) {
    return '$options seçin';
  }

  @override
  String get notAvailableInOptions => 'Bu seçeneklerle mevcut değil';

  @override
  String get outOfStock => 'Stokta yok';

  @override
  String get notSoldInApp => 'Bu ürün uygulamada satılmıyor.';

  @override
  String get optionsLower => 'seçenekleri';

  @override
  String get listAnd => ' ve ';

  @override
  String get productPhoto => 'Ürün fotoğrafı';

  @override
  String productPhotoOf(int index, int total) {
    return 'Ürün fotoğrafı $index / $total';
  }

  @override
  String get quantity => 'Adet';

  @override
  String get sortBestSelling => 'En çok satan';

  @override
  String get sortTopRated => 'En yüksek puanlı';

  @override
  String get sortName => 'Ad';

  @override
  String get searchProducts => 'Ürün ara';

  @override
  String get onSale => 'İndirimde';

  @override
  String get loadingProducts => 'Ürünler yükleniyor';

  @override
  String get noProductsTitle => 'Ürün bulunamadı';

  @override
  String get noProductsMessage => 'Başka bir arama veya kategori deneyin.';

  @override
  String get loadingMoreProducts => 'Daha fazla ürün yükleniyor';

  @override
  String get loadingShop => 'Mağaza yükleniyor';

  @override
  String get shopGettingReady => 'Mağaza hazırlanıyor';

  @override
  String get newProductsSoon => 'Yeni ürünler yakında burada görünecek.';

  @override
  String get newArrivals => 'Yeni gelenler';

  @override
  String get bestSellers => 'Çok satanlar';

  @override
  String get offer => 'Kampanya';

  @override
  String wasPrice(String price) {
    return 'önceki fiyat $price';
  }

  @override
  String get inStock => 'Stokta';

  @override
  String get onBackorder => 'Ön siparişle mevcut';

  @override
  String get onSaleLower => 'indirimde';

  @override
  String get outOfStockLower => 'stokta yok';

  @override
  String get sale => 'İndirim';

  @override
  String get fewer => 'Azalt';

  @override
  String quantityIs(int quantity) {
    return 'Adet $quantity';
  }

  @override
  String get more => 'Arttır';

  @override
  String get loadingAppointments => 'Randevular yükleniyor';

  @override
  String get noUpcomingAppointments => 'Yaklaşan randevu yok';

  @override
  String get noUpcomingAppointmentsMessage =>
      'Bir saat ayırtın, burada görünsün.';

  @override
  String get bookAppointment => 'Randevu al';

  @override
  String get noPastAppointments => 'Geçmiş randevu yok';

  @override
  String get upcoming => 'Yaklaşan';

  @override
  String get past => 'Geçmiş';

  @override
  String get cancelAppointmentTitle => 'Bu randevu iptal edilsin mi?';

  @override
  String get cancelAppointment => 'Randevuyu iptal et';

  @override
  String get appointmentCancelled => 'Randevunuz iptal edildi.';

  @override
  String get appointment => 'Randevu';

  @override
  String get loadingAppointment => 'Randevu yükleniyor';

  @override
  String get cancelling => 'İptal ediliyor';

  @override
  String withStaff(String name) {
    return '$name ile';
  }

  @override
  String withStaffLower(String name) {
    return '$name ile';
  }

  @override
  String get contactToChange =>
      'Değiştirmek veya iptal etmek için lütfen bizimle iletişime geçin.';

  @override
  String get tooLateToCancel =>
      'Uygulamadan iptal etmek için çok geç. Değiştirmek için lütfen bizimle iletişime geçin.';

  @override
  String cancelUpTo(String duration) {
    return 'Başlamadan $duration öncesine kadar iptal edebilirsiniz.';
  }

  @override
  String get gettingReady => 'Hazırlanıyor';

  @override
  String get servicesSoon =>
      'Ayırtabileceğiniz hizmetler yakında burada görünecek.';

  @override
  String get nextAppointment => 'Sıradaki randevunuz';

  @override
  String get services => 'Hizmetler';

  @override
  String get ourTeam => 'Ekibimiz';

  @override
  String get loadingService => 'Hizmet yükleniyor';

  @override
  String get appointmentBooked => 'Randevunuz alındı.';

  @override
  String get slotTaken =>
      'Bu saat az önce alındı. Lütfen başka bir saat seçin.';

  @override
  String get withTitle => 'Kiminle';

  @override
  String get chooseTime => 'Bir saat seçin';

  @override
  String get findingTimes => 'Boş saatler aranıyor';

  @override
  String bookSlot(String time) {
    return '$time için randevu al';
  }

  @override
  String dayAtTime(String day, String time) {
    return '$day, saat $time';
  }

  @override
  String get noTimesThisWeek => 'Bu hafta boş saat yok';

  @override
  String get tryAnotherWeek =>
      'Başka bir hafta veya müsait herhangi birini deneyin.';

  @override
  String get nextWeek => 'Sonraki hafta';

  @override
  String get previousWeek => 'Önceki hafta';

  @override
  String get noTimesThisDay => 'Bu günde boş saat yok.';

  @override
  String timesIn(String zone) {
    return 'Saatler $zone saatine göredir.';
  }

  @override
  String get anyone => 'Fark etmez';

  @override
  String freeTimeCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count boş saat',
      one: '1 boş saat',
    );
    return '$_temp0';
  }

  @override
  String get noFreeTimes => 'boş saat yok';

  @override
  String get confirmYourBooking => 'Randevunuzu onaylayın';

  @override
  String get anyoneAvailable => 'Müsait olan herhangi biri';

  @override
  String get noteForBusiness => 'İşletmeye not (isteğe bağlı)';

  @override
  String get confirmBooking => 'Randevuyu onayla';

  @override
  String get loadingServices => 'Hizmetler yükleniyor';

  @override
  String get noServicesYet => 'Henüz hizmet yok';

  @override
  String get noMatches => 'Sonuç yok';

  @override
  String get servicesShowHere =>
      'Ayırtabileceğiniz hizmetler burada görünecek.';

  @override
  String get tryAnotherWord => 'Başka bir kelime deneyin.';

  @override
  String get searchServices => 'Hizmet ara';

  @override
  String get previewTitle => 'Uygulama önizlemesi';

  @override
  String get previewInstalledAppOnly => 'Yüklü uygulamada kullanılabilir';

  @override
  String get previewWebPageNote =>
      'Gömülü videolar ve ödeme sayfaları gibi web sayfaları yüklü uygulamada açılır.';

  @override
  String get previewOpenInNewTab => 'Yeni sekmede aç';

  @override
  String get previewCheckoutNote =>
      'Sipariş ve ödeme yüklü uygulamada çalışır. Önizleme hiçbir zaman ödeme almaz.';

  @override
  String get previewSignInNote =>
      'Bu bir önizleme. Uygulamanızın mağaza inceleme numarası ve koduyla giriş yapın. Önizleme hiçbir zaman giriş kodu göndermez.';

  @override
  String get previewSignInUnavailable =>
      'Giriş yüklü uygulamada çalışır. Uygulamanızın sunucusu henüz önizlemeden giriş yapılmasını desteklemiyor.';

  @override
  String get previewNoLink => 'Önizlemeyi Yallapp panelinizden açın.';

  @override
  String get previewExpired =>
      'Bu önizleme bağlantısının süresi doldu. Önizlemeyi Yallapp panelinizden yeniden açın.';

  @override
  String get previewInvalid =>
      'Bu önizleme bağlantısı geçerli değil. Önizlemeyi Yallapp panelinizden açın.';

  @override
  String get previewUnreachable =>
      'Önizleme yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.';

  @override
  String get previewNoContent =>
      'Kurulumun Web sitesi adımında uygulamanızın içeriğinin nereden geleceğini seçin, sonra önizlemeyi yeniden yükleyin.';

  @override
  String previewApiBlocked(String origin) {
    return 'Önizleme uygulamanızın içeriğine ulaşamadı. Siteniz veya API\'niz başka adreslerden gelen istekleri engelliyorsa $origin adresine izin verin. Yallapp belgelerindeki Kendi API\'nizi bağlayın rehberi nasıl yapılacağını gösterir.';
  }

  @override
  String get wordingBusiness => 'İşletme';

  @override
  String get wordingCustomer => 'Müşteri';

  @override
  String get wordingClinic => 'Klinik';

  @override
  String get wordingPatient => 'Hasta';

  @override
  String get clinicDoctor => 'Doktor';

  @override
  String get clinicOurDoctors => 'Doktorlarımız';

  @override
  String get clinicVisits => 'Ziyaretler';

  @override
  String get clinicVisit => 'Ziyaret';

  @override
  String get clinicBookVisit => 'Ziyaret randevusu al';

  @override
  String get clinicNextVisit => 'Sıradaki ziyaretiniz';

  @override
  String get clinicNoUpcomingVisits => 'Yaklaşan ziyaret yok';

  @override
  String get clinicNoUpcomingVisitsMessage =>
      'Bir ziyaret randevusu alın, burada görünür.';

  @override
  String get clinicNoPastVisits => 'Geçmiş ziyaret yok';

  @override
  String get clinicLoadingVisits => 'Ziyaretler yükleniyor';

  @override
  String get clinicLoadingVisit => 'Ziyaret yükleniyor';

  @override
  String get clinicCancelVisit => 'Ziyareti iptal et';

  @override
  String get clinicCancelVisitTitle => 'Bu ziyaret iptal edilsin mi?';

  @override
  String get clinicVisitCancelled => 'Ziyaretiniz iptal edildi.';

  @override
  String get clinicVisitBooked => 'Ziyaret randevunuz alındı.';

  @override
  String get clinicAnyDoctor => 'Herhangi bir doktor';

  @override
  String get clinicAnyDoctorAvailable => 'Müsait herhangi bir doktor';

  @override
  String get clinicNoteForClinic => 'Klinik için not (isteğe bağlı)';

  @override
  String get clinicConfirmVisit => 'Ziyaretinizi onaylayın';

  @override
  String get intakeTitle => 'Birkaç soru';

  @override
  String intakeIntro(String business) {
    return 'Randevu almadan önce bunları yanıtlayın. Yanıtlarınızı yalnızca siz ve $business görür.';
  }

  @override
  String get intakeOptional => 'İsteğe bağlı';

  @override
  String get intakeRequired => 'Lütfen bunu yanıtlayın.';

  @override
  String get intakeChooseOne => 'Lütfen birini seçin.';

  @override
  String intakeTooLong(int max) {
    return 'Lütfen en fazla $max karakter kullanın.';
  }

  @override
  String get intakeChooseDate => 'Bir tarih seçin';

  @override
  String get yourAnswers => 'Yanıtlarınız';

  @override
  String answersPrivate(String business) {
    return 'Bu yanıtları yalnızca siz ve $business görür.';
  }

  @override
  String get staffSpecialties => 'Uzmanlık alanları';

  @override
  String get staffLanguages => 'Diller';

  @override
  String staffAbout(String name) {
    return '$name hakkında';
  }

  @override
  String get staffViewProfile => 'Profili gör';

  @override
  String get tabLatest => 'En yeni';

  @override
  String get tabSaved => 'Kaydedilenler';

  @override
  String get newsTopStories => 'Öne çıkanlar';

  @override
  String get newsLatest => 'En yeni';

  @override
  String get newsAll => 'Tümü';

  @override
  String get newsSearchHint => 'Makalelerde ara';

  @override
  String get loadingArticles => 'Makaleler yükleniyor';

  @override
  String get noArticlesTitle => 'Henüz makale yok';

  @override
  String get noArticlesMessage => 'Yeni makaleler burada görünecek.';

  @override
  String get noArticlesFoundTitle => 'Makale bulunamadı';

  @override
  String get noArticlesFoundMessage =>
      'Başka kelimeler veya başka bir bölüm deneyin.';

  @override
  String get noSavedTitle => 'Kaydedilen makale yok';

  @override
  String get noSavedMessage =>
      'Bir makaleyi burada tutmak ve daha sonra, bağlantı olmadan da okumak için yer imine dokunun.';

  @override
  String get articleSave => 'Makaleyi kaydet';

  @override
  String get articleUnsave => 'Kaydedilenlerden çıkar';

  @override
  String get articleSavedMessage =>
      'Kaydedildi. Kaydedilenler\'de bulabilirsiniz.';

  @override
  String get articleShare => 'Paylaş';

  @override
  String articleBy(String author) {
    return 'Yazan: $author';
  }

  @override
  String get articleOpenOnSite => 'Web sitesinde oku';

  @override
  String get notifyBreakingNews => 'Son dakika haberleri';

  @override
  String get wordingRestaurant => 'Restoran';

  @override
  String get menuTitle => 'Menü';

  @override
  String get menuSearch => 'Menüde ara';

  @override
  String get menuBrowse => 'Menüye bak';

  @override
  String get menuEmptyTitle => 'Henüz yemek yok';

  @override
  String get menuEmptyMessage => 'Menü yakında burada olacak.';

  @override
  String get menuLoading => 'Menü yükleniyor';

  @override
  String get menuMore => 'Diğer';

  @override
  String get optionsRequired => 'Zorunlu';

  @override
  String get optionsOptional => 'İsteğe bağlı';

  @override
  String get optionsChooseOne => '1 tane seçin';

  @override
  String optionsChooseUpTo(int count) {
    return 'En fazla $count tane seçin';
  }

  @override
  String optionsChooseAtLeast(int count) {
    return 'En az $count tane seçin';
  }

  @override
  String optionsAddToCart(String price) {
    return 'Sepete ekle · $price';
  }

  @override
  String optionsMissing(String group) {
    return 'Seçin: $group';
  }

  @override
  String get optionsPriceNote => 'Son fiyat sepette onaylanır.';

  @override
  String get fulfilmentHow => 'Gel al veya teslimat';

  @override
  String get fulfilmentPickup => 'Gel al';

  @override
  String get fulfilmentDelivery => 'Teslimat';

  @override
  String fulfilmentPickupAt(String address) {
    return 'Teslim alma adresi: $address';
  }

  @override
  String get deliveryAddress => 'Teslimat adresi';

  @override
  String get deliveryAddressHint => 'Sokak, bina ve daire';

  @override
  String get deliveryDistrict => 'Semt';

  @override
  String get deliveryNotes => 'Kurye için not (isteğe bağlı)';

  @override
  String get deliveryFee => 'Teslimat ücreti';

  @override
  String deliveryMinimum(String amount) {
    return 'Teslimat için en az sipariş tutarı $amount.';
  }

  @override
  String get deliveryEnterAddress => 'Teslimat adresinizi girin.';

  @override
  String get orderTimeTitle => 'Ne zaman';

  @override
  String get orderAsap => 'En kısa sürede';

  @override
  String orderReadyIn(int minutes) {
    return 'Yaklaşık $minutes dakikada hazır';
  }

  @override
  String get orderLater => 'Daha sonraya planla';

  @override
  String get orderChooseTime => 'Bir saat seçin';

  @override
  String orderToday(String time) {
    return 'Bugün $time';
  }

  @override
  String orderTomorrow(String time) {
    return 'Yarın $time';
  }

  @override
  String closedNowOpensAt(String time) {
    return 'Şu an kapalı — $time açılıyor';
  }

  @override
  String get closedNow => 'Şu an kapalı';

  @override
  String get closedOrderLater => 'Daha sonrası için sipariş verebilirsiniz.';

  @override
  String get closedComeBack => 'Lütfen açık olduğumuzda sipariş verin.';

  @override
  String get fulfilmentReceived => 'Alındı';

  @override
  String get fulfilmentPreparing => 'Hazırlanıyor';

  @override
  String get fulfilmentReady => 'Hazır';

  @override
  String get fulfilmentReadyPickup => 'Teslim almaya hazır';

  @override
  String get fulfilmentOutForDelivery => 'Yolda';

  @override
  String get fulfilmentCompleted => 'Tamamlandı';

  @override
  String get fulfilmentCancelled => 'İptal edildi';

  @override
  String get orderCancelledMessage =>
      'Bu sipariş iptal edildi. Sorunuz varsa lütfen bizimle iletişime geçin.';

  @override
  String get orderPickupAsap => 'Gel al, en kısa sürede';

  @override
  String get orderDeliveryAsap => 'Teslimat, en kısa sürede';

  @override
  String orderPickupAt(String time) {
    return 'Gel al: $time';
  }

  @override
  String orderDeliveryAt(String time) {
    return 'Teslimat: $time';
  }

  @override
  String get orderUpdatesNote => 'Her adımda size bildirim göndereceğiz.';

  @override
  String get orderYourOrder => 'Siparişiniz';

  @override
  String get orderTotal => 'Toplam';

  @override
  String get loadingOrder => 'Siparişiniz yükleniyor';
}
