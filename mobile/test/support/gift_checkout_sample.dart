import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp/modules/store/widgets/gift_checkout_look.dart';

/// 131.25 A sample gift order the gift checkout's look is drawn with in the
/// tests and the gallery (the canvas draws the same,
/// platform/web/src/lib/studio/checkout-words.ts): Omar sends Salma a
/// bouquet for her birthday, tomorrow between 13:00 and 16:00, delivery
/// priced by the distance. SAMPLE: the app draws the shop's own order.
GiftCheckoutData giftSample({
  String language = 'en',
  String? photoUrl,
  int step = 2,
}) {
  final ar = language == 'ar';
  final tr = language == 'tr';
  String pick(String en, String a, String t) => ar
      ? a
      : tr
      ? t
      : en;
  String money(String amount) => ar
      ? '$amount ج.م'
      : tr
      ? '${amount.replaceAll(',', '.')} E£'
      : 'E£ $amount';
  final occasions = [
    (
      pick('Love & romance', 'حب ورومانسية', 'Aşk ve romantizm'),
      Symbols.favorite_rounded,
    ),
    (pick('Birthday', 'عيد ميلاد', 'Doğum günü'), Symbols.cake_rounded),
    (pick('Anniversary', 'ذكرى سنوية', 'Yıl dönümü'), Symbols.diamond_rounded),
    (
      pick('Congratulations', 'تهنئة', 'Tebrikler'),
      Symbols.celebration_rounded,
    ),
    (pick('New baby', 'مولود جديد', 'Yeni bebek'), Symbols.child_care_rounded),
    (
      pick('Get well', 'تمنيات بالشفاء', 'Geçmiş olsun'),
      Symbols.healing_rounded,
    ),
    (
      pick('Thank you', 'شكرًا', 'Teşekkürler'),
      Symbols.volunteer_activism_rounded,
    ),
    (pick('Sympathy', 'مواساة', 'Taziye'), Symbols.spa_rounded),
  ];
  final messages = ar
      ? [
          'عيد ميلاد سعيد! عسى أن يزهر عامك كهذه الزهور.',
          'عامٌ جديد وسببٌ آخر للاحتفال بك.',
          'أتمنى لك يومًا جميلًا مثلك.',
        ]
      : tr
      ? [
          'İyi ki doğdun! Bu yıl bu çiçekler gibi açsın.',
          'Yeni bir yaş, seni kutlamak için bir neden daha.',
          'Senin kadar güzel bir gün dilerim.',
        ]
      : [
          'Happy birthday! May this year bloom like these flowers.',
          'Another year, another reason to celebrate you.',
          'Wishing you a day as lovely as you are.',
        ];
  return GiftCheckoutData(
    step: step,
    photoUrl: photoUrl,
    sender: GiftSender(
      name: pick('Omar Hassan', 'عمر حسن', 'Omar Hassan'),
      phone: '+20 100 555 0142',
      email: 'omar@example.com',
    ),
    recipient: GiftRecipient(
      name: pick('Salma Adel', 'سلمى عادل', 'Salma Adel'),
      phone: '+20 122 555 0187',
      country: pick('Egypt', 'مصر', 'Mısır'),
      city: pick('Cairo', 'القاهرة', 'Kahire'),
      address: pick(
        '12 Shagaret El Dor St., Zamalek, 3rd floor',
        '12 شارع شجرة الدر، الزمالك، الطابق الثالث',
        'Shagaret El Dor Cad. 12, Zamalek, 3. kat',
      ),
    ),
    perKm: true,
    cutoffPassed: true,
    days: [
      GiftChoice(
        pick('Today', 'اليوم', 'Bugün'),
        icon: Symbols.bolt_rounded,
        enabled: false,
      ),
      GiftChoice(
        pick('Tomorrow, 15 Nov', 'غدًا، 15 نوفمبر', 'Yarın, 15 Kasım'),
        icon: Symbols.wb_sunny_rounded,
        selected: true,
      ),
      GiftChoice(
        pick('Pick a date', 'اختر تاريخًا', 'Tarih seçin'),
        icon: Symbols.calendar_month_rounded,
      ),
    ],
    slots: [
      const GiftChoice('10:00–13:00'),
      const GiftChoice('13:00–16:00', selected: true),
      GiftChoice('16:00–19:00', extra: money('+50')),
      GiftChoice('19:00–22:00', extra: money('+80')),
    ],
    occasions: [
      for (final (i, (label, icon)) in occasions.indexed)
        GiftChoice(label, icon: icon, selected: i == 1),
    ],
    messages: messages,
    message: messages.first,
    lines: [
      GiftLine(
        pick('Blush Garden', 'حديقة الورد', 'Pembe Bahçe'),
        money('2,100'),
        subtitle: pick('Deluxe · 24 stems', 'فاخر · 24 ساقًا', 'Lüks · 24 dal'),
        imageUrl: photoUrl,
      ),
      GiftLine(
        pick('Greeting card', 'بطاقة تهنئة', 'Tebrik kartı'),
        money('60'),
        addOn: true,
      ),
      GiftLine(
        pick('Chocolate box', 'علبة شوكولاتة', 'Çikolata kutusu'),
        money('320'),
        addOn: true,
      ),
    ],
    subtotal: money('2,480'),
    fee: money('95'),
    feeParts: [
      (pick('Base', 'الرسوم الأساسية', 'Temel'), money('60')),
      (pick('Distance · 7 km', 'المسافة · 7 كم', 'Mesafe · 7 km'), money('35')),
      (pick('Time slot', 'الموعد', 'Saat aralığı'), money('0')),
    ],
    freeOver: money('2,500'),
    total: money('2,575'),
  );
}
