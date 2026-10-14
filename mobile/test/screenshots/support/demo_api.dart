import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';

import '../../support/fake_api.dart';
import '../../support/fixtures.dart';
import 'demo_images.dart';

/// The fake API with believable content for the website screenshots: an
/// academy, a flower and gift shop in Istanbul, a hair and beauty studio
/// and an estate agency in Cairo. Shapes come from the contract fixtures.
class DemoApi extends FakeApi {
  DemoApi._({required Map<String, dynamic> config, this.arabic = false})
    : super(config: config);

  /// An academy with Yallapp's default colors.
  factory DemoApi.academy({
    bool arabic = false,
    Map<String, dynamic>? appearance,
  }) {
    final api = DemoApi._(
      arabic: arabic,
      config: {
        ...configJson(qna: true, orders: true, languages: _languages),
        'site': _site(arabic ? 'أكاديمية نور' : 'Nour Academy'),
        'branding': {'logo_url': null, 'primary_color': '#0E0D24'},
        'appearance': ?appearance,
      },
    );
    api
      ..course = api._courseDetail(_courses(arabic).first)
      ..lesson = api._lesson();
    return api;
  }

  /// A flower and gift shop in Istanbul.
  factory DemoApi.store({Map<String, dynamic>? appearance, String? primary}) {
    final api = DemoApi._(
      config: {
        ...configJson(lms: null, orders: true, languages: _languages),
        'site': _site('Lale Flowers'),
        'branding': {'logo_url': null, 'primary_color': primary ?? '#0E0D24'},
        'store': {
          ...storeConfigJson(),
          // Optional, so the cart shows a ready checkout button.
          'delivery_date': {
            'enabled': true,
            'required': false,
            'min_days': 1,
            'max_days': 14,
            'closed_weekdays': [0],
          },
        },
        'appearance': ?appearance,
      },
    );
    api
      ..product = _productDetail()
      ..cartQuote = _cartQuote();
    return api;
  }

  /// A hair and beauty studio in Istanbul.
  factory DemoApi.bookings({Map<String, dynamic>? appearance}) {
    final api = DemoApi._(
      config: {
        ...configJson(lms: null, bookings: true, languages: _languages),
        'site': _site('Studio Nur'),
        'branding': {'logo_url': null, 'primary_color': '#0E0D24'},
        'appearance': ?appearance,
      },
    );
    api.service = _serviceDetail();
    return api;
  }

  /// An estate agency in Cairo.
  factory DemoApi.realEstate({
    bool arabic = false,
    Map<String, dynamic>? appearance,
    String? primary,
  }) {
    final api = DemoApi._(
      arabic: arabic,
      config: {
        ...configJson(
          lms: null,
          languages: _languages,
          listings: {
            ...listingsConfigJson(),
            'contact': {
              'name': arabic ? 'نايل هومز' : 'Nile Homes',
              'phone': '+201001234567',
              'whatsapp': '+201001234567',
              'email': 'hello@nilehomes.example',
            },
          },
        ),
        'site': _site(arabic ? 'نايل هومز' : 'Nile Homes'),
        'branding': {'logo_url': null, 'primary_color': primary ?? '#0E0D24'},
        'appearance': ?appearance,
      },
    );
    final listings = _listings(arabic);
    api
      ..listings = listings
      ..favorites = [listings[1]]
      ..listing = api._listingDetail(listings.first, listings.skip(1).toList());
    return api;
  }

  final bool arabic;

  static const _languages = {
    'default': 'en',
    'available': ['en', 'ar', 'tr'],
  };

  static Map<String, dynamic> _site(String name) => {
    'name': name,
    'url': 'https://example.com',
    'terms_url': 'https://example.com/terms',
    'privacy_url': 'https://example.com/privacy',
    'support_whatsapp': '+90 532 123 45 67',
  };

  // ------------------------------------------------------------- Account

  @override
  Future<User> getMe() => super.getMe().then(
    (_) => User.fromJson({
      ...userJson(),
      'name': arabic ? 'سارة يلماز' : 'Sara Yılmaz',
      'email': 'sara@example.com',
    }),
  );

  // ------------------------------------------------------------- Academy

  static Map<String, dynamic> _price(String? formatted, {String? amount}) =>
      formatted == null
      ? {
          'is_free': true,
          'amount': null,
          'sale_amount': null,
          'currency': null,
          'formatted': null,
        }
      : {
          'is_free': false,
          'amount': amount,
          'sale_amount': null,
          'currency': 'TRY',
          'formatted': formatted,
        };

