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
