import 'dart:async';

import 'api_exception.dart';
import 'models.dart';
import 'owner_api.dart';

/// 59 The Owner API in memory: sample apps of every kind, with the rules the
/// contract describes (features per app, next statuses, check-in outcomes,
/// limits). The widget tests drive it, and `--dart-define=YB_DEMO=true` runs
/// the app on it.
class FakeOwnerApi implements OwnerApi {
  FakeOwnerApi({DateTime? now, this.latency = Duration.zero})
    : now = now ?? DateTime.now() {
    _seed();
  }

  static const demoEmail = 'owner@example.com';
  static const demoPassword = 'yallapp-demo';

  /// Everything relative to this moment.
  final DateTime now;

  /// Time each call takes (the demo shows its loading states).
  final Duration latency;

  // What tests change.
  AccountState state = AccountState.active;
  String? stateMessage;
  bool staffOnly = false;

  /// 70 The account has two-step sign-in: sign-in needs this code as `otp`
  /// (each code once).
  String? twoStepCode;
  final _usedCodes = <String>{};
  String? language;
  bool pushAvailable = true;

  /// Thrown by the next call, then cleared.
  ApiException? failNext;

  /// Thrown once by the next call of that operation (`today`, `orders`…).
  final failOn = <String, ApiException>{};

  /// Every call, by its operation name.
  final calls = <String>[];

  late List<AppSummary> apps;
  final devicesList = <Device>[];
  var preferences = const PushPreferences({});
  String? pushToken;
  final updatesList = <Update>[];
  final _orders = <String, List<Order>>{};
  final _appointments = <String, List<Appointment>>{};
  final _events = <String, List<EventSummary>>{};
  final _tickets = <String, ({int eventId, String holder, DateTime? usedAt})>{};
  final _donations = <String, List<Donation>>{};
  final _campaigns = <String, List<CampaignTotals>>{};
  final _products = <String, List<Product>>{};
  final _courses = <String, List<Course>>{};
  final _articles = <String, List<Article>>{};
  final _listings = <String, List<Listing>>{};
  final _media = <String, List<MediaFile>>{};
  final uploads = <String, ({String appId, int size, List<int> bytes})>{};
  final _inquiries = <String, List<InquiryDetail>>{};
  final _users = <String, List<AppUser>>{};
  final _sent = <String, List<SentNotification>>{};
  final _scheduled = <String, List<ScheduledNotification>>{};
  // 63 Course questions and reviews, a gym's members and today's check-ins.
  final _questions = <String, List<QuestionDetail>>{};
  final _reviews = <String, List<Review>>{};
  final _members = <String, List<Member>>{};
  final _visits = <String, List<MemberVisit>>{};
  final _memberCodes = <String, int>{};
  // 77 The app's chat: conversations, their messages, reports, switches.
  final chatThreads = <String, List<ChatThread>>{};
  final chatMessagesOf = <String, List<ChatMessage>>{};
  final chatReportsOf = <String, List<ChatReport>>{};
  final chatSettingsOf = <String, ChatSettings>{};
  final chatReads = <String, String>{};
  final chatBlocked = <String>{};
  int _nextChatId = 900;
  // 60 Team members: the person's role here, their businesses, the owner's team.
  TeamRole role = TeamRole.owner;
  var businesses = const <Business>[];
  final teamMembers = <TeamMember>[];
  final invitations = <TeamInvitation>[];
  int _sentThisHour = 0;
  int _nextId = 5000;
  int _sessions = 0;

  static const restaurantId = '11111111-1111-4111-8111-111111111111';
  static const clinicId = '22222222-2222-4222-8222-222222222222';
  static const eventsId = '33333333-3333-4333-8333-333333333333';
  static const charityId = '44444444-4444-4444-8444-444444444444';
  static const academyId = '55555555-5555-4555-8555-555555555555';
  static const homesId = '66666666-6666-4666-8666-666666666666';
  static const newsId = '77777777-7777-4777-8777-777777777777';
  // 63 A gym, for members at the door.
  static const gymId = '88888888-8888-4888-8888-888888888888';

  /// Sara Adel's member code (membership 1 of the gym), typed and as a QR.
  static const memberCode = 'Q4MZ7KP2XH9D';
  static const memberQr = 'YM1.1.$memberCode';

  static const ticketCode = 'YT1.A7K2-9QXM.3f9a1c';

  Future<void> _call(String name, {bool needsActive = true}) async {
    calls.add(name);
    if (latency > Duration.zero) await Future<void>.delayed(latency);
    final fail = failNext ?? failOn.remove(name.split(':').first);
    if (fail != null) {
      failNext = null;
      throw fail;
    }
    if (needsActive && state.blocked) {
      throw ApiException(
        code: state == AccountState.pending
            ? ApiException.accountPending
            : ApiException.accountSuspended,
        message: stateMessage ?? '',
        statusCode: 403,
      );
    }
  }

  AppSummary _app(String appId, [bool Function(AppFeatures f)? feature]) {
    final app = apps.where((a) => a.id == appId).firstOrNull;
    if (app == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    if (feature != null && !feature(app.features)) {
      throw const ApiException(
        code: ApiException.notAvailable,
        statusCode: 404,
      );
    }
    return app;
  }

  static Money money(int cents, [String currency = 'TRY']) {
    final symbol = switch (currency) {
      'TRY' => '₺',
      'EGP' => 'E£',
      'USD' => r'$',
      _ => '$currency ',
    };
    final whole = (cents.abs() ~/ 100).toString().replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (_) => ',',
    );
    final sign = cents < 0 ? '-' : '';
    return Money(
      amountCents: cents,
      currency: currency,
      formatted:
          '$sign$symbol$whole.${(cents.abs() % 100).toString().padLeft(2, '0')}',
    );
  }

  /// lib/media/quota.ts formatBytes: "49 MB", "1.5 GB", "20 GB".
  static String sizeText(int bytes) {
    if (bytes < 1024) return '$bytes B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    var value = bytes / 1024;
    var unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    final whole = value >= 100 || value == value.roundToDouble();
    final text = whole
        ? value.round().toString()
        : value.toStringAsFixed(1).replaceFirst(RegExp(r'\.0$'), '');
    return '$text ${units[unit]}';
  }

  DateTime _ago(Duration d) => now.subtract(d).toUtc();
  String _day(DateTime t) =>
      '${t.year.toString().padLeft(4, '0')}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}';

