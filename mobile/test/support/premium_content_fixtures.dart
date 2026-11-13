import 'fixtures.dart';

/// 129.11–129.20 Studio pages showing each premium content element, as the
/// hosted API serves them (texts in the language asked for): for the
/// widget tests and the gallery (test/screenshots/premium_screenshots_test
/// .dart). The prices are an example project's, as its owner wrote them.
const premiumElements = [
  'testimonials',
  'pricing',
  'stats',
  'progress',
  'timeline',
  'profile_card',
  'bento',
  'glass_card',
  'badge_text',
  'cta_bar',
];

/// Yallapp's own photos (platform/web/public/stories), as a page names them.
String premiumPhoto(String path) => 'https://demo.yallapp.test/stories/$path';

/// The photos the pages show, by their path under platform/web/public.
const premiumPhotoPaths = [
  '/stories/delivery/delivery-shop-owner.jpg',
  '/stories/school/school-teacher.jpg',
  '/stories/rides/rides-driver.jpg',
  '/stories/academy/academy-desk.jpg',
  '/stories/multi-vendor/zad-cafe.jpg',
  '/stories/multi-vendor/zad-market-aisle.jpg',
  '/stories/rides/rides-night-city.jpg',
  '/stories/academy/academy-graduation.jpg',
];

Map<String, dynamic> _text(
  String id,
  String text, {
  double size = 15,
  int weight = 400,
  String? color,
  Map<String, dynamic>? margin,
}) => {
  'id': id,
  'type': 'text',
  'text': text,
  'font': {'size': size, 'weight': weight},
  'color': ?color,
  'margin': margin ?? {'top': 0, 'end': 16, 'bottom': 0, 'start': 16},
};

const _side = {'top': 0, 'end': 16, 'bottom': 0, 'start': 16};

