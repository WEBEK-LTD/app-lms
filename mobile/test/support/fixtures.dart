/// JSON shaped exactly like the examples in docs/api/openapi.yaml.
library;

Map<String, dynamic> configJson({
  bool enrollButton = true,
  bool freeEnrollment = true,
  String watermark = 'phone',
  String embedHeight = 'auto',
  bool updateRequired = false,
  bool maintenance = false,
  bool signupAllowed = true,
  bool wishlist = true,
  bool qna = false,
  bool orders = false,
  String? lms = 'tutor',
  bool store = false,
  bool bookings = false,
  bool staffChoice = true,
  int? cancelBeforeMinutes = 60,
  Map<String, dynamic>? appearance,
  Map<String, dynamic>? languages,
  Map<String, dynamic>? listings,
}) => {
  'site': {
    'name': 'Your Academy',
    'url': 'https://your-academy.com',
    'terms_url': 'https://your-academy.com/terms',
    'privacy_url': 'https://your-academy.com/privacy',
    'support_whatsapp': '+90 532 123 45 67',
  },
  'branding': {'logo_url': null, 'primary_color': '#0E0D24'},
  'features': {
    'lms': lms,
    'lms_version': '3.8.0',
    'pro': true,
    'certificates': true,
    'quizzes': true,
    'wishlist': wishlist,
    'reviews': true,
    'qna': qna,
    'push': true,
    'orders': orders,
  },
  'auth': {
    'signup_allowed': signupAllowed,
    'signup_fields': ['name', 'email'],
    'default_country_code': '+90',
  },
  'purchases': {
    'enroll_button': enrollButton,
    'free_enrollment': freeEnrollment,
    'checkout_opens_in': 'in_app',
  },
  'content': {
    'block_screen_capture': true,
    'watermark': watermark,
    'embed_fullscreen_button': true,
    'embed_height': embedHeight,
    'code_highlighting': true,
    'required_watch_percent': 80,
  },
  'app': {
    'update_required': updateRequired,
    'maintenance': maintenance,
    'maintenance_message': maintenance ? 'Back at 10:00.' : null,
  },
  if (store) 'store': storeConfigJson(),
  if (bookings)
    'bookings': bookingsConfigJson(
      staffChoice: staffChoice,
      cancelBeforeMinutes: cancelBeforeMinutes,
    ),
  'appearance': ?appearance,
  'languages': ?languages,
  'listings': ?listings,
};

/// `Config.appearance` as the dashboard sends it.
Map<String, dynamic> appearanceJson({
  String template = 'bold',
  String themeMode = 'dark',
  bool userCanChangeMode = true,
  String? secondaryColor = '#1F8A70',
  String font = 'Lexend',
  String corners = 'round',
  String cards = 'outlined',
}) => {
  'template': template,
  'theme_mode': themeMode,
  'user_can_change_mode': userCanChangeMode,
  'secondary_color': secondaryColor,
  'font': font,
  'corners': corners,
  'cards': cards,
};

Map<String, dynamic> userJson() => {
  'id': 7,
  'name': 'Sara Yilmaz',
  'phone': '+905321234567',
  'email': null,
  'city': 'Istanbul',
  'avatar_url': null,
};

Map<String, dynamic> sessionJson() => {
  'access_token': 'access-1',
  'refresh_token': 'refresh-1',
  'expires_in': 900,
  'user': userJson(),
};

Map<String, dynamic> courseSummaryJson({
  int id = 1,
  String title = 'UI Design Fundamentals',
  bool free = false,
  bool enrolled = false,
}) => {
  'id': id,
  'title': title,
  'image_url': null,
  'instructor': {
    'id': 3,
    'name': 'Deniz Kaya',
    'avatar_url': null,
    'bio': null,
  },
  'price': free
      ? {
          'is_free': true,
          'amount': null,
          'sale_amount': null,
          'currency': null,
          'formatted': null,
        }
      : {
          'is_free': false,
          'amount': '450.00',
          'sale_amount': null,
          'currency': 'TRY',
          'formatted': '₺450',
        },
  'lesson_count': 24,
  'rating': 4.6,
  'rating_count': 120,
  'enrolled': enrolled,
  'wishlisted': false,
};