  void _seed() {
    final plan = PlanSummary(
      id: 'growth',
      name: 'Growth',
      expiresAt: now.add(const Duration(days: 120)).toUtc(),
      daysLeft: 120,
    );
    apps = [
      AppSummary(
        id: restaurantId,
        name: 'Bab Al Sham',
        type: 'store',
        vertical: 'restaurant',
        typeName: 'Restaurant & café',
        backend: 'hosted',
        state: AccountState.active,
        plan: plan,
        features: const AppFeatures(
          orders: true,
          kitchen: true,
          products: true,
          // 77 Its customers write to it.
          chat: true,
          appUsers: true,
          notifications: true,
          media: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
      AppSummary(
        id: clinicId,
        name: 'Nour Clinic',
        type: 'booking',
        vertical: 'clinic',
        typeName: 'Clinic',
        backend: 'hosted',
        state: AccountState.active,
        plan: plan,
        features: const AppFeatures(
          appointments: true,
          appUsers: true,
          notifications: true,
          media: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
      AppSummary(
        id: eventsId,
        name: 'Cairo Nights',
        type: 'events',
        typeName: 'Events & tickets',
        backend: 'hosted',
        state: AccountState.active,
        plan: plan,
        features: const AppFeatures(
          orders: true,
          events: true,
          checkIn: true,
          appUsers: true,
          notifications: true,
          media: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
      AppSummary(
        id: charityId,
        name: 'Hope Foundation',
        type: 'donations',
        vertical: 'charity',
        typeName: 'Charity & donations',
        backend: 'hosted',
        state: AccountState.active,
        plan: plan,
        features: const AppFeatures(
          donations: true,
          appUsers: true,
          notifications: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
      AppSummary(
        id: academyId,
        name: 'Nile Academy',
        type: 'lms',
        typeName: 'Academy',
        backend: 'hosted',
        state: AccountState.active,
        plan: plan,
        features: const AppFeatures(
          orders: true,
          courses: true,
          questions: true,
          reviews: true,
          appUsers: true,
          notifications: true,
          media: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
      AppSummary(
        id: homesId,
        name: 'Bosphorus Homes',
        type: 'real_estate',
        typeName: 'Real estate',
        backend: 'hosted',
        state: AccountState.active,
        plan: plan,
        features: const AppFeatures(
          listings: true,
          inquiries: true,
          appUsers: true,
          notifications: true,
          media: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
      AppSummary(
        id: newsId,
        name: 'Daily Delta',
        type: 'news',
        typeName: 'News & blog',
        backend: 'hosted',
        state: AccountState.expired,
        plan: null,
        features: const AppFeatures(
          articles: true,
          appUsers: true,
          notifications: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
    ];

    apps.add(
      AppSummary(
        id: gymId,
        name: 'Pulse Gym',
        type: 'booking',
        vertical: 'fitness',
        typeName: 'Gym & fitness',
        backend: 'hosted',
        state: AccountState.active,
        plan: plan,
        features: const AppFeatures(
          orders: true,
          appointments: true,
          memberCheckIn: true,
          appUsers: true,
          notifications: true,
          media: true,
          analytics: true,
          preview: true,
          builds: true,
        ),
      ),
    );
    _seedCommunity();
    _seedGym();

    devicesList
      ..clear()
      ..add(
        Device(
          id: 'd0000000-0000-4000-8000-000000000002',
          name: 'iPad of Layla',
          platform: 'ios',
          appVersion: '1.0.0',
          createdAt: _ago(const Duration(days: 20)),
          lastSeenAt: _ago(const Duration(days: 2)),
          current: false,
          push: true,
        ),
      );

    updatesList
      ..clear()
      ..addAll([
        Update(
          key: 'account:build:1',
          kind: 'account',
          kindLabel: 'Your account',
          title: 'Your app build is ready',
          body: 'Version 2.3.0 is ready to download and publish.',
          summary: 'Version 2.3.0 is ready to download and publish.',
          appName: 'Bab Al Sham',
          at: _ago(const Duration(hours: 3)),
          unread: true,
          current: true,
        ),
        Update(
          key: 'announcement:maintenance',
          kind: 'maintenance',
          kindLabel: 'Maintenance',
          title: 'Planned maintenance on Sunday',
          body: 'The dashboard may be **slow** for a few minutes between 02:00 and 02:30.',
          summary: 'The dashboard may be slow for a few minutes between 02:00 and 02:30.',
          at: _ago(const Duration(days: 1)),
          unread: true,
          current: true,
        ),
        Update(
          key: 'announcement:feature',
          kind: 'update',
          kindLabel: 'Update',
          title: 'Kitchen mode is here',
          body: 'Follow every order from the kitchen on a tablet.',
          summary: 'Follow every order from the kitchen on a tablet.',
          link: 'https://yallapp.com.tr/blog',
          linkLabel: 'Read about Kitchen mode',
          at: _ago(const Duration(days: 6)),
          unread: false,
          current: false,
        ),
      ]);

    // Restaurant orders.
    Order order(
      int id,
      String step,
      Duration ago, {
      String type = 'pickup',
      String status = 'processing',
    }) {
      final next = switch (step) {
        'received' => ['preparing', 'cancelled'],
        'preparing' => ['ready', 'cancelled'],
        'ready' => [
          if (type == 'delivery') 'out_for_delivery' else 'completed',
          'cancelled',
        ],
        'out_for_delivery' => ['completed', 'cancelled'],
        _ => <String>[],
      };
      return Order(
        id: id,
        number: '$id',
        status: status,
        statusLabel: _statusLabel(status),
        kitchen: OrderKitchen(
          type: type,
          step: step,
          stepLabel: _stepLabel(step),
        ),
        total: money(48500),
        lines: [
          OrderLine(
            name: 'Chicken shawarma',
            quantity: 2,
            unit: money(16500),
            options: const ['Extra garlic'],
          ),
          OrderLine(name: 'Fresh lemonade', quantity: 2, unit: money(7750)),
        ],
        customer: Customer(
          name: id.isEven ? 'Ahmed Yilmaz' : 'Sara Hassan',
          phone: '+90 555 010 ${id % 100}',
          email: 'guest$id@example.com',
          city: 'Istanbul',
          address: type == 'delivery' ? 'Moda Cd. 12, Kadıköy' : null,
        ),
        createdAt: _ago(ago),
        paidAt: _ago(ago),
        nextStatuses: status == 'processing' ? next : const [],
      );
    }

    _orders[restaurantId] = [
      order(1042, 'received', const Duration(minutes: 4), type: 'delivery'),
      order(1041, 'preparing', const Duration(minutes: 18)),
      order(1040, 'ready', const Duration(minutes: 35), type: 'delivery'),
      order(1039, 'completed', const Duration(hours: 3), status: 'completed'),
      order(1038, 'cancelled', const Duration(hours: 6), status: 'cancelled'),
    ];
    _orders[eventsId] = [
      Order(
        id: 2201,
        number: '2201',
        status: 'completed',
        statusLabel: 'Completed',
        total: money(90000),
        lines: [
          OrderLine(
            name: 'Jazz on the Nile · Standard',
            quantity: 2,
            unit: money(45000),
          ),
        ],
        customer: const Customer(
          name: 'Omar Farouk',
          email: 'omar@example.com',
        ),
        createdAt: _ago(const Duration(hours: 5)),
        paidAt: _ago(const Duration(hours: 5)),
        nextStatuses: const [],
      ),
    ];
    _orders[academyId] = [
      Order(
        id: 3301,
        number: '3301',
        status: 'processing',
        statusLabel: 'In progress',
        total: money(125000),
        lines: [
          OrderLine(
            name: 'Arabic for beginners',
            quantity: 1,
            unit: money(125000),
          ),
        ],
        customer: const Customer(name: 'Elif Demir', email: 'elif@example.com'),
        createdAt: _ago(const Duration(hours: 2)),
        paidAt: _ago(const Duration(hours: 2)),
        nextStatuses: const ['completed', 'cancelled'],
      ),
    ];

    Appointment appt(int id, String status, Duration from, String name) {
      final start = now.add(from);
      final hh = start.hour.toString().padLeft(2, '0');
      final mm = start.minute.toString().padLeft(2, '0');
      return Appointment(
        id: id,
        status: status,
        statusLabel: _apptLabel(status),
        service: 'Dental check-up',
        staff: 'Dr. Mona Adel',
        customerName: name,
        customerPhone: '+20 100 000 0$id',
        customerEmail: null,
        startAt: start.toUtc(),
        endAt: start.add(const Duration(minutes: 30)).toUtc(),
        localDate: _day(start),
        localTime: '$hh:$mm',
        price: money(60000, 'EGP'),
        notes: id == 701 ? 'First visit' : null,
        answers: const [(label: 'Insurance', value: 'None')],
        nextStatuses: _apptNext(status),
        canReschedule: _movable(status, start),
      );
    }

    _appointments[clinicId] = [
      appt(701, 'pending', const Duration(hours: 1), 'Yusuf Kaya'),
      appt(702, 'approved', const Duration(hours: 3), 'Mariam Ali'),
      appt(703, 'pending', const Duration(days: 2), 'Hasan Çelik'),
      appt(704, 'completed', const Duration(days: -1), 'Nadia Salem'),
    ];

    _events[eventsId] = [
      EventSummary(
        id: 81,
        title: 'Jazz on the Nile',
        status: 'published',
        startAt: now.add(const Duration(hours: 2)).toUtc(),
        endAt: now.add(const Duration(hours: 5)).toUtc(),
        venue: 'Cairo Opera House',
        valid: 118,
        used: 24,
        capacity: 200,
      ),
      EventSummary(
        id: 82,
        title: 'Startup breakfast',
        status: 'published',
        startAt: now.add(const Duration(days: 3)).toUtc(),
        endAt: now.add(const Duration(days: 3, hours: 2)).toUtc(),
        venue: null,
        valid: 40,
        used: 0,
        capacity: null,
      ),
    ];
    _tickets
      ..clear()
      ..[ticketCode] = (eventId: 81, holder: 'Karim Mostafa', usedAt: null)
      ..['A7K2-USED'] = (
        eventId: 81,
        holder: 'Laila Nasser',
        usedAt: _ago(const Duration(minutes: 12)),
      )
      ..['B8Z1-OTHER'] = (eventId: 82, holder: 'Can Öztürk', usedAt: null);

    _campaigns[charityId] = [
      CampaignTotals(
        id: 11,
        title: 'Winter blankets',
        status: 'active',
        raised: money(1850000, 'EGP'),
        donors: 214,
        goal: money(2500000, 'EGP'),
      ),
      CampaignTotals(
        id: 12,
        title: 'School bags',
        status: 'active',
        raised: money(420000, 'EGP'),
        donors: 51,
        goal: null,
      ),
    ];
    _donations[charityId] = [
      for (var i = 0; i < 6; i++)
        Donation(
          id: 900 + i,
          amount: money(25000 + i * 5000, 'EGP'),
          status: i == 5 ? 'refunded' : 'paid',
          refunded: i == 5 ? money(50000, 'EGP') : null,
          donorName: i == 2
              ? null
              : ['Hana', 'Ali', '', 'Zeynep', 'Mahmoud', 'Rana'][i],
          message: i == 0 ? 'For the families in Aswan' : null,
          campaignId: i.isEven ? 11 : 12,
          campaignTitle: i.isEven ? 'Winter blankets' : 'School bags',
          paidAt: _ago(Duration(hours: i * 5 + 1)),
        ),
    ];

    _products[restaurantId] = [
      Product(
        id: 401,
        name: 'Chicken shawarma',
        price: money(16500),
        salePrice: null,
        stock: null,
        available: true,
        sales: 312,
      ),
      Product(
        id: 402,
        name: 'Falafel plate',
        price: money(12000),
        salePrice: money(9900),
        stock: 25,
        available: true,
        sales: 140,
      ),
      Product(
        id: 403,
        name: 'Kunafa',
        price: money(9500),
        salePrice: null,
        stock: 0,
        available: false,
        sales: 88,
      ),
    ];

    _courses[academyId] = [
      Course(
        id: 61,
        title: 'Arabic for beginners',
        published: true,
        price: money(125000),
        students: 86,
        topics: const [
          Topic(
            id: 601,
            title: 'Letters and sounds',
            lessons: [
              Lesson(
                id: 6001,
                title: 'The alphabet',
                video: 'media',
                mediaId: 'e0000000-0000-4000-8000-000000000001',
                durationMinutes: 12,
                preview: true,
              ),
              Lesson(
                id: 6002,
                title: 'Short vowels',
                video: 'link',
                durationMinutes: 9,
                preview: false,
              ),
            ],
          ),
          Topic(id: 602, title: 'First words', lessons: []),
        ],
      ),
      Course(
        id: 62,
        title: 'Business Turkish',
        published: false,
        price: money(0),
        students: 0,
        topics: const [Topic(id: 621, title: 'Introductions', lessons: [])],
      ),
    ];

    _articles[newsId] = [
      Article(
        id: 71,
        title: 'New bridge opens in Mansoura',
        status: 'published',
        featured: true,
        publishedAt: _ago(const Duration(hours: 4)),
        updatedAt: _ago(const Duration(hours: 4)),
      ),
      Article(
        id: 72,
        title: 'Cotton harvest starts early',
        status: 'draft',
        featured: false,
        publishedAt: null,
        updatedAt: _ago(const Duration(days: 1)),
      ),
    ];
    _listings[homesId] = [
      const Listing(
        id: 51,
        title: 'Sea-view flat in Beşiktaş',
        status: 'published',
        featured: true,
        price: '₺12,500,000',
        city: 'Istanbul',
      ),
      const Listing(
        id: 52,
        title: 'Garden house in Şile',
        status: 'draft',
        featured: false,
        price: '₺8,900,000',
        city: 'Istanbul',
      ),
    ];

    _media[restaurantId] = [
      MediaFile(
        id: 'e0000000-0000-4000-8000-000000000011',
        name: 'menu-cover.jpg',
        kind: 'image',
        contentType: 'image/jpeg',
        sizeBytes: 820000,
        status: 'ready',
        public: true,
        link: 'https://yallapp.com.tr/m/e0000000-0000-4000-8000-000000000011',
        createdAt: _ago(const Duration(days: 3)),
      ),
      MediaFile(
        id: 'e0000000-0000-4000-8000-000000000012',
        name: 'kitchen-tour.mp4',
        kind: 'video',
        contentType: 'video/mp4',
        sizeBytes: 48000000,
        status: 'ready',
        public: false,
        link: 'https://yallapp.com.tr/m/e0000000-0000-4000-8000-000000000012',
        createdAt: _ago(const Duration(days: 8)),
      ),
    ];
    _media[academyId] = [
      MediaFile(
        id: 'e0000000-0000-4000-8000-000000000001',
        name: 'alphabet.mp4',
        kind: 'video',
        contentType: 'video/mp4',
        sizeBytes: 120000000,
        status: 'ready',
        public: false,
        link: 'https://yallapp.com.tr/m/e0000000-0000-4000-8000-000000000001',
        createdAt: _ago(const Duration(days: 30)),
      ),
    ];

    _seedChat();

    _inquiries[homesId] = [
      InquiryDetail(
        inquiry: Inquiry(
          id: 31,
          listingId: 51,
          listingTitle: 'Sea-view flat in Beşiktaş',
          person: 'Deniz Arslan',
          status: 'open',
          lastMessage: 'Is the flat still available?',
          unread: 1,
          updatedAt: _ago(const Duration(minutes: 40)),
        ),
        phone: '+90 532 000 0031',
        email: 'deniz@example.com',
        messages: [
          InquiryMessage(
            id: 1,
            fromOffice: false,
            text: 'Hello, is the flat still available?',
            createdAt: _ago(const Duration(minutes: 40)),
          ),
        ],
      ),
      InquiryDetail(
        inquiry: Inquiry(
          id: 32,
          listingId: 52,
          listingTitle: 'Garden house in Şile',
          person: 'Mehmet Aydın',
          status: 'closed',
          lastMessage: 'Thank you!',
          unread: 0,
          updatedAt: _ago(const Duration(days: 2)),
        ),
        messages: [
          InquiryMessage(
            id: 2,
            fromOffice: false,
            text: 'Can I visit on Saturday?',
            createdAt: _ago(const Duration(days: 3)),
          ),
          InquiryMessage(
            id: 3,
            fromOffice: true,
            text: 'Yes, 11:00 works.',
            createdAt: _ago(const Duration(days: 2, hours: 1)),
          ),
          InquiryMessage(
            id: 4,
            fromOffice: false,
            text: 'Thank you!',
            createdAt: _ago(const Duration(days: 2)),
          ),
        ],
      ),
    ];

    for (final app in apps) {
      _users[app.id] = [
        for (var i = 0; i < 26; i++)
          AppUser(
            id: 100 + i,
            name:
                [
                  'Aylin Kara',
                  'Omar Said',
                  'Fatma Şahin',
                  'Youssef Adel',
                  'Selin Koç',
                  'Huda Kamal',
                ][i % 6] +
                (i < 6 ? '' : ' $i'),
            phone: i.isEven ? '+90 555 000 ${100 + i}' : null,
            email: i.isOdd ? 'user$i@example.com' : null,
            city: i % 3 == 0 ? 'Istanbul' : (i % 3 == 1 ? 'Cairo' : null),
            createdAt: _ago(Duration(days: i)),
          ),
      ];
      _sent[app.id] = [
        SentNotification(
          id: 1,
          title: 'Weekend offer',
          body: '20% off every order this weekend.',
          sentAt: _ago(const Duration(days: 4)),
        ),
      ];
    }
  }

  static String _statusLabel(String status) => switch (status) {
    'processing' => 'In progress',
    'completed' => 'Completed',
    'cancelled' => 'Cancelled',
    'refunded' => 'Refunded',
    _ => status,
  };

  static String _stepLabel(String step) => switch (step) {
    'received' => 'New',
    'preparing' => 'Preparing',
    'ready' => 'Ready',
    'out_for_delivery' => 'Out for delivery',
    'completed' => 'Completed',
    'cancelled' => 'Cancelled',
    _ => step,
  };

  static String _apptLabel(String status) => switch (status) {
    'pending' => 'To confirm',
    'approved' => 'Confirmed',
    'rejected' => 'Declined',
    'cancelled' => 'Cancelled',
    'completed' => 'Completed',
    'no_show' => 'No-show',
    _ => status,
  };

  bool _movable(String status, DateTime start) =>
      (status == 'pending' || status == 'approved') && start.isAfter(now);

  static const _staff = [
    (id: 1, name: 'Dr. Mona Adel'),
    (id: 2, name: 'Dr. Karim Nabil'),
  ];

  Appointment _copy(
    Appointment a, {
    String? status,
    String? staff,
    DateTime? start,
  }) {
    final s = status ?? a.status;
    final at = start ?? a.startAt.toLocal();
    final hh = at.hour.toString().padLeft(2, '0');
    final mm = at.minute.toString().padLeft(2, '0');
    return Appointment(
      id: a.id,
      status: s,
      statusLabel: _apptLabel(s),
      service: a.service,
      staff: staff ?? a.staff,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      customerEmail: a.customerEmail,
      startAt: at.toUtc(),
      endAt: at.add(a.endAt.difference(a.startAt)).toUtc(),
      localDate: _day(at),
      localTime: '$hh:$mm',
      price: a.price,
      notes: a.notes,
      answers: a.answers,
      nextStatuses: _apptNext(s),
      canReschedule: _movable(s, at),
    );
  }

  static List<String> _apptNext(String status) => switch (status) {
    'pending' => const ['approved', 'rejected'],
    'approved' => const ['completed', 'no_show', 'cancelled'],
    _ => const [],
  };

  Session _session() {
    _sessions += 1;
    return Session(
      accessToken: 'access-$_sessions',
      accessExpiresAt: DateTime.now().toUtc().add(const Duration(minutes: 15)),
      refreshToken: 'refresh-$_sessions',
      refreshExpiresAt: DateTime.now().toUtc().add(const Duration(days: 60)),
      deviceId: 'd0000000-0000-4000-8000-000000000001',
      accountState: state,
    );
  }

  // Auth

  @override
  Future<Session> signIn({
    required String email,
    required String password,
    required DeviceInfo device,
    String? otp,
  }) async {
    await _call('signIn', needsActive: false);
    if (email.trim().toLowerCase() != demoEmail || password != demoPassword) {
      throw const ApiException(
        code: ApiException.invalidCredentials,
        message: 'The email or password is incorrect.',
        statusCode: 401,
      );
    }
    final code = twoStepCode;
    if (code != null) {
      final sent = otp?.replaceAll(' ', '');
      if (sent == null || sent.isEmpty) {
        throw const ApiException(
          code: ApiException.twoFactorRequired,
          message: 'Enter the 6-digit code from your authenticator app, or a recovery code.',
          statusCode: 401,
        );
      }
      if (sent != code || !_usedCodes.add(sent)) {
        throw const ApiException(
          code: ApiException.invalidTwoFactorCode,
          message: "That code isn't right. Try again, or use a recovery code.",
          statusCode: 401,
        );
      }
    }
    if (staffOnly) {
      throw const ApiException(
        code: ApiException.useWebsite,
        message: 'This account has no apps. Use yallapp.com.tr.',
        statusCode: 403,
      );
    }
    devicesList.removeWhere((d) => d.current);
    devicesList.insert(
      0,
      Device(
        id: 'd0000000-0000-4000-8000-000000000001',
        name: device.name,
        platform: device.platform,
        appVersion: device.appVersion,
        createdAt: DateTime.now().toUtc(),
        lastSeenAt: DateTime.now().toUtc(),
        current: true,
        push: false,
      ),
    );
    return _session();
  }

  @override
  Future<Session> refresh(String refreshToken) async {
    await _call('refresh', needsActive: false);
    return _session();
  }

  @override
  Future<void> signOut() async {
    await _call('signOut', needsActive: false);
    devicesList.removeWhere((d) => d.current);
  }

  @override
  Future<void> signOutAll() async {
    await _call('signOutAll', needsActive: false);
    devicesList.clear();
  }

  @override
  Future<String> passwordResetLink() async {
    await _call('passwordResetLink', needsActive: false);
    return 'https://yallapp.com.tr/forgot-password';
  }

  // Account

  @override
  Future<Me> me() async {
    await _call('me', needsActive: false);
    return Me(
      user: OwnerUser(
        id: 'u0000000-0000-4000-8000-000000000001',
        name: 'Layla Haddad',
        email: demoEmail,
        language: language,
      ),
      state: state,
      stateMessage: state.blocked ? stateMessage : null,
      apps: state.blocked ? const [] : apps,
      business: businesses.isEmpty
          ? null
          : businesses.firstWhere(
              (b) => b.id == _businessId,
              orElse: () => businesses.first,
            ),
      businesses: businesses,
      links: const MeLinks(
        dashboard: 'https://yallapp.com.tr/dashboard',
        supportWhatsapp: 'https://wa.me/201000000000',
        supportWhatsappEgypt: 'https://wa.me/201000000000',
        supportWhatsappInternational: 'https://wa.me/905000000000',
        supportEmail: 'info@yallapp.com.tr',
      ),
    );
  }

  @override
  Future<Me> setLanguage(String? language) async {
    await _call('setLanguage', needsActive: false);
    this.language = language;
    return me();
  }

  @override
  Future<List<Device>> devices() async {
    await _call('devices', needsActive: false);
    return List.of(devicesList);
  }

  @override
  Future<void> signOutDevice(String deviceId) async {
    await _call('signOutDevice', needsActive: false);
    final before = devicesList.length;
    devicesList.removeWhere((d) => d.id == deviceId);
    if (devicesList.length == before) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
  }

  @override
  Future<void> setPushToken(String token, {String provider = 'fcm'}) async {
    await _call('setPushToken', needsActive: false);
    pushToken = token;
  }

  @override
  Future<void> deletePushToken() async {
    await _call('deletePushToken', needsActive: false);
    pushToken = null;
  }

  @override
  Future<PushPreferences> pushPreferences() async {
    await _call('pushPreferences', needsActive: false);
    return PushPreferences({
      for (final kind in PushKind.values) kind: preferences.isOn(kind),
    });
  }

  @override
  Future<PushPreferences> setPushPreferences(PushPreferences value) async {
    await _call('setPushPreferences', needsActive: false);
    preferences = PushPreferences({...preferences.values, ...value.values});
    return pushPreferences();
  }

  // 60 Team members

  String? _businessId;

  /// Makes the signed-in person a Manager or Staff with [areas]: the apps say
  /// so (`access`) and lose what the role doesn't allow, as the server does.
  void joinAs(TeamRole role, {List<String> areas = const []}) {
    this.role = role;
    bool has(String area) => role != TeamRole.staff || areas.contains(area);
    final settings = role != TeamRole.staff;
    apps = [
      for (final a in apps)
        AppSummary(
          id: a.id,
          name: a.name,
          type: a.type,
          typeName: a.typeName,
          state: a.state,
          vertical: a.vertical,
          backend: a.backend,
          iconUrl: a.iconUrl,
          plan: a.plan,
          features: AppFeatures(
            orders: a.features.orders && has('orders'),
            kitchen: a.features.kitchen && has('orders'),
            appointments: a.features.appointments && has('bookings'),
            events: a.features.events && has('events'),
            checkIn: a.features.checkIn && has('events'),
            donations: a.features.donations && has('donations'),
            products: a.features.products && has('catalog'),
            courses: a.features.courses && has('catalog'),
            articles: a.features.articles && has('catalog'),
            listings: a.features.listings && has('catalog'),
            inquiries: a.features.inquiries && has('messages'),
            questions: a.features.questions && has('messages'),
            reviews: a.features.reviews && has('catalog'),
            memberCheckIn: a.features.memberCheckIn && has('bookings'),
            chat: a.features.chat && has('chat'),
            appUsers: a.features.appUsers && has('app_users'),
            notifications: a.features.notifications && has('notifications'),
            media: a.features.media && has('media'),
            analytics: a.features.analytics && has('analytics'),
            preview: a.features.preview,
            builds: a.features.builds && settings,
          ),
          access: AppAccess(
            role: role,
            areas: role == TeamRole.staff ? areas : teamAreas,
            license: false,
            team: false,
            settings: settings,
          ),
        ),
    ];
  }

  void _ownerOnly() {
    if (role != TeamRole.owner) {
      throw const ApiException(
        code: ApiException.notAllowed,
        message: "Your role on this team doesn't allow this. Ask the owner.",
        statusCode: 403,
      );
    }
  }

  @override
  Future<Me> setBusiness(String businessId) async {
    await _call('setBusiness', needsActive: false);
    if (!businesses.any((b) => b.id == businessId)) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    _businessId = businessId;
    return me();
  }

  @override
  Future<Team> team() async {
    await _call('team');
    _ownerOnly();
    return Team(
      members: [
        const TeamMember(
          userId: 'u0000000-0000-4000-8000-000000000001',
          name: 'Layla Haddad',
          email: demoEmail,
          role: TeamRole.owner,
          areas: teamAreas,
        ),
        ...teamMembers,
      ],
      invitations: List.of(invitations),
    );
  }

  @override
  Future<TeamInvitation> inviteTeamMember({
    required String name,
    required String email,
    required TeamRole role,
    List<String> areas = const [],
    List<String>? appIds,
  }) async {
    await _call('inviteTeamMember');
    _ownerOnly();
    if (invitations.any((i) => i.email == email) ||
        teamMembers.any((m) => m.email == email)) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        statusCode: 400,
        fieldErrors: {
          'email': 'This email has an invitation already. Send it again from the list.',
        },
      );
    }
    final invitation = TeamInvitation(
      id: 'i${_nextId++}',
      name: name,
      email: email,
      role: role,
      areas: areas,
      appIds: appIds,
      sentAt: now,
      expiresAt: now.add(const Duration(days: 7)),
      expired: false,
    );
    invitations.insert(0, invitation);
    return invitation;
  }

  @override
  Future<TeamInvitation> resendInvitation(String invitationId) async {
    await _call('resendInvitation');
    _ownerOnly();
    final index = invitations.indexWhere((i) => i.id == invitationId);
    if (index < 0) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    final old = invitations[index];
    return invitations[index] = TeamInvitation(
      id: old.id,
      name: old.name,
      email: old.email,
      role: old.role,
      areas: old.areas,
      appIds: old.appIds,
      sentAt: now,
      expiresAt: now.add(const Duration(days: 7)),
      expired: false,
    );
  }

  @override
  Future<void> cancelInvitation(String invitationId) async {
    await _call('cancelInvitation');
    _ownerOnly();
    invitations.removeWhere((i) => i.id == invitationId);
  }

  @override
  Future<TeamMember> updateTeamMember(
    String userId, {
    required TeamRole role,
    List<String> areas = const [],
    List<String>? appIds,
  }) async {
    await _call('updateTeamMember');
    _ownerOnly();
    final index = teamMembers.indexWhere((m) => m.userId == userId);
    if (index < 0) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    final old = teamMembers[index];
    return teamMembers[index] = TeamMember(
      userId: old.userId,
      name: old.name,
      email: old.email,
      role: role,
      areas: role == TeamRole.staff ? areas : teamAreas,
      appIds: appIds,
      joinedAt: old.joinedAt,
      lastSignInAt: old.lastSignInAt,
    );
  }

  @override
  Future<void> removeTeamMember(String userId) async {
    await _call('removeTeamMember');
    _ownerOnly();
    teamMembers.removeWhere((m) => m.userId == userId);
  }

  @override
  Future<AppSummary> app(String appId) async {
    await _call('app');
    return _app(appId);
  }

  // Updates

  @override
  Future<UpdatesList> updates() async {
    await _call('updates');
    return UpdatesList(
      unread: updatesList.where((u) => u.unread && u.current).length,
      items: List.of(updatesList),
    );
  }

  @override
  Future<int> markUpdatesRead({
    List<String> keys = const [],
    bool all = false,
  }) async {
    await _call('markUpdatesRead');
    for (var i = 0; i < updatesList.length; i++) {
      if (all || keys.contains(updatesList[i].key)) {
        updatesList[i] = updatesList[i].read();
      }
    }
    return updatesList.where((u) => u.unread && u.current).length;
  }

  // Today

  @override
  Future<Today> today(String appId) async {
    await _call('today');
    final app = _app(appId);
    final f = app.features;
    final orders = _orders[appId] ?? const [];
    final processing = orders.where((o) => o.status == 'processing').length;
    final toConfirm = (_appointments[appId] ?? const [])
        .where((a) => a.status == 'pending')
        .length;
    final unanswered = (_inquiries[appId] ?? const [])
        .where((i) => i.inquiry.unread > 0)
        .length;
    final questions = f.questions
        ? (_questions[appId] ?? const [])
              .where((q) => q.question.open && !q.question.hidden)
              .length
        : 0;
    return Today(
      date: _day(now),
      timeZone: 'Europe/Istanbul',
      sales: f.orders ? [money(orders.length * 48500)] : const [],
      donations: f.donations ? [money(185000, 'EGP')] : const [],
      counts: TodayCounts(
        orders: f.orders ? orders.length : null,
        appointments: f.appointments
            ? (_appointments[appId] ?? const []).length
            : null,
        tickets: f.events ? 12 : null,
        checkIns: f.checkIn ? 24 : null,
        memberCheckIns: f.memberCheckIn
            ? (_visits[appId] ?? const []).length
            : null,
        donations: f.donations ? 9 : null,
        newUsers: f.appUsers ? 7 : null,
        appOpens: f.analytics ? 342 : null,
      ),
      hasAppOpens: f.analytics,
      needsYou: [
        if (processing > 0)
          NeedsYou(
            kind: 'orders_in_progress',
            count: processing,
            title: processing == 1
                ? '1 order in progress'
                : '$processing orders in progress',
          ),
        if (toConfirm > 0)
          NeedsYou(
            kind: 'appointments_to_confirm',
            count: toConfirm,
            title: toConfirm == 1
                ? '1 appointment to confirm'
                : '$toConfirm appointments to confirm',
          ),
        if (unanswered > 0)
          NeedsYou(
            kind: 'unanswered_messages',
            count: unanswered,
            title: unanswered == 1
                ? '1 conversation waiting for your reply'
                : '$unanswered conversations waiting for your reply',
          ),
        if (questions > 0)
          NeedsYou(
            kind: 'questions_to_answer',
            count: questions,
            title: questions == 1
                ? '1 course question to answer'
                : '$questions course questions to answer',
          ),
        if (app.state == AccountState.expired)
          const NeedsYou(
            kind: 'notice',
            count: 1,
            title: "The app's plan has ended",
            noticeId: 3,
          ),
      ],
    );
  }

  // Orders

  @override
  Future<Paged<Order>> orders(
    String appId, {
    List<String> statuses = const [],
    int page = 1,
    int perPage = 20,
  }) async {
    await _call('orders');
    _app(appId, (f) => f.orders);
    final all = (_orders[appId] ?? const [])
        .where((o) => statuses.isEmpty || statuses.contains(o.status))
        .toList();
    return _page(all, page, perPage);
  }

  Paged<T> _page<T>(List<T> all, int page, int perPage) {
    final start = (page - 1) * perPage;
    return Paged(
      items: all.skip(start).take(perPage).toList(),
      page: page,
      perPage: perPage,
      total: all.length,
      totalPages: all.isEmpty ? 1 : (all.length / perPage).ceil(),
    );
  }

  Order _detail(String appId, Order o) {
    final refunded = o.refunds.fold(0, (n, r) => n + r.amount.amountCents);
    final left = o.total.amountCents - refunded;
    final refundable = left > 0 && o.status != 'cancelled';
    return Order(
      id: o.id,
      number: o.number,
      status: o.status,
      statusLabel: o.statusLabel,
      kitchen: o.kitchen,
      total: o.total,
      refunded: refunded > 0 ? money(refunded, o.total.currency) : null,
      lines: o.lines,
      customer: o.customer,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      nextStatuses: o.nextStatuses,
      refunds: o.refunds,
      refund: RefundOptions(
        refundable: refundable,
        why: refundable ? null : 'Nothing is left to refund on this order.',
        provider: 'iyzico',
        left: money(left, o.total.currency),
        byApi: true,
        manual: true,
        reasons: const [
          IdLabel(id: 'buyer_request', label: 'The buyer asked'),
          IdLabel(id: 'double_payment', label: 'Paid twice'),
          IdLabel(id: 'fraud', label: 'Fraud'),
          IdLabel(id: 'other', label: 'Other'),
        ],
        tickets: appId == eventsId
            ? const [Takeable(id: 1, label: 'Ticket A7K2-9QXM')]
            : const [],
      ),
    );
  }

  /// A new paid order for the restaurant (Kitchen mode's tests and demo).
  void addOrderForTest() {
    final list = _orders[restaurantId]!;
    final model = list.first;
    final id = list.map((o) => o.id).reduce((a, b) => a > b ? a : b) + 1;
    list.insert(
      0,
      Order(
        id: id,
        number: '$id',
        status: 'processing',
        statusLabel: _statusLabel('processing'),
        kitchen: const OrderKitchen(
          type: 'pickup',
          step: 'received',
          stepLabel: 'New',
        ),
        total: model.total,
        lines: model.lines,
        customer: const Customer(name: 'Mert Kaya'),
        createdAt: DateTime.now().toUtc(),
        paidAt: DateTime.now().toUtc(),
        nextStatuses: const ['preparing', 'cancelled'],
      ),
    );
  }

  Order _find(String appId, int orderId) {
    final found = (_orders[appId] ?? const []).where((o) => o.id == orderId);
    if (found.isEmpty) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    return found.first;
  }

  void _replace(String appId, Order order) {
    final list = _orders[appId]!;
    list[list.indexWhere((o) => o.id == order.id)] = order;
  }

  @override
  Future<Order> order(String appId, int orderId) async {
    await _call('order');
    _app(appId, (f) => f.orders);
    return _detail(appId, _find(appId, orderId));
  }

  @override
  Future<Order> changeOrderStatus(
    String appId,
    int orderId,
    String status,
  ) async {
    await _call('changeOrderStatus:$status');
    _app(appId, (f) => f.orders);
    final o = _find(appId, orderId);
    if (!o.nextStatuses.contains(status)) {
      throw const ApiException(
        code: 'invalid_status',
        message: "This order can't move to that status now.",
        statusCode: 409,
      );
    }
    final kitchen = o.kitchen;
    final finalStatus = switch (status) {
      'completed' => 'completed',
      'cancelled' => 'cancelled',
      _ => 'processing',
    };
    final next = kitchen == null || finalStatus != 'processing'
        ? const <String>[]
        : switch (status) {
            'preparing' => ['ready', 'cancelled'],
            'ready' => [
              if (kitchen.type == 'delivery')
                'out_for_delivery'
              else
                'completed',
              'cancelled',
            ],
            'out_for_delivery' => ['completed', 'cancelled'],
            _ => const <String>[],
          };
    final updated = Order(
      id: o.id,
      number: o.number,
      status: finalStatus,
      statusLabel: _statusLabel(finalStatus),
      kitchen: kitchen == null
          ? null
          : OrderKitchen(
              type: kitchen.type,
              step: status,
              stepLabel: _stepLabel(status),
            ),
      total: o.total,
      refunded: o.refunded,
      lines: o.lines,
      customer: o.customer,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      nextStatuses: next,
      refunds: o.refunds,
    );
    _replace(appId, updated);
    return _detail(appId, updated);
  }

  @override
  Future<RefundResult> refundOrder(
    String appId,
    int orderId,
    RefundRequest request,
  ) async {
    await _call('refundOrder');
    _app(appId, (f) => f.orders);
    final o = _find(appId, orderId);
    final options = _detail(appId, o).refund!;
    final cents = ((double.tryParse(request.amount) ?? 0) * 100).round();
    if (!options.refundable) {
      throw ApiException(
        code: 'not_refundable',
        message: options.why ?? '',
        statusCode: 409,
      );
    }
    if (cents <= 0 || cents > options.left.amountCents) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: 'Check the amount.',
        statusCode: 400,
        fieldErrors: {'amount': 'Enter an amount up to what is left.'},
      );
    }
    final refunds = [
      ...o.refunds,
      Refund(
        id: _nextId++,
        amount: money(cents, o.total.currency),
        reason: request.reason,
        method: request.method,
        createdAt: DateTime.now().toUtc(),
      ),
    ];
    final whole =
        refunds.fold(0, (n, r) => n + r.amount.amountCents) >=
        o.total.amountCents;
    final updated = Order(
      id: o.id,
      number: o.number,
      status: whole ? 'refunded' : o.status,
      statusLabel: _statusLabel(whole ? 'refunded' : o.status),
      kitchen: o.kitchen,
      total: o.total,
      lines: o.lines,
      customer: o.customer,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      nextStatuses: whole ? const [] : o.nextStatuses,
      refunds: refunds,
    );
    _replace(appId, updated);
    return RefundResult(
      message:
          'Refunded ${money(cents, o.total.currency).formatted}. The customer gets an email.',
      order: _detail(appId, updated),
    );
  }

  // Appointments

  @override
  Future<AppointmentsPage> appointments(
    String appId, {
    String scope = 'upcoming',
    List<String> statuses = const [],
    int page = 1,
  }) async {
    await _call('appointments:$scope');
    _app(appId, (f) => f.appointments);
    final today = _day(now);
    final all = (_appointments[appId] ?? const []).where((a) {
      if (statuses.isNotEmpty && !statuses.contains(a.status)) return false;
      return switch (scope) {
        'today' => a.localDate == today,
        'past' => a.startAt.isBefore(now.toUtc()),
        _ => !a.startAt.isBefore(now.toUtc()),
      };
    }).toList();
    return AppointmentsPage(
      page: _page(all, page, 20),
      timeZone: 'Africa/Cairo',
    );
  }

  @override
  Future<Appointment> changeAppointmentStatus(
    String appId,
    int appointmentId,
    String status,
  ) async {
    await _call('changeAppointmentStatus:$status');
    _app(appId, (f) => f.appointments);
    final list = _appointments[appId]!;
    final i = list.indexWhere((a) => a.id == appointmentId);
    if (i < 0) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    final a = list[i];
    if (!a.nextStatuses.contains(status)) {
      throw const ApiException(
        code: 'invalid_status',
        message: "This appointment can't change that way now.",
        statusCode: 409,
      );
    }
    final updated = _copy(a, status: status);
    list[i] = updated;
    return updated;
  }

  /// 61 Every 30 minutes from 09:00 to 16:30 on the clinic's days, from
  /// now, where the staff member has no other appointment.
  @override
  Future<RescheduleTimes> rescheduleTimes(
    String appId,
    int appointmentId, {
    String? from,
    int days = 7,
    int? staffId,
  }) async {
    await _call('rescheduleTimes');
    _app(appId, (f) => f.appointments);
    final list = _appointments[appId] ?? const <Appointment>[];
    final a = list.where((x) => x.id == appointmentId).firstOrNull;
    if (a == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    if (!a.canReschedule) {
      throw const ApiException(
        code: 'invalid_status',
        message: "This appointment can't be moved.",
        statusCode: 409,
      );
    }
    final first = from == null ? now : DateTime.parse(from);
    final start = DateTime(first.year, first.month, first.day);
    final busy = {
      for (final x in list)
        if (x.id != a.id && (x.status == 'pending' || x.status == 'approved'))
          '${x.localDate} ${x.localTime}',
    };
    final people = staffId == null
        ? _staff
        : _staff.where((p) => p.id == staffId).toList();
    return RescheduleTimes(
      timeZone: 'Africa/Cairo',
      staff: _staff,
      days: [
        for (var d = 0; d < days; d++)
          () {
            final day = DateTime(start.year, start.month, start.day + d);
            final slots = <FreeSlot>[];
            if (day.weekday != DateTime.friday) {
              for (var m = 9 * 60; m <= 16 * 60 + 30; m += 30) {
                final at = DateTime(
                  day.year,
                  day.month,
                  day.day,
                  m ~/ 60,
                  m % 60,
                );
                if (!at.isAfter(now)) continue;
                final time =
                    '${(m ~/ 60).toString().padLeft(2, '0')}:${(m % 60).toString().padLeft(2, '0')}';
                // Dr. Mona (1) has the other appointments; Dr. Karim is free.
                final ids = [
                  for (final p in people)
                    if (p.id != 1 || !busy.contains('${_day(at)} $time')) p.id,
                ];
                if (ids.isEmpty) continue;
                slots.add(
                  FreeSlot(
                    start: at.toUtc(),
                    end: at.add(const Duration(minutes: 30)).toUtc(),
                    localTime: time,
                    staffIds: ids,
                  ),
                );
              }
            }
            return (date: _day(day), slots: slots);
          }(),
      ],
    );
  }

  @override
  Future<Appointment> reschedule(
    String appId,
    int appointmentId, {
    required DateTime start,
    int? staffId,
  }) async {
    final times = await rescheduleTimes(
      appId,
      appointmentId,
      from: _day(start.toLocal()),
      days: 1,
      staffId: staffId,
    );
    final slot = times.days.first.slots
        .where((s) => s.start.isAtSameMomentAs(start))
        .firstOrNull;
    if (slot == null) {
      throw const ApiException(
        code: 'slot_taken',
        message: "This time isn't free. Please choose another one.",
        statusCode: 409,
      );
    }
    await _call('reschedule:${_day(start.toLocal())} ${slot.localTime}');
    final list = _appointments[appId]!;
    final i = list.indexWhere((a) => a.id == appointmentId);
    final who = staffId ?? slot.staffIds.first;
    final moved = _copy(
      list[i],
      start: start.toLocal(),
      staff: _staff.firstWhere((p) => p.id == who).name,
    );
    list[i] = moved;
    return moved;
  }

  // Events

  @override
  Future<EventsList> events(String appId, {String scope = 'open'}) async {
    await _call('events');
    _app(appId, (f) => f.events);
    return EventsList(
      items: List.of(_events[appId] ?? const []),
      timeZone: 'Africa/Cairo',
    );
  }

  @override
  Future<CheckIn> checkIn(String appId, String code, {int? eventId}) async {
    await _call('checkIn');
    _app(appId, (f) => f.checkIn);
    final key = code.trim().toUpperCase().startsWith('YT1.')
        ? code.trim()
        : code.trim().toUpperCase();
    final ticket = _tickets[key] ?? _tickets[code.trim()];
    if (ticket == null) {
      return CheckIn(
        outcome: code.contains('.') ? 'forged' : 'not_found',
        admitted: false,
        message: code.contains('.')
            ? "This code wasn't made by this app."
            : 'No ticket has this code.',
      );
    }
    final event = (_events[appId] ?? const []).firstWhere(
      (e) => e.id == ticket.eventId,
    );
    final info = TicketInfo(
      code: key,
      holderName: ticket.holder,
      typeName: 'Standard',
      eventId: event.id,
      eventTitle: event.title,
      usedAt: ticket.usedAt,
    );
    if (eventId != null && eventId != ticket.eventId) {
      return CheckIn(
        outcome: 'other_event',
        admitted: false,
        message: 'This ticket is for ${event.title}.',
        ticket: info,
      );
    }
    if (ticket.usedAt != null) {
      return CheckIn(
        outcome: 'used',
        admitted: false,
        message: 'Already used.',
        ticket: info,
      );
    }
    final at = DateTime.now().toUtc();
    _tickets[key] = (
      eventId: ticket.eventId,
      holder: ticket.holder,
      usedAt: at,
    );
    final list = _events[appId]!;
    final i = list.indexWhere((e) => e.id == event.id);
    list[i] = EventSummary(
      id: event.id,
      title: event.title,
      status: event.status,
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      valid: event.valid - 1,
      used: event.used + 1,
      capacity: event.capacity,
    );
    return CheckIn(
      outcome: 'admitted',
      admitted: true,
      // 65 As the server answers in the account's language (the store
      // screenshots in Arabic and Turkish).
      message: switch (language) {
        'ar' => 'أهلاً، ${ticket.holder}.',
        'tr' => 'Hoş geldiniz, ${ticket.holder}.',
        _ => 'Welcome, ${ticket.holder}.',
      },
      ticket: TicketInfo(
        code: key,
        holderName: ticket.holder,
        typeName: 'Standard',
        eventId: event.id,
        eventTitle: event.title,
        usedAt: at,
      ),
    );
  }

  // Donations

  @override
  Future<DonationsPage> donations(
    String appId, {
    int? campaignId,
    int page = 1,
  }) async {
    await _call('donations');
    _app(appId, (f) => f.donations);
    final all = (_donations[appId] ?? const [])
        .where((d) => campaignId == null || d.campaignId == campaignId)
        .toList();
    return DonationsPage(
      page: _page(all, page, 20),
      campaigns: _campaigns[appId] ?? const [],
    );
  }

  // Catalog

  @override
  Future<List<Product>> products(String appId) async {
    await _call('products');
    _app(appId, (f) => f.products);
    return List.of(_products[appId] ?? const []);
  }

  @override
  Future<Product> updateProduct(
    String appId,
    int productId,
    ProductPatch patch,
  ) async {
    await _call('updateProduct');
    _app(appId, (f) => f.products);
    final list = _products[appId]!;
    final i = list.indexWhere((p) => p.id == productId);
    if (i < 0) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    final p = list[i];
    int? cents(String? major) =>
        major == null ? null : ((double.tryParse(major) ?? -1) * 100).round();
    final price = cents(patch.price) ?? p.price.amountCents;
    final sale = patch.clearSalePrice
        ? null
        : (cents(patch.salePrice) ?? p.salePrice?.amountCents);
    final errors = <String, String>{
      if (price <= 0) 'price': 'Enter a price above zero.',
      if (sale != null && sale >= price)
        'sale_price': 'The sale price must be lower than the price.',
      if (patch.stock != null && (patch.stock! < 0 || patch.stock! > 1000000))
        'stock': 'Enter a whole number from 0 to 1,000,000.',
    };
    if (errors.isNotEmpty) {
      throw ApiException(
        code: ApiException.invalidRequest,
        message: errors.values.first,
        statusCode: 400,
        fieldErrors: errors,
      );
    }
    final updated = Product(
      id: p.id,
      name: p.name,
      price: money(price, p.price.currency),
      salePrice: sale == null ? null : money(sale, p.price.currency),
      stock: patch.unlimitedStock ? null : (patch.stock ?? p.stock),
      available: patch.available ?? p.available,
      imageUrl: p.imageUrl,
      sales: p.sales,
    );
    list[i] = updated;
    return updated;
  }

  @override
  Future<List<Course>> courses(String appId) async {
    await _call('courses');
    _app(appId, (f) => f.courses);
    return List.of(_courses[appId] ?? const []);
  }

  Course _course(String appId, int courseId) {
    final found = (_courses[appId] ?? const []).where((c) => c.id == courseId);
    if (found.isEmpty) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    return found.first;
  }

  void _putCourse(String appId, Course course) {
    final list = _courses[appId]!;
    list[list.indexWhere((c) => c.id == course.id)] = course;
  }

  @override
  Future<Course> updateCourse(
    String appId,
    int courseId, {
    required bool published,
  }) async {
    await _call('updateCourse');
    _app(appId, (f) => f.courses);
    final c = _course(appId, courseId);
    final updated = Course(
      id: c.id,
      title: c.title,
      published: published,
      price: c.price,
      students: c.students,
      topics: c.topics,
    );
    _putCourse(appId, updated);
    return updated;
  }

  @override
  Future<Course> addLesson(
    String appId,
    int courseId,
    int topicId,
    LessonRequest lesson,
  ) async {
    await _call('addLesson');
    _app(appId, (f) => f.courses);
    final title = lesson.title.trim();
    if (title.length < 2 || title.length > 120) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: 'Give the lesson a title of 2 to 120 characters.',
        statusCode: 400,
        fieldErrors: {
          'title': 'Give the lesson a title of 2 to 120 characters.',
        },
      );
    }
    final c = _course(appId, courseId);
    final updated = Course(
      id: c.id,
      title: c.title,
      published: c.published,
      price: c.price,
      students: c.students,
      topics: [
        for (final t in c.topics)
          t.id != topicId
              ? t
              : Topic(
                  id: t.id,
                  title: t.title,
                  lessons: [
                    ...t.lessons,
                    Lesson(
                      id: _nextId++,
                      title: title,
                      video: lesson.videoMediaId != null
                          ? 'media'
                          : (lesson.videoUrl != null ? 'link' : 'none'),
                      mediaId: lesson.videoMediaId,
                      durationMinutes: lesson.durationMinutes,
                      preview: lesson.preview,
                    ),
                  ],
                ),
      ],
    );
    _putCourse(appId, updated);
    return updated;
  }

  @override
  Future<List<Article>> articles(String appId) async {
    await _call('articles');
    _app(appId, (f) => f.articles);
    return List.of(_articles[appId] ?? const []);
  }

  @override
  Future<Article> updateArticle(
    String appId,
    int articleId, {
    String? status,
    bool? featured,
  }) async {
    await _call('updateArticle');
    _app(appId, (f) => f.articles);
    final list = _articles[appId]!;
    final i = list.indexWhere((a) => a.id == articleId);
    final a = list[i];
    final updated = Article(
      id: a.id,
      title: a.title,
      status: status ?? a.status,
      featured: featured ?? a.featured,
      publishedAt: status == 'published'
          ? (a.publishedAt ?? DateTime.now().toUtc())
          : a.publishedAt,
      updatedAt: DateTime.now().toUtc(),
    );
    list[i] = updated;
    return updated;
  }

  @override
  Future<List<Listing>> listings(String appId) async {
    await _call('listings');
    _app(appId, (f) => f.listings);
    return List.of(_listings[appId] ?? const []);
  }

  @override
  Future<Listing> updateListing(
    String appId,
    int listingId, {
    String? status,
    bool? featured,
  }) async {
    await _call('updateListing');
    _app(appId, (f) => f.listings);
    final list = _listings[appId]!;
    final i = list.indexWhere((l) => l.id == listingId);
    final l = list[i];
    final updated = Listing(
      id: l.id,
      title: l.title,
      status: status ?? l.status,
      featured: featured ?? l.featured,
      price: l.price,
      city: l.city,
    );
    list[i] = updated;
    return updated;
  }

  // Media

  Storage _storage(String appId) {
    final used = (_media[appId] ?? const []).fold(0, (n, m) => n + m.sizeBytes);
    const limit = 20 * 1024 * 1024 * 1024;
    return Storage(
      usedBytes: used,
      limitBytes: limit,
      // 63 As the server writes sizes: MB under a GB ("49 MB of 20 GB").
      used: sizeText(used),
      limit: sizeText(limit),
      full: used >= limit,
      manageUrl: 'https://yallapp.com.tr/dashboard/media',
    );
  }

  @override
  Future<MediaList> media(String appId, {String? kind}) async {
    await _call('media');
    _app(appId, (f) => f.media);
    return MediaList(
      items: (_media[appId] ?? const [])
          .where((m) => kind == null || m.kind == kind)
          .toList(),
      storage: _storage(appId),
    );
  }

  @override
  Future<Upload> startUpload(
    String appId, {
    required String name,
    required int size,
    required String type,
  }) async {
    await _call('startUpload');
    final app = _app(appId, (f) => f.media);
    if (app.state == AccountState.expired) {
      throw const ApiException(
        code: ApiException.planNotActive,
        message: "Uploads start once the app's plan is active.",
        statusCode: 403,
      );
    }
    final kind = type.startsWith('video/')
        ? 'video'
        : (type.startsWith('image/')
              ? 'image'
              : (type == 'application/pdf' ? 'pdf' : null));
    if (kind == null) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: "This kind of file can't go in Media.",
        statusCode: 400,
      );
    }
    final id =
        'f${(_nextId++).toString().padLeft(7, '0')}-0000-4000-8000-000000000000';
    _media
        .putIfAbsent(appId, () => [])
        .insert(
          0,
          MediaFile(
            id: id,
            name: name,
            kind: kind,
            contentType: type,
            sizeBytes: size,
            status: 'uploading',
            public: false,
            link: 'https://yallapp.com.tr/m/$id',
            createdAt: DateTime.now().toUtc(),
          ),
        );
    uploads[id] = (appId: appId, size: size, bytes: <int>[]);
    return Upload(
      id: id,
      uploadUrl: 'https://media.example/u/$appId/$id?size=$size',
      chunkBytes: 5 * 1024 * 1024,
      size: size,
    );
  }

  @override
  Future<Upload> resumeUpload(String appId, String mediaId) async {
    await _call('resumeUpload');
    _app(appId, (f) => f.media);
    final upload = uploads[mediaId];
    if (upload == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    return Upload(
      id: mediaId,
      uploadUrl: 'https://media.example/u/$appId/$mediaId?size=${upload.size}',
      chunkBytes: 5 * 1024 * 1024,
      size: upload.size,
    );
  }

  @override
  Future<MediaFile> completeUpload(String appId, String mediaId) async {
    await _call('completeUpload');
    _app(appId, (f) => f.media);
    final upload = uploads[mediaId];
    if (upload == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    if (upload.bytes.length < upload.size) {
      throw ApiException(
        code: ApiException.incomplete,
        message: 'The file has not all arrived.',
        statusCode: 409,
        fieldErrors: {'offset': '${upload.bytes.length}'},
      );
    }
    uploads.remove(mediaId);
    final list = _media[appId]!;
    final i = list.indexWhere((m) => m.id == mediaId);
    final m = list[i];
    final ready = MediaFile(
      id: m.id,
      name: m.name,
      kind: m.kind,
      contentType: m.contentType,
      sizeBytes: m.sizeBytes,
      status: 'ready',
      public: m.public,
      link: m.link,
      createdAt: m.createdAt,
    );
    list[i] = ready;
    return ready;
  }

  @override
  Future<void> deleteMedia(String appId, String mediaId) async {
    await _call('deleteMedia');
    _app(appId, (f) => f.media);
    uploads.remove(mediaId);
    _media[appId]?.removeWhere((m) => m.id == mediaId);
  }

  /// The media gate of this fake.
  late final UploadTransport transport = _FakeTransport(this);

  // Messages

  @override
  Future<InquiriesPage> inquiries(
    String appId, {
    String? status,
    int page = 1,
  }) async {
    await _call('inquiries');
    _app(appId, (f) => f.inquiries);
    final all = (_inquiries[appId] ?? const [])
        .where((i) => status == null || i.inquiry.status == status)
        .map((i) => i.inquiry)
        .toList();
    return InquiriesPage(
      page: _page(all, page, 20),
      unread: (_inquiries[appId] ?? const [])
          .where((i) => i.inquiry.unread > 0)
          .length,
    );
  }

  InquiryDetail _withInquiry(
    InquiryDetail d, {
    int? unread,
    String? status,
    List<InquiryMessage>? messages,
  }) {
    final i = d.inquiry;
    final list = messages ?? d.messages;
    return InquiryDetail(
      inquiry: Inquiry(
        id: i.id,
        listingId: i.listingId,
        listingTitle: i.listingTitle,
        person: i.person,
        status: status ?? i.status,
        lastMessage: list.isEmpty ? i.lastMessage : list.last.text,
        unread: unread ?? i.unread,
        updatedAt: list.isEmpty ? i.updatedAt : list.last.createdAt,
      ),
      phone: d.phone,
      email: d.email,
      messages: list,
    );
  }

  @override
  Future<InquiryDetail> inquiry(String appId, int inquiryId) async {
    await _call('inquiry');
    _app(appId, (f) => f.inquiries);
    final list = _inquiries[appId]!;
    final i = list.indexWhere((d) => d.inquiry.id == inquiryId);
    if (i < 0) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    list[i] = _withInquiry(list[i], unread: 0);
    return list[i];
  }

  @override
  Future<InquiryDetail> replyInquiry(
    String appId,
    int inquiryId,
    String text,
  ) async {
    await _call('replyInquiry');
    _app(appId, (f) => f.inquiries);
    final list = _inquiries[appId]!;
    final i = list.indexWhere((d) => d.inquiry.id == inquiryId);
    list[i] = _withInquiry(
      list[i],
      status: 'open',
      messages: [
        ...list[i].messages,
        InquiryMessage(
          id: _nextId++,
          fromOffice: true,
          text: text,
          createdAt: DateTime.now().toUtc(),
        ),
      ],
    );
    return list[i];
  }

  // 63 Course questions and reviews

  void _seedCommunity() {
    QuestionAnswer answer(
      int id,
      String name,
      String text,
      Duration ago, {
      bool hidden = false,
    }) => QuestionAnswer(
      id: id,
      fromBusiness: name == 'Nile Academy',
      name: name,
      text: text,
      hidden: hidden,
      createdAt: _ago(ago),
    );
    QuestionDetail question(
      int id,
      int courseId,
      String course,
      String person,
      String text,
      Duration ago,
      List<QuestionAnswer> answers, {
      bool hidden = false,
    }) {
      final open = answers.isEmpty || !answers.last.fromBusiness;
      return QuestionDetail(
        question: Question(
          id: id,
          courseId: courseId,
          courseTitle: course,
          person: person,
          text: text,
          status: open ? 'open' : 'answered',
          hidden: hidden,
          answerCount: answers.where((a) => !a.hidden).length,
          createdAt: _ago(ago),
          updatedAt: answers.isEmpty ? _ago(ago) : answers.last.createdAt,
        ),
        answers: answers,
      );
    }

    _questions[academyId] = [
      question(
        31,
        1,
        'Arabic for Beginners',
        'Omar Said',
        'Is there a worksheet for the alphabet lesson? I would like to practise writing the letters.',
        const Duration(minutes: 40),
        const [],
      ),
      question(
        32,
        2,
        'Business English',
        'Selin Koç',
        'Can I join the live session on Thursday if I am still on lesson 3?',
        const Duration(hours: 3),
        [
          answer(
            1,
            'Nile Academy',
            'Yes! Everyone in the course is welcome.',
            const Duration(hours: 2),
          ),
          answer(
            2,
            'Selin Koç',
            'Great, and will it be recorded?',
            const Duration(hours: 1),
          ),
        ],
      ),
      question(
        33,
        1,
        'Arabic for Beginners',
        'Huda Kamal',
        'How long should each lesson take me?',
        const Duration(days: 2),
        [
          // 64 A student's answer the academy hid.
          answer(
            4,
            'Unknown visitor',
            'Message me for the answers to every quiz!',
            const Duration(days: 1, hours: 6),
            hidden: true,
          ),
          answer(
            3,
            'Nile Academy',
            'About 20 minutes, plus 10 minutes of practice.',
            const Duration(days: 1),
          ),
        ],
      ),
      // 64 A question the academy hid: only its author sees it in the app.
      question(
        34,
        2,
        'Business English',
        'Unknown visitor',
        'Visit my page for cheap followers!!!',
        const Duration(days: 4),
        const [],
        hidden: true,
      ),
    ];
    _reviews[academyId] = [
      Review(
        id: 41,
        courseId: 1,
        courseTitle: 'Arabic for Beginners',
        person: 'Fatma Şahin',
        rating: 5,
        text: 'Clear lessons and kind feedback. I can read signs now!',
        hidden: false,
        createdAt: _ago(const Duration(hours: 5)),
      ),
      Review(
        id: 42,
        courseId: 2,
        courseTitle: 'Business English',
        person: 'Youssef Adel',
        rating: 4,
        text: 'Very practical. A few more examples for emails would help.',
        hidden: false,
        createdAt: _ago(const Duration(days: 1)),
        reply: ReviewReply(
          text: 'Thank you, Youssef! New email examples arrive next week.',
          createdAt: _ago(const Duration(hours: 20)),
        ),
      ),
      Review(
        id: 43,
        courseId: 1,
        courseTitle: 'Arabic for Beginners',
        person: 'Aylin Kara',
        rating: 3,
        text: 'Good, but the videos are a bit fast for me.',
        hidden: false,
        createdAt: _ago(const Duration(days: 3)),
      ),
      Review(
        id: 44,
        courseId: 2,
        courseTitle: 'Business English',
        person: 'Unknown visitor',
        rating: 1,
        text: 'Visit my page for cheap followers!!!',
        hidden: true,
        createdAt: _ago(const Duration(days: 4)),
      ),
    ];
  }

  QuestionDetail _ownQuestion(String appId, int questionId) {
    final found = (_questions[appId] ?? const [])
        .where((q) => q.question.id == questionId)
        .firstOrNull;
    if (found == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    return found;
  }

  @override
  Future<QuestionsPage> questions(
    String appId, {
    String? status,
    int page = 1,
  }) async {
    await _call('questions');
    _app(appId, (f) => f.questions);
    // 64 Waiting and answered are the questions shown in the app.
    bool listed(Question q) => status == null
        ? true
        : status == 'hidden'
        ? q.hidden
        : !q.hidden && q.status == status;
    final all = [
      for (final q in _questions[appId] ?? const <QuestionDetail>[])
        if (listed(q.question)) q.question,
    ]..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return QuestionsPage(
      page: _page(all, page, 20),
      open: (_questions[appId] ?? const [])
          .where((q) => q.question.open && !q.question.hidden)
          .length,
    );
  }

  @override
  Future<QuestionDetail> question(String appId, int questionId) async {
    await _call('question');
    _app(appId, (f) => f.questions);
    return _ownQuestion(appId, questionId);
  }

  @override
  Future<QuestionDetail> answerQuestion(
    String appId,
    int questionId,
    String text,
  ) async {
    await _call('answerQuestion');
    final app = _app(appId, (f) => f.questions);
    final value = text.trim();
    if (value.isEmpty) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: 'Write your answer.',
        statusCode: 400,
      );
    }
    final old = _ownQuestion(appId, questionId);
    final at = DateTime.now().toUtc();
    final q = old.question;
    final updated = QuestionDetail(
      question: Question(
        id: q.id,
        courseId: q.courseId,
        courseTitle: q.courseTitle,
        person: q.person,
        text: q.text,
        status: 'answered',
        hidden: q.hidden,
        answerCount: q.answerCount + 1,
        createdAt: q.createdAt,
        updatedAt: at,
      ),
      answers: [
        ...old.answers,
        QuestionAnswer(
          id: _nextId++,
          fromBusiness: true,
          name: app.name,
          text: value,
          createdAt: at,
        ),
      ],
    );
    final list = _questions[appId]!;
    list[list.indexOf(old)] = updated;
    return updated;
  }

  /// 64 The question and its answers again, with `hidden` changed.
  QuestionDetail _rehide(
    String appId,
    QuestionDetail old, {
    bool? hidden,
    int? answerId,
    bool? answerHidden,
  }) {
    final q = old.question;
    final answers = [
      for (final a in old.answers)
        a.id == answerId
            ? QuestionAnswer(
                id: a.id,
                fromBusiness: a.fromBusiness,
                name: a.name,
                text: a.text,
                hidden: answerHidden!,
                createdAt: a.createdAt,
              )
            : a,
    ];
    final updated = QuestionDetail(
      question: Question(
        id: q.id,
        courseId: q.courseId,
        courseTitle: q.courseTitle,
        person: q.person,
        text: q.text,
        status: q.status,
        hidden: hidden ?? q.hidden,
        answerCount: answers.where((a) => !a.hidden).length,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      ),
      answers: answers,
    );
    final list = _questions[appId]!;
    list[list.indexOf(old)] = updated;
    return updated;
  }

  @override
  Future<QuestionDetail> setQuestionHidden(
    String appId,
    int questionId,
    bool hidden,
  ) async {
    await _call('setQuestionHidden');
    _app(appId, (f) => f.questions);
    return _rehide(appId, _ownQuestion(appId, questionId), hidden: hidden);
  }

  @override
  Future<QuestionDetail> setAnswerHidden(
    String appId,
    int questionId,
    int answerId,
    bool hidden,
  ) async {
    await _call('setAnswerHidden');
    _app(appId, (f) => f.questions);
    final old = _ownQuestion(appId, questionId);
    final answer = old.answers.where((a) => a.id == answerId).firstOrNull;
    if (answer == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    if (answer.fromBusiness) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: "Your own answers can't be hidden.",
        statusCode: 400,
      );
    }
    return _rehide(appId, old, answerId: answerId, answerHidden: hidden);
  }

  Review _ownReview(String appId, int reviewId) {
    final found = (_reviews[appId] ?? const [])
        .where((r) => r.id == reviewId)
        .firstOrNull;
    if (found == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    return found;
  }

  Review _saveReview(
    String appId,
    Review r, {
    bool? hidden,
    ReviewReply? reply,
    bool clearReply = false,
  }) {
    final updated = Review(
      id: r.id,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      person: r.person,
      rating: r.rating,
      text: r.text,
      hidden: hidden ?? r.hidden,
      createdAt: r.createdAt,
      reply: clearReply ? null : (reply ?? r.reply),
    );
    final list = _reviews[appId]!;
    list[list.indexOf(r)] = updated;
    return updated;
  }

  @override
  Future<ReviewsPage> reviews(
    String appId, {
    String filter = 'all',
    int page = 1,
  }) async {
    await _call('reviews');
    _app(appId, (f) => f.reviews);
    final every = _reviews[appId] ?? const <Review>[];
    final all = [
      for (final r in every)
        if (filter == 'all' ||
            (filter == 'hidden' && r.hidden) ||
            (filter == 'unreplied' && !r.hidden && r.reply == null))
          r,
    ];
    final shown = every.where((r) => !r.hidden).toList();
    final sum = shown.fold(0, (n, r) => n + r.rating);
    return ReviewsPage(
      page: _page(all, page, 20),
      rating: shown.isEmpty ? null : (sum / shown.length * 10).round() / 10,
      ratingCount: shown.length,
    );
  }

  @override
  Future<Review> setReviewHidden(
    String appId,
    int reviewId,
    bool hidden,
  ) async {
    await _call('setReviewHidden');
    _app(appId, (f) => f.reviews);
    return _saveReview(appId, _ownReview(appId, reviewId), hidden: hidden);
  }

  @override
  Future<Review> replyReview(String appId, int reviewId, String text) async {
    await _call('replyReview');
    _app(appId, (f) => f.reviews);
    final value = text.trim();
    if (value.isEmpty) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: 'Write your reply.',
        statusCode: 400,
      );
    }
    return _saveReview(
      appId,
      _ownReview(appId, reviewId),
      reply: ReviewReply(text: value, createdAt: DateTime.now().toUtc()),
    );
  }

  @override
  Future<Review> deleteReviewReply(String appId, int reviewId) async {
    await _call('deleteReviewReply');
    _app(appId, (f) => f.reviews);
    return _saveReview(appId, _ownReview(appId, reviewId), clearReply: true);
  }

  // 63 A gym's members at the door

  void _seedGym() {
    Member member(
      int id,
      String name,
      String plan, {
      String status = 'active',
      int endsIn = 20,
      int? credits,
      String? phone,
    }) => Member(
      membershipId: id,
      name: name,
      phone: phone,
      planName: plan,
      status: status,
      endsAt: endsIn == 0 ? null : now.add(Duration(days: endsIn)).toUtc(),
      creditsLeft: credits,
    );
    _members[gymId] = [
      member(1, 'Sara Adel', 'Monthly unlimited', phone: '+20 100 111 2223'),
      member(2, 'Karim Nabil', 'Yearly unlimited', endsIn: 240),
      member(3, 'Mona Hassan', '10-class pack', endsIn: 0, credits: 4),
      member(4, 'Ahmed Fouad', 'Monthly unlimited', phone: '+20 100 555 1234'),
      member(
        5,
        'Layla Samir',
        'Monthly unlimited',
        status: 'expired',
        endsIn: -3,
      ),
      member(6, 'Tarek Ali', '10-class pack', endsIn: 0, credits: 0),
      // 64 Frozen for a trip, back in 9 days.
      Member(
        membershipId: 7,
        name: 'Nour Hany',
        planName: 'Monthly unlimited',
        status: 'frozen',
        endsAt: now.add(const Duration(days: 34)).toUtc(),
        frozenFrom: _startOfDay(now.subtract(const Duration(days: 5))),
        frozenUntil: _startOfDay(now.add(const Duration(days: 9))),
      ),
    ];
    for (final m in _members[gymId]!) {
      _memberCodes[m.membershipId == 1
              ? memberCode
              : 'M${m.membershipId}XKP7QZ2HD9'.substring(0, 12)] =
          m.membershipId;
    }
    MemberVisit visit(
      int id,
      int membership,
      String name,
      String plan,
      int minutes,
    ) => MemberVisit(
      id: id,
      membershipId: membership,
      name: name,
      planName: plan,
      checkedInAt: _ago(Duration(minutes: minutes)),
      by: 'Layla',
    );
    _visits[gymId] = [
      visit(1, 2, 'Karim Nabil', 'Yearly unlimited', 25),
      visit(2, 3, 'Mona Hassan', '10-class pack', 70),
      visit(3, 4, 'Ahmed Fouad', 'Monthly unlimited', 130),
    ];
  }

  Member _withVisit(Member m) => Member(
    membershipId: m.membershipId,
    name: m.name,
    phone: m.phone,
    planName: m.planName,
    status: m.status,
    endsAt: m.endsAt,
    creditsLeft: m.creditsLeft,
    frozenFrom: m.frozenFrom,
    frozenUntil: m.frozenUntil,
    checkedInAt: (_visits[gymId] ?? const <MemberVisit>[])
        .where((v) => v.name == m.name)
        .firstOrNull
        ?.checkedInAt,
  );

  DateTime _startOfDay(DateTime t) => DateTime(t.year, t.month, t.day).toUtc();

  /// 64 A member with its freeze (and end) changed.
  Member _refreeze(
    Member m, {
    required String status,
    required DateTime? endsAt,
    DateTime? frozenFrom,
    DateTime? frozenUntil,
  }) => Member(
    membershipId: m.membershipId,
    name: m.name,
    phone: m.phone,
    planName: m.planName,
    status: status,
    endsAt: endsAt,
    creditsLeft: m.creditsLeft,
    frozenFrom: frozenFrom,
    frozenUntil: frozenUntil,
  );

  Member _ownMember(String appId, int membershipId) {
    final m = (_members[appId] ?? const <Member>[])
        .where((x) => x.membershipId == membershipId)
        .firstOrNull;
    if (m == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    return m;
  }

  Member _saveMember(String appId, Member old, Member updated) {
    final list = _members[appId]!;
    list[list.indexOf(old)] = updated;
    return _withVisit(updated);
  }

  @override
  Future<Member> freezeMember(
    String appId,
    int membershipId, {
    required String from,
    String? until,
  }) async {
    await _call('freezeMember');
    _app(appId, (f) => f.memberCheckIn);
    final m = _ownMember(appId, membershipId);
    if (m.status != 'active' || m.freezeSet) {
      throw const ApiException(
        code: 'invalid_status',
        message: 'This membership is already frozen.',
        statusCode: 409,
      );
    }
    final start = DateTime.tryParse(from);
    final back = until == null ? null : DateTime.tryParse(until);
    final today = DateTime(now.year, now.month, now.day);
    if (start == null || start.isBefore(today)) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: 'Choose today or a later day.',
        statusCode: 400,
      );
    }
    if (back != null && !back.isAfter(start)) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: 'Choose a day after the first frozen day.',
        statusCode: 400,
      );
    }
    // The end moves by the frozen days at once when it has an end day.
    final days = back == null ? 0 : back.difference(start).inDays;
    return _saveMember(
      appId,
      m,
      _refreeze(
        m,
        status: start.isAfter(today) ? 'active' : 'frozen',
        endsAt: m.endsAt?.add(Duration(days: days)),
        frozenFrom: start.toUtc(),
        frozenUntil: back?.toUtc(),
      ),
    );
  }

  @override
  Future<Member> unfreezeMember(String appId, int membershipId) async {
    await _call('unfreezeMember');
    _app(appId, (f) => f.memberCheckIn);
    final m = _ownMember(appId, membershipId);
    final from = m.frozenFrom;
    if (from == null) {
      throw const ApiException(
        code: 'invalid_status',
        message: "This membership isn't frozen.",
        statusCode: 409,
      );
    }
    final today = DateTime(now.year, now.month, now.day).toUtc();
    final until = m.frozenUntil;
    // Back today: the days from its first day were frozen.
    final started = !from.isAfter(today);
    final days = until == null
        ? (started ? today.difference(from).inDays : 0)
        : -until.difference(started ? today : from).inDays;
    return _saveMember(
      appId,
      m,
      _refreeze(
        m,
        status: 'active',
        endsAt: m.endsAt?.add(Duration(days: days)),
      ),
    );
  }

  @override
  Future<MembersPage> members(
    String appId, {
    String? query,
    int page = 1,
  }) async {
    await _call('members');
    _app(appId, (f) => f.memberCheckIn);
    final q = (query ?? '').trim().toLowerCase();
    final all =
        [
          for (final m in _members[appId] ?? const <Member>[])
            if (q.isEmpty ||
                m.name.toLowerCase().contains(q) ||
                (m.phone ?? '')
                    .replaceAll(' ', '')
                    .contains(q.replaceAll(' ', '')))
              _withVisit(m),
        ]..sort(
          (a, b) =>
              (a.status == 'active' ? 0 : 1) - (b.status == 'active' ? 0 : 1),
        );
    return MembersPage(page: _page(all, page, 20), timeZone: 'Africa/Cairo');
  }

  @override
  Future<MemberCheckIn> checkInMember(
    String appId, {
    String? code,
    int? membershipId,
  }) async {
    await _call('checkInMember');
    _app(appId, (f) => f.memberCheckIn);
    MemberCheckIn refused(String outcome, String message, [Member? m]) =>
        MemberCheckIn(
          outcome: outcome,
          admitted: false,
          message: message,
          member: m,
        );
    var id = membershipId;
    if (id == null) {
      final value = (code ?? '').trim();
      if (value.startsWith('YM1.')) {
        final parts = value.split('.');
        final claimed = parts.length == 3 ? int.tryParse(parts[1]) : null;
        if (claimed == null) {
          return refused('not_a_code', "That isn't a member code");
        }
        if (_memberCodes[parts[2]] != claimed) {
          return refused('forged', "This code wasn't made by your app");
        }
        id = claimed;
      } else {
        final typed = value.toUpperCase().replaceAll(RegExp(r'[\s-]'), '');
        if (!RegExp(r'^[A-Z0-9]{12}$').hasMatch(typed)) {
          return refused('not_a_code', "That isn't a member code");
        }
        id = _memberCodes[typed];
      }
    }
    final m = (_members[appId] ?? const <Member>[])
        .where((x) => x.membershipId == id)
        .firstOrNull;
    if (m == null) return refused('not_found', 'No membership has this code');
    final withVisit = _withVisit(m);
    if (m.status == 'cancelled') {
      return refused('cancelled', 'This membership was cancelled', withVisit);
    }
    if (m.status == 'expired') {
      return refused('expired', 'This membership has ended', withVisit);
    }
    if (m.status == 'frozen') {
      return refused('frozen', 'Frozen', withVisit);
    }
    if (m.creditsLeft == 0) {
      return refused(
        'no_credits',
        'No classes left on this membership',
        withVisit,
      );
    }
    if (withVisit.checkedInAt != null) {
      return refused('already_in', 'Already checked in today', withVisit);
    }
    final at = DateTime.now().toUtc();
    _visits[appId] = [
      MemberVisit(
        id: _nextId++,
        membershipId: m.membershipId,
        name: m.name,
        planName: m.planName,
        checkedInAt: at,
        by: 'You',
      ),
      ...?_visits[appId],
    ];
    return MemberCheckIn(
      outcome: 'admitted',
      admitted: true,
      message: 'Welcome in',
      member: _withVisit(m),
    );
  }

  @override
  Future<MemberVisits> memberCheckIns(String appId, {String? date}) async {
    await _call('memberCheckIns');
    _app(appId, (f) => f.memberCheckIn);
    final items = List.of(_visits[appId] ?? const <MemberVisit>[]);
    return MemberVisits(
      date: date ?? _day(now),
      timeZone: 'Africa/Cairo',
      count: items.length,
      items: items,
    );
  }

  // 77 The app's chat

  static const chatAyse = 'c0a8e0f2-0000-4000-8000-0000000000a1';
  static const chatMehmet = 'c0a8e0f2-0000-4000-8000-0000000000a2';
  static const ayseMember = '0f9a0000-0000-4000-8000-0000000000a1';
  static const mehmetMember = '0f9a0000-0000-4000-8000-0000000000a2';

  ChatMessage _chatMessage(
    String conversationId,
    String? text, {
    String? memberId,
    String name = '',
    String? teamMember,
    String? clientId,
    ChatAttachment? attachment,
    DateTime? at,
  }) => ChatMessage(
    id: '${_nextChatId++}',
    conversationId: conversationId,
    clientId: clientId,
    fromBusiness: memberId == null,
    memberId: memberId,
    senderName: memberId == null ? 'Bab Al Sham' : name,
    teamMember: teamMember,
    text: text,
    attachment: attachment,
    deleted: false,
    reported: false,
    createdAt: (at ?? now).toUtc(),
  );

  void _seedChat() {
    chatSettingsOf[restaurantId] = const ChatSettings(
      available: true,
      enabled: true,
    );
    chatMessagesOf[chatAyse] = [
      _chatMessage(
        chatAyse,
        'Do you have a table for six tonight?',
        memberId: ayseMember,
        name: 'Ayşe Yılmaz',
        at: now.subtract(const Duration(hours: 3)),
      ),
      _chatMessage(
        chatAyse,
        'Yes, from 8 pm. Shall we keep it for you?',
        teamMember: 'Owner',
        at: now.subtract(const Duration(hours: 2)),
      ),
      _chatMessage(
        chatAyse,
        'Please, under Ayşe.',
        memberId: ayseMember,
        name: 'Ayşe Yılmaz',
        at: now.subtract(const Duration(minutes: 20)),
      ),
    ];
    chatMessagesOf[chatMehmet] = [
      _chatMessage(
        chatMehmet,
        'Is the falafel wrap vegan?',
        memberId: mehmetMember,
        name: 'Mehmet Kaya',
        at: now.subtract(const Duration(days: 2)),
      ),
    ];
    chatReads[chatAyse] = chatMessagesOf[chatAyse]![1].id;
    chatReads[chatMehmet] = chatMessagesOf[chatMehmet]![0].id;
    chatThreads[restaurantId] = [
      _thread(chatAyse, 'Ayşe Yılmaz', ayseMember),
      _thread(chatMehmet, 'Mehmet Kaya', mehmetMember),
    ];
  }

  ChatThread _thread(
    String id,
    String title,
    String? memberId, {
    bool group = false,
    String? keepUntil,
  }) {
    final messages = chatMessagesOf[id] ?? const <ChatMessage>[];
    final read = chatReads[id];
    final unread = messages
        .where(
          (m) =>
              !m.fromBusiness &&
              !m.deleted &&
              (read == null || ChatMessage.compareIds(m.id, read) > 0),
        )
        .length;
    final oldest = messages.firstOrNull?.createdAt;
    final expires =
        keepUntil ??
        (oldest == null ? null : _day(oldest.add(const Duration(days: 365))));
    return ChatThread(
      id: id,
      group: group,
      title: title,
      person: memberId == null
          ? null
          : ChatPerson(
              id: memberId,
              name: title,
              blocked: chatBlocked.contains(memberId),
            ),
      memberCount: group ? 12 : null,
      lastMessage: messages.lastOrNull,
      unreadCount: unread,
      updatedAt: messages.lastOrNull?.createdAt ?? now.toUtc(),
      keepUntil: keepUntil,
      expiresOn: expires,
    );
  }

  List<ChatThread> _threadsOf(String appId) => [
    for (final t in chatThreads[appId] ?? const <ChatThread>[])
      _thread(
        t.id,
        t.title,
        t.person?.id,
        group: t.group,
        keepUntil: t.keepUntil,
      ),
  ];

  ChatThread _threadOf(String appId, String id) {
    final thread = _threadsOf(appId).where((t) => t.id == id).firstOrNull;
    if (thread == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    return thread;
  }

  @override
  Future<ChatInbox> chatConversations(
    String appId, {
    bool unread = false,
    String? kind,
    String? query,
  }) async {
    await _call('chatConversations');
    _app(appId, (f) => f.chat);
    final all = _threadsOf(appId)
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    final q = query?.trim().toLowerCase() ?? '';
    return ChatInbox(
      items: [
        for (final t in all)
          if ((!unread || t.unreadCount > 0) &&
              (kind == null || (kind == 'group') == t.group) &&
              (q.isEmpty || t.title.toLowerCase().contains(q)))
            t,
      ],
      unreadCount: all.fold(0, (sum, t) => sum + t.unreadCount),
      openReports: (chatReportsOf[appId] ?? const [])
          .where((r) => r.open)
          .length,
      expiring: 0,
    );
  }

  @override
  Future<ChatMessagesPage> chatMessages(
    String appId,
    String conversationId, {
    String? after,
    String? before,
  }) async {
    await _call(after == null ? 'chatMessages' : 'chatMessages:after');
    _app(appId, (f) => f.chat);
    _threadOf(appId, conversationId);
    final all = chatMessagesOf[conversationId] ?? const <ChatMessage>[];
    final reported = {
      for (final r in chatReportsOf[appId] ?? const <ChatReport>[])
        if (r.open) r.message.id,
    };
    ChatMessage mark(ChatMessage m) => reported.contains(m.id)
        ? ChatMessage(
            id: m.id,
            conversationId: m.conversationId,
            clientId: m.clientId,
            fromBusiness: m.fromBusiness,
            memberId: m.memberId,
            senderName: m.senderName,
            teamMember: m.teamMember,
            text: m.text,
            attachment: m.attachment,
            deleted: m.deleted,
            reported: true,
            createdAt: m.createdAt,
          )
        : m;
    final List<ChatMessage> items;
    if (after != null) {
      items = [
        for (final m in all)
          if (ChatMessage.compareIds(m.id, after) > 0) mark(m),
      ];
    } else {
      final older = before == null
          ? all
          : [
              for (final m in all)
                if (ChatMessage.compareIds(m.id, before) < 0) m,
            ];
      items = [for (final m in older.reversed.take(50)) mark(m)];
    }
    return ChatMessagesPage(items: items, hasMore: false, pollAfterSeconds: 5);
  }

  /// A message from someone in the app arrives (tests, the demo).
  ChatMessage chatArrives(String conversationId, String text) {
    final first = chatMessagesOf[conversationId]!.firstWhere(
      (m) => !m.fromBusiness,
    );
    final message = _chatMessage(
      conversationId,
      text,
      memberId: first.memberId,
      name: first.senderName,
    );
    chatMessagesOf[conversationId]!.add(message);
    return message;
  }

  @override
  Future<ChatMessage> sendChatMessage(
    String appId,
    String conversationId, {
    required String clientId,
    String? text,
    String? mediaId,
  }) async {
    await _call('sendChatMessage');
    _app(appId, (f) => f.chat);
    _threadOf(appId, conversationId);
    final list = chatMessagesOf[conversationId]!;
    final same = list.where((m) => m.clientId == clientId).firstOrNull;
    if (same != null) return same;
    if ((text == null || text.trim().isEmpty) && mediaId == null) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        statusCode: 400,
      );
    }
    final file = mediaId == null
        ? null
        : (_media[appId] ?? const <MediaFile>[])
              .where((f) => f.id == mediaId)
              .firstOrNull;
    final message = _chatMessage(
      conversationId,
      text,
      teamMember: 'Owner',
      clientId: clientId,
      attachment: file == null
          ? null
          : ChatAttachment(
              kind: switch (file.kind) {
                'image' => 'image',
                'video' => 'video',
                _ => 'file',
              },
              name: file.name,
              contentType: file.contentType,
              sizeBytes: file.sizeBytes,
              url: file.link,
              mediaId: file.id,
            ),
    );
    list.add(message);
    chatReads[conversationId] = message.id;
    return message;
  }

  @override
  Future<void> readChat(
    String appId,
    String conversationId,
    String messageId,
  ) async {
    await _call('readChat');
    _threadOf(appId, conversationId);
    chatReads[conversationId] = messageId;
  }

  @override
  Future<ChatThread> keepChat(String appId, String conversationId) async {
    await _call('keepChat');
    final threads = chatThreads[appId] ?? [];
    final at = threads.indexWhere((t) => t.id == conversationId);
    if (at < 0) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    final t = threads[at];
    threads[at] = _thread(
      t.id,
      t.title,
      t.person?.id,
      group: t.group,
      keepUntil: _day(now.add(const Duration(days: 365))),
    );
    return _threadOf(appId, conversationId);
  }

  @override
  Future<int> keepExpiringChats(String appId) async {
    await _call('keepExpiringChats');
    return 0;
  }

  @override
  Future<void> clearChat(String appId, String conversationId) async {
    await _call('clearChat');
    _threadOf(appId, conversationId);
    chatMessagesOf[conversationId] = [];
  }

  @override
  Future<void> deleteChatMessage(String appId, String messageId) async {
    await _call('deleteChatMessage');
    for (final list in chatMessagesOf.values) {
      final at = list.indexWhere((m) => m.id == messageId);
      if (at >= 0) list[at] = list[at].asDeleted();
    }
    _closeReports(appId, messageId, 'deleted');
  }

  void _closeReports(String appId, String messageId, String outcome) {
    final reports = chatReportsOf[appId] ?? [];
    for (var i = 0; i < reports.length; i++) {
      final r = reports[i];
      if (r.message.id != messageId || !r.open) continue;
      reports[i] = ChatReport(
        id: r.id,
        message: r.message,
        conversationTitle: r.conversationTitle,
        reporter: r.reporter,
        reason: r.reason,
        note: r.note,
        open: false,
        outcome: outcome,
        createdAt: r.createdAt,
      );
    }
  }

  /// Someone in the app reports a message (tests, the demo).
  ChatReport chatReported(
    String appId,
    String conversationId,
    String messageId, {
    String reason = 'abuse',
  }) {
    final message = chatMessagesOf[conversationId]!.firstWhere(
      (m) => m.id == messageId,
    );
    final report = ChatReport(
      id: 'r${_nextChatId++}',
      message: message,
      conversationTitle: _threadOf(appId, conversationId).title,
      reporter: const ChatPerson(
        id: mehmetMember,
        name: 'Mehmet Kaya',
        blocked: false,
      ),
      reason: reason,
      open: true,
      createdAt: now.toUtc(),
    );
    (chatReportsOf[appId] ??= []).add(report);
    return report;
  }

  @override
  Future<List<ChatReport>> chatReports(String appId, {bool open = true}) async {
    await _call('chatReports');
    _app(appId, (f) => f.chat);
    return [
      for (final r in (chatReportsOf[appId] ?? const <ChatReport>[]).reversed)
        if (r.open == open) r,
    ];
  }

  @override
  Future<void> resolveChatReport(
    String appId,
    String reportId,
    ChatReportAction action,
  ) async {
    await _call('resolveChatReport:${action.wire}');
    final report = (chatReportsOf[appId] ?? const <ChatReport>[])
        .where((r) => r.id == reportId)
        .firstOrNull;
    if (report == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    if (action != ChatReportAction.dismiss) {
      for (final list in chatMessagesOf.values) {
        final at = list.indexWhere((m) => m.id == report.message.id);
        if (at >= 0) list[at] = list[at].asDeleted();
      }
      final sender = report.message.memberId;
      if (action == ChatReportAction.blockSender && sender != null) {
        chatBlocked.add(sender);
      }
    }
    _closeReports(appId, report.message.id, switch (action) {
      ChatReportAction.dismiss => 'dismissed',
      ChatReportAction.deleteMessage => 'deleted',
      ChatReportAction.blockSender => 'blocked',
    });
  }

  @override
  Future<void> blockChatMember(
    String appId,
    String memberId, {
    required bool blocked,
  }) async {
    await _call(blocked ? 'blockChatMember' : 'unblockChatMember');
    _app(appId, (f) => f.chat);
    blocked ? chatBlocked.add(memberId) : chatBlocked.remove(memberId);
  }

  @override
  Future<ChatSettings> chatSettings(String appId) async {
    await _call('chatSettings');
    final app = _app(appId);
    return chatSettingsOf[appId] ??
        ChatSettings(
          available: false,
          enabled: true,
          courseGroups: app.type == 'lms' ? false : null,
        );
  }

  @override
  Future<ChatSettings> updateChatSettings(
    String appId, {
    bool? enabled,
    bool? courseGroups,
  }) async {
    await _call('updateChatSettings');
    final current = await chatSettings(appId);
    if (!current.available) {
      throw const ApiException(
        code: ApiException.notAvailable,
        statusCode: 404,
      );
    }
    return chatSettingsOf[appId] = ChatSettings(
      available: true,
      enabled: enabled ?? current.enabled,
      courseGroups: courseGroups ?? current.courseGroups,
    );
  }

  // App users

  @override
  Future<AppUsersPage> appUsers(
    String appId, {
    String? query,
    int page = 1,
  }) async {
    await _call('appUsers');
    _app(appId, (f) => f.appUsers);
    final all = _users[appId] ?? const [];
    final q = query?.trim().toLowerCase() ?? '';
    final matches = all.where((u) {
      if (q.isEmpty) return true;
      return u.name.toLowerCase().contains(q) ||
          (u.email ?? '').toLowerCase().contains(q) ||
          (u.phone ?? '').replaceAll(' ', '').contains(q.replaceAll(' ', ''));
    }).toList();
    return AppUsersPage(page: _page(matches, page, 20), count: all.length);
  }

  // Analytics

  @override
  Future<Analytics> analytics(
    String appId, {
    String range = '30',
    String? from,
    String? to,
  }) async {
    await _call('analytics:$range');
    _app(appId, (f) => f.analytics);
    final days = switch (range) {
      '7' => 7,
      '90' => 90,
      'custom' => 14,
      _ => 30,
    };
    final daily = [
      for (var i = days - 1; i >= 0; i--)
        DailyPoint(
          day: _day(now.subtract(Duration(days: i))),
          active: 80 + ((i * 37) % 60),
          installs: 3 + (i * 7) % 9,
          sessions: 150 + ((i * 53) % 90),
        ),
    ];
    return Analytics(
      preset: range,
      from: daily.first.day,
      to: daily.last.day,
      days: days,
      timeZone: 'Europe/Istanbul',
      hasData: true,
      kpis: Kpis(
        installs: daily.fold(0, (n, d) => n + d.installs),
        activeAvg: 104.6,
        weekly: 412,
        monthly: 1290,
        sessions: daily.fold(0, (n, d) => n + d.sessions),
      ),
      previous: const Kpis(
        installs: 120,
        activeAvg: 96.2,
        weekly: 380,
        monthly: 1210,
        sessions: 5100,
      ),
      daily: daily,
      retention: const [
        Retention(days: 1, cohort: 120, returned: 54, rate: 0.45),
        Retention(days: 7, cohort: 120, returned: 31, rate: 0.258),
        Retention(days: 30, cohort: 90, returned: 14, rate: 0.156),
      ],
      platforms: const [
        Share(key: 'android', label: 'Android', value: 820, share: 0.64),
        Share(key: 'ios', label: 'iOS', value: 460, share: 0.36),
      ],
      countries: const [
        Share(key: 'TR', label: 'Türkiye', value: 700, share: 0.55),
        Share(key: 'EG', label: 'Egypt', value: 450, share: 0.35),
        Share(key: 'DE', label: 'Germany', value: 130, share: 0.10),
      ],
      screens: const [
        Share(key: 'home', label: 'Home', value: 3100, share: 0.5),
        Share(key: 'menu', label: 'Menu', value: 1900, share: 0.3),
        Share(key: 'cart', label: 'Cart', value: 1200, share: 0.2),
      ],
    );
  }

  // Notifications

  /// 68 As the Owner API: nothing is sent or scheduled once the plan ended.
  void _planActiveToSend(AppSummary app) {
    if (app.state == AccountState.expired) {
      throw const ApiException(
        code: ApiException.planNotActive,
        message: "The app's plan has ended, so notifications aren't sent until it's renewed.",
        statusCode: 403,
      );
    }
  }

  @override
  Future<SentNotifications> sentNotifications(String appId) async {
    await _call('sentNotifications');
    final app = _app(appId, (f) => f.notifications);
    return SentNotifications(
      // 68 Nothing goes out once the plan has ended.
      push: pushAvailable && app.state != AccountState.expired,
      items: List.of(_sent[appId] ?? const []),
    );
  }

  @override
  Future<NotificationResult> sendNotification(
    String appId, {
    required String title,
    required String body,
  }) async {
    await _call('sendNotification');
    _planActiveToSend(_app(appId, (f) => f.notifications));
    if (_sentThisHour >= 10) {
      throw const ApiException(
        code: ApiException.rateLimited,
        message: 'You can send 10 notifications an hour. Try again later.',
        statusCode: 429,
        retryAfterSeconds: 1800,
      );
    }
    if (title.trim().isEmpty ||
        title.length > 65 ||
        body.trim().isEmpty ||
        body.length > 240) {
      throw const ApiException(
        code: ApiException.invalidRequest,
        message: 'Check the title and the message.',
        statusCode: 400,
      );
    }
    _sentThisHour += 1;
    _sent
        .putIfAbsent(appId, () => [])
        .insert(
          0,
          SentNotification(
            id: _nextId++,
            title: title,
            body: body,
            sentAt: DateTime.now().toUtc(),
          ),
        );
    return NotificationResult(
      message: 'Sent. Everyone sees it in the app’s inbox.',
      pushed: pushAvailable ? 128 : 0,
    );
  }

  /// 61 Notifications sent later, in the phone's time (the fake's zone).
  @override
  Future<ScheduledNotifications> scheduledNotifications(String appId) async {
    await _call('scheduledNotifications');
    _app(appId, (f) => f.notifications);
    final items = List.of(_scheduled[appId] ?? const <ScheduledNotification>[])
      ..sort((a, b) => a.sendAt.compareTo(b.sendAt));
    return ScheduledNotifications(
      timeZone: 'Africa/Cairo',
      max: 50,
      items: items,
    );
  }

  ScheduledNotification _scheduledFrom(
    int id,
    String title,
    String body,
    String date,
    String time,
  ) {
    final at = DateTime.tryParse('${date}T$time');
    final errors = <String, String>{
      if (title.trim().isEmpty) 'title': 'Enter a title.',
      if (title.length > 65) 'title': 'Keep the title to 65 characters.',
      if (body.trim().isEmpty) 'body': 'Enter a message.',
      if (body.length > 240) 'body': 'Keep the message to 240 characters.',
      if (at == null)
        'send_at': 'Choose a date and time.'
      else if (!at.isAfter(now))
        'send_at': 'Choose a time later than now.',
    };
    if (errors.isNotEmpty) {
      throw ApiException(
        code: ApiException.invalidRequest,
        message: 'The request isn\'t valid.',
        statusCode: 400,
        fieldErrors: errors,
      );
    }
    return ScheduledNotification(
      id: id,
      title: title.trim(),
      body: body.trim(),
      sendAt: at!.toUtc(),
      localDate: date,
      localTime: time,
      status: 'scheduled',
    );
  }

  @override
  Future<ScheduledNotification> scheduleNotification(
    String appId, {
    required String title,
    required String body,
    required String date,
    required String time,
  }) async {
    await _call('scheduleNotification:$date $time');
    _planActiveToSend(_app(appId, (f) => f.notifications));
    final made = _scheduledFrom(_nextId++, title, body, date, time);
    _scheduled.putIfAbsent(appId, () => []).add(made);
    return made;
  }

  @override
  Future<ScheduledNotification> editScheduledNotification(
    String appId,
    int id, {
    required String title,
    required String body,
    required String date,
    required String time,
  }) async {
    await _call('editScheduledNotification:$date $time');
    _app(appId, (f) => f.notifications);
    final list = _scheduled[appId] ?? [];
    final i = list.indexWhere((n) => n.id == id);
    if (i < 0) {
      throw const ApiException(
        code: 'already_sent',
        message: 'This notification was already sent or cancelled.',
        statusCode: 409,
      );
    }
    return list[i] = _scheduledFrom(id, title, body, date, time);
  }

  @override
  Future<void> cancelScheduledNotification(String appId, int id) async {
    await _call('cancelScheduledNotification');
    _app(appId, (f) => f.notifications);
    _scheduled[appId]?.removeWhere((n) => n.id == id);
  }

  // Publishing and license

  @override
  Future<Preview> preview(String appId, {bool draft = false}) async {
    await _call('preview');
    _app(appId, (f) => f.preview);
    return Preview(
      url:
          'https://yallapp.com.tr/preview-app/?app=$appId${draft ? '&draft=1' : ''}',
      expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
    );
  }

  @override
  Future<Builds> builds(String appId) async {
    await _call('builds');
    _app(appId, (f) => f.builds);
    return Builds(
      items: [
        Build(
          id: 'b0000000-0000-4000-8000-000000000003',
          number: 14,
          version: '2.3.0',
          status: 'building',
          statusLabel: 'Building',
          createdAt: _ago(const Duration(minutes: 20)),
          files: const [],
        ),
        Build(
          id: 'b0000000-0000-4000-8000-000000000002',
          number: 13,
          version: '2.2.1',
          status: 'ready',
          statusLabel: 'Ready',
          createdAt: _ago(const Duration(days: 2)),
          finishedAt: _ago(const Duration(days: 2)),
          files: const [
            BuildFile(
              kind: 'aab',
              label: 'Google Play (AAB)',
              url: 'https://yallapp.com.tr/d/aab',
            ),
            BuildFile(
              kind: 'ipa',
              label: 'App Store (IPA)',
              url: 'https://yallapp.com.tr/d/ipa',
            ),
          ],
        ),
        Build(
          id: 'b0000000-0000-4000-8000-000000000001',
          number: 12,
          version: '2.2.0',
          status: 'failed',
          statusLabel: 'Failed',
          message: 'The iOS signing certificate has expired.',
          createdAt: _ago(const Duration(days: 9)),
          finishedAt: _ago(const Duration(days: 9)),
          files: const [],
        ),
      ],
      publishingMode: 'managed',
      stores: const [
        StoreStatus(
          store: 'Google Play',
          status: 'Live',
          url: 'https://play.google.com/store',
        ),
        StoreStatus(store: 'App Store', status: 'In review'),
      ],
    );
  }

  @override
  Future<License> license(String appId) async {
    await _call('license');
    // 60 The owner's only.
    _ownerOnly();
    final app = _app(appId);
    return License(
      state: app.state,
      plan: app.plan,
      nextPlan: null,
      features: const [
        'Android and iOS apps',
        'Push notifications',
        '20 GB of Media',
        'Up to 5,000 app users',
      ],
      storage: _storage(appId),
      manageUrl: 'https://yallapp.com.tr/dashboard/license',
    );
  }
}

class _FakeTransport implements UploadTransport {
  _FakeTransport(this._api);

  final FakeOwnerApi _api;

  /// Chunks to fail (by their offset) before they arrive, once each.
  final failAt = <int>{};

  /// 64b Every chunk refused with this HTTP status (a firewall), when set.
  int? refuseWith;

  String _id(String url) => Uri.parse(url).pathSegments.last;

  @override
  Future<int> offset(String uploadUrl) async =>
      _api.uploads[_id(uploadUrl)]?.bytes.length ?? 0;

  @override
  Future<int> send(String uploadUrl, int offset, List<int> bytes) async {
    final upload = _api.uploads[_id(uploadUrl)];
    if (upload == null) {
      throw const ApiException(code: ApiException.notFound, statusCode: 404);
    }
    final refused = refuseWith;
    if (refused != null) throw ApiException.fromGate(refused);
    if (failAt.remove(offset)) {
      throw const ApiException(code: ApiException.serverError, statusCode: 503);
    }
    if (offset != upload.bytes.length) return upload.bytes.length;
    upload.bytes.addAll(bytes);
    return upload.bytes.length;
  }
}

/// Lets tests make the fake gate fail a chunk.
extension FakeTransportControl on FakeOwnerApi {
  Set<int> get failChunksAt => (transport as _FakeTransport).failAt;

  /// 64b Makes the fake gate refuse every chunk with [status] (null: stop).
  set refuseUploadsWith(int? status) =>
      (transport as _FakeTransport).refuseWith = status;
}