  static Map<String, dynamic> _course(
    int id,
    String title,
    String instructor,
    String image, {
    String? price,
    int lessons = 24,
    double rating = 4.8,
    int ratings = 312,
    bool enrolled = false,
  }) => {
    'id': id,
    'title': title,
    'image_url': demoImage(image),
    'instructor': {
      'id': id + 100,
      'name': instructor,
      'avatar_url': null,
      'bio': null,
    },
    'price': _price(price),
    'lesson_count': lessons,
    'rating': rating,
    'rating_count': ratings,
    'enrolled': enrolled,
    'wishlisted': false,
  };

  static List<Map<String, dynamic>> _courses(bool arabic) => arabic
      ? [
          _course(
            1,
            'أساسيات تصميم تجربة المستخدم',
            'دنيز كايا',
            'course-ux',
            price: '₺1.450',
            lessons: 32,
            rating: 4.9,
            ratings: 418,
          ),
          _course(
            2,
            'الخط العربي للمبتدئين',
            'ليلى حداد',
            'course-arabic',
            price: '₺1.250',
            lessons: 18,
          ),
          _course(
            3,
            'إكسل لأصحاب المشاريع الصغيرة',
            'عمر فاروق',
            'course-excel',
            lessons: 14,
            rating: 4.7,
            ratings: 1240,
          ),
          _course(
            4,
            'تصوير المنتجات بهاتفك',
            'أمره أيدن',
            'course-photo',
            price: '₺890',
            lessons: 21,
            rating: 4.6,
            ratings: 205,
          ),
          _course(
            5,
            'تسويق عبر وسائل التواصل يبيع فعلاً',
            'ياسمين عادل',
            'course-marketing',
            price: '₺1.100',
            lessons: 26,
            rating: 4.8,
            ratings: 356,
          ),
        ]
      : [
          _course(
            1,
            'UX Design Fundamentals',
            'Deniz Kaya',
            'course-ux',
            price: '₺1,450',
            lessons: 32,
            rating: 4.9,
            ratings: 418,
          ),
          _course(
            2,
            'Arabic Calligraphy for Beginners',
            'Leila Haddad',
            'course-arabic',
            price: '₺1,250',
            lessons: 18,
          ),
          _course(
            3,
            'Excel for Small Business Owners',
            'Omar Farouk',
            'course-excel',
            lessons: 14,
            rating: 4.7,
            ratings: 1240,
          ),
          _course(
            4,
            'Product Photography with Your Phone',
            'Emre Aydın',
            'course-photo',
            price: '₺890',
            lessons: 21,
            rating: 4.6,
            ratings: 205,
          ),
          _course(
            5,
            'Social Media Marketing That Sells',
            'Yasmin Adel',
            'course-marketing',
            price: '₺1,100',
            lessons: 26,
            rating: 4.8,
            ratings: 356,
          ),
          _course(
            6,
            'Everyday English Conversation',
            'Hannah Clarke',
            'course-english',
            price: '₺650',
            lessons: 40,
            rating: 4.7,
            ratings: 980,
          ),
          _course(
            7,
            'Python for Data Analysis',
            'Mert Şahin',
            'course-python',
            price: '₺1,600',
            lessons: 45,
            rating: 4.9,
            ratings: 524,
          ),
        ];

  Map<String, dynamic> _myCourse() => {
    'course': {..._courses(arabic)[1], 'enrolled': true},
    'progress': {
      'course_id': 2,
      'completed_items': 11,
      'total_items': 18,
      'percent': 61,
      'course_completed': false,
    },
    'next_item': {
      'id': 112,
      'type': 'lesson',
      'title': arabic
          ? 'الدرس 12: حرف الألف والباء بخط النسخ'
          : 'Lesson 12: Alif and Ba in Naskh script',
      'duration_minutes': 14,
      'question_count': null,
      'preview': false,
      'locked': false,
      'completed': false,
    },
    'certificate_url': null,
  };

  List<Map<String, dynamic>> get _categories => arabic
      ? [
          {'id': 4, 'name': 'التصميم', 'count': 12},
          {'id': 5, 'name': 'الأعمال', 'count': 9},
          {'id': 6, 'name': 'اللغات', 'count': 7},
          {'id': 7, 'name': 'التصوير', 'count': 5},
        ]
      : [
          {'id': 4, 'name': 'Design', 'count': 12},
          {'id': 5, 'name': 'Business', 'count': 9},
          {'id': 6, 'name': 'Languages', 'count': 7},
          {'id': 7, 'name': 'Photography', 'count': 5},
          {'id': 8, 'name': 'Programming', 'count': 6},
        ];