Map<String, dynamic> courseDetailJson({
  int id = 1,
  String action = 'checkout',
  bool free = false,
  bool enrolled = false,
}) => {
  ...courseSummaryJson(id: id, free: free, enrolled: enrolled),
  'description_html': '<p>Learn the basics of interface design.</p>',
  'intro_video': null,
  'duration_minutes': 340,
  'level': 'Beginner',
  'has_certificate': true,
  'categories': [
    {'id': 4, 'name': 'Design', 'count': 12},
  ],
  'purchase': {'action': action},
};

Map<String, dynamic> curriculumJson() => {
  'topics': [
    {
      'id': 10,
      'title': 'Module 1: Introduction',
      'items': [
        {
          'id': 101,
          'type': 'lesson',
          'title': 'What is UI design?',
          'duration_minutes': 8,
          'question_count': null,
          'preview': true,
          'locked': false,
          'completed': false,
        },
        {
          'id': 102,
          'type': 'lesson',
          'title': 'Designer tools',
          'duration_minutes': 12,
          'question_count': null,
          'preview': false,
          'locked': true,
          'completed': false,
        },
        {
          'id': 201,
          'type': 'quiz',
          'title': 'Module 1 quiz',
          'duration_minutes': null,
          'question_count': 10,
          'preview': false,
          'locked': true,
          'completed': false,
        },
      ],
    },
  ],
};

Map<String, dynamic> myCourseJson() => {
  'course': courseSummaryJson(enrolled: true),
  'progress': {
    'course_id': 1,
    'completed_items': 12,
    'total_items': 20,
    'percent': 60,
    'course_completed': false,
  },
  'next_item': {
    'id': 107,
    'type': 'lesson',
    'title': 'Lesson 7: Functions & Variables',
    'duration_minutes': 9,
    'question_count': null,
    'preview': false,
    'locked': false,
    'completed': false,
  },
  'certificate_url': null,
};

Map<String, dynamic> homeJson() => {
  'sections': [
    {'type': 'continue_learning', 'title': null, 'course': myCourseJson()},
    {
      'type': 'categories',
      'title': 'Categories',
      'categories': [
        {'id': 4, 'name': 'Design', 'count': 12},
      ],
    },
    {
      'type': 'featured_courses',
      'title': 'Featured courses',
      'courses': [
        courseSummaryJson(),
        courseSummaryJson(id: 2, title: 'Business English', free: true),
      ],
    },
    {'type': 'something_new', 'title': 'Ignored'},
  ],
};

Map<String, dynamic> textLessonJson({String? embedHeight}) => {
  'id': 108,
  'course_id': 1,
  'title': 'Writing your first function',
  'render_mode': 'native',
  'html':
      '<p>A function is a reusable block of code. Use <code>def</code>.</p>'
      '<pre><code class="language-python">def greet(name):\n    return f"Hello, {name}!"</code></pre>'
      '<p>Try the challenge:</p>'
      '<div data-yallapp-embed="yallapp-embed-1"></div>'
      '<p>[yallapp-embed-2]</p>',
  'webview_url': null,
  'embeds': [
    {
      'placeholder': 'yallapp-embed-1',
      'src': 'https://www.youtube.com/embed/abc123',
      'provider': 'youtube',
      'width': '100%',
      'height': '315',
      'aspect_ratio': 1.7778,
      'allow_fullscreen': true,
    },
    {
      'placeholder': 'yallapp-embed-2',
      'src': 'https://tools.example.org/challenge',
      'provider': 'other',
      'width': '640',
      'height': '900',
      'aspect_ratio': null,
      'allow_fullscreen': true,
    },
  ],
  'embed_height': embedHeight,
  'video': null,
  'attachments': [
    {
      'name': 'Slides.pdf',
      'url': 'https://your-academy.com/slides.pdf',
      'size_bytes': 204800,
      'mime_type': 'application/pdf',
    },
  ],
  'completed': false,
  'position_seconds': 0,
  'previous_id': 107,
  'next_id': 109,
};

/// A time relative to now, so timers and expiring links in fixtures never run out.
String fromNow(Duration offset) =>
    DateTime.now().toUtc().add(offset).toIso8601String();