/// The page's elements for [element], in Arabic or English.
List<Map<String, dynamic>> premiumChildren(
  String element, {
  bool arabic = false,
}) {
  String w(String en, String ar) => arabic ? ar : en;
  switch (element) {
    case 'testimonials':
      return [
        _text(
          'h',
          w('What our customers say', 'ماذا يقول عملاؤنا'),
          size: 22,
          weight: 800,
        ),
        {
          'id': 'quotes',
          'type': 'testimonials',
          'padding': _side,
          'gap': 12,
          'entries': [
            {
              'text': w(
                'Orders arrive in under an hour and the team always answers. We moved our whole shop to the app.',
                'تصل الطلبات في أقل من ساعة والفريق يرد دائمًا. نقلنا متجرنا كله إلى التطبيق.',
              ),
              'title': w('Mona Adel', 'منى عادل'),
              'subtitle': w('Shop owner, Cairo', 'صاحبة متجر، القاهرة'),
              'value': 5,
              'image_url': premiumPhoto('delivery/delivery-shop-owner.jpg'),
            },
            {
              'text': w(
                'Parents see the day at a glance. Fewer calls, calmer mornings.',
                'يرى أولياء الأمور اليوم بنظرة. مكالمات أقل وصباح أهدأ.',
              ),
              'title': w('Omar Hassan', 'عمر حسن'),
              'subtitle': w('Teacher', 'معلّم'),
              'value': 5,
              'image_url': premiumPhoto('school/school-teacher.jpg'),
            },
            {
              'text': w('Clear, fast and kind.', 'واضح وسريع ولطيف.'),
              'title': w('Karim Saleh', 'كريم صالح'),
              'subtitle': w('Driver', 'سائق'),
              'value': 4,
            },
          ],
        },
        _text(
          'h2',
          w('Stacked', 'تحت بعضها'),
          size: 13,
          weight: 700,
          margin: {'top': 10, 'end': 16, 'bottom': 0, 'start': 16},
        ),
        {
          'id': 'stacked',
          'type': 'testimonials',
          'testimonials': {'style': 'stacked'},
          'padding': _side,
          'entries': [
            {
              'text': w(
                'The booking takes ten seconds now.',
                'الحجز يستغرق عشر ثوانٍ الآن.',
              ),
              'title': w('Lina Farouk', 'لينا فاروق'),
              'subtitle': w('Clinic manager', 'مديرة عيادة'),
              'value': 5,
            },
          ],
        },
      ];
    case 'pricing':
      return [
        _text('h', w('Choose your plan', 'اختر باقتك'), size: 22, weight: 800),
        {
          'id': 'plans',
          'type': 'pricing',
          'pricing': {'yearly': true},
          'margin': _side,
          'gap': 12,
          'entries': [
            {
              'title': w('Starter', 'البداية'),
              'price': 24900,
              'price_yearly': 249000,
              'text': w(
                'One shop\nOrders and payments\nEmail support',
                'متجر واحد\nالطلبات والمدفوعات\nدعم بالبريد',
              ),
              'label': w('Start', 'ابدأ'),
            },
            {
              'title': w('Growth', 'النمو'),
              'price': 59900,
              'price_yearly': 599000,
              'highlight': true,
              'text': w(
                'Three shops\nDelivery and coupons\nPriority support',
                'ثلاثة متاجر\nالتوصيل والقسائم\nدعم أولوية',
              ),
              'label': w('Choose Growth', 'اختر النمو'),
            },
            {
              'title': w('Scale', 'التوسع'),
              'price': 119900,
              'price_yearly': 1199000,
              'text': w(
                'Every branch\nYour own app\nA manager for you',
                'كل الفروع\nتطبيقك الخاص\nمدير حساب لك',
              ),
              'label': w('Talk to us', 'تواصل معنا'),
            },
          ],
        },
      ];
    case 'stats':
      return [
        // 129 A hero number at the element's font, its words small beside it.
        {
          'id': 'hero',
          'type': 'stats',
          'stats': {'start': true, 'still': true},
          'font': {'size': 72, 'weight': 900},
          'margin': _side,
          'entries': [
            {
              'value': 6,
              'suffix': w(' min', ' د'),
              'title': w(
                'Karim is 6 min from Maadi',
                'كريم على بعد 6 دقائق من المعادي',
              ),
            },
          ],
        },
        {
          'id': 'plain',
          'type': 'stats',
          'stats': {'dividers': true},
          'margin': {'top': 10, 'end': 16, 'bottom': 0, 'start': 16},
          'entries': [
            {
              'value': 12500,
              'suffix': '+',
              'title': w('Customers', 'عميل'),
              'icon': 'groups',
            },
            {
              'value': 4.9,
              'title': w('Rating', 'التقييم'),
              'icon': 'star',
              'highlight': true,
            },
            {
              'value': 38,
              'suffix': w(' min', ' د'),
              'title': w('Delivery', 'التوصيل'),
              'icon': 'local_shipping',
            },
          ],
        },
        {
          'id': 'cards',
          'type': 'stats',
          'stats': {'style': 'cards'},
          'font': {'size': 40, 'weight': 900},
          'margin': {'top': 14, 'end': 16, 'bottom': 0, 'start': 16},
          'gap': 10,
          'entries': [
            {
              'value': 35,
              'prefix': 'E£',
              'title': w('Economy · 4 seats', 'اقتصادي · 4 مقاعد'),
            },
            {
              'value': 50,
              'prefix': 'E£',
              'title': w('Comfort · 4 seats', 'مريح · 4 مقاعد'),
              'highlight': true,
            },
            {
              'value': 80,
              'prefix': 'E£',
              'title': w('Van · 7 seats', 'فان · 7 مقاعد'),
            },
          ],
        },
      ];
    case 'progress':
      return [
        // 129 A gold ring around a photo with its tick marks and knob.
        {
          'id': 'hero',
          'type': 'progress',
          'progress': {
            'style': 'rings',
            'size': 226,
            'stroke': 8,
            'ticks': 18,
            'knob': true,
          },
          'margin': _side,
          'entries': [
            {
              'value': 61,
              'image_url': premiumPhoto('academy/academy-desk.jpg'),
              'subtitle': w('Lesson 12 of 18', 'الدرس 12 من 18'),
              'gradient': {'from': '#E6C26E', 'to': '#B8862F'},
            },
          ],
        },
        {
          'id': 'lessons',
          'type': 'progress',
          'progress': {'style': 'segments', 'segments': 18, 'stroke': 4},
          'margin': {'top': 10, 'end': 16, 'bottom': 0, 'start': 16},
          'entries': [
            {
              'title': w('11 of 18 lessons done', '11 من 18 درسًا'),
              'value': 61,
              'gradient': {'from': '#E6C26E', 'to': '#B8862F'},
            },
          ],
        },
        {
          'id': 'bars',
          'type': 'progress',
          'margin': {'top': 14, 'end': 16, 'bottom': 0, 'start': 16},
          'gap': 14,
          'entries': [
            {'title': w('Arabic', 'اللغة العربية'), 'value': 86},
            {'title': w('Maths', 'الرياضيات'), 'value': 72},
          ],
        },
        {
          'id': 'rings',
          'type': 'progress',
          'progress': {'style': 'rings'},
          'margin': {'top': 18, 'end': 16, 'bottom': 0, 'start': 16},
          'entries': [
            {'title': w('Lessons', 'الدروس'), 'value': 80},
            {
              'title': w('Homework', 'الواجبات'),
              'value': 64,
              'icon': 'description',
            },
            {
              'title': w('Attendance', 'الحضور'),
              'value': 96,
              'color': '#2F8A5B',
            },
          ],
        },
      ];
    case 'timeline':
      return [
        _text('h', w("Lina's day", 'يوم لينا'), size: 22, weight: 800),
        // 129 A school day: the times at the start, the class now as a card.
        {
          'id': 'down',
          'type': 'timeline',
          'timeline': {'times': true, 'mono': true, 'card': true},
          'margin': _side,
          'entries': [
            {
              'subtitle': '07:42',
              'title': w(
                'Checked in at the main gate',
                'وصلت من البوابة الرئيسية',
              ),
              'text': w(
                'Bus Route 1 from Road 9, Maadi',
                'حافلة الخط 1 من شارع 9، المعادي',
              ),
            },
            {
              'subtitle': '08:00',
              'title': w('Maths with Ms. Mona', 'الرياضيات مع أ. منى'),
              'label': w('NOW', 'الآن'),
              'value': 40,
              'text': w(
                'Next: Arabic with Mr. Tarek at 08:50',
                'التالية: العربية مع أ. طارق 08:50',
              ),
              'highlight': true,
            },
            {
              'subtitle': '13:55',
              'title': w(
                'Grandfather Samir picks Lina up',
                'الجد سمير يأخذ لينا',
              ),
              'icon': 'home',
            },
            {'subtitle': '14:30', 'title': w('Home', 'في البيت')},
          ],
        },
        // 129 A trip's legs, a bar over each.
        {
          'id': 'across',
          'type': 'timeline',
          'timeline': {'style': 'bars', 'mono': true},
          'margin': {'top': 6, 'end': 16, 'bottom': 0, 'start': 16},
          'entries': [
            {
              'title': w('Tue 17', 'الثلاثاء 17'),
              'subtitle': 'SFR 471',
              'icon': 'flight',
              'highlight': true,
            },
            {
              'title': w('Wed 18', 'الأربعاء 18'),
              'subtitle': w('Transfer', 'انتقال'),
              'icon': 'directions_car',
            },
            {
              'title': w('4 nights', '4 ليالٍ'),
              'subtitle': 'Seminyak',
              'icon': 'bed',
            },
            {
              'title': w('Sun 22', 'الأحد 22'),
              'subtitle': 'SFR 472',
              'icon': 'flight',
            },
          ],
        },
      ];
    case 'profile_card':
      return [
        {
          'id': 'card',
          'type': 'profile_card',
          'title': w('Dr. Salma Nour', 'د. سلمى نور'),
          'text': w(
            'Teacher of Arabic · Cairo',
            'معلمة اللغة العربية · القاهرة',
          ),
          'image_url': premiumPhoto('delivery/delivery-shop-owner.jpg'),
          'profile': {
            'cover_url': premiumPhoto('academy/academy-desk.jpg'),
            'socials': [
              {'network': 'instagram', 'url': 'https://instagram.com/example'},
              {'network': 'youtube', 'url': 'https://youtube.com/example'},
              {'network': 'linkedin', 'url': 'https://linkedin.com/example'},
            ],
          },
          'margin': _side,
          'gap': 12,
          'children': [
            {
              'id': 'badges',
              'type': 'row',
              'gap': 6,
              'align': 'center',
              'children': [
                {
                  'id': 'b1',
                  'type': 'badge_text',
                  'text': w('Top teacher', 'الأعلى تقييمًا'),
                  'icon': 'workspace_premium',
                  'badge': {'style': 'gradient'},
                },
                {
                  'id': 'b2',
                  'type': 'badge_text',
                  'text': '4.9',
                  'icon': 'star',
                  'badge': {'style': 'outline'},
                },
              ],
            },
            {
              'id': 'buttons',
              'type': 'row',
              'gap': 10,
              'children': [
                {
                  'id': 'book',
                  'type': 'button',
                  'text': w('Book a lesson', 'احجز درسًا'),
                  'width': 'fill',
                  'height': 44,
                  'radius': 14,
                  'background': '#1F3A5F',
                  'dark_background': '#E8B04B',
                  'color': '#FFFFFF',
                  'dark_color': '#0E0D24',
                  'font': {'size': 14, 'weight': 800},
                  'text_align': 'center',
                },
                {
                  'id': 'follow',
                  'type': 'button',
                  'text': w('Follow', 'تابِع'),
                  'width': 'fill',
                  'height': 44,
                  'radius': 14,
                  'background': '#FFFFFF',
                  'dark_background': '#1D1B2C',
                  'border_color': '#1F3A5F',
                  'dark_border_color': '#E8B04B',
                  'border_width': 1.5,
                  'color': '#1F3A5F',
                  'dark_color': '#E8B04B',
                  'font': {'size': 14, 'weight': 800},
                  'text_align': 'center',
                },
              ],
            },
          ],
        },
      ];
    case 'bento':
      return [
        _text(
          'h',
          w("What's for dinner?", 'ماذا على العشاء؟'),
          size: 22,
          weight: 800,
        ),
        {
          'id': 'grid',
          'type': 'bento',
          'columns': 3,
          'gap': 10,
          // 129 Frosted labels, a chip at a tile's top, a tile across all.
          'bento': {'caption': 'glass', 'row': 112},
          'margin': _side,
          'entries': [
            {
              'title': w('Fresh every morning', 'طازج كل صباح'),
              'text': w('From the market to your door.', 'من السوق إلى بابك.'),
              'subtitle': w(
                'Zad Club · free over EGP 150',
                'نادي زاد · مجاني فوق 150',
              ),
              'image_url': premiumPhoto('multi-vendor/zad-market-aisle.jpg'),
              'size': 'large',
            },
            {
              'title': w('30 min', '30 دقيقة'),
              'text': w('Delivery', 'توصيل'),
              'icon': 'bolt',
              'gradient': {'from': '#1F3A5F', 'to': '#E8B04B', 'angle': 135},
            },
            {
              'title': w('Café', 'مقهى'),
              'image_url': premiumPhoto('multi-vendor/zad-cafe.jpg'),
            },
            {
              'title': w('Your café, one tap away', 'مقهاك بلمسة واحدة'),
              'text': w(
                'Bayt El Koshary · Koshary EGP 55',
                'بيت الكشري · كشري 55',
              ),
              'image_url': premiumPhoto('multi-vendor/zad-cafe.jpg'),
              'size': 'full',
            },
          ],
        },
      ];
    case 'glass_card':
      return [
        {
          'id': 'hero',
          'type': 'photo_hero',
          'image_url': premiumPhoto('rides/rides-night-city.jpg'),
          'height': 250,
          'radius': 26,
          'background': '#0E1A2B',
          'align': 'end',
          'padding': {'top': 16, 'end': 16, 'bottom': 16, 'start': 16},
          'margin': _side,
          'children': [
            {
              'id': 'glass',
              'type': 'column',
              'gap': 6,
              'radius': 22,
              'padding': {'top': 16, 'end': 16, 'bottom': 16, 'start': 16},
              'surface': {
                'glass': 18,
                'tint': 0.16,
                'border': {'from': '#FFFFFF', 'to': '#E8B04B'},
              },
              'children': [
                _text(
                  'gt',
                  w('Home tonight, safely', 'إلى البيت الليلة بأمان'),
                  size: 20,
                  weight: 800,
                  color: '#FFFFFF',
                  margin: const {},
                ),
                _text(
                  'gs',
                  w(
                    'Frosted glass over the photo, a border in two colours.',
                    'زجاج مصنفر فوق الصورة وإطار بلونين.',
                  ),
                  size: 13,
                  color: '#FFFFFF',
                  margin: const {},
                ),
              ],
            },
          ],
        },
        {
          'id': 'glow',
          'type': 'column',
          'gap': 6,
          'radius': 22,
          'background': '#FFFFFF',
          'dark_background': '#1D1B2C',
          'padding': {'top': 16, 'end': 16, 'bottom': 16, 'start': 16},
          'margin': {'top': 16, 'end': 16, 'bottom': 0, 'start': 16},
          'surface': {
            'border': {'from': '#1F3A5F', 'to': '#E8B04B', 'width': 2},
            'glow': '#E8B04B',
            'soft': 3,
          },
          'children': [
            _text(
              'ct',
              w(
                'Gradient border, glow, soft shadow',
                'إطار متدرج وتوهج وظل ناعم',
              ),
              size: 16,
              weight: 800,
              margin: const {},
            ),
            _text(
              'cs',
              w(
                'Any row, column or layer can take this card style.',
                'أي صف أو عمود أو طبقة يمكن أن يأخذ هذا الشكل.',
              ),
              size: 13,
              margin: const {},
            ),
          ],
        },
        // 129 A pass: perforated as a ticket, its texture a fine grain.
        {
          'id': 'pass',
          'type': 'column',
          'gap': 4,
          'radius': 24,
          'background': '#FFFFFF',
          'dark_background': '#1D1B2C',
          'padding': {'top': 16, 'end': 18, 'bottom': 16, 'start': 18},
          'margin': {'top': 16, 'end': 16, 'bottom': 0, 'start': 16},
          'surface': {
            'ticket': {'at': 58},
            'pattern': 'grain',
            'soft': 2,
          },
          'children': [
            _text(
              'pk',
              w('CHECKED IN', 'تم الحضور'),
              size: 12,
              weight: 700,
              margin: const {},
            ),
            _text('pt', '07:42', size: 44, weight: 900, margin: const {}),
            {'id': 'pgap', 'type': 'spacer', 'height': 22},
            _text(
              'pn',
              w(
                'Maths with Ms. Mona · until 08:45',
                'الرياضيات مع أ. منى · حتى 08:45',
              ),
              size: 14,
              weight: 700,
              margin: const {},
            ),
          ],
        },
      ];
    case 'badge_text':
      return [
        {
          'id': 'title',
          'type': 'badge_text',
          'text': w('Premium, made simple', 'الفخامة ببساطة'),
          'badge': {'style': 'text'},
          'font': {'size': 30, 'weight': 900},
          'margin': _side,
        },
        {
          'id': 'chips',
          'type': 'row',
          'gap': 8,
          'scroll': true,
          'margin': {'top': 6, 'end': 16, 'bottom': 0, 'start': 16},
          'children': [
            {
              'id': 'c1',
              'type': 'badge_text',
              'text': w('New', 'جديد'),
              'icon': 'bolt',
              'badge': {'style': 'gradient'},
            },
            {
              'id': 'c2',
              'type': 'badge_text',
              'text': w('Free delivery', 'توصيل مجاني'),
              'icon': 'local_shipping',
              'badge': {'style': 'pill'},
            },
            {
              'id': 'c3',
              'type': 'badge_text',
              'text': w('Top rated', 'الأعلى تقييمًا'),
              'icon': 'star',
              'badge': {'style': 'outline'},
            },
          ],
        },
        {
          'id': 'heading',
          'type': 'row',
          'gap': 8,
          'cross': 'center',
          'margin': {'top': 18, 'end': 16, 'bottom': 0, 'start': 16},
          'children': [
            {
              ..._text(
                'ht',
                w('Weekend offers', 'عروض نهاية الأسبوع'),
                size: 20,
                weight: 800,
                margin: const {},
              ),
              'max_lines': 1,
            },
            {
              'id': 'c4',
              'type': 'badge_text',
              'text': '-20%',
              'badge': {'style': 'gradient'},
              'gradient': {'from': '#E2623A', 'to': '#F2B544', 'angle': 90},
            },
          ],
        },
        {
          'id': 'over',
          'type': 'stack',
          'height': 150,
          'radius': 22,
          'image_background_url': premiumPhoto(
            'academy/academy-graduation.jpg',
          ),
          'margin': {'top': 16, 'end': 16, 'bottom': 0, 'start': 16},
          'cross': 'start',
          'children': [
            {
              'id': 'c5',
              'type': 'badge_text',
              'text': w('Glass badge on a photo', 'شارة زجاجية على صورة'),
              'icon': 'workspace_premium',
              'badge': {'style': 'glass'},
              'color': '#FFFFFF',
              'margin': {'top': 12, 'end': 12, 'bottom': 12, 'start': 12},
            },
          ],
        },
      ];
    case 'cta_bar':
      return [
        {
          'id': 'photo',
          'type': 'image',
          'image_url': premiumPhoto('multi-vendor/zad-cafe.jpg'),
          'height': 150,
          'radius': 24,
          'margin': _side,
        },
        _text(
          'name',
          w('Breakfast for two', 'فطور لشخصين'),
          size: 22,
          weight: 800,
          margin: {'top': 12, 'end': 16, 'bottom': 0, 'start': 16},
        ),
        _text(
          'about',
          w(
            'Eggs, cheese, bread from the oven, fresh juice and two coffees.',
            'بيض وجبن وخبز من الفرن وعصير طازج وقهوتان.',
          ),
          margin: {'top': 4, 'end': 16, 'bottom': 0, 'start': 16},
        ),
        // 129 A floating card with its icon tile and two lines.
        {
          'id': 'sign',
          'type': 'cta_bar',
          'cta': {'style': 'card', 'lead': 'description'},
          'title': w(
            'Sign: Science museum trip\nNext Thursday, 9:00–13:00 · E£350',
            'وقّع: رحلة متحف العلوم\nالخميس القادم، 9:00–13:00 · 350 ج.م',
          ),
          'text': w('Sign', 'وقّع'),
          'margin': {'top': 10, 'end': 0, 'bottom': 0, 'start': 0},
        },
        {
          'id': 'fab',
          'type': 'cta_bar',
          'cta': {'style': 'fab'},
          'icon': 'chat',
          'pin': 'bottom',
          'action': {'type': 'screen', 'screen': 'messages'},
        },
        {
          'id': 'bar',
          'type': 'cta_bar',
          'cta': {'style': 'bar'},
          'title': '₺450',
          'text': w('Order now', 'اطلب الآن'),
          'icon': 'arrow_forward',
          'pin': 'bottom',
          'action': {'type': 'screen', 'screen': 'cart'},
        },
      ];
  }
  throw ArgumentError(element);
}

/// The page holding [element], under a header with its name.
Map<String, dynamic> premiumPage(String element, {bool arabic = false}) => {
  ...appPageJson(blocks: [], showTitle: false),
  'studio': {
    'background': '#F6F3EE',
    'dark_background': '#0E0D1A',
    'header': {
      'type': 'title',
      'title': arabic ? 'بريميوم' : 'Premium',
      'background': '#F6F3EE',
      'dark_background': '#0E0D1A',
      'color': '#0E0D24',
      'dark_color': '#F4EFE6',
    },
    'body': {
      'id': 'root',
      'type': 'column',
      'gap': 14,
      'padding': {'top': 8, 'end': 0, 'bottom': 24, 'start': 0},
      'children': premiumChildren(element, arabic: arabic),
    },
  },
};