  @override
  Future<List<HomeSection>> getHome() => super.getHome().then((_) {
    final courses = _courses(arabic);
    return [
      for (final s in [
        {'type': 'continue_learning', 'title': null, 'course': _myCourse()},
        {'type': 'categories', 'title': null, 'categories': _categories},
        {
          'type': 'featured_courses',
          'title': null,
          'courses': [courses[0], courses[3], courses[4]],
        },
        {
          'type': 'latest_courses',
          'title': null,
          'courses': [courses[2], courses.last],
        },
      ])
        HomeSection.fromJson(s),
    ];
  });

  @override
  Future<List<Category>> listCategories() => super.listCategories().then(
    (_) => [for (final c in _categories) Category.fromJson(c)],
  );

  @override
  Future<Paged<CourseSummary>> listCourses(CourseQuery query) => super
      .listCourses(query)
      .then(
        (_) =>
            Paged.fromJson(pageJson(_courses(arabic)), CourseSummary.fromJson),
      );

  @override
  Future<Paged<MyCourse>> listMyCourses({
    MyCoursesStatus status = MyCoursesStatus.inProgress,
    int page = 1,
  }) => super
      .listMyCourses(status: status, page: page)
      .then((_) => Paged.fromJson(pageJson([_myCourse()]), MyCourse.fromJson));

  Map<String, dynamic> _courseDetail(Map<String, dynamic> summary) => {
    ...summary,
    'description_html': arabic
        ? '<p>تعلّم كيف تصمم تطبيقات ومواقع سهلة الاستخدام، من البحث مع المستخدمين إلى النماذج الأولية القابلة للنقر.</p>'
        : '<p>Learn how to design apps and websites people find easy to '
              'use: from talking to users and mapping their journeys to '
              'wireframes, clickable prototypes and a simple design '
              'system you can hand to developers.</p>'
              '<p>Every module ends with a short project, and you finish '
              'with three case studies for your portfolio.</p>',
    'intro_video': null,
    'duration_minutes': 610,
    'level': arabic ? 'مبتدئ' : 'Beginner',
    'has_certificate': true,
    'categories': [_categories.first],
    'purchase': {'action': 'checkout'},
  };

  @override
  Future<List<Topic>> getCurriculum(int courseId) => super
      .getCurriculum(courseId)
      .then((_) => [for (final t in _curriculum) Topic.fromJson(t)]);

  static Map<String, dynamic> _item(
    int id,
    String title, {
    String type = 'lesson',
    int? minutes,
    int? questions,
    bool preview = false,
    bool locked = true,
    bool completed = false,
  }) => {
    'id': id,
    'type': type,
    'title': title,
    'duration_minutes': minutes,
    'question_count': questions,
    'preview': preview,
    'locked': locked,
    'completed': completed,
  };

  static final _curriculum = [
    {
      'id': 10,
      'title': 'Module 1: Thinking like a designer',
      'items': [
        _item(101, 'What UX design is (and isn’t)', minutes: 8, preview: true),
        _item(102, 'Talking to your users', minutes: 14),
        _item(103, 'Mapping the user journey', minutes: 12),
        _item(201, 'Module 1 quiz', type: 'quiz', questions: 8),
      ],
    },
    {
      'id': 11,
      'title': 'Module 2: From sketches to wireframes',
      'items': [
        _item(104, 'Sketching ten ideas in ten minutes', minutes: 10),
        _item(105, 'Wireframes that answer questions', minutes: 16),
      ],
    },
    {
      'id': 12,
      'title': 'Module 3: Prototypes and testing',
      'items': [
        _item(106, 'Your first clickable prototype', minutes: 18),
        _item(107, 'Running a five-person usability test', minutes: 15),
      ],
    },
  ];