Map<String, dynamic> videoLessonJson({String? expiresAt}) => {
  'id': 107,
  'course_id': 1,
  'title': 'Lesson 7: Functions & Variables',
  'render_mode': 'native',
  'html': null,
  'webview_url': null,
  'embeds': <Object>[],
  'video': {
    'source': 'upload',
    'url': 'https://your-academy.com/video.mp4?sig=abc',
    'expires_at': expiresAt ?? fromNow(const Duration(hours: 2)),
    'embed_html': null,
    'duration_seconds': 750,
    'poster_url': null,
  },
  'attachments': <Object>[],
  'completed': false,
  'position_seconds': 252,
  'previous_id': 106,
  'next_id': 108,
};

Map<String, dynamic> quizJson() => {
  'id': 201,
  'course_id': 1,
  'title': 'Module 2 quiz',
  'question_count': 2,
  'time_limit_seconds': 600,
  'pass_percent': 70,
  'attempts_allowed': 3,
  'attempts_used': 1,
  'last_result': {
    'attempt_id': 30,
    'quiz_id': 201,
    'quiz_title': 'Module 2 quiz',
    'status': 'failed',
    'score_percent': 50,
    'finished_at': '2026-10-01T09:00:00Z',
  },
};

Map<String, dynamic> attemptJson({String? endsAt}) => {
  'id': 31,
  'quiz_id': 201,
  'started_at': fromNow(Duration.zero),
  'ends_at': endsAt ?? fromNow(const Duration(minutes: 10)),
  'questions': [
    {
      'id': 1,
      'type': 'single_choice',
      'title': 'Which keyword defines a function in Python?',
      'description_html': null,
      'render_mode': 'native',
      'webview_url': null,
      'options': [
        {'id': 'a', 'label': 'function', 'image_url': null},
        {'id': 'b', 'label': 'def', 'image_url': null},
      ],
      'points': 1,
    },
    {
      'id': 2,
      'type': 'ordering',
      'title': 'Put the steps in order',
      'description_html': null,
      'render_mode': 'webview',
      'webview_url': 'https://your-academy.com/quiz-question/2?sig=x',
      'options': <Object>[],
      'points': 2,
    },
  ],
};

Map<String, dynamic> pageJson(List<Map<String, dynamic>> items) => {
  'page': 1,
  'per_page': 20,
  'total': items.length,
  'total_pages': 1,
  'items': items,
};

Map<String, dynamic> personJson({
  String name = 'Deniz Kaya',
  bool instructor = false,
}) => {'name': name, 'avatar_url': null, 'instructor': instructor};

Map<String, dynamic> notificationJson({
  int id = 1,
  String type = 'announcement',
  int? courseId,
  int? lessonId,
  int? questionId,
  bool read = false,
}) => {
  'id': id,
  'title': 'Exam on Friday',
  'body': 'Bring a pencil.',
  'type': type,
  'course_id': courseId,
  'lesson_id': lessonId,
  'question_id': questionId,
  'created_at': '2026-10-12T09:00:00Z',
  'read': read,
};

Map<String, dynamic> orderJson() => {
  'id': 1042,
  'number': '1042',
  'status': 'on_hold',
  'status_label': 'On hold',
  'total': '₺450.00',
  'created_at': '2026-10-01T10:00:00Z',
  'items': [
    {'name': 'UI Design', 'course_id': 42},
  ],
};

Map<String, dynamic> reviewJson({
  int id = 7,
  int rating = 5,
  bool mine = false,
  String status = 'approved',
}) => {
  'id': id,
  'rating': rating,
  'text': 'Clear lessons and a good pace.',
  'author': personJson(name: mine ? 'Deniz Kaya' : 'Ayse Demir'),
  'created_at': '2026-10-02T10:00:00Z',
  'status': status,
  'mine': mine,
};

Map<String, dynamic> reviewPageJson({
  bool canReview = true,
  Map<String, dynamic>? mine,
}) => {
  ...pageJson([reviewJson(), reviewJson(id: 8, rating: 4)]),
  'summary': {
    'rating': 4.5,
    'rating_count': 2,
    'counts': {'1': 0, '2': 0, '3': 0, '4': 1, '5': 1},
  },
  'mine': mine,
  'can_review': canReview,
};

