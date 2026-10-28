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
  String get sideMenuOpen => 'Menüyü aç';

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
  String get updateRecommendedTitle => 'Yeni bir sürüm hazır';

  @override
  String updateRecommendedMessage(String name) {
    return '$name uygulamasının daha yeni bir sürümü mağazada. Şimdi güncelleyin ya da devam edip daha sonra güncelleyin.';
  }

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
  String get deviceNoLimit =>
      'Bu hesabı istediğiniz kadar cihazda kullanabilirsiniz.';

  @override
  String devicesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count cihaz',
      one: '1 cihaz',
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
  String get courseLearn => 'Neler öğreneceksiniz';

  @override
  String get courseRequirements => 'Gereksinimler';

  @override
  String get courseAudience => 'Bu kurs kimler için';

  @override
  String get courseIncludes => 'Bu kursun içeriği';

  @override
  String studentCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count öğrenci',
      one: '1 öğrenci',
    );
    return '$_temp0';
  }

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
  String get back10Seconds => '10 saniye geri';

  @override
  String get forward10Seconds => '10 saniye ileri';

  @override
  String get captionsTurnOn => 'Altyazıları aç';

  @override
  String get captionsTurnOff => 'Altyazıları kapat';

  @override
  String get videoQuality => 'Video kalitesi';

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
  String get previewNoPlugin =>
      'WordPress sitenize Yallapp eklentisini kurun ve lisans anahtarınızı içinde etkinleştirin (WordPress menüsünde Yallapp), sonra önizlemeyi yeniden yükleyin.';

  @override
  String get previewBeingSetUp =>
      'Ekibimiz WordPress sitenizi kuruyor. Hazır olduğunda önizleme uygulamanızın içeriğini gösterir.';

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

  @override
  String get wordingGym => 'Spor salonu';

  @override
  String get wordingMember => 'Üye';

  @override
  String get fitnessCoach => 'Antrenör';

  @override
  String get fitnessOurCoaches => 'Antrenörlerimiz';

  @override
  String get fitnessAnyCoach => 'Fark etmez';

  @override
  String get fitnessAnyCoachAvailable => 'Müsait olan bir antrenör';

  @override
  String get classesTitle => 'Dersler';

  @override
  String get classesLoading => 'Dersler yükleniyor';

  @override
  String get classesNone => 'Bu gün ders yok';

  @override
  String get classesNoneMessage =>
      'Derslerini görmek için başka bir gün seçin.';

  @override
  String get classesNoTimetable => 'Henüz ders yok';

  @override
  String classesNoTimetableMessage(String business) {
    return '$business derslerini henüz uygulamaya eklemedi.';
  }

  @override
  String classSpotsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count yer kaldı',
      one: '1 yer kaldı',
    );
    return '$_temp0';
  }

  @override
  String get classFull => 'Dolu';

  @override
  String get classCancelledLabel => 'İptal edildi';

  @override
  String get classBookedLabel => 'Yeriniz ayrıldı';

  @override
  String get classBook => 'Yer ayırt';

  @override
  String get classCancel => 'İptal et';

  @override
  String classBookName(String name) {
    return '$name için yer ayırt';
  }

  @override
  String classCancelName(String name) {
    return '$name dersindeki yerinizi iptal edin';
  }

  @override
  String get classCancelTitle => 'Yerinizi bırakmak istiyor musunuz?';

  @override
  String classCancelMessage(String name, String when) {
    return '$when tarihindeki $name. Yerinizi başka biri alabilir.';
  }

  @override
  String get classKeepSpot => 'Yerimi koru';

  @override
  String classBooked(String name) {
    return '$name için yeriniz ayrıldı.';
  }

  @override
  String get classSpotCancelled => 'Yeriniz artık boş.';

  @override
  String classWith(String name) {
    return '$name ile';
  }

  @override
  String get classSignInToBook => 'Yer ayırtmak için giriş yapın.';

  @override
  String get membershipTitle => 'Üyelik';

  @override
  String get membershipLoading => 'Üyeliğiniz yükleniyor';

  @override
  String get membershipMine => 'Üyeliğim';

  @override
  String get membershipNone => 'Henüz üyeliğiniz yok';

  @override
  String get membershipNoneMessage => 'Ders ayırtmak için bir plan seçin.';

  @override
  String get membershipSignIn =>
      'Üyeliğinizi görmek ve plan almak için giriş yapın.';

  @override
  String get membershipUnlimited => 'Sınırsız ders';

  @override
  String membershipClassesLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ders kaldı',
      one: '1 ders kaldı',
    );
    return '$_temp0';
  }

  @override
  String membershipClasses(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ders',
      one: '1 ders',
    );
    return '$_temp0';
  }

  @override
  String membershipUntil(String date) {
    return '$date tarihine kadar';
  }

  @override
  String get membershipNoEnd => 'Bitiş tarihi yok';

  @override
  String get membershipEnded => 'Sona erdi';

  @override
  String get membershipCancelled => 'İptal edildi';

  @override
  String get membershipActive => 'Aktif';

  @override
  String get membershipPlans => 'Planlar';

  @override
  String get membershipNoPlans =>
      'Planlar şu anda uygulamada satışta değil. Geldiğinizde bize sorun.';

  @override
  String get membershipBuy => 'Satın al';

  @override
  String membershipBuyName(String name) {
    return '$name satın al';
  }

  @override
  String get membershipPerMonth => 'aylık';

  @override
  String get membershipPerQuarter => '3 ayda bir';

  @override
  String get membershipPerYear => 'yıllık';

  @override
  String get membershipPack => 'ders paketi';

  @override
  String get membershipBought => 'Üyeliğiniz aktif.';

  @override
  String get membershipSeePlans => 'Planları gör';

  @override
  String get classGiveBack => 'Yerimi bırak';

  @override
  String get tabEvents => 'Etkinlikler';

  @override
  String get tabTickets => 'Biletlerim';

  @override
  String get eventsSearchHint => 'Etkinlik ara';

  @override
  String get eventsAll => 'Tümü';

  @override
  String get eventsListView => 'Liste';

  @override
  String get eventsCalendarView => 'Takvim';

  @override
  String get loadingEvents => 'Etkinlikler yükleniyor';

  @override
  String get noEventsTitle => 'Henüz etkinlik yok';

  @override
  String get noEventsMessage => 'Yeni etkinlikler burada görünecek.';

  @override
  String get noEventsFoundTitle => 'Etkinlik bulunamadı';

  @override
  String get noEventsFoundMessage =>
      'Başka kelimeler ya da başka bir kategori deneyin.';

  @override
  String get noEventsOnDay => 'Bu gün etkinlik yok.';

  @override
  String get eventsPreviousMonth => 'Önceki ay';

  @override
  String get eventsNextMonth => 'Sonraki ay';

  @override
  String eventsOnDay(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count etkinlik',
      one: '1 etkinlik',
    );
    return '$_temp0';
  }

  @override
  String get eventOnline => 'Çevrim içi';

  @override
  String get eventSoldOut => 'Tükendi';

  @override
  String get eventCancelledBadge => 'İptal edildi';

  @override
  String get eventEndedBadge => 'Sona erdi';

  @override
  String eventSpotsLeft(int count) {
    return '$count kaldı';
  }

  @override
  String get eventCancelledMessage => 'Bu etkinlik iptal edildi.';

  @override
  String get eventEndedMessage => 'Bu etkinlik sona erdi.';

  @override
  String get eventAddToCalendar => 'Takvime ekle';

  @override
  String get eventShare => 'Paylaş';

  @override
  String get eventJoinOnline => 'Çevrim içi katıl';

  @override
  String get eventOnlineNote => 'Katılma bağlantısı biletinizde.';

  @override
  String eventOrganiser(String name) {
    return 'Düzenleyen: $name';
  }

  @override
  String get eventTicketsTitle => 'Biletler';

  @override
  String get eventNoTickets => 'Biletler henüz satışta değil.';

  @override
  String get eventGetTickets => 'Bilet al';

  @override
  String get eventBuyTickets => 'Bilet satın al';

  @override
  String get eventSalesEnded => 'Satış sona erdi';

  @override
  String eventSalesEnd(String date) {
    return 'Satış $date tarihinde bitiyor';
  }

  @override
  String get eventNotInApp => 'Uygulamada satılmıyor';

  @override
  String eventYourTickets(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count biletiniz var',
      one: '1 biletiniz var',
    );
    return '$_temp0';
  }

  @override
  String get eventSeeTickets => 'Biletlerimi gör';

  @override
  String get eventSeeEvent => 'Etkinliği gör';

  @override
  String get ticketsHowMany => 'Kaç bilet';

  @override
  String get ticketsNamesTitle => 'Her biletteki isim';

  @override
  String ticketNameLabel(int number) {
    return '$number. bilet';
  }

  @override
  String ticketsGetFree(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ücretsiz bilet al',
      one: '1 ücretsiz bilet al',
    );
    return '$_temp0';
  }

  @override
  String get ticketsContinueToPayment => 'Ödemeye geç';

  @override
  String get ticketsIssuedMessage => 'Tamam. Biletleriniz Biletlerim\'de.';

  @override
  String get ticketsPaidMessage => 'Ödeme alındı. Biletleriniz Biletlerim\'de.';

  @override
  String get ticketsSignInTitle => 'Biletleriniz burada';

  @override
  String get ticketsSignInMessage =>
      'Biletlerinizi görmek ve girişte göstermek için oturum açın.';

  @override
  String get noTicketsTitle => 'Henüz biletiniz yok';

  @override
  String get noTicketsMessage =>
      'Aldığınız biletler girişte göstereceğiniz QR koduyla burada görünür.';

  @override
  String get ticketsOfflineNote =>
      'Çevrim dışısınız: bunlar bu telefonda kayıtlı biletler.';

  @override
  String get ticketStatusValid => 'Geçerli';

  @override
  String get ticketStatusUsed => 'Kullanıldı';

  @override
  String get ticketStatusCancelled => 'İptal edildi';

  @override
  String get ticketStatusRefunded => 'İade edildi';

  @override
  String refundedAmount(String amount) {
    return '$amount iade edildi';
  }

  @override
  String ticketUsedAt(String time) {
    return 'Giriş yapıldı: $time';
  }

  @override
  String get ticketShowAtDoor => 'Bu kodu girişte gösterin';

  @override
  String get ticketCancel => 'Bileti iptal et';

  @override
  String get ticketCancelTitle => 'Bu bilet iptal edilsin mi?';

  @override
  String get ticketCancelMessage =>
      'Yeriniz yeniden satışa çıkar. Bu geri alınamaz.';

  @override
  String get ticketCancelledMessage => 'Bilet iptal edildi.';

  @override
  String ticketQrLabel(String name) {
    return '$name adına biletin QR kodu';
  }

  @override
  String get tabCampaigns => 'Kampanyalar';

  @override
  String get tabMyDonations => 'Bağışlarım';

  @override
  String get loadingCampaigns => 'Kampanyalar yükleniyor';

  @override
  String get noCampaignsTitle => 'Henüz kampanya yok';

  @override
  String get noCampaignsMessage => 'Kampanyalar burada görünecek.';

  @override
  String campaignRaisedOf(String raised, String goal) {
    return '$raised toplandı · Hedef $goal';
  }

  @override
  String campaignRaised(String raised) {
    return '$raised toplandı';
  }

  @override
  String campaignDonors(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count bağışçı',
      one: '1 bağışçı',
      zero: 'Henüz bağışçı yok',
    );
    return '$_temp0';
  }

  @override
  String get campaignGoalReached => 'Hedefe ulaşıldı';

  @override
  String get campaignEnded => 'Sona erdi';

  @override
  String campaignEndsOn(String date) {
    return 'Bitiş: $date';
  }

  @override
  String get donateTitle => 'Bağış yap';

  @override
  String get donateChooseAmount => 'Bir tutar seçin';

  @override
  String get donateOtherAmount => 'Başka bir tutar';

  @override
  String donateMinimum(String amount) {
    return 'En düşük bağış $amount.';
  }

  @override
  String get donateAmountInvalid => '250 gibi bir tutar girin.';

  @override
  String get donateChooseOne => 'Tutarlardan birini seçin.';

  @override
  String get donateOnce => 'Bir kez';

  @override
  String get donateMonthly => 'Her ay';

  @override
  String get donateAnonymous => 'İsimsiz bağış yap';

  @override
  String get donateAnonymousHint => 'Adınız kampanyada görünmez.';

  @override
  String get donateMessage => 'Mesaj (isteğe bağlı)';

  @override
  String get donateMessageHint => 'Bağışınızla birlikte görünecek birkaç söz';

  @override
  String donateButton(String amount) {
    return '$amount bağışla';
  }

  @override
  String get donateOnWebsite => 'Web sitemizde bağış yapın';

  @override
  String get donateOnWebsiteNote =>
      'Bağışınız tarayıcınızda, web sitemizde yapılır. İşiniz bitince uygulamaya dönün.';

  @override
  String get donateClosed =>
      'Bu kampanya sona erdi. Desteğiniz için teşekkürler.';

  @override
  String get donateThanks => 'Bağışınız için teşekkürler!';

  @override
  String get donateFailed => 'Bağış sayfası açılamadı. Lütfen tekrar deneyin.';

  @override
  String get donateSignInHint =>
      'Bağışlarınızı ve makbuzlarınızı uygulamada görmek için önce giriş yapın.';

  @override
  String get recentDonations => 'Son bağışlar';

  @override
  String get anonymousDonor => 'İsimsiz';

  @override
  String get loadingDonations => 'Bağışlar yükleniyor';

  @override
  String get myDonationsSignInTitle => 'Bağışlarınız';

  @override
  String get myDonationsSignInMessage =>
      'Bağışlarınızı ve makbuzlarını görmek için giriş yapın.';

  @override
  String get noDonationsTitle => 'Henüz bağış yok';

  @override
  String get noDonationsMessage =>
      'Giriş yapmışken yaptığınız bağışlar makbuzlarıyla birlikte burada görünür.';

  @override
  String get donationReceipt => 'Makbuz';

  @override
  String get downloadReceipt => 'Makbuzu indir';

  @override
  String get shipmentTitle => 'Gönderi';

  @override
  String shippedOnDate(String date) {
    return 'Kargoya verildi: $date';
  }

  @override
  String trackingNumberLine(String number) {
    return 'Takip numarası: $number';
  }

  @override
  String get copyTrackingNumber => 'Takip numarasını kopyala';

  @override
  String get trackingNumberCopied => 'Takip numarası kopyalandı.';

  @override
  String get trackShipment => 'Gönderiyi takip et';

  @override
  String waybillLine(String waybill) {
    return 'İrsaliye: $waybill';
  }

  @override
  String get openWaybill => 'İrsaliyeyi aç';

  @override
  String get donationSeeCampaign => 'Kampanyayı gör';

  @override
  String get notifyCampaignUpdates => 'Kampanya haberleri';

  @override
  String get pageOpenNow => 'Şu an açık';

  @override
  String get pageClosedDay => 'Kapalı';

  @override
  String get pageToday => 'Bugün';

  @override
  String get pageDirections => 'Yol tarifi';

  @override
  String get pageWebsite => 'Web sitesi';

  @override
  String get countdownDays => 'Gün';

  @override
  String get countdownHours => 'Saat';

  @override
  String get countdownMinutes => 'Dk';

  @override
  String get countdownSeconds => 'Sn';

  @override
  String get socialWhatsappChannel => 'WhatsApp kanalı';

  @override
  String ratingOutOfFive(int count) {
    return '5 üzerinden $count yıldız';
  }

  @override
  String slideOf(int index, int count) {
    return 'Slayt $index/$count';
  }

  @override
  String get privacyGroup => 'Gizlilik';

  @override
  String get shareUsageStatistics => 'Kullanım istatistiklerini paylaş';

  @override
  String shareUsageNote(String app) {
    return '$app, uygulamanın nasıl kullanıldığını, örneğin hangi ekranların ve öğelerin açıldığını görür. Adınız, telefon numaranız ve e-posta adresiniz asla gönderilmez.';
  }

  @override
  String get shareLink => 'Paylaş';

  @override
  String get sendCrashReports => 'Hata raporlarını gönder';

  @override
  String get sendCrashReportsHint =>
      'Bir sorun olduğunda uygulama, düzeltilebilmesi için ne olduğunu, sürümünü ve telefon türünü gönderir. Adınızı, numaranızı veya yazdıklarınızı asla göndermez.';

  @override
  String get downloadNeedsInternetVideo =>
      'Bu dersin videosu bir video sitesinden oynatılıyor, bu yüzden internet gerekiyor. Çevrimdışı izlemek için kaydedilemez.';

  @override
  String get downloadNeedsInternetPage =>
      'Bu ders bir web sayfası gösteriyor, bu yüzden internet gerekiyor. Çevrimdışı izlemek için kaydedilemez.';

  @override
  String get downloadsOff =>
      'Dersleri çevrimdışı izlemek için kaydetmek bu uygulamada yok.';

  @override
  String get downloadNotAvailable =>
      'Bu ders çevrimdışı izlemek için kaydedilemez.';

  @override
  String get downloadFailed => 'İndirme tamamlanmadı. Tekrar deneyin.';

  @override
  String get downloadWaitsForConnection => 'Bağlantı bekleniyor.';

  @override
  String downloadsSkipped(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count ders kaydedilmedi: videoları bir video sitesinden oynatılıyor, bu yüzden internet gerekiyor.',
      one: '1 ders kaydedilmedi: videosu bir video sitesinden oynatılıyor, bu yüzden internet gerekiyor.',
    );
    return '$_temp0';
  }

  @override
  String downloadsExpired(int days) {
    return 'Kaydettiğiniz dersler silindi: uygulama $days gün boyunca erişiminizi kontrol edemedi. İnternete bağlanıp yeniden kaydedin.';
  }

  @override
  String get downloadsTurnedOff =>
      'Kaydettiğiniz dersler silindi: ders kaydetme artık bu uygulamada yok.';

  @override
  String downloadsAccessEnded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Erişiminiz sona erdiği için kaydedilen $count ders silindi.',
      one: 'Erişiminiz sona erdiği için kaydedilen 1 ders silindi.',
    );
    return '$_temp0';
  }

  @override
  String get downloadsNotificationRunning => 'Çevrimdışı için kaydediliyor';

  @override
  String get downloadsNotificationPaused => 'İndirme duraklatıldı';

  @override
  String get downloadsNotificationDone => 'Çevrimdışı için kaydedildi';

  @override
  String get downloadsNotificationDoneBody =>
      'Dersleriniz internetsiz izlemeye hazır.';

  @override
  String get downloadsNotificationFailed => 'İndirme başarısız oldu';

  @override
  String get downloads => 'İndirilenler';

  @override
  String get downloadLesson => 'Çevrimdışı için kaydet';

  @override
  String get downloadCourse => 'Kursu çevrimdışı için kaydet';

  @override
  String downloadSaving(int saved, int total) {
    return 'Çevrimdışı için kaydediliyor · $saved/$total';
  }

  @override
  String downloadSavingLesson(int percent) {
    return 'Çevrimdışı için kaydediliyor · %$percent';
  }

  @override
  String get downloadSaved => 'Çevrimdışı için kaydedildi';

  @override
  String downloadCourseSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ders çevrimdışı için kaydedildi',
      one: '1 ders çevrimdışı için kaydedildi',
    );
    return '$_temp0';
  }

  @override
  String get downloadQueued => 'İndirmeyi bekliyor';

  @override
  String get downloadPaused => 'Duraklatıldı';

  @override
  String get downloadPause => 'Duraklat';

  @override
  String get downloadResume => 'Sürdür';

  @override
  String get downloadRetry => 'Tekrar dene';

  @override
  String get downloadCancel => 'İndirmeyi iptal et';

  @override
  String get downloadDelete => 'Bu telefondan sil';

  @override
  String get downloadsDeleteAll => 'Tüm indirilenleri sil';

  @override
  String get downloadsDeleteAllConfirm =>
      'Kaydedilen tüm dersler bu telefondan silinsin mi? Bağlantınız varken yeniden kaydedebilirsiniz.';

  @override
  String get downloadsDeleteCourseConfirm =>
      'Bu kursun kaydedilen dersleri bu telefondan silinsin mi?';

  @override
  String get delete => 'Sil';

  @override
  String get downloadsStorage => 'Kullanılan alan';

  @override
  String get downloadsWifiOnly => 'Yalnızca Wi-Fi ile indir';

  @override
  String get downloadsWifiOnlyHint =>
      'Mobil verinizi korur: indirmeler Wi-Fi\'ye bağlanana kadar bekler.';

  @override
  String get downloadsEmptyTitle => 'Henüz indirilen yok';

  @override
  String get downloadsEmptyMessage =>
      'Bir dersi ya da kursun tamamını internetsiz izlemek ve okumak için kaydedin: kursta ya da derste Çevrimdışı için kaydet\'e dokunun.';

  @override
  String downloadsNote(int days) {
    return 'Kaydedilen dersler bu uygulamanın içinde şifreli tutulur, galerinizde ya da dosyalarınızda asla görünmez. Kursa erişiminiz sona erdiğinde ya da $days gün bağlantı olmadan geçtiğinde silinir.';
  }

  @override
  String downloadsKeptFor(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Bağlantı olmadan $days gün daha saklanır',
      one: 'Bağlantı olmadan 1 gün daha saklanır',
    );
    return '$_temp0';
  }

  @override
  String get downloadsUnsupported =>
      'İndirmeler telefonunuzdaki uygulamada çalışır.';

  @override
  String get downloadStarted =>
      'Çevrimdışı için kaydediliyor. Uygulamayı kullanmaya devam edebilirsiniz.';

  @override
  String downloadCourseStarted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ders çevrimdışı için kaydediliyor.',
      one: '1 ders çevrimdışı için kaydediliyor.',
      zero: 'Açabildiğiniz tüm dersler zaten kaydedildi.',
    );
    return '$_temp0';
  }

  @override
  String downloadCourseSize(String lessons, String size) {
    return '$lessons · $size';
  }

  @override
  String sizeGigabytes(String size) {
    return '$size GB';
  }

  @override
  String get lessonCompleteOffline =>
      'Tamamlandı olarak işaretlendi. Tekrar çevrimiçi olduğunuzda gönderilecek.';

  @override
  String get reviewCourse => 'Kursu gözden geçir';

  @override
  String courseCompletedOn(String date) {
    return '$date tarihinde tamamlandı';
  }

  @override
  String get courseCompletedTitle => 'Bu kursu tamamladınız';

  @override
  String get viewCertificate => 'Sertifikayı görüntüle';

  @override
  String get startCourseAgain => 'Kursa yeniden başla';

  @override
  String get startCourseAgainTitle => 'Kursa yeniden başlansın mı?';

  @override
  String get startCourseAgainMessage =>
      'Bu kurstaki ilerlemeniz silinir: tamamladığınız dersler ve her videonun kaldığı yer. Kursa kayıtlı kalırsınız ve ilk dersten başlarsınız.';

  @override
  String get startCourseAgainConfirm => 'Yeniden başla';

  @override
  String completedCourseLabel(String title) {
    return '$title, tamamlandı';
  }

  @override
  String get screenProtected =>
      'Bu içerik korunuyor. Ekran kaydedilirken veya paylaşılırken gizlenir.';

  @override
  String get screenshotProtected =>
      'Bu içerik korunuyor: ekran görüntüsü alınamaz.';

  @override
  String get fileOpenFailed => 'Bu dosya açılamadı.';

  @override
  String get fileInAppOnly => 'Bu dosya burada gösterilemiyor';

  @override
  String get fileInAppOnlyMessage =>
      'Kurs dosyaları yalnızca uygulamanın içinde açılır; uygulama PDF, resim ve metin dosyalarını gösterir. Bu dosyayı eğitmeninizden PDF olarak isteyin.';

  @override
  String pageOf(int page, int total) {
    return 'Sayfa $page / $total';
  }

  @override
  String get coursePasswordTitle => 'Bu kursun bir şifresi var';

  @override
  String get coursePasswordWebsite =>
      'Şifresini web sitesinde girin. Kursa orada katıldığınızda burada da açılır.';

  @override
  String get coursePasswordInApp => 'Uygulamada açılamaz.';

  @override
  String get courseOpenOnWebsite => 'Web sitesinde aç';

  @override
  String get membershipShowAtDoor => 'Girişte bunu gösterin';

  @override
  String membershipQrLabel(String plan) {
    return '$plan üyeliğinizin QR kodu';
  }

  @override
  String get reviewReplyTitle => 'Akademinin yanıtı';

  @override
  String get reviewHiddenNote =>
      'Akademi gizledi. Yalnızca siz görebilirsiniz.';

  @override
  String get qnaHiddenNote =>
      'Akademi bunu gizledi. Yalnızca siz görebilirsiniz.';

  @override
  String get membershipFrozen => 'Donduruldu';

  @override
  String membershipFrozenUntil(String date) {
    return '$date tarihine kadar donduruldu';
  }

  @override
  String get membershipFrozenOpen => 'Dondurma kaldırılana kadar donduruldu';

  @override
  String membershipFreezesOn(String date) {
    return '$date tarihinden itibaren dondurulacak';
  }

  @override
  String get membershipFrozenAtDoor =>
      'Üyeliğiniz donduruldu; geri gelene kadar bu kodla giriş yapamazsınız.';

  @override
  String get tabChat => 'Sohbet';

  @override
  String get chatTitle => 'Sohbet';

  @override
  String get chatLoading => 'Sohbetler yükleniyor';

  @override
  String get chatEmptyTitle => 'Henüz sohbet yok';

  @override
  String get chatEmptyMessage => 'Sohbetleriniz burada görünür.';

  @override
  String chatSignInTitle(String business) {
    return '$business ile sohbet edin';
  }

  @override
  String get chatSignInMessage =>
      'Mesaj göndermek ve yanıtları burada almak için giriş yapın.';

  @override
  String get chatStart => 'Mesaj gönderin';

  @override
  String get chatCourseGroup => 'Kurs grubu';

  @override
  String chatMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count üye',
      one: '1 üye',
    );
    return '$_temp0';
  }

  @override
  String get chatNoMessagesTitle => 'Merhaba deyin';

  @override
  String get chatNoMessagesMessage =>
      'Gönderdiğiniz ve aldığınız mesajlar burada görünür.';

  @override
  String get chatLoadingMessages => 'Mesajlar yükleniyor';

  @override
  String get chatOlder => 'Önceki mesajları göster';

  @override
  String get chatAttach => 'Ekle';

  @override
  String get chatGallery => 'Fotoğraf veya video';

  @override
  String get chatTakePhoto => 'Fotoğraf çek';

  @override
  String get chatRecordVideo => 'Video çek';

  @override
  String get chatChooseFile => 'Dosya';

  @override
  String get chatPhoto => 'Fotoğraf';

  @override
  String get chatVideo => 'Video';

  @override
  String get chatVoice => 'Sesli mesaj';

  @override
  String get chatFile => 'Dosya';

  @override
  String get chatRecord => 'Sesli mesaj kaydet';

  @override
  String chatRecording(String time) {
    return 'Kaydediliyor $time';
  }

  @override
  String get chatStopAndSend => 'Sesli mesajı gönder';

  @override
  String get chatMicDenied =>
      'Sesli mesaj kaydetmek için telefonunuzun ayarlarından mikrofona izin verin.';

  @override
  String get chatSending => 'Gönderiliyor';

  @override
  String chatUploading(int percent) {
    return 'Gönderiliyor %$percent';
  }

  @override
  String get chatNotSent => 'Gönderilmedi. Yeniden denemek için dokunun.';

  @override
  String get chatDeleted => 'Bu mesaj silindi.';

  @override
  String get chatDeleteMessage => 'Mesajı sil';

  @override
  String get chatDeleteConfirm => 'Bu mesaj herkes için silinsin mi?';

  @override
  String get chatReport => 'Bildir';

  @override
  String get chatReportTitle => 'Bu mesajı neden bildiriyorsunuz?';

  @override
  String get chatReportSpam => 'Spam';

  @override
  String get chatReportAbuse => 'Taciz veya hakaret';

  @override
  String get chatReportInappropriate => 'Uygunsuz içerik';

  @override
  String get chatReportOther => 'Başka bir sebep';

  @override
  String chatReported(String business) {
    return 'Teşekkürler. $business bunu inceleyecek.';
  }

  @override
  String get chatMembers => 'Üyeler';

  @override
  String get chatBlock => 'Engelle';

  @override
  String get chatUnblock => 'Engeli kaldır';

  @override
  String chatBlockTitle(String name) {
    return '$name engellensin mi?';
  }

  @override
  String chatBlockMessage(String name) {
    return '$name kişisinin mesajlarını hiçbir grupta görmeyeceksiniz. Kendisine bildirilmez.';
  }

  @override
  String get chatBlocked => 'Engellendi';

  @override
  String get chatCantSend =>
      'Bu sohbeti okuyabilirsiniz ancak mesaj gönderemezsiniz.';

  @override
  String get chatTooBig => 'Bu dosya göndermek için çok büyük.';

  @override
  String get chatStorageFull =>
      'Şu anda dosya gönderilemiyor. Yine de metin gönderebilirsiniz.';

  @override
  String get chatFileType =>
      'Bu tür bir dosya gönderilemez. Fotoğraf, video ya da PDF, Word, Excel, PowerPoint veya metin dosyası gönderin.';

  @override
  String get chatUnavailable => 'Sohbet şu anda kullanılamıyor.';

  @override
  String get chatPlayVoice => 'Sesli mesajı oynat';

  @override
  String get chatPauseVoice => 'Sesli mesajı duraklat';

  @override
  String chatOpenFile(String name) {
    return '$name dosyasını aç';
  }

  @override
  String chatMessageFrom(String name, String text) {
    return '$name: $text';
  }

  @override
  String get chatMore => 'Daha fazla';

  @override
  String chatBlockPerson(String name) {
    return '$name kişisini engelle';
  }

  @override
  String opensOn(String date) {
    return '$date tarihinde açılır';
  }

  @override
  String accessUntil(String date) {
    return '$date tarihine kadar erişim';
  }

  @override
  String get siteMemberships => 'Üyeliklerim';

  @override
  String get siteMembershipsNoneTitle => 'Üyelik yok';

  @override
  String get siteMembershipsNoneMessage =>
      'Web sitemizdeki üyelikleriniz ve abonelikleriniz burada görünür.';

  @override
  String get siteMembershipsManaged => 'Üyelikler web sitemizden yönetilir.';

  @override
  String get siteMembershipActive => 'Etkin';

  @override
  String get siteMembershipOnHold => 'Beklemede';

  @override
  String get siteMembershipCancelled => 'İptal edildi';

  @override
  String siteMembershipRenews(String date) {
    return '$date tarihinde yenilenir';
  }

  @override
  String siteMembershipEnds(String date) {
    return '$date tarihinde sona erer';
  }

  @override
  String siteMembershipCourses(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count kurs',
      one: '1 kurs',
    );
    return '$_temp0';
  }

  @override
  String get courseMembershipTitle => 'Üyelere özel';

  @override
  String courseMembershipPlans(String plans) {
    return 'Bu kurs web sitemizdeki bir üyelikle birlikte gelir: $plans.';
  }

  @override
  String get courseMembershipAny =>
      'Bu kurs web sitemizdeki bir üyelikle birlikte gelir.';

  @override
  String get courseMembershipWebsite => 'Üyelikleri web sitesinde gör';

  @override
  String get couponHave => 'Kuponunuz mu var?';

  @override
  String get couponCode => 'Kupon kodu';

  @override
  String get couponApply => 'Uygula';

  @override
  String get couponRemove => 'Kuponu kaldır';

  @override
  String couponApplied(String code) {
    return '$code uygulandı';
  }

  @override
  String couponAtCheckout(String code) {
    return '$code ödeme adımında uygulanır.';
  }

  @override
  String couponNotApplied(String code) {
    return '$code geçerli değil.';
  }

  @override
  String get cartDiscount => 'İndirim';

  @override
  String get cartShipping => 'Kargo';

  @override
  String get cartTaxes => 'Vergiler';

  @override
  String get cartTotal => 'Toplam';

  @override
  String get plusShippingAtCheckout =>
      'Kargo ve vergiler ödeme adımında eklenir.';

  @override
  String get notifyOrderUpdates => 'Sipariş güncellemeleri';

  @override
  String get requestReturn => 'Bu siparişi iade et';

  @override
  String get returnReasonTitle => 'Neden iade ediyorsunuz?';

  @override
  String get returnReasonDamaged => 'Hasarlı geldi';

  @override
  String get returnReasonWrongItem => 'Yanlış ürün';

  @override
  String get returnReasonNotAsDescribed => 'Açıklandığı gibi değil';

  @override
  String get returnReasonNoLongerNeeded => 'Artık ihtiyacım yok';

  @override
  String get returnReasonOther => 'Başka bir neden';

  @override
  String get returnNote => 'Mağazaya not (isteğe bağlı)';

  @override
  String get returnNoteRequired => 'Mağazaya nedenini yazın';

  @override
  String get sendReturnRequest => 'Talebi gönder';

  @override
  String get returnRequested =>
      'İade talebi gönderildi. Mağaza buradan yanıtlayacak.';

  @override
  String get returnStatusRequested => 'İade talep edildi';

  @override
  String get returnStatusApproved => 'İade onaylandı';

  @override
  String get returnStatusDeclined => 'İade reddedildi';

  @override
  String returnShopReply(String reply) {
    return 'Mağaza: $reply';
  }

  @override
  String get myPoints => 'Puanlarım';

  @override
  String pointsBalance(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count puan',
      one: '1 puan',
    );
    return '$_temp0';
  }

  @override
  String pointsWorth(String value) {
    return 'Sonraki siparişlerinizde $value değerinde';
  }

  @override
  String pointsRule(String spend, String value) {
    return 'Ürünlere harcadığınız her $spend için 1 puan kazanın. Her puan $value değerindedir.';
  }

  @override
  String cartPointsFrom(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count puanınız olduğunda kullanın.',
      one: '1 puanınız olduğunda kullanın.',
    );
    return '$_temp0';
  }

  @override
  String cartUsePoints(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count puan kullan',
      one: '1 puan kullan',
    );
    return '$_temp0';
  }

  @override
  String cartPointsWorth(String value) {
    return 'Bu siparişten $value indirim';
  }

  @override
  String get cartPointsDiscount => 'Puanlar';

  @override
  String get pointsHistory => 'Geçmiş';

  @override
  String get pointsReasonEarned => 'Kazanıldı';

  @override
  String get pointsReasonUsed => 'Kullanıldı';

  @override
  String get pointsReasonGivenBack => 'İade edildi';

  @override
  String get pointsReasonTakenBack => 'Geri alındı';

  @override
  String get noPointsYet =>
      'Henüz puanınız yok. Siparişleriniz tamamlandığında puan kazanırsınız.';

  @override
  String orderPointsUsed(int count, String amount) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count puan kullanıldı: −$amount',
      one: '1 puan kullanıldı: −$amount',
    );
    return '$_temp0';
  }

  @override
  String orderPointsEarned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count puan kazanıldı',
      one: '1 puan kazanıldı',
    );
    return '$_temp0';
  }

  @override
  String cartTaxIncluded(String amount, String tax) {
    return '$amount $tax dahil';
  }

  @override
  String payOutsideDue(String total, String date, String number) {
    return '$total tutarını $date tarihine kadar aşağıdaki gibi ödeyin ve ödemenizle birlikte $number sipariş numarasını belirtin. Mağaza, ödeme ulaştığında siparişinizi onaylar.';
  }

  @override
  String get pageFormSent => 'Gönderildi. Teşekkürler.';

  @override
  String get pageFormSignIn => 'Göndermek için giriş yapın';

  @override
  String get pageFormRequired => 'Bu alan zorunludur';

  @override
  String get pageFormInvalidEmail => 'Geçerli bir e-posta girin';

  @override
  String get pageFormInvalidPhone => 'Geçerli bir telefon numarası girin';

  @override
  String get pageFormInvalidNumber => 'Bir sayı girin';

  @override
  String get pageFormChooseOne => 'Birini seçin';

  @override
  String storePricePerMonth(String price) {
    return 'Aylık $price';
  }

  @override
  String storePricePerYear(String price) {
    return 'Yıllık $price';
  }

  @override
  String get storeSubscribe => 'Abone ol';

  @override
  String get storeMembershipSubscribe =>
      'Bu kursu açmak için bir üyeliğe abone olun.';

  @override
  String storeSubscriptionTerms(String store) {
    return 'Ödeme, satın almayı onayladığınızda $store hesabınızdan alınır. Abonelik, siz iptal edene kadar her dönem aynı fiyatla otomatik olarak yenilenir. Aboneliğinizi $store hesap ayarlarınızdan yönetebilir veya iptal edebilirsiniz.';
  }

  @override
  String get storeManageSubscription => 'Aboneliği yönet';

  @override
  String get storeRestorePurchases => 'Satın alımları geri yükle';

  @override
  String get storePurchasesGroup => 'Satın alımlar';

  @override
  String get storeRestored => 'Satın alımlarınız geri yüklendi.';

  @override
  String get storeRestoredNone =>
      'Bu hesap için geri yüklenecek satın alım yok.';

  @override
  String get storePending =>
      'Ödeme bekleniyor. Ödeme tamamlandığında erişiminiz açılır.';

  @override
  String get storeMembershipActive => 'Üyeliğiniz etkin.';

  @override
  String get storeRetryLater =>
      'Satın alımınız gerçekleşti. Şu anda onaylanamadı; otomatik olarak yeniden deneyeceğiz.';

  @override
  String get storeInvalidReceipt =>
      'Bu satın alım kullanılamadı. Ücret alındıysa bizimle iletişime geçin.';

  @override
  String get storePurchaseInUse =>
      'Bu satın alım bu uygulamadaki başka bir hesaba ait. Kullanmak için o hesapla giriş yapın.';

  @override
  String get storePurchaseEnded =>
      'Bu satın alımın süresi doldu veya iadesi yapıldı.';

  @override
  String get storePurchaseFailed => 'Satın alma tamamlanamadı. Tekrar deneyin.';

  @override
  String get storeUnavailable =>
      'Satın alma şu anda bu cihazda kullanılamıyor.';

  @override
  String get headerSearch => 'Ara';

  @override
  String get tabSend => 'Gönder';

  @override
  String get tabShipments => 'Gönderilerim';

  @override
  String get tabCourier => 'Kurye';

  @override
  String get sendTitle => 'Paket gönder';

  @override
  String get sendService => 'Hizmet';

  @override
  String get sendPickup => 'Alış';

  @override
  String get sendDropoff => 'Teslim';

  @override
  String get placeAddress => 'Adres';

  @override
  String get placeDetails => 'Bina, kat, tarif (isteğe bağlı)';

  @override
  String get placeUseMyLocation => 'Konumum';

  @override
  String get placePasteLink => 'Harita bağlantısı yapıştır';

  @override
  String get placeOnMap => 'Haritada';

  @override
  String get placeLocated => 'Konum belirlendi';

  @override
  String get placeNotLocated => 'Henüz konum yok (isteğe bağlı)';

  @override
  String get placeLocationNeeded =>
      'Bu yeri konumunuzla, bir harita bağlantısıyla veya haritada belirleyin: fiyat mesafeye göre.';

  @override
  String get placeRemoveLocation => 'Kaldır';

  @override
  String get pasteLinkTitle => 'Harita bağlantısını yapıştırın';

  @override
  String get pasteLinkHint =>
      'Bir Google Haritalar veya Apple Haritalar bağlantısı ya da WhatsApp\'ta paylaşılan bir konum';

  @override
  String get pasteLinkUse => 'Bu yeri kullan';

  @override
  String get pasteLinkFailed => 'Bu bağlantıda bir yer bulamadık.';

  @override
  String get locateOff => 'Telefonunuzun ayarlarından konumu açın.';

  @override
  String get locateDenied =>
      'Telefonunuzun ayarlarından uygulamanın konumunuzu kullanmasına izin verin.';

  @override
  String get locateFailed =>
      'Nerede olduğunuzu bulamadık. Yeniden deneyin veya yeri haritada belirleyin.';

  @override
  String get mapPickTitle => 'Haritayı yere kaydırın';

  @override
  String get mapPickConfirm => 'Bu yeri kullan';

  @override
  String get sendZone => 'Bölge';

  @override
  String get sendRecipient => 'Alıcı';

  @override
  String get recipientName => 'Ad';

  @override
  String get recipientPhone => 'Cep numarası';

  @override
  String get sendParcelSection => 'Paket';

  @override
  String get parcelSmall => 'Küçük';

  @override
  String get parcelMedium => 'Orta';

  @override
  String get parcelLarge => 'Büyük';

  @override
  String get parcelDescription => 'İçinde ne var (isteğe bağlı)';

  @override
  String get sendNotes => 'Kurye için notlar (isteğe bağlı)';

  @override
  String get sendPayment => 'Ödeme';

  @override
  String get payCash => 'Kuryeye nakit';

  @override
  String get payCard => 'Kart';

  @override
  String get sendPrice => 'Fiyat';

  @override
  String get sendPriceCalculating => 'Hesaplanıyor…';

  @override
  String get sendPriceMissing => 'Fiyatı görmek için iki adresi de girin.';

  @override
  String distanceKm(String km) {
    return '$km km';
  }

  @override
  String get sendButton => 'Paketi gönder';

  @override
  String get sendSignIn => 'Göndermek için giriş yapın';

  @override
  String get sendFillPlace => 'Alış ve teslim adreslerini girin.';

  @override
  String get sendFillRecipient => 'Alıcının adını ve cep numarasını girin.';

  @override
  String get sendSent => 'Gönderildi. Kurye yola çıkınca size haber vereceğiz.';

  @override
  String get sendPaid => 'Ödendi. Paketiniz bir kurye bekliyor.';

  @override
  String get loadingShipments => 'Gönderiler yükleniyor';

  @override
  String get noShipmentsTitle => 'Henüz gönderi yok';

  @override
  String get noShipmentsMessage =>
      'Gönderdiğiniz paketler her aşamasıyla burada görünür.';

  @override
  String get shipmentsSignInTitle => 'Gönderileriniz';

  @override
  String get shipmentsSignInMessage =>
      'Paket göndermek ve takip etmek için giriş yapın.';

  @override
  String shipmentHeading(String reference) {
    return '$reference gönderisi';
  }

  @override
  String get shipmentAwaitingPayment => 'Ödeme bekliyor';

  @override
  String get shipmentPending => 'Kurye bekliyor';

  @override
  String get shipmentAssigned => 'Kurye almaya geliyor';

  @override
  String get shipmentPickedUp => 'Alındı';

  @override
  String get shipmentOnTheWay => 'Yolda';

  @override
  String get shipmentDelivered => 'Teslim edildi';

  @override
  String get shipmentFailed => 'Teslim edilemedi';

  @override
  String get shipmentCancelled => 'İptal edildi';

  @override
  String get shipmentCourier => 'Kurye';

  @override
  String get callCourier => 'Ara';

  @override
  String get shipmentWaitingCourier => 'Paketiniz için bir kurye arıyoruz.';

  @override
  String trackingCourierAt(String time) {
    return 'Kuryenin $time konumu';
  }

  @override
  String get trackingOpenMap => 'Haritada aç';

  @override
  String get trackingNoPosition =>
      'Kurye konumunu paylaşınca nerede olduğunu göreceksiniz.';

  @override
  String get paymentPaid => 'Ödendi';

  @override
  String get paymentUnpaid => 'Henüz ödenmedi';

  @override
  String get payNow => 'Şimdi öde';

  @override
  String get cancelShipment => 'Gönderiyi iptal et';

  @override
  String get cancelShipmentConfirm => 'Bu gönderi iptal edilsin mi?';

  @override
  String get cancelShipmentYes => 'İptal et';

  @override
  String get keepIt => 'Kalsın';

  @override
  String get shipmentCancelledToast => 'İptal edildi.';

  @override
  String get shipmentStages => 'Aşamalar';

  @override
  String get directionsButton => 'Yol tarifi';

  @override
  String get courierTitle => 'Kurye';

  @override
  String get courierOnDuty => 'Görevde';

  @override
  String get courierOffDutyHint => 'Görev dışı: size yeni iş önerilmez.';

  @override
  String courierDeliveredToday(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Bugün $count teslimat',
      zero: 'Bugün henüz teslimat yok',
    );
    return '$_temp0';
  }

  @override
  String get courierMyJobs => 'İşlerim';

  @override
  String get courierWaiting => 'Bekleyen';

  @override
  String get courierDone => 'Biten';

  @override
  String get loadingJobs => 'İşler yükleniyor';

  @override
  String get noJobsTitle => 'Burada iş yok';

  @override
  String get noJobsMessage =>
      'Yeni işler burada görünür ve bildirim alırsınız.';

  @override
  String get noWaitingTitle => 'Bekleyen iş yok';

  @override
  String get noWaitingOffDuty => 'Bekleyen işleri görmek için göreve başlayın.';

  @override
  String get notCourierTitle => 'Kuryelerimiz için';

  @override
  String get notCourierMessage =>
      'Bu ekran şirketin kuryeleri içindir. Numaranızı eklemesini şirketten isteyin.';

  @override
  String get customerView => 'Müşteri görünümü';

  @override
  String get sharingLocation =>
      'Paket yoldayken ve bu ekran açıkken müşteri nerede olduğunuzu görür.';

  @override
  String jobTitle(String reference) {
    return '$reference işi';
  }

  @override
  String jobCollect(String amount) {
    return '$amount tahsil et';
  }

  @override
  String jobCollectBanner(String amount) {
    return 'Teslimatta $amount nakit tahsil edin.';
  }

  @override
  String get jobPaidByCard => 'Kartla ödendi: tahsil edilecek bir şey yok.';

  @override
  String get jobPhonesAfterTaking => 'Numaralar işi aldığınızda görünür.';

  @override
  String callSender(String name) {
    return '$name kişisini ara';
  }

  @override
  String callRecipient(String name) {
    return '$name kişisini ara';
  }

  @override
  String get jobTake => 'Bu işi al';

  @override
  String get jobTaken => 'İş sizin. Alış yerine gidin.';

  @override
  String get jobUpdated => 'Kaydedildi. Müşteriye haber verildi.';

  @override
  String get deliveredDone => 'Teslim edildi. Tebrikler.';

  @override
  String get stepPickedUp => 'Aldım';

  @override
  String get stepOnTheWay => 'Yoldayım';

  @override
  String get stepDelivered => 'Teslim edildi';

  @override
  String get stepFailed => 'Teslim edemedim';

  @override
  String get stepReleased => 'İşi geri ver';

  @override
  String get releaseConfirm =>
      'Bu iş geri verilsin mi? Başka bir kurye alacak.';

  @override
  String get failReasonTitle => 'Neden teslim edilemedi?';

  @override
  String get failReasonHint => 'Örneğin: kimse açmadı';

  @override
  String get failReasonSend => 'Gönder';

  @override
  String get courierMode => 'Kurye modu';

  @override
  String get tabRestaurants => 'Restoranlar';

  @override
  String get tabFoodOrders => 'Siparişlerim';

  @override
  String get tabRestaurantDesk => 'Restoran';

  @override
  String get restaurantMode => 'Restoran modu';

  @override
  String get restaurantsSearchHint => 'Restoran ve yemek ara';

  @override
  String get cuisineAll => 'Tümü';

  @override
  String get loadingRestaurants => 'Restoranlar yükleniyor';

  @override
  String get noRestaurantsTitle => 'Henüz restoran yok';

  @override
  String get noRestaurantsMessage =>
      'Başka bir arama ya da mutfak deneyin veya daha sonra tekrar bakın.';

  @override
  String get restaurantClosed => 'Kapalı';

  @override
  String restaurantOpensAt(String time) {
    return '$time açılır';
  }

  @override
  String get restaurantBusy => 'Şu an yoğun';

  @override
  String get restaurantNoDelivery => 'Size teslimat yapmıyor';

  @override
  String restaurantMinutes(int minutes) {
    return '$minutes dk';
  }

  @override
  String restaurantMinOrder(String amount) {
    return 'En az $amount';
  }

  @override
  String restaurantFee(String amount) {
    return 'Teslimat $amount';
  }

  @override
  String get dishSoldOut => 'Tükendi';

  @override
  String get dishPopular => 'Popüler';

  @override
  String get dishNote => 'Mutfak için not (isteğe bağlı)';

  @override
  String get foodAdded => 'Sepetinize eklendi.';

  @override
  String get cartReplaceTitle => 'Yeni sepet başlatılsın mı?';

  @override
  String cartReplaceMessage(String restaurant) {
    return 'Sepetinizde $restaurant yemekleri var. Bunu eklemek sepeti boşaltır.';
  }

  @override
  String get cartReplaceYes => 'Yeni sepet başlat';

  @override
  String foodViewCart(int count) {
    return 'Sepeti gör ($count)';
  }

  @override
  String get foodCartTitle => 'Siparişiniz';

  @override
  String get foodCartEmptyTitle => 'Sepetiniz boş';

  @override
  String get foodCartEmptyMessage => 'Bir restoran seçin ve yemek ekleyin.';

  @override
  String get foodDeliverTo => 'Teslimat adresi';

  @override
  String get foodSubtotal => 'Ara toplam';

  @override
  String get foodDeliveryFee => 'Teslimat';

  @override
  String get foodTotal => 'Toplam';

  @override
  String get foodTotalMissing => 'Toplamı görmek için adresi girin.';

  @override
  String get foodYourPhone => 'Kurye için cep telefonunuz';

  @override
  String get foodPlaceOrder => 'Siparişi ver';

  @override
  String get foodSignInToOrder => 'Sipariş için giriş yapın';

  @override
  String get foodFillAddress => 'Teslimat adresini girin.';

  @override
  String get foodFillPhone =>
      'Kuryenin sizi arayabilmesi için cep telefonunuzu girin.';

  @override
  String get foodOrderSent => 'Siparişiniz restorana gönderildi.';

  @override
  String get foodOrderPaid => 'Ödendi. Siparişiniz restorana gitti.';

  @override
  String foodEta(int minutes) {
    return 'Yaklaşık $minutes dk';
  }

  @override
  String get foodAwaitingPayment => 'Ödeme bekleniyor';

  @override
  String get foodPlaced => 'Restorana gönderildi';

  @override
  String get foodAccepted => 'Hazırlanıyor';

  @override
  String get foodReady => 'Kurye için hazır';

  @override
  String get foodPickedUp => 'Kurye aldı';

  @override
  String get foodOnTheWay => 'Yolda';

  @override
  String get foodDelivered => 'Teslim edildi';

  @override
  String get foodRejected => 'Kabul edilmedi';

  @override
  String get foodCancelled => 'İptal edildi';

  @override
  String get foodFailed => 'Teslim edilemedi';

  @override
  String foodOrderHeading(String reference) {
    return 'Sipariş $reference';
  }

  @override
  String foodReadyAt(String time) {
    return 'Yaklaşık $time hazır';
  }

  @override
  String get rejectClosing => 'Restoran kapanıyor';

  @override
  String get rejectTooBusy => 'Şu an çok yoğun';

  @override
  String get rejectItemUnavailable => 'Bir ürün yok';

  @override
  String get rejectOther => 'Başka bir neden';

  @override
  String get foodCancel => 'Siparişi iptal et';

  @override
  String get foodCancelConfirm => 'Bu sipariş iptal edilsin mi?';

  @override
  String get foodCancelledToast => 'Sipariş iptal edildi.';

  @override
  String get foodCallRestaurant => 'Restoranı ara';

  @override
  String get foodRestaurant => 'Restoran';

  @override
  String get foodDishes => 'Yemekler';

  @override
  String get foodWaitingRestaurant => 'Restoranın kabul etmesi bekleniyor.';

  @override
  String get foodRateTitle => 'Siparişinizi değerlendirin';

  @override
  String get rateRestaurant => 'Restoran';

  @override
  String get rateCourier => 'Kurye';

  @override
  String get rateComment =>
      'Eklemek istediğiniz bir şey var mı? (isteğe bağlı)';

  @override
  String get rateSend => 'Değerlendirmeyi gönder';

  @override
  String get rateThanks => 'Değerlendirdiğiniz için teşekkürler.';

  @override
  String get ratePickStars => 'Restoranın yıldızlarını seçin.';

  @override
  String foodRated(int stars) {
    return '5 üzerinden $stars verdiniz.';
  }

  @override
  String rateStar(int stars) {
    return '$stars yıldız';
  }

  @override
  String get loadingFoodOrders => 'Siparişleriniz yükleniyor';

  @override
  String get noFoodOrdersTitle => 'Henüz sipariş yok';

  @override
  String get noFoodOrdersMessage => 'Yemek siparişleriniz burada görünür.';

  @override
  String get foodOrderFood => 'Yemek sipariş et';

  @override
  String get foodOrdersSignInTitle => 'Siparişlerinizi görmek için giriş yapın';

  @override
  String get foodOrdersSignInMessage =>
      'Siparişleriniz ve nerede oldukları burada görünür.';

  @override
  String get deskNew => 'Yeni';

  @override
  String get deskPreparing => 'Hazırlanıyor';

  @override
  String get deskDone => 'Biten';

  @override
  String get deskAccepting => 'Sipariş alıyor';

  @override
  String deskPausedUntil(String time) {
    return '$time saatine kadar duraklatıldı';
  }

  @override
  String get deskClosedHours => 'Çalışma saatleri dışında kapalı';

  @override
  String deskToday(int count, String sales) {
    return 'Bugün: $count sipariş · $sales';
  }

  @override
  String get deskPause => 'Yeni siparişleri duraklat';

  @override
  String get deskPauseFor => 'Yeni siparişleri şu süre duraklat';

  @override
  String get deskOpenAgain => 'Yeniden sipariş al';

  @override
  String get notRestaurantTitle => 'Restoranlarımız için';

  @override
  String get notRestaurantMessage =>
      'Bu ekran, teslimat yaptığımız restoranların çalışanları içindir.';

  @override
  String get loadingRestaurantOrders => 'Siparişler yükleniyor';

  @override
  String get noRestaurantOrdersTitle => 'Burada sipariş yok';

  @override
  String get noRestaurantOrdersMessage =>
      'Yeni siparişler geldikçe burada görünür.';

  @override
  String get deskAccept => 'Kabul et';

  @override
  String get deskAcceptTitle => 'Kaç dakikada hazır olur?';

  @override
  String get deskAccepted => 'Kabul edildi. Müşteriye bildirildi.';

  @override
  String get deskReject => 'Alamıyoruz';

  @override
  String get deskRejectTitle => 'Neden alamıyorsunuz?';

  @override
  String get deskRejectNote => 'Müşteri için not (isteğe bağlı)';

  @override
  String get deskRejected => 'Reddedildi. Müşteriye bildirildi.';

  @override
  String get deskMarkReady => 'Kurye için hazır';

  @override
  String get deskMarkedReady => 'Hazır olarak işaretlendi.';

  @override
  String get deskCustomer => 'Müşteri';
}