  Map<String, dynamic> _lesson() => {
    'id': 105,
    'course_id': 1,
    'title': 'Wireframes that answer questions',
    'render_mode': 'native',
    'html':
        '<p>A wireframe is a quick, grey-box drawing of a screen. Its job is '
        'not to look good: it answers <strong>what goes where</strong> and '
        '<strong>what happens next</strong>, before anyone spends time on '
        'colours and fonts.</p>'
        '<h3>Start from the task</h3>'
        '<p>Write the one thing a person comes to this screen to do. For a '
        'booking app that might be “find a free slot on Saturday”.</p>'
        '<ul><li>List the information they need to decide.</li>'
        '<li>Put the main action where a thumb can reach it.</li>'
        '<li>Leave out anything that doesn’t help the task.</li></ul>'
        '<blockquote>Tip: draw at phone size first. If it works on a small '
        'screen, it will work on a large one.</blockquote>'
        '<h3>Label everything</h3>'
        '<p>Use real words instead of “lorem ipsum”. Real labels show you '
        'early when a button or heading is unclear.</p>',
    'webview_url': null,
    'embeds': <Object>[],
    'embed_height': null,
    'video': null,
    'attachments': [
      {
        'name': 'Wireframe kit.pdf',
        'url': 'https://example.com/wireframe-kit.pdf',
        'size_bytes': 2411724,
        'mime_type': 'application/pdf',
      },
      {
        'name': 'Practice brief.docx',
        'url': 'https://example.com/brief.docx',
        'size_bytes': 48230,
        'mime_type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ],
    'completed': false,
    'position_seconds': 0,
    'previous_id': 104,
    'next_id': 106,
  };

  @override
  Future<ReviewPage> listReviews(int courseId, {int page = 1}) => super
      .listReviews(courseId, page: page)
      .then(
        (_) => ReviewPage.fromJson({
          ...pageJson([
            {
              ...reviewJson(),
              'text':
                  'Clear, practical and well paced. I redesigned our '
                  'booking form during module 2.',
              'author': personJson(name: 'Ayşe Demir'),
            },
            {
              ...reviewJson(id: 8, rating: 5),
              'text': 'The usability test module alone was worth it.',
              'author': personJson(name: 'Karim Mansour'),
            },
          ]),
          'summary': {
            'rating': 4.9,
            'rating_count': 418,
            'counts': {'1': 2, '2': 3, '3': 9, '4': 41, '5': 363},
          },
          'mine': null,
          'can_review': false,
        }),
      );

  @override
  Future<NotificationPage> listNotifications({
    int page = 1,
    int perPage = 20,
  }) => super
      .listNotifications(page: page, perPage: perPage)
      .then(
        (_) => NotificationPage.fromJson({
          ...pageJson([
            {
              ...notificationJson(),
              'title': 'New lesson: Running a usability test',
              'body': 'Module 3 is ready in UX Design Fundamentals.',
              'type': 'new_lesson',
            },
            {
              ...notificationJson(id: 2, read: true),
              'title': 'Live Q&A on Thursday',
              'body': 'Join Deniz at 19:00 for questions about your project.',
            },
          ]),
          'unread_count': 1,
        }),
      );

  // --------------------------------------------------------------- Store

  static Map<String, dynamic> _money(
    String amount, {
    String? regular,
    String? formatted,
    String? regularFormatted,
  }) => {
    'amount': amount,
    'regular_amount': regular,
    'regular_formatted': regularFormatted,
    'currency': 'TRY',
    'formatted': formatted,
    'on_sale': regular != null,
    'range': false,
  };

  static Map<String, dynamic> _product(
    int id,
    String name,
    String image,
    String price, {
    String? was,
    double rating = 4.8,
    int ratings = 64,
    String stock = 'in_stock',
  }) => {
    'id': id,
    'name': name,
    'type': 'simple',
    'image_url': demoImage(image),
    'price': _money(
      price.replaceAll(RegExp(r'[^0-9]'), ''),
      regular: was?.replaceAll(RegExp(r'[^0-9]'), ''),
      formatted: price,
      regularFormatted: was,
    ),
    'rating': rating,
    'rating_count': ratings,
    'stock_status': stock,
    'purchasable': true,
    'digital': false,
  };

  static final _products = [
    _product(
      21,
      'Blush Rose Bouquet',
      'product-roses',
      '₺1,290',
      was: '₺1,490',
      ratings: 128,
    ),
    _product(22, 'White Orchid in Ceramic Pot', 'product-orchid', '₺1,850'),
    _product(
      23,
      'Turkish Coffee Gift Set',
      'product-coffee',
      '₺940',
      rating: 4.9,
      ratings: 87,
    ),
    _product(
      24,
      'Rose Turkish Delight Box',
      'product-delight',
      '₺420',
      was: '₺520',
      ratings: 211,
    ),
    _product(25, 'Fig & Cedar Candle', 'product-candle', '₺560', ratings: 42),
    _product(
      26,
      'Spring Tulip Bunch',
      'product-tulips',
      '₺690',
      rating: 4.7,
      ratings: 55,
    ),
    _product(27, 'Birthday Surprise Box', 'product-gift', '₺1,450'),
    _product(28, 'Linden Tea Tin', 'product-tea', '₺280', ratings: 33),
  ];

  static List<Map<String, dynamic>> get _productCategories => [
    {
      ...productCategoryJson(id: 5, name: 'Flowers'),
      'count': 24,
      'image_url': demoImage('category-flowers'),
    },
    {
      ...productCategoryJson(id: 6, name: 'Gift boxes'),
      'count': 12,
      'image_url': demoImage('category-gifts'),
    },
    {
      ...productCategoryJson(id: 7, name: 'Sweets'),
      'count': 18,
      'image_url': demoImage('category-sweets'),
    },
    {
      ...productCategoryJson(id: 8, name: 'Home'),
      'count': 9,
      'image_url': demoImage('category-home'),
    },
  ];

  @override
  Future<List<StoreHomeSection>> getStoreHome() => super.getStoreHome().then(
    (_) => [
      for (final s in [
        {
          'type': 'banner',
          'title': 'Same-day delivery in Istanbul',
          'banner': {
            'image_url': demoImage('banner-store'),
            'link_product_id': null,
            'link_category_id': 5,
          },
        },
        {'type': 'categories', 'title': null, 'categories': _productCategories},
        {
          'type': 'featured_products',
          'title': 'Fresh this week',
          'products': _products.take(4).toList(),
        },
        {
          'type': 'sale_products',
          'title': null,
          'products': [_products[3], _products[0]],
        },
        {
          'type': 'best_sellers',
          'title': null,
          'products': _products.skip(4).toList(),
        },
      ])
        StoreHomeSection.fromJson(s),
    ],
  );

  @override
  Future<List<ProductCategory>> listProductCategories() =>
      super.listProductCategories().then(
        (_) => [
          for (final c in _productCategories) ProductCategory.fromJson(c),
        ],
      );

  @override
  Future<Paged<ProductSummary>> listProducts(ProductQuery query) => super
      .listProducts(query)
      .then(
        (_) => Paged.fromJson(pageJson(_products), ProductSummary.fromJson),
      );

  static Map<String, dynamic> _productDetail() => {
    ..._products.first,
    'description_html':
        '<p>Fifteen garden roses in soft blush and cream, with eucalyptus '
        'and wax flower, hand-tied by our florists in Nişantaşı on the '
        'morning of delivery.</p>'
        '<p>Comes in recyclable paper with a care card and flower food. '
        'Lasts 7 to 10 days with fresh water.</p>',
    'short_description_html':
        '<p>Fifteen garden roses with eucalyptus, hand-tied on the day.</p>',
    'images': [
      {'url': demoImage('product-roses'), 'alt': 'Blush Rose Bouquet'},
      {'url': demoImage('product-tulips'), 'alt': null},
      {'url': demoImage('product-gift'), 'alt': null},
    ],
    'sku': 'LF-ROSE-15',
    'max_quantity': 5,
    'attributes': <Object>[],
    'variations': <Object>[],
    'categories': [_productCategories.first],
    'related': [_products[1], _products[5], _products[3]],
    'external_url': null,
    'permalink': 'https://example.com/product/blush-rose-bouquet',
  };

  /// The cart as the device keeps it (`CartController.storageKey`).
  static List<Map<String, dynamic>> cartItems() => [
    for (final (p, q) in [
      (_products[0], 1),
      (_products[2], 2),
      (_products[4], 1),
    ])
      {
        'product_id': p['id'],
        'variation_id': null,
        'quantity': q,
        'name': p['name'],
        'attributes': <String, String>{},
        'image_url': p['image_url'],
        'price': (p['price'] as Map)['formatted'],
        'max_quantity': 5,
      },
  ];

  static Map<String, dynamic> _cartQuote() => {
    'lines': [
      for (final (p, q, total) in [
        (_products[0], 1, '₺1,290'),
        (_products[2], 2, '₺1,880'),
        (_products[4], 1, '₺560'),
      ])
        {
          'product_id': p['id'],
          'variation_id': null,
          'quantity': q,
          'name': p['name'],
          'image_url': p['image_url'],
          'unit_price': (p['price'] as Map)['formatted'],
          'line_total': total,
          'available': true,
          'problem': null,
          'max_quantity': 5,
          'digital': false,
        },
    ],
    'item_count': 4,
    'subtotal': '₺3,730',
    'subtotal_amount': '3730.00',
    'currency': 'TRY',
  };

  @override
  Future<ReviewPage> listProductReviews(int productId, {int page = 1}) =>
      listReviews(productId, page: page);

  // ------------------------------------------------------------ Bookings

  static Map<String, dynamic> _bookingPrice(String amount, String label) => {
    'amount': amount,
    'currency': 'TRY',
    'formatted': label,
    'free': false,
  };

  static Map<String, dynamic> _service(
    int id,
    String name,
    String image,
    int minutes,
    String amount,
    String label, {
    int category = 1,
    String color = '#2E6E5A',
  }) => {
    'id': id,
    'name': name,
    'image_url': demoImage(image),
    'duration_minutes': minutes,
    'price': _bookingPrice(amount, label),
    'category_id': category,
    'color': color,
  };

  static final _services = [
    _service(1, 'Haircut & blow-dry', 'service-cut', 45, '850.00', '₺850'),
    _service(
      2,
      'Balayage colour',
      'service-colour',
      180,
      '3200.00',
      '₺3,200',
      color: '#A34D7A',
    ),
    _service(
      3,
      'Hot stone massage',
      'service-massage',
      60,
      '1400.00',
      '₺1,400',
      category: 2,
      color: '#8C7650',
    ),
    _service(
      4,
      'Gel manicure',
      'service-nails',
      45,
      '600.00',
      '₺600',
      category: 3,
      color: '#C9644E',
    ),
    _service(
      5,
      'Hydrating facial',
      'service-facial',
      50,
      '1100.00',
      '₺1,100',
      category: 2,
      color: '#52709C',
    ),
    _service(
      6,
      'Brow shaping & tint',
      'service-brows',
      30,
      '450.00',
      '₺450',
      category: 3,
      color: '#9C7B4C',
    ),
  ];

  static Map<String, dynamic> _staff(int id, String name, String title) => {
    'id': id,
    'name': name,
    'image_url': null,
    'title': title,
    'price': null,
  };

  static final _team = [
    _staff(1, 'Ayşe Kaya', 'Senior stylist'),
    _staff(2, 'Elif Demir', 'Colour specialist'),
    _staff(3, 'Mehmet Arslan', 'Massage therapist'),
  ];

  static const _serviceCategories = [
    {'id': 1, 'name': 'Hair', 'count': 8, 'image_url': null},
    {'id': 2, 'name': 'Spa', 'count': 5, 'image_url': null},
    {'id': 3, 'name': 'Nails & brows', 'count': 6, 'image_url': null},
  ];

  @override
  Future<List<BookingsHomeSection>> getBookingsHome() =>
      super.getBookingsHome().then(
        (_) => [
          for (final s in [
            {
              'type': 'next_appointment',
              'title': null,
              'appointment': _appointment(),
            },
            {
              'type': 'categories',
              'title': null,
              'categories': _serviceCategories,
            },
            {'type': 'services', 'title': 'Popular', 'services': _services},
            {'type': 'staff', 'title': null, 'staff': _team},
          ])
            BookingsHomeSection.fromJson(s),
        ],
      );

  @override
  Future<List<ServiceCategory>> listServiceCategories() =>
      super.listServiceCategories().then(
        (_) => [
          for (final c in _serviceCategories) ServiceCategory.fromJson(c),
        ],
      );

  @override
  Future<Paged<ServiceSummary>> listServices({
    int page = 1,
    String? search,
    int? category,
  }) => super
      .listServices(page: page, search: search, category: category)
      .then(
        (_) => Paged.fromJson(
          pageJson([
            for (final s in _services)
              if (category == null || s['category_id'] == category) s,
          ]),
          ServiceSummary.fromJson,
        ),
      );

  static Map<String, dynamic> _serviceDetail() => {
    ..._services.first,
    'description_html':
        '<p>A consultation, wash, precision cut and blow-dry. Tell us how '
        'you wear your hair day to day and we will suggest a shape that '
        'is easy to keep.</p>'
        '<p>Please arrive five minutes early. Free cancellation up to an '
        'hour before.</p>',
    'staff': [
      _team[0],
      {..._team[1], 'price': _bookingPrice('950.00', '₺950')},
    ],
  };

  @override
  Future<Availability> getAvailability(
    int serviceId, {
    required String from,
    int? staffId,
    int days = 7,
  }) => super
      .getAvailability(serviceId, from: from, staffId: staffId, days: days)
      .then((_) {
        final json = availabilityJson(from);
        const times = [
          '09:30',
          '10:15',
          '11:00',
          '13:30',
          '14:15',
          '15:00',
          '16:30',
          '17:15',
        ];
        var day = 0;
        for (final d in (json['days'] as List).cast<Map<String, dynamic>>()) {
          final date = DateTime.parse(d['date'] as String);
          if (date.weekday == DateTime.sunday) continue;
          d['slots'] = [
            for (final (i, t) in times.indexed)
              if ((i + day) % 4 != 1)
                () {
                  final start = DateTime.utc(
                    date.year,
                    date.month,
                    date.day,
                    int.parse(t.substring(0, 2)) - 3,
                    int.parse(t.substring(3)),
                  );
                  return {
                    'start': start.toIso8601String(),
                    'end': start
                        .add(const Duration(minutes: 45))
                        .toIso8601String(),
                    'local_time': t,
                    'staff_ids': [1, 2],
                  };
                }(),
          ];
          day++;
        }
        return Availability.fromJson(json);
      });

  static Map<String, dynamic> _appointment() => {
    ...appointmentJson(),
    'service': {
      'id': 1,
      'name': 'Haircut & blow-dry',
      'image_url': demoImage('service-cut'),
    },
    'staff': _team.first,
    'price': _bookingPrice('850.00', '₺850'),
    'local_time': '10:15',
  };

  @override
  Future<Paged<Appointment>> listMyAppointments({
    AppointmentsFilter filter = AppointmentsFilter.upcoming,
    int page = 1,
  }) => super
      .listMyAppointments(filter: filter, page: page)
      .then(
        (_) => Paged.fromJson(pageJson([_appointment()]), Appointment.fromJson),
      );

  // --------------------------------------------------------- Real estate

  static Map<String, dynamic> _home(
    int id,
    String title,
    String image, {
    required String purpose,
    required String amount,
    required String price,
    required String type,
    required String typeLabel,
    required String city,
    required String district,
    required int area,
    required int bedrooms,
    required int bathrooms,
    bool featured = false,
    bool favorited = false,
  }) => {
    'id': id,
    'reference': 'NH-$id',
    'title': title,
    'purpose': purpose,
    'type': type,
    'type_label': typeLabel,
    'price': {
      'amount': amount,
      'currency': 'EGP',
      'formatted': price,
      'period': purpose == 'rent' ? 'month' : null,
      'negotiable': purpose == 'sale',
    },
    'image_url': demoImage(image),
    'city': city,
    'district': district,
    'area': area,
    'bedrooms': bedrooms,
    'bathrooms': bathrooms,
    'featured': featured,
    'favorited': favorited,
  };

  static List<Map<String, dynamic>> _listings(bool arabic) => [
    _home(
      1042,
      arabic
          ? 'شقة مشرقة بإطلالة على النيل'
          : 'Bright apartment with a Nile view',
      'home-nile',
      purpose: 'sale',
      amount: '12500000.00',
      price: arabic ? '12,500,000 ج.م' : 'EGP 12,500,000',
      type: 'apartment',
      typeLabel: arabic ? 'شقة' : 'Apartment',
      city: arabic ? 'القاهرة' : 'Cairo',
      district: arabic ? 'الزمالك' : 'Zamalek',
      area: 185,
      bedrooms: 3,
      bathrooms: 2,
      featured: true,
    ),
    _home(
      1043,
      arabic ? 'دوبلكس بحديقة خاصة' : 'Garden duplex with a private pool',
      'home-duplex',
      purpose: 'rent',
      amount: '45000.00',
      price: arabic ? '45,000 ج.م' : 'EGP 45,000',
      type: 'duplex',
      typeLabel: arabic ? 'دوبلكس' : 'Duplex',
      city: arabic ? 'القاهرة' : 'Cairo',
      district: arabic ? 'التجمع الخامس' : 'New Cairo',
      area: 260,
      bedrooms: 4,
      bathrooms: 3,
      favorited: true,
    ),
    _home(
      1044,
      arabic ? 'فيلا حديثة في الشيخ زايد' : 'Modern villa in Sheikh Zayed',
      'home-villa',
      purpose: 'sale',
      amount: '28000000.00',
      price: arabic ? '28,000,000 ج.م' : 'EGP 28,000,000',
      type: 'villa',
      typeLabel: arabic ? 'فيلا' : 'Villa',
      city: arabic ? 'الجيزة' : 'Giza',
      district: arabic ? 'الشيخ زايد' : 'Sheikh Zayed',
      area: 420,
      bedrooms: 5,
      bathrooms: 4,
      featured: true,
    ),
    _home(
      1045,
      arabic ? 'استوديو مفروش في المعادي' : 'Furnished studio in Maadi',
      'home-studio',
      purpose: 'rent',
      amount: '18000.00',
      price: arabic ? '18,000 ج.م' : 'EGP 18,000',
      type: 'apartment',
      typeLabel: arabic ? 'شقة' : 'Apartment',
      city: arabic ? 'القاهرة' : 'Cairo',
      district: arabic ? 'المعادي' : 'Maadi',
      area: 70,
      bedrooms: 1,
      bathrooms: 1,
    ),
    _home(
      1046,
      arabic ? 'بنتهاوس مع تراس على السطح' : 'Penthouse with a roof terrace',
      'home-penthouse',
      purpose: 'sale',
      amount: '9750000.00',
      price: arabic ? '9,750,000 ج.م' : 'EGP 9,750,000',
      type: 'apartment',
      typeLabel: arabic ? 'شقة' : 'Apartment',
      city: arabic ? 'القاهرة' : 'Cairo',
      district: arabic ? 'مصر الجديدة' : 'Heliopolis',
      area: 210,
      bedrooms: 3,
      bathrooms: 3,
    ),
  ];

  Map<String, dynamic> _listingDetail(
    Map<String, dynamic> summary,
    List<Map<String, dynamic>> similar,
  ) => {
    ...summary,
    'description_html': arabic
        ? '<p>شقة على زاوية في الطابق السابع مع شرفتين تطلان على النيل، ومطبخ مفتوح وغرفة نوم رئيسية بحمام خاص.</p>'
        : '<p>A sunny corner apartment on the seventh floor with '
              '<strong>two balconies</strong> facing the Nile, an open '
              'kitchen and a main bedroom with its own bathroom.</p>'
              '<p>Five minutes’ walk from the Cairo Marriott and the '
              'Zamalek cafés on 26th of July Street.</p>',
    'images': [
      {'url': demoImage('home-nile'), 'alt': 'Building'},
      {'url': demoImage('home-living'), 'alt': 'Living room'},
      {'url': demoImage('home-kitchen'), 'alt': 'Kitchen'},
      {'url': demoImage('home-bedroom'), 'alt': 'Bedroom'},
    ],
    'video_url': null,
    'features': arabic
        ? ['مصعد', 'شرفة', 'أمن 24 ساعة', 'موقف سيارات', 'تكييف مركزي']
        : [
            'Elevator',
            'Two balconies',
            '24-hour security',
            'Parking',
            'Central air',
          ],
    'floor': 7,
    'year_built': 2019,
    'furnished': false,
    'location': {
      'address': arabic
          ? '12 شارع حسن صبري، الزمالك، القاهرة'
          : '12 Hassan Sabry Street, Zamalek, Cairo',
      'latitude': 30.06,
      'longitude': 31.22,
    },
    'similar': similar,
    'created_at': '2026-10-01T09:00:00Z',
  };

  @override
  Future<ListingFilters> getListingFilters() => super.getListingFilters().then(
    (_) => ListingFilters.fromJson({
      ...listingFiltersJson(),
      'types': [
        {
          'key': 'apartment',
          'label': arabic ? 'شقة' : 'Apartment',
          'count': 48,
        },
        {'key': 'villa', 'label': arabic ? 'فيلا' : 'Villa', 'count': 12},
        {'key': 'duplex', 'label': arabic ? 'دوبلكس' : 'Duplex', 'count': 9},
      ],
      'cities': [
        {
          'name': arabic ? 'القاهرة' : 'Cairo',
          'count': 54,
          'districts': arabic
              ? ['الزمالك', 'المعادي', 'التجمع الخامس', 'مصر الجديدة']
              : ['Zamalek', 'Maadi', 'New Cairo', 'Heliopolis'],
        },
        {
          'name': arabic ? 'الجيزة' : 'Giza',
          'count': 15,
          'districts': arabic ? ['الشيخ زايد'] : ['Sheikh Zayed'],
        },
      ],
    }),
  );
}