Map<String, dynamic> questionJson({int id = 3, int answers = 1}) => {
  'id': id,
  'course_id': 42,
  'text': 'What does range return?',
  'author': personJson(),
  'created_at': '2026-10-03T10:00:00Z',
  'answer_count': answers,
  'mine': true,
};

Map<String, dynamic> questionThreadJson() => {
  ...questionJson(),
  'answers': [
    {
      'id': 4,
      'text': 'It returns a range object.',
      'author': personJson(name: 'Ayse Demir', instructor: true),
      'created_at': '2026-10-03T11:00:00Z',
      'mine': false,
    },
  ],
};

Map<String, dynamic> storeConfigJson({
  bool guestCheckout = true,
  bool deliveryDate = true,
  bool giftMessage = true,
}) => {
  'currency': 'TRY',
  'guest_checkout': guestCheckout,
  'checkout_opens_in': 'in_app',
  'reviews': true,
  'delivery_date': {
    'enabled': deliveryDate,
    'required': deliveryDate,
    'min_days': 1,
    'max_days': 14,
    'closed_weekdays': [0],
  },
  'gift_message': {'enabled': giftMessage, 'max_length': 100},
};

Map<String, dynamic> priceJson(
  String amount, {
  String? regular,
  bool range = false,
  String? formatted,
}) => {
  'amount': amount,
  'regular_amount': regular,
  'regular_formatted': regular == null ? null : '₺$regular',
  'currency': 'TRY',
  'formatted': formatted ?? '₺$amount',
  'on_sale': regular != null,
  'range': range,
};

Map<String, dynamic> productSummaryJson({
  int id = 21,
  String name = 'Sunflower Basket',
  String type = 'simple',
  bool digital = false,
  String stock = 'in_stock',
  bool purchasable = true,
  Map<String, dynamic>? price,
}) => {
  'id': id,
  'name': name,
  'type': type,
  'image_url': null,
  'price': price ?? priceJson('200.00', regular: '250.00'),
  'rating': 4.5,
  'rating_count': 2,
  'stock_status': stock,
  'purchasable': purchasable,
  'digital': digital,
};

Map<String, dynamic> productDetailJson({
  bool digital = false,
  String stock = 'in_stock',
}) => {
  ...productSummaryJson(digital: digital, stock: stock),
  'description_html': '<p>A basket of sunflowers.</p>',
  'short_description_html': null,
  'images': <Object>[],
  'sku': null,
  'max_quantity': 5,
  'attributes': <Object>[],
  'variations': <Object>[],
  'categories': [productCategoryJson()],
  'related': [productSummaryJson(id: 22, name: 'Chocolate Box')],
  'external_url': null,
  'permalink': 'https://your-shop.com/product/sunflower-basket',
};

Map<String, dynamic> variableProductJson() => {
  ...productSummaryJson(
    id: 20,
    name: 'Red Roses Bouquet',
    type: 'variable',
    price: priceJson('300.00', range: true, formatted: '₺300.00 – ₺600.00'),
  ),
  'description_html': '<p>Fresh red roses.</p>',
  'short_description_html': null,
  'images': <Object>[],
  'sku': null,
  'max_quantity': null,
  'attributes': [
    {
      'slug': 'pa_size',
      'name': 'Size',
      'variation': true,
      'options': [
        {'value': 'small', 'label': 'Small'},
        {'value': 'large', 'label': 'Large'},
      ],
    },
  ],
  'variations': [
    {
      'id': 201,
      'attributes': {'pa_size': 'small'},
      'price': priceJson('300.00'),
      'image_url': null,
      'stock_status': 'in_stock',
      'max_quantity': null,
      'purchasable': true,
    },
    {
      'id': 203,
      'attributes': {'pa_size': 'large'},
      'price': priceJson('600.00'),
      'image_url': null,
      'stock_status': 'in_stock',
      'max_quantity': 2,
      'purchasable': true,
    },
  ],
  'categories': <Object>[],
  'related': <Object>[],
  'external_url': null,
  'permalink': 'https://your-shop.com/product/red-roses',
};

Map<String, dynamic> productCategoryJson({
  int id = 5,
  String name = 'Flowers',
}) => {
  'id': id,
  'name': name,
  'count': 3,
  'parent_id': null,
  'image_url': null,
};

Map<String, dynamic> storeHomeJson() => {
  'sections': [
    {
      'type': 'categories',
      'title': 'Categories',
      'categories': [
        productCategoryJson(),
        productCategoryJson(id: 6, name: 'Gifts'),
      ],
    },
    {
      'type': 'featured_products',
      'title': 'Featured',
      'products': [
        productSummaryJson(),
        productSummaryJson(id: 22, name: 'Chocolate Box'),
      ],
    },
    {'type': 'something_new', 'title': 'Later'},
  ],
};

Map<String, dynamic> cartQuoteJson({bool problem = false}) => {
  'lines': [
    {
      'product_id': 21,
      'variation_id': null,
      'quantity': 2,
      'name': 'Sunflower Basket',
      'image_url': null,
      'unit_price': '₺200.00',
      'line_total': '₺400.00',
      'available': !problem,
      'problem': problem ? 'Only 1 left in stock.' : null,
      'max_quantity': 5,
      'digital': false,
    },
  ],
  'item_count': 2,
  'subtotal': '₺400.00',
  'subtotal_amount': '400.00',
  'currency': 'TRY',
};

Map<String, dynamic> bookingsConfigJson({
  bool staffChoice = true,
  int? cancelBeforeMinutes = 60,
}) => {
  'plugin': 'amelia',
  'plugin_version': '1.2.30',
  'timezone': 'Europe/Istanbul',
  'currency': 'TRY',
  'staff_choice': staffChoice,
  'notes': true,
  'max_days_ahead': 60,
  'min_minutes_ahead': 0,
  'cancel_before_minutes': cancelBeforeMinutes,
};

Map<String, dynamic> bookingPriceJson(String amount) => {
  'amount': amount,
  'currency': 'TRY',
  'formatted': '₺$amount',
  'free': amount == '0.00',
};

Map<String, dynamic> staffJson({
  int id = 1,
  String name = 'Ayşe Kaya',
  String? price,
}) => {
  'id': id,
  'name': name,
  'image_url': null,
  'title': 'Senior stylist',
  'price': price == null ? null : bookingPriceJson(price),
};

/// 21 A doctor with a profile (`StaffMember.specialties`, `languages`, `bio`).
Map<String, dynamic> doctorJson({int id = 1, String name = 'Dr. Ayşe Demir'}) =>
    {
      'id': id,
      'name': name,
      'image_url': null,
      'title': 'Dentist',
      'price': null,
      'specialties': ['Orthodontics', "Children's dentistry"],
      'languages': ['Turkish', 'English'],
      'bio': 'Twelve years in Istanbul, with children and adults.',
    };

/// 21 A clinic's intake form (`BookingsConfig.intake_fields`), with a type
/// from a newer server.
List<Map<String, dynamic>> intakeFieldsJson() => [
  {
    'id': 'reason',
    'label': 'Reason for your visit',
    'type': 'textarea',
    'required': true,
  },
  {
    'id': 'first_visit',
    'label': 'First visit?',
    'type': 'choice',
    'options': ['Yes', 'No'],
    'required': true,
  },
  {'id': 'birth', 'label': 'Date of birth', 'type': 'date', 'required': false},
  {
    'id': 'heard',
    'label': 'How did you hear of us?',
    'type': 'signature',
    'required': false,
  },
];

/// 21 A clinic's config: the clinic vertical and an intake form.
Map<String, dynamic> clinicConfigJson() {
  final config = configJson(lms: null, bookings: true);
  config['vertical'] = 'clinic';
  (config['bookings'] as Map<String, dynamic>)['intake_fields'] =
      intakeFieldsJson();
  return config;
}

Map<String, dynamic> serviceSummaryJson({
  int id = 1,
  String name = 'Haircut',
  int minutes = 30,
  String price = '300.00',
}) => {
  'id': id,
  'name': name,
  'image_url': null,
  'duration_minutes': minutes,
  'price': bookingPriceJson(price),
  'category_id': 1,
  'color': '#1D6B48',
};

Map<String, dynamic> serviceDetailJson({List<Map<String, dynamic>>? staff}) => {
  ...serviceSummaryJson(),
  'description_html': '<p>Haircut with our team.</p>',
  'staff':
      staff ??
      [staffJson(), staffJson(id: 2, name: 'Mehmet Demir', price: '350.00')],
};

/// Seven days from [from]: closed on Sundays, otherwise free at 09:00, 09:30
/// and 10:00 Istanbul time (UTC+3).
Map<String, dynamic> availabilityJson(String from, {bool empty = false}) {
  final first = DateTime.utc(
    int.parse(from.substring(0, 4)),
    int.parse(from.substring(5, 7)),
    int.parse(from.substring(8, 10)),
  );
  String two(int v) => v.toString().padLeft(2, '0');
  return {
    'timezone': 'Europe/Istanbul',
    'days': [
      for (var i = 0; i < 7; i++)
        () {
          final day = first.add(Duration(days: i));
          final date = '${day.year}-${two(day.month)}-${two(day.day)}';
          return {
            'date': date,
            'slots': empty || day.weekday == DateTime.sunday
                ? []
                : [
                    for (final t in ['09:00', '09:30', '10:00'])
                      () {
                        final h = int.parse(t.substring(0, 2)) - 3;
                        final m = int.parse(t.substring(3));
                        final start = DateTime.utc(
                          day.year,
                          day.month,
                          day.day,
                          h,
                          m,
                        );
                        return {
                          'start': start.toIso8601String(),
                          'end': start
                              .add(const Duration(minutes: 30))
                              .toIso8601String(),
                          'local_time': t,
                          'staff_ids': [1, 2],
                        };
                      }(),
                  ],
          };
        }(),
    ],
  };
}

Map<String, dynamic> appointmentJson({
  int id = 7,
  String status = 'approved',
  bool canCancel = true,
  String localDate = '2026-10-19',
  String localTime = '10:00',
  List<Map<String, dynamic>>? answers,
}) => {
  'id': id,
  'status': status,
  'status_label': status == 'approved'
      ? 'Approved'
      : status == 'cancelled'
      ? 'Cancelled'
      : 'Pending',
  'service': {'id': 1, 'name': 'Haircut', 'image_url': null},
  'staff': staffJson(),
  'start': '2026-10-19T07:00:00Z',
  'end': '2026-10-19T07:30:00Z',
  'local_date': localDate,
  'local_time': localTime,
  'price': bookingPriceJson('300.00'),
  'notes': null,
  'location': null,
  'can_cancel': canCancel,
  'answers': ?answers,
};

Map<String, dynamic> bookingsHomeJson() => {
  'sections': [
    {
      'type': 'next_appointment',
      'title': null,
      'appointment': appointmentJson(),
    },
    {
      'type': 'categories',
      'title': null,
      'categories': [
        {'id': 1, 'name': 'Hair', 'count': 2, 'image_url': null},
        {'id': 2, 'name': 'Spa', 'count': 1, 'image_url': null},
      ],
    },
    {
      'type': 'services',
      'title': 'Popular',
      'services': [
        serviceSummaryJson(),
        serviceSummaryJson(
          id: 3,
          name: 'Massage',
          minutes: 60,
          price: '600.00',
        ),
      ],
    },
    {
      'type': 'staff',
      'title': null,
      'staff': [staffJson(), staffJson(id: 2, name: 'Mehmet Demir')],
    },
    {'type': 'loyalty_card', 'title': 'From a newer plugin'},
  ],
};

// ------------------------------------------------------------------ Pages

/// `Config.languages`.
Map<String, dynamic> languagesJson({
  String defaultCode = 'en',
  List<String> available = const ['en', 'ar', 'tr'],
}) => {'default': defaultCode, 'available': available};

Map<String, dynamic> navTabJson(
  String id,
  String label,
  String icon,
  Map<String, dynamic> target,
) => {'id': id, 'label': label, 'icon': icon, 'target': target};

/// `GET /pages`: a page tab, two built-in screens and a tab whose target a
/// newer dashboard added (skipped).
Map<String, dynamic> navigationJson({List<Map<String, dynamic>>? tabs}) => {
  'version': '2026-10-13T18:00:00Z.4',
  'tabs':
      tabs ??
      [
        navTabJson('t1', 'Discover', 'explore', {
          'type': 'page',
          'page_slug': 'home',
        }),
        navTabJson('t2', 'Catalog', 'menu_book', {
          'type': 'screen',
          'screen': 'courses',
        }),
        navTabJson('t3', 'Later', 'rocket', {'type': 'teleport'}),
        navTabJson('t4', 'Me', 'person', {
          'type': 'screen',
          'screen': 'account',
        }),
      ],
  'pages': [
    {'slug': 'home', 'title': 'Discover', 'updated_at': '2026-10-13T18:00:00Z'},
  ],
};

Map<String, dynamic> itemJson({
  String source = 'courses',
  String id = '1',
  String title = 'UI Design Fundamentals',
  String? priceLabel = '₺450',
  bool favorited = false,
}) => {
  'source': source,
  'id': id,
  'title': title,
  'subtitle': 'Deniz Kaya · 24 lessons',
  'image_url': null,
  'price_label': priceLabel,
  'badge': 'New',
  'favorited': favorited,
  'action': null,
};

/// One block of every type in the contract, plus one the app doesn't know.
List<Map<String, dynamic>> allBlocksJson({String layout = 'carousel'}) => [
  {
    'id': 'b1',
    'type': 'banner',
    'title': null,
    'image_url': 'https://cdn.example.com/banner.jpg',
    'heading': 'Autumn intake is open',
    'subheading': 'Start any course this week',
    'action': {'type': 'course', 'course_id': 1},
  },
  {
    'id': 'b2',
    'type': 'text',
    'title': 'About us',
    'html': '<p>We teach <strong>design</strong> and English.</p>',
  },
  {
    'id': 'b3',
    'type': 'image',
    'title': null,
    'image_url': 'https://cdn.example.com/campus.jpg',
    'aspect_ratio': 1.78,
    'action': null,
  },
  {
    'id': 'b4',
    'type': 'video',
    'title': 'Welcome',
    'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'poster_url': null,
  },
  {
    'id': 'b4b',
    'type': 'video',
    'title': 'Campus tour',
    'url': 'https://cdn.example.com/tour.mp4',
    'poster_url': null,
  },
  {
    'id': 'b5',
    'type': 'button',
    'title': null,
    'label': 'See all courses',
    'icon': 'arrow_forward',
    'style': 'filled',
    'action': {'type': 'screen', 'screen': 'courses'},
  },
  {
    'id': 'b5b',
    'type': 'button',
    'title': null,
    'label': 'Our website',
    'icon': 'not_a_real_icon',
    'style': 'outlined',
    'action': {
      'type': 'url',
      'url': 'https://your-academy.com',
      'open_in': 'browser',
    },
  },
  {
    'id': 'b5c',
    'type': 'button',
    'title': null,
    'label': 'Something new',
    'icon': null,
    'style': 'text',
    'action': {'type': 'hologram'},
  },
  {
    'id': 'b6',
    'type': 'items',
    'title': 'Popular courses',
    'source': 'courses',
    'layout': layout,
    'see_all': {'type': 'screen', 'screen': 'courses'},
    'items': [
      itemJson(),
      itemJson(id: '2', title: 'Business English', priceLabel: 'Free'),
      itemJson(
        id: '3',
        title: 'A very long course title that wraps onto more than two lines on a small phone',
      ),
    ],
  },
  {
    'id': 'b7',
    'type': 'categories',
    'title': 'Categories',
    'source': 'courses',
    'style': 'tiles',
    'categories': [
      {'id': 4, 'name': 'Design', 'count': 12},
      {'id': 5, 'name': 'Languages', 'count': 1},
    ],
  },
  {
    'id': 'b7b',
    'type': 'categories',
    'title': null,
    'source': 'courses',
    'style': 'chips',
    'categories': [
      {'id': 4, 'name': 'Design', 'count': 12},
    ],
  },
  {
    'id': 'b8',
    'type': 'search',
    'title': null,
    'source': 'courses',
    'placeholder': 'Find your next course',
  },
  {
    'id': 'b9',
    'type': 'continue_learning',
    'title': 'Pick up where you left off',
    'course': myCourseJson(),
  },
  {
    'id': 'b10',
    'type': 'embed',
    'title': 'Timetable',
    'url': 'https://forms.example.com/timetable',
    'height': 420,
  },
  {'id': 'b11', 'type': 'spacer', 'title': null, 'size': 'large'},
  {'id': 'b12', 'type': 'carousel_3d', 'title': 'From the future'},
];

/// `GET /pages/{slug}`.
Map<String, dynamic> appPageJson({
  String slug = 'home',
  String title = 'Discover',
  bool showTitle = true,
  List<Map<String, dynamic>>? blocks,
}) => {
  'slug': slug,
  'title': title,
  'updated_at': '2026-10-13T18:00:00Z',
  'show_title': showTitle,
  'blocks': blocks ?? allBlocksJson(),
};

// ------------------------------------------------------------ Real estate

Map<String, dynamic> listingsConfigJson({bool messages = true}) => {
  'currency': 'EGP',
  'area_unit': 'm2',
  'contact': {
    'name': 'Nile Homes',
    'phone': '+201001234567',
    'whatsapp': '+201001234567',
    'email': 'hello@nilehomes.example',
  },
  'messages': messages,
};

Map<String, dynamic> listingFiltersJson() => {
  'purposes': ['sale', 'rent'],
  'types': [
    {'key': 'apartment', 'label': 'Apartment', 'count': 12},
    {'key': 'villa', 'label': 'Villa', 'count': 3},
  ],
  'cities': [
    {
      'name': 'Cairo',
      'count': 14,
      'districts': ['Maadi', 'Zamalek'],
    },
    {'name': 'Giza', 'count': 1, 'districts': <String>[]},
  ],
  'price': {'min': 900000, 'max': 12000000},
  'area': {'min': 60, 'max': 450},
  'bedrooms_max': 5,
};

Map<String, dynamic> listingSummaryJson({
  int id = 42,
  String title = 'Bright apartment with a Nile view',
  String purpose = 'sale',
  bool favorited = false,
  bool featured = true,
}) => {
  'id': id,
  'reference': 'NH-10$id',
  'title': title,
  'purpose': purpose,
  'type': 'apartment',
  'type_label': 'Apartment',
  'price': {
    'amount': purpose == 'rent' ? '18000.00' : '4250000.00',
    'currency': 'EGP',
    'formatted': purpose == 'rent' ? 'EGP 18,000' : 'EGP 4,250,000',
    'period': purpose == 'rent' ? 'month' : null,
    'negotiable': purpose == 'sale',
  },
  'image_url': null,
  'city': 'Cairo',
  'district': 'Maadi',
  'area': 185,
  'bedrooms': 3,
  'bathrooms': 2,
  'featured': featured,
  'favorited': favorited,
};

Map<String, dynamic> listingDetailJson({int id = 42}) => {
  ...listingSummaryJson(id: id),
  'description_html':
      '<p>Sunny corner flat, <strong>two balconies</strong>.</p>',
  'images': [
    {'url': 'https://cdn.example.com/l1.jpg', 'alt': 'Living room'},
    {'url': 'https://cdn.example.com/l2.jpg', 'alt': null},
  ],
  'video_url': null,
  'features': ['Elevator', 'Balcony', 'Security'],
  'floor': 7,
  'year_built': 2018,
  'furnished': false,
  'location': {
    'address': '12 Road 9, Maadi, Cairo',
    'latitude': 29.96,
    'longitude': 31.25,
  },
  'similar': [
    listingSummaryJson(id: 43, title: 'Garden duplex', purpose: 'rent'),
  ],
  'created_at': '2026-10-01T09:00:00Z',
};

Map<String, dynamic> inquiryJson({
  int id = 7,
  int unread = 1,
  String status = 'open',
  List<Map<String, dynamic>>? messages,
}) => {
  'id': id,
  'listing': {
    'id': 42,
    'title': 'Bright apartment with a Nile view',
    'image_url': null,
  },
  'status': status,
  'unread': unread,
  'updated_at': '2026-10-12T10:00:00Z',
  'messages':
      messages ??
      [
        {
          'id': 1,
          'from': 'user',
          'text': 'Is it still available?',
          'created_at': '2026-10-12T09:00:00Z',
        },
        {
          'id': 2,
          'from': 'office',
          'text': 'Yes, viewings on Saturday.',
          'created_at': '2026-10-12T10:00:00Z',
        },
      ],
};
