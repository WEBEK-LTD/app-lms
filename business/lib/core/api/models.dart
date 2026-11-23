import 'json.dart';
import 'studio_models.dart';

export 'json.dart' show Json;
export 'chat_models.dart';
export 'studio_models.dart';

/// 59 The Owner API's schemas (docs/api/owner.yaml), read from JSON.

class Money {
  const Money({
    required this.amountCents,
    required this.currency,
    required this.formatted,
  });

  factory Money.fromJson(Json json) => Money(
    amountCents: integer(json, 'amount_cents'),
    currency: str(json, 'currency'),
    formatted: str(json, 'formatted'),
  );

  static Money? opt(Json json, String key) {
    final value = optObject(json, key);
    return value == null ? null : Money.fromJson(value);
  }

  final int amountCents;
  final String currency;
  final String formatted;

  /// In major units with two decimals ("150.50"), as the API takes amounts.
  String get major {
    final negative = amountCents < 0;
    final cents = amountCents.abs();
    final text = '${cents ~/ 100}.${(cents % 100).toString().padLeft(2, '0')}';
    return negative ? '-$text' : text;
  }
}

enum AccountState {
  pending,
  active,
  expired,
  suspended;

  static AccountState parse(String? value) => AccountState.values.firstWhere(
    (s) => s.name == value,
    orElse: () => AccountState.active,
  );

  /// Pending and suspended accounts see only their state.
  bool get blocked => this == pending || this == suspended;
}

class Session {
  const Session({
    required this.accessToken,
    required this.accessExpiresAt,
    required this.refreshToken,
    required this.refreshExpiresAt,
    required this.deviceId,
    required this.accountState,
  });

  factory Session.fromJson(Json json) => Session(
    accessToken: str(json, 'access_token'),
    accessExpiresAt: date(json, 'access_expires_at'),
    refreshToken: str(json, 'refresh_token'),
    refreshExpiresAt: date(json, 'refresh_expires_at'),
    deviceId: str(json, 'device_id'),
    accountState: AccountState.parse(optStr(json, 'account_state')),
  );

  Json toJson() => {
    'token_type': 'Bearer',
    'access_token': accessToken,
    'access_expires_at': accessExpiresAt.toUtc().toIso8601String(),
    'refresh_token': refreshToken,
    'refresh_expires_at': refreshExpiresAt.toUtc().toIso8601String(),
    'device_id': deviceId,
    'account_state': accountState.name,
  };

  final String accessToken;
  final DateTime accessExpiresAt;
  final String refreshToken;
  final DateTime refreshExpiresAt;
  final String deviceId;
  final AccountState accountState;
}

class DeviceInfo {
  const DeviceInfo({
    required this.name,
    required this.platform,
    this.appVersion,
  });

  final String name;

  /// `android` or `ios`.
  final String platform;
  final String? appVersion;

  Json toJson() => {
    'name': name.length > 100 ? name.substring(0, 100) : name,
    'platform': platform,
    if (appVersion != null) 'app_version': appVersion,
  };
}

class OwnerUser {
  const OwnerUser({
    required this.id,
    required this.name,
    required this.email,
    this.language,
  });

  factory OwnerUser.fromJson(Json json) => OwnerUser(
    id: str(json, 'id'),
    name: str(json, 'name'),
    email: str(json, 'email'),
    language: optStr(json, 'language'),
  );

  final String id;
  final String name;
  final String email;

  /// `en`, `ar` or `tr`; null follows the phone.
  final String? language;

  String get firstName {
    final parts = name.trim().split(RegExp(r'\s+'));
    return parts.isEmpty ? name : parts.first;
  }
}

class MeLinks {
  const MeLinks({
    required this.dashboard,
    this.supportWhatsapp,
    this.supportWhatsappEgypt,
    this.supportWhatsappInternational,
    this.supportEmail,
  });

  factory MeLinks.fromJson(Json json) => MeLinks(
    dashboard: str(json, 'dashboard'),
    supportWhatsapp: optStr(json, 'support_whatsapp'),
    supportWhatsappEgypt: optStr(json, 'support_whatsapp_egypt'),
    supportWhatsappInternational: optStr(
      json,
      'support_whatsapp_international',
    ),
    supportEmail: optStr(json, 'support_email'),
  );

  final String dashboard;

  /// Yallapp's WhatsApp for the account's country (72: Egypt's number in
  /// Egypt, else the international one).
  final String? supportWhatsapp;

  /// 72 Both numbers, shown with their labels on the help screen; null on
  /// older servers.
  final String? supportWhatsappEgypt;
  final String? supportWhatsappInternational;
  final String? supportEmail;

  /// 72 Both numbers are known: the help screen lists each with its label.
  bool get bothWhatsapp =>
      supportWhatsappEgypt != null && supportWhatsappInternational != null;
}

class Me {
  const Me({
    required this.user,
    required this.state,
    required this.apps,
    required this.links,
    this.stateMessage,
    this.business,
    this.businesses = const [],
    this.accountManager,
  });

  factory Me.fromJson(Json json) {
    final account = optObject(json, 'account') ?? const {};
    final business = optObject(json, 'business');
    return Me(
      user: OwnerUser.fromJson(asJson(json['user'])),
      state: AccountState.parse(optStr(account, 'state')),
      stateMessage: optStr(account, 'message'),
      apps: listOf(json, 'apps', AppSummary.fromJson),
      links: MeLinks.fromJson(optObject(json, 'links') ?? const {}),
      business: business == null ? null : Business.fromJson(business),
      businesses: listOf(json, 'businesses', Business.fromJson),
      accountManager: AccountManager.opt(json, 'account_manager'),
    );
  }

  final OwnerUser user;
  final AccountState state;

  /// What a pending or suspended account sees, in the person's language.
  final String? stateMessage;
  final List<AppSummary> apps;
  final MeLinks links;

  /// 60 The business this phone works on, and every one the person is on
  /// (their own and the teams they joined).
  final Business? business;
  final List<Business> businesses;

  /// 125 VIP: the business's account manager at Yallapp (when it has one
  /// and an app on a plan with one).
  final AccountManager? accountManager;

  /// 60 The person's role on this business (the owner's when unknown).
  TeamRole get role => business?.role ?? TeamRole.owner;

  Me copyWith({OwnerUser? user, List<AppSummary>? apps}) => Me(
    user: user ?? this.user,
    state: state,
    stateMessage: stateMessage,
    apps: apps ?? this.apps,
    links: links,
    business: business,
    businesses: businesses,
    accountManager: accountManager,
  );
}

/// 60 A role on a business's team.
enum TeamRole {
  owner,
  manager,
  staff;

  static TeamRole parse(String? value) =>
      values.where((r) => r.name == value).firstOrNull ?? TeamRole.owner;
}

/// 60 What a Staff member can be given, in the dashboard's order.
const teamAreas = [
  'orders',
  'bookings',
  'events',
  'donations',
  'catalog',
  'media',
  'messages',
  // 77 The app's chat.
  'chat',
  'app_users',
  'analytics',
  'notifications',
  // 113.12 A school's salaries.
  'salaries',
];

/// 60 A business the person works on.
class Business {
  const Business({
    required this.id,
    required this.name,
    required this.role,
    required this.state,
  });

  factory Business.fromJson(Json json) => Business(
    id: str(json, 'id'),
    name: str(json, 'name'),
    role: TeamRole.parse(optStr(json, 'role')),
    state: AccountState.parse(optStr(json, 'state')),
  );

  final String id;
  final String name;
  final TeamRole role;
  final AccountState state;
}

/// 60 What the signed-in person may do on an app. A server without teams
/// sends none: the owner's.
class AppAccess {
  const AppAccess({
    this.role = TeamRole.owner,
    this.areas = teamAreas,
    this.license = true,
    this.team = true,
    this.settings = true,
  });

  factory AppAccess.fromJson(Json json) => AppAccess(
    role: TeamRole.parse(optStr(json, 'role')),
    areas: strings(json, 'areas'),
    license: boolean(json, 'license'),
    team: boolean(json, 'team'),
    settings: boolean(json, 'settings'),
  );

  final TeamRole role;
  final List<String> areas;

  /// The plan, payments and storage packs: the owner only.
  final bool license;
  final bool team;

  /// The app's settings: builds and publishing.
  final bool settings;
}

/// 60 Someone on the team (the owner first).
class TeamMember {
  const TeamMember({
    required this.userId,
    required this.name,
    required this.email,
    required this.role,
    required this.areas,
    this.appIds,
    this.joinedAt,
    this.lastSignInAt,
  });

  factory TeamMember.fromJson(Json json) => TeamMember(
    userId: str(json, 'user_id'),
    name: str(json, 'name'),
    email: str(json, 'email'),
    role: TeamRole.parse(optStr(json, 'role')),
    areas: strings(json, 'areas'),
    appIds: json['app_ids'] == null ? null : strings(json, 'app_ids'),
    joinedAt: optDate(json, 'joined_at'),
    lastSignInAt: optDate(json, 'last_sign_in_at'),
  );

  final String userId;
  final String name;
  final String email;
  final TeamRole role;
  final List<String> areas;

  /// Null for every app.
  final List<String>? appIds;
  final DateTime? joinedAt;
  final DateTime? lastSignInAt;
}

/// 60 An invitation waiting to be accepted.
class TeamInvitation {
  const TeamInvitation({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.areas,
    required this.sentAt,
    required this.expiresAt,
    required this.expired,
    this.appIds,
  });

  factory TeamInvitation.fromJson(Json json) => TeamInvitation(
    id: str(json, 'id'),
    name: str(json, 'name'),
    email: str(json, 'email'),
    role: TeamRole.parse(optStr(json, 'role')),
    areas: strings(json, 'areas'),
    appIds: json['app_ids'] == null ? null : strings(json, 'app_ids'),
    sentAt: date(json, 'sent_at'),
    expiresAt: date(json, 'expires_at'),
    expired: boolean(json, 'expired'),
  );

  final String id;
  final String name;
  final String email;
  final TeamRole role;
  final List<String> areas;
  final List<String>? appIds;
  final DateTime sentAt;
  final DateTime expiresAt;
  final bool expired;
}

class Team {
  const Team({required this.members, required this.invitations});

  factory Team.fromJson(Json json) => Team(
    members: listOf(json, 'members', TeamMember.fromJson),
    invitations: listOf(json, 'invitations', TeamInvitation.fromJson),
  );

  final List<TeamMember> members;
  final List<TeamInvitation> invitations;
}

class PlanSummary {
  const PlanSummary({
    required this.id,
    required this.name,
    required this.expiresAt,
    required this.daysLeft,
  });

  factory PlanSummary.fromJson(Json json) => PlanSummary(
    id: str(json, 'id'),
    name: str(json, 'name'),
    expiresAt: date(json, 'expires_at'),
    daysLeft: integer(json, 'days_left'),
  );

  static PlanSummary? opt(Json json, String key) {
    final value = optObject(json, key);
    return value == null ? null : PlanSummary.fromJson(value);
  }

  final String id;
  final String name;
  final DateTime expiresAt;
  final int daysLeft;
}

/// What an app has, as the dashboard's menu shows it.
class AppFeatures {
  const AppFeatures({
    this.orders = false,
    this.kitchen = false,
    this.appointments = false,
    this.events = false,
    this.checkIn = false,
    this.donations = false,
    this.products = false,
    this.courses = false,
    this.articles = false,
    this.listings = false,
    this.inquiries = false,
    this.questions = false,
    this.reviews = false,
    this.memberCheckIn = false,
    this.chat = false,
    this.appUsers = false,
    this.notifications = false,
    this.media = false,
    this.analytics = false,
    this.preview = false,
    this.builds = false,
    this.foodOrders = false,
    this.restaurants = false,
    this.shipments = false,
    this.rides = false,
    this.market = false,
    this.school = false,
    this.prime = false,
    this.vip = false,
  });

  factory AppFeatures.fromJson(Json json) => AppFeatures(
    orders: boolean(json, 'orders'),
    kitchen: boolean(json, 'kitchen'),
    appointments: boolean(json, 'appointments'),
    events: boolean(json, 'events'),
    checkIn: boolean(json, 'check_in'),
    donations: boolean(json, 'donations'),
    products: boolean(json, 'products'),
    courses: boolean(json, 'courses'),
    articles: boolean(json, 'articles'),
    listings: boolean(json, 'listings'),
    inquiries: boolean(json, 'inquiries'),
    questions: boolean(json, 'questions'),
    reviews: boolean(json, 'reviews'),
    memberCheckIn: boolean(json, 'member_check_in'),
    chat: boolean(json, 'chat'),
    appUsers: boolean(json, 'app_users'),
    notifications: boolean(json, 'notifications'),
    media: boolean(json, 'media'),
    analytics: boolean(json, 'analytics'),
    preview: boolean(json, 'preview'),
    builds: boolean(json, 'builds'),
    foodOrders: boolean(json, 'food_orders'),
    restaurants: boolean(json, 'restaurants'),
    shipments: boolean(json, 'shipments'),
    rides: boolean(json, 'rides'),
    market: boolean(json, 'market'),
    school: boolean(json, 'school'),
    prime: boolean(json, 'prime'),
    vip: boolean(json, 'vip'),
  );

  final bool orders;
  final bool kitchen;
  final bool appointments;
  final bool events;
  final bool checkIn;
  final bool donations;
  final bool products;
  final bool courses;
  final bool articles;
  final bool listings;
  final bool inquiries;

  /// 63 Students' questions in courses managed in Yallapp (Messages).
  final bool questions;

  /// 63 Reviews of courses managed in Yallapp (Catalog & content).
  final bool reviews;

  /// 63 A gym's members checked in at the door (Bookings).
  final bool memberCheckIn;

  /// 77 The app's chat: its plan has it, it's on, and the person has the
  /// Chat area.
  final bool chat;
  final bool appUsers;
  final bool notifications;
  final bool media;
  final bool analytics;
  final bool preview;
  final bool builds;

  /// 125 A Studio food app's orders (its restaurants' own).
  final bool foodOrders;

  /// 125 Its restaurants: busy, delayed, open again.
  final bool restaurants;

  /// 125 Courier jobs (a delivery app, and food and marketplace apps).
  final bool shipments;

  /// 125 A rides or taxi app's rides and drivers.
  final bool rides;

  /// 125 A marketplace: its orders, complaints and vendors.
  final bool market;

  /// 125 A school's day: check-in, excuses, reports, leave.
  final bool school;

  /// 125 Prime: the app is a Studio app (and the person has Analytics).
  final bool prime;

  /// 125 VIP: the app's plan comes with an account manager.
  final bool vip;

  bool get catalog => products || courses || articles || listings;

  /// 63 The Inbox tab: a listing's conversations, course questions, reviews.
  bool get inbox => inquiries || questions || reviews;
}

class AppSummary {
  const AppSummary({
    required this.id,
    required this.name,
    required this.type,
    required this.typeName,
    required this.state,
    required this.features,
    this.vertical,
    this.backend,
    this.iconUrl,
    this.plan,
    this.access = const AppAccess(),
    this.primeGift = false,
    this.primeGiftUntil,
  });

  factory AppSummary.fromJson(Json json) => AppSummary(
    id: str(json, 'id'),
    name: str(json, 'name'),
    type: str(json, 'type'),
    vertical: optStr(json, 'vertical'),
    typeName: str(json, 'type_name'),
    backend: optStr(json, 'backend'),
    state: AccountState.parse(optStr(json, 'state')),
    iconUrl: optStr(json, 'icon_url'),
    plan: PlanSummary.opt(json, 'plan'),
    features: AppFeatures.fromJson(optObject(json, 'features') ?? const {}),
    access: switch (optObject(json, 'access')) {
      final Json access => AppAccess.fromJson(access),
      null => const AppAccess(),
    },
    primeGift: optObject(json, 'prime_gift') != null,
    primeGiftUntil: switch (optObject(json, 'prime_gift')) {
      final Json gift => optDate(gift, 'until'),
      null => null,
    },
  );

  final String id;
  final String name;

  /// lms, store, booking, real_estate, news, events or donations.
  final String type;

  /// restaurant, clinic, fitness, charity or services.
  final String? vertical;
  final String typeName;

  /// wordpress, hosted, custom_api or setup_requested.
  final String? backend;
  final AccountState state;
  final String? iconUrl;
  final PlanSummary? plan;
  final AppFeatures features;

  /// 60 What the signed-in person may do on it.
  final AppAccess access;

  /// 132 Prime given by Yallapp as a gift (whatever the plan), until when
  /// (null: until Yallapp removes it).
  final bool primeGift;
  final DateTime? primeGiftUntil;

  bool get isRestaurant => vertical == 'restaurant' || features.kitchen;
  bool get hosted => backend == 'hosted';
}

class Device {
  const Device({
    required this.id,
    required this.name,
    required this.platform,
    required this.createdAt,
    required this.lastSeenAt,
    required this.current,
    required this.push,
    this.appVersion,
  });

  factory Device.fromJson(Json json) => Device(
    id: str(json, 'id'),
    name: str(json, 'name'),
    platform: str(json, 'platform'),
    appVersion: optStr(json, 'app_version'),
    createdAt: date(json, 'created_at'),
    lastSeenAt: date(json, 'last_seen_at'),
    current: boolean(json, 'current'),
    push: boolean(json, 'push'),
  );

  final String id;
  final String name;
  final String platform;
  final String? appVersion;
  final DateTime createdAt;
  final DateTime lastSeenAt;
  final bool current;
  final bool push;
}

enum PushKind {
  newOrder('new_order'),
  newBooking('new_booking'),
  newMessage('new_message'),
  // 77 A message in the app's chat.
  newChatMessage('new_chat_message'),
  newReview('new_review'),
  paymentReceived('payment_received'),
  buildFinished('build_finished'),
  yallappUpdates('yallapp_updates'),
  accountNotices('account_notices'),
  // 125 Studio apps and Prime.
  newFoodOrder('new_food_order'),
  shipmentWaiting('shipment_waiting'),
  newComplaint('new_complaint'),
  primeAlert('prime_alert'),
  morningBrief('morning_brief'),
  // 206 A marketplace order reached its vendor; a customer cancelled one.
  newMarketOrder('new_market_order'),
  orderCancelled('order_cancelled');

  const PushKind(this.wire);
  final String wire;

  static PushKind? parse(String? value) {
    for (final kind in values) {
      if (kind.wire == value) return kind;
    }
    return null;
  }
}

/// One switch per kind of push; kinds the server didn't list are on.
class PushPreferences {
  const PushPreferences(this.values);

  factory PushPreferences.fromJson(Json json) => PushPreferences({
    for (final kind in PushKind.values) kind: boolean(json, kind.wire, true),
  });

  final Map<PushKind, bool> values;

  bool isOn(PushKind kind) => values[kind] ?? true;

  PushPreferences withValue(PushKind kind, bool on) =>
      PushPreferences({...values, kind: on});

  Json toJson() => {for (final e in values.entries) e.key.wire: e.value};
}

class Update {
  const Update({
    required this.key,
    required this.kind,
    required this.title,
    required this.body,
    required this.summary,
    required this.at,
    required this.unread,
    required this.current,
    this.kindLabel,
    this.link,
    this.linkLabel,
    this.appName,
  });

  factory Update.fromJson(Json json) => Update(
    key: str(json, 'key'),
    kind: str(json, 'kind'),
    kindLabel: optStr(json, 'kind_label'),
    title: str(json, 'title'),
    body: str(json, 'body'),
    summary: str(json, 'summary'),
    link: optStr(json, 'link'),
    linkLabel: optStr(json, 'link_label'),
    appName: optStr(json, 'app_name'),
    at: date(json, 'at'),
    unread: boolean(json, 'unread'),
    current: boolean(json, 'current', true),
  );

  final String key;

  /// update, announcement, maintenance, offer or account.
  final String kind;
  final String? kindLabel;
  final String title;

  /// Plain text for the account's items, a small Markdown for announcements.
  final String body;

  /// The text on one line.
  final String summary;
  final String? link;
  final String? linkLabel;

  /// The app it is about, when the account has more than one.
  final String? appName;
  final DateTime at;
  final bool unread;
  final bool current;

  Update read() => Update(
    key: key,
    kind: kind,
    kindLabel: kindLabel,
    title: title,
    body: body,
    summary: summary,
    link: link,
    linkLabel: linkLabel,
    appName: appName,
    at: at,
    unread: false,
    current: current,
  );
}

class UpdatesList {
  const UpdatesList({required this.unread, required this.items});

  factory UpdatesList.fromJson(Json json) => UpdatesList(
    unread: integer(json, 'unread'),
    items: listOf(json, 'items', Update.fromJson),
  );

  final int unread;
  final List<Update> items;
}

class TodayCounts {
  const TodayCounts({
    this.orders,
    this.appointments,
    this.tickets,
    this.checkIns,
    this.memberCheckIns,
    this.donations,
    this.newUsers,
    this.appOpens,
  });

  factory TodayCounts.fromJson(Json json) => TodayCounts(
    orders: optInt(json, 'orders'),
    appointments: optInt(json, 'appointments'),
    tickets: optInt(json, 'tickets'),
    checkIns: optInt(json, 'check_ins'),
    memberCheckIns: optInt(json, 'member_check_ins'),
    donations: optInt(json, 'donations'),
    newUsers: optInt(json, 'new_users'),
    appOpens: optInt(json, 'app_opens'),
  );

  final int? orders;
  final int? appointments;
  final int? tickets;
  final int? checkIns;

  /// 63 A gym's members who came in today.
  final int? memberCheckIns;
  final int? donations;
  final int? newUsers;

  /// Null before the app sends any analytics.
  final int? appOpens;
}

class NeedsYou {
  const NeedsYou({
    required this.kind,
    required this.count,
    required this.title,
    this.noticeId,
  });

  factory NeedsYou.fromJson(Json json) => NeedsYou(
    kind: str(json, 'kind'),
    count: integer(json, 'count'),
    title: str(json, 'title'),
    noticeId: optInt(json, 'notice_id'),
  );

  /// orders_in_progress, appointments_to_confirm, unanswered_messages,
  /// questions_to_answer (63), notice; 125 food_orders_new,
  /// shipments_waiting, rides_searching, complaints_waiting,
  /// school_excuses, school_reports, school_leave.
  final String kind;
  final int count;
  final String title;
  final int? noticeId;
}

class Today {
  const Today({
    required this.date,
    required this.timeZone,
    required this.sales,
    required this.donations,
    required this.counts,
    required this.needsYou,
    this.hasAppOpens = false,
    this.compare,
    this.morningBrief,
    this.goal,
  });

  factory Today.fromJson(Json json) {
    final counts = optObject(json, 'counts') ?? const {};
    return Today(
      date: str(json, 'date'),
      timeZone: str(json, 'time_zone'),
      sales: listOf(json, 'sales', Money.fromJson),
      donations: listOf(json, 'donations', Money.fromJson),
      counts: TodayCounts.fromJson(counts),
      hasAppOpens: counts.containsKey('app_opens'),
      needsYou: listOf(json, 'needs_you', NeedsYou.fromJson),
      compare: TodayCompare.opt(json, 'compare'),
      morningBrief: optStr(
        optObject(json, 'morning_brief') ?? const {},
        'text',
      ),
      goal: TodayGoal.opt(json, 'goal'),
    );
  }

  final String date;
  final String timeZone;
  final List<Money> sales;
  final List<Money> donations;
  final TodayCounts counts;

  /// The app has Analytics (app_opens is listed, maybe still null).
  final bool hasAppOpens;
  final List<NeedsYou> needsYou;

  /// 125 A Prime app's today against the same weekday last week.
  final TodayCompare? compare;

  /// 125 Yesterday in a line (`morning_brief.text`), when sent.
  final String? morningBrief;

  /// 132 The person's sales goal and how far it is (Prime).
  final TodayGoal? goal;
}

/// 132 A sales goal for the day, the week or the month, and how far it is.
class TodayGoal {
  const TodayGoal({
    required this.period,
    required this.target,
    required this.current,
    required this.pct,
    required this.reached,
    required this.label,
  });

  static TodayGoal? opt(Json json, String key) {
    final g = optObject(json, key);
    if (g == null) return null;
    return TodayGoal(
      period: str(g, 'period', 'day'),
      target: Money.fromJson(optObject(g, 'target') ?? const {}),
      current: Money.fromJson(optObject(g, 'current') ?? const {}),
      pct: integer(g, 'pct'),
      reached: boolean(g, 'reached'),
      label: str(g, 'label'),
    );
  }

  /// day, week or month.
  final String period;
  final Money target;
  final Money current;
  final int pct;
  final bool reached;
  final String label;
}

class Paged<T> {
  const Paged({
    required this.items,
    this.page = 1,
    this.perPage = 20,
    this.total = 0,
    this.totalPages = 1,
    this.counts = const {},
  });

  factory Paged.fromJson(Json json, T Function(Json) parse) => Paged(
    items: listOf(json, 'items', parse),
    page: integer(json, 'page', 1),
    perPage: integer(json, 'per_page', 20),
    total: integer(json, 'total'),
    totalPages: integer(json, 'total_pages', 1),
    counts: {
      for (final e in (optObject(json, 'counts') ?? const {}).entries)
        if (e.value is num) e.key: (e.value as num).toInt(),
    },
  );

  final List<T> items;
  final int page;
  final int perPage;
  final int total;
  final int totalPages;

  /// 125 The list's counts beside its page (food orders' `new` and
  /// `active`, shipments' `waiting`…).
  final Map<String, int> counts;

  int count(String key) => counts[key] ?? 0;

  bool get hasMore => page < totalPages;
}

class OrderKitchen {
  const OrderKitchen({
    required this.type,
    required this.step,
    this.stepLabel,
    this.scheduledFor,
  });

  factory OrderKitchen.fromJson(Json json) => OrderKitchen(
    type: str(json, 'type', 'pickup'),
    step: str(json, 'step', 'received'),
    stepLabel: optStr(json, 'step_label'),
    scheduledFor: optDate(json, 'scheduled_for'),
  );

  /// pickup or delivery.
  final String type;

  /// received, preparing, ready, out_for_delivery, completed, cancelled.
  final String step;
  final String? stepLabel;

  /// 132 The time the customer asked for; null: as soon as possible.
  final DateTime? scheduledFor;
}

/// 132 A line bought at a flash sale's price.
class LineSale {
  const LineSale({this.title, this.percent});

  factory LineSale.fromJson(Json json) =>
      LineSale(title: optStr(json, 'title'), percent: optInt(json, 'percent'));

  final String? title;
  final int? percent;
}

class OrderLine {
  const OrderLine({
    required this.name,
    required this.quantity,
    required this.unit,
    this.options = const [],
    this.productId,
    this.total,
    this.variant,
    this.addonOf,
    this.flashSale,
    this.bouquet,
  });

  factory OrderLine.fromJson(Json json) {
    final sale = optObject(json, 'flash_sale');
    return OrderLine(
      name: str(json, 'name'),
      quantity: integer(json, 'quantity', 1),
      unit: Money.fromJson(optObject(json, 'unit') ?? const {}),
      options: strings(json, 'options'),
      productId: optInt(json, 'product_id'),
      total: Money.opt(json, 'total'),
      variant: optStr(json, 'variant'),
      addonOf: optInt(json, 'addon_of'),
      flashSale: sale == null ? null : LineSale.fromJson(sale),
      bouquet: LineBouquet.tryParse(optObject(json, 'bouquet')),
    );
  }

  /// 162 A line of a bouquet the customer built in the app; null otherwise.
  final LineBouquet? bouquet;

  final String name;
  final int quantity;
  final Money unit;
  final List<String> options;

  /// 132 The product; an add-on's [addonOf] is its item's.
  final int? productId;
  final Money? total;
  final String? variant;

  /// 131 A gift add-on: the product of the line it goes with.
  final int? addonOf;
  final LineSale? flashSale;
}

/// 162 Which bouquet a line is part of, which part (`flower`, `wrap`,
/// `card`) and, on one of its lines, the card's message.
class LineBouquet {
  const LineBouquet({required this.id, required this.part, this.message});

  static LineBouquet? tryParse(Json? json) {
    if (json == null) return null;
    final id = optStr(json, 'id');
    final part = optStr(json, 'part');
    if (id == null || id.isEmpty || part == null) return null;
    final message = optStr(json, 'message');
    return LineBouquet(
      id: id,
      part: part,
      message: message == null || message.trim().isEmpty ? null : message,
    );
  }

  final String id;
  final String part;
  final String? message;
}

class Customer {
  const Customer({
    this.name,
    this.phone,
    this.email,
    this.city,
    this.address,
    this.source,
  });

  factory Customer.fromJson(Json json) => Customer(
    name: optStr(json, 'name'),
    phone: optStr(json, 'phone'),
    email: optStr(json, 'email'),
    city: optStr(json, 'city'),
    address: optStr(json, 'address'),
    source: optStr(json, 'source'),
  );

  final String? name;
  final String? phone;
  final String? email;
  final String? city;
  final String? address;

  /// 132 checkout (the payment page), sender (the gift checkout) or account
  /// (the app's account of the person who checked out).
  final String? source;
}

/// 132 Where an order goes and who takes it: the gift's recipient, or the
/// customer at their address; the place's pin for the map.
class DeliverTo {
  const DeliverTo({
    required this.person,
    this.name,
    this.phone,
    this.address,
    this.city,
    this.country,
    this.lat,
    this.lng,
    this.notes,
  });

  factory DeliverTo.fromJson(Json json) => DeliverTo(
    person: str(json, 'person', 'customer'),
    name: optStr(json, 'name'),
    phone: optStr(json, 'phone'),
    address: optStr(json, 'address'),
    city: optStr(json, 'city'),
    country: optStr(json, 'country'),
    lat: optNumber(json, 'lat'),
    lng: optNumber(json, 'lng'),
    notes: optStr(json, 'notes'),
  );

  /// customer or recipient.
  final String person;
  final String? name;
  final String? phone;
  final String? address;
  final String? city;
  final String? country;
  final double? lat;
  final double? lng;
  final String? notes;

  bool get isRecipient => person == 'recipient';

  /// "14 Brazil St, Zamalek, Cairo": what to copy or look up.
  String get line => [
    address,
    if (city != null && !(address ?? '').contains(city!)) city,
  ].whereType<String>().join(', ');
}

/// 131 A delivery's people: the gift checkout's sender or its recipient.
class GiftPerson {
  const GiftPerson({required this.name, this.phone, this.email, this.address});

  factory GiftPerson.fromJson(Json json) => GiftPerson(
    name: str(json, 'name'),
    phone: optStr(json, 'phone'),
    email: optStr(json, 'email'),
    address: optStr(json, 'address'),
  );

  final String name;
  final String? phone;
  final String? email;
  final String? address;
}

/// 131 The delivery day and slot, the gift's people and card, the place,
/// the shipping's zone and the fee with what made it up.
class OrderDelivery {
  const OrderDelivery({
    this.date,
    this.slotLabel,
    this.fee,
    this.sender,
    this.recipient,
    this.giftMessage,
    this.anonymous = false,
    this.signedBy,
    this.zone,
    this.shippingFee,
    this.breakdown = const [],
  });

  factory OrderDelivery.fromJson(Json json) {
    final slot = optObject(json, 'slot');
    final sender = optObject(json, 'sender');
    final recipient = optObject(json, 'recipient');
    return OrderDelivery(
      date: optStr(json, 'date'),
      slotLabel: slot == null
          ? null
          : optStr(slot, 'label') ??
                '${str(slot, 'start')}–${str(slot, 'end')}',
      fee: Money.opt(json, 'fee'),
      sender: sender == null ? null : GiftPerson.fromJson(sender),
      recipient: recipient == null ? null : GiftPerson.fromJson(recipient),
      giftMessage: optStr(json, 'gift_message'),
      anonymous: boolean(json, 'anonymous'),
      signedBy: optStr(json, 'signed_by'),
      zone: optStr(json, 'zone'),
      shippingFee: Money.opt(json, 'shipping_fee'),
      breakdown: [
        for (final b in jsonList(json, 'breakdown'))
          (
            label: str(b, 'label'),
            rule: optStr(b, 'rule'),
            amount: Money.fromJson(optObject(b, 'amount') ?? const {}),
          ),
      ],
    );
  }

  /// YYYY-MM-DD in the shop's time zone.
  final String? date;

  /// "13:00–16:00".
  final String? slotLabel;

  /// The slot's own fee.
  final Money? fee;
  final GiftPerson? sender;
  final GiftPerson? recipient;
  final String? giftMessage;

  /// The card goes without the sender's name (the owner still sees them).
  final bool anonymous;
  final String? signedBy;
  final String? zone;
  final Money? shippingFee;
  final List<({String label, String? rule, Money amount})> breakdown;

  bool get hasWhen => date != null || slotLabel != null;
  bool get hasCard => giftMessage != null || anonymous;
}

/// 132 What an order's total is made of.
class OrderAmounts {
  const OrderAmounts({
    required this.subtotal,
    required this.total,
    this.discount,
    this.couponCode,
    this.points,
    this.pointsUsed,
    this.shipping,
    this.tax,
    this.taxLabel,
    this.taxIncluded = false,
  });

  factory OrderAmounts.fromJson(Json json) {
    final discount = optObject(json, 'discount');
    final points = optObject(json, 'points');
    final tax = optObject(json, 'tax');
    return OrderAmounts(
      subtotal: Money.fromJson(optObject(json, 'subtotal') ?? const {}),
      total: Money.fromJson(optObject(json, 'total') ?? const {}),
      discount: discount == null ? null : Money.opt(discount, 'amount'),
      couponCode: discount == null ? null : optStr(discount, 'code'),
      points: points == null ? null : Money.opt(points, 'amount'),
      pointsUsed: points == null ? null : optInt(points, 'used'),
      shipping: Money.opt(json, 'shipping'),
      tax: tax == null ? null : Money.opt(tax, 'amount'),
      taxLabel: tax == null ? null : optStr(tax, 'label'),
      taxIncluded: tax != null && boolean(tax, 'included'),
    );
  }

  final Money subtotal;
  final Money total;
  final Money? discount;
  final String? couponCode;
  final Money? points;
  final int? pointsUsed;
  final Money? shipping;
  final Money? tax;
  final String? taxLabel;
  final bool taxIncluded;
}

/// 96.2 To be paid by bank transfer or the owner's own method.
class PayOutside {
  const PayOutside({required this.method, required this.name, this.dueAt});

  factory PayOutside.fromJson(Json json) => PayOutside(
    method: str(json, 'method'),
    name: str(json, 'name'),
    dueAt: optDate(json, 'due_at'),
  );

  final String method;
  final String name;
  final DateTime? dueAt;
}

/// 80.4 How it was shipped.
class OrderShipment {
  const OrderShipment({
    this.carrier,
    this.trackingNumber,
    this.trackingUrl,
    this.shippedAt,
  });

  factory OrderShipment.fromJson(Json json) => OrderShipment(
    carrier: optStr(json, 'carrier'),
    trackingNumber: optStr(json, 'tracking_number'),
    trackingUrl: optStr(json, 'tracking_url'),
    shippedAt: optDate(json, 'shipped_at'),
  );

  final String? carrier;
  final String? trackingNumber;
  final String? trackingUrl;
  final DateTime? shippedAt;
}

class Takeable {
  const Takeable({required this.id, required this.label});

  factory Takeable.fromJson(Json json) =>
      Takeable(id: integer(json, 'id'), label: str(json, 'label'));

  final int id;
  final String label;
}

class IdLabel {
  const IdLabel({required this.id, required this.label});

  factory IdLabel.fromJson(Json json) =>
      IdLabel(id: str(json, 'id'), label: str(json, 'label'));

  final String id;
  final String label;
}

class RefundOptions {
  const RefundOptions({
    required this.refundable,
    required this.left,
    required this.byApi,
    required this.manual,
    this.why,
    this.provider,
    this.reasons = const [],
    this.tickets = const [],
    this.courses = const [],
    this.memberships = const [],
  });

  factory RefundOptions.fromJson(Json json) {
    final take = optObject(json, 'can_take_back') ?? const {};
    return RefundOptions(
      refundable: boolean(json, 'refundable'),
      why: optStr(json, 'why'),
      provider: optStr(json, 'provider'),
      left: Money.fromJson(optObject(json, 'left') ?? const {}),
      byApi: boolean(json, 'by_api'),
      manual: boolean(json, 'manual'),
      reasons: listOf(json, 'reasons', IdLabel.fromJson),
      tickets: listOf(take, 'tickets', Takeable.fromJson),
      courses: listOf(take, 'courses', Takeable.fromJson),
      memberships: listOf(take, 'memberships', Takeable.fromJson),
    );
  }

  final bool refundable;
  final String? why;
  final String? provider;
  final Money left;
  final bool byApi;
  final bool manual;
  final List<IdLabel> reasons;
  final List<Takeable> tickets;
  final List<Takeable> courses;
  final List<Takeable> memberships;
}

class Refund {
  const Refund({
    required this.id,
    required this.amount,
    required this.reason,
    required this.method,
    required this.createdAt,
  });

  factory Refund.fromJson(Json json) => Refund(
    id: integer(json, 'id'),
    amount: Money.fromJson(optObject(json, 'amount') ?? const {}),
    reason: str(json, 'reason'),
    method: str(json, 'method'),
    createdAt: date(json, 'created_at'),
  );

  final int id;
  final Money amount;
  final String reason;
  final String method;
  final DateTime createdAt;
}

/// An order; [refund] and [refunds] come with one order (`OrderDetail`).
class Order {
  const Order({
    required this.id,
    required this.number,
    required this.status,
    required this.total,
    required this.lines,
    required this.createdAt,
    required this.nextStatuses,
    this.statusLabel,
    this.kitchen,
    this.refunded,
    this.customer,
    this.paidAt,
    this.refund,
    this.refunds = const [],
    this.deliverTo,
    this.delivery,
    this.amounts,
    this.payOutside,
    this.shipment,
    this.stage,
    this.stageHistory = const [],
    this.nextStages = const [],
    this.refundDue,
    this.cancelRefund,
  });

  factory Order.fromJson(Json json) {
    final kitchen = optObject(json, 'kitchen');
    final customer = optObject(json, 'customer');
    final refund = optObject(json, 'refund');
    final deliverTo = optObject(json, 'deliver_to');
    final delivery = optObject(json, 'delivery');
    final amounts = optObject(json, 'amounts');
    final outside = optObject(json, 'pay_outside');
    final shipment = optObject(json, 'shipment');
    final stage = optObject(json, 'stage');
    return Order(
      id: integer(json, 'id'),
      number: str(json, 'number'),
      status: str(json, 'status'),
      statusLabel: optStr(json, 'status_label'),
      kitchen: kitchen == null ? null : OrderKitchen.fromJson(kitchen),
      total: Money.fromJson(optObject(json, 'total') ?? const {}),
      refunded: Money.opt(json, 'refunded'),
      lines: listOf(json, 'lines', OrderLine.fromJson),
      customer: customer == null ? null : Customer.fromJson(customer),
      createdAt: date(json, 'created_at'),
      paidAt: optDate(json, 'paid_at'),
      nextStatuses: strings(json, 'next_statuses'),
      refund: refund == null ? null : RefundOptions.fromJson(refund),
      refunds: listOf(json, 'refunds', Refund.fromJson),
      deliverTo: deliverTo == null ? null : DeliverTo.fromJson(deliverTo),
      delivery: delivery == null ? null : OrderDelivery.fromJson(delivery),
      amounts: amounts == null ? null : OrderAmounts.fromJson(amounts),
      payOutside: outside == null ? null : PayOutside.fromJson(outside),
      shipment: shipment == null ? null : OrderShipment.fromJson(shipment),
      stage: stage == null ? null : OrderStage.fromJson(stage),
      stageHistory: listOf(json, 'stage_history', OrderStage.fromJson),
      nextStages: strings(json, 'next_stages'),
      refundDue: RefundDue.opt(json, 'refund_due'),
      cancelRefund: Money.opt(
        optObject(json, 'cancel_refund') ?? const {},
        'amount',
      ),
    );
  }

  final int id;

  /// The order's number as the API gives it ("1042").
  final String number;

  /// "#1042", as the dashboard shows it.
  String get label => number.startsWith('#') ? number : '#$number';

  /// pending (96.2), processing, completed, cancelled, refunded.
  final String status;
  final String? statusLabel;
  final OrderKitchen? kitchen;
  final Money total;
  final Money? refunded;
  final List<OrderLine> lines;
  final Customer? customer;
  final DateTime createdAt;
  final DateTime? paidAt;
  final List<String> nextStatuses;
  final RefundOptions? refund;
  final List<Refund> refunds;

  /// 132 Where it goes and who takes it.
  final DeliverTo? deliverTo;

  /// 131 The day and slot, the gift's people and card, the fees.
  final OrderDelivery? delivery;

  /// 132 What the total is made of.
  final OrderAmounts? amounts;
  final PayOutside? payOutside;
  final OrderShipment? shipment;

  /// 132 Where its delivery is (a store's order); null before its first stage.
  final OrderStage? stage;

  /// 132 Every change of its delivery stage, newest first.
  final List<OrderStage> stageHistory;

  /// 132 The stages it may move to now (shipped, postponed, failed…).
  final List<String> nextStages;

  /// 132 The customer's money after a failed delivery cancelled it.
  final RefundDue? refundDue;

  /// 175 What cancelling it now can refund (all that's left of its
  /// payment): the owner chooses to refund it or not. Null when nothing paid
  /// is left, and from older servers.
  final Money? cancelRefund;

  /// 132 The owner still has to pay the customer back.
  bool get needsRefund => refundDue?.status == 'needed';

  int get itemCount => lines.fold(0, (sum, line) => sum + line.quantity);

  /// 132 Who ordered: the customer, else the gift's sender.
  String? get buyerName => customer?.name ?? delivery?.sender?.name;

  /// The same order with what changed (the fake API's moves and refunds).
  Order copyWith({
    String? status,
    String? statusLabel,
    OrderKitchen? kitchen,
    bool clearKitchen = false,
    Money? refunded,
    List<String>? nextStatuses,
    RefundOptions? refund,
    List<Refund>? refunds,
    OrderStage? stage,
    List<OrderStage>? stageHistory,
    List<String>? nextStages,
    OrderDelivery? delivery,
    RefundDue? refundDue,
    Money? cancelRefund,
    bool clearCancelRefund = false,
  }) => Order(
    id: id,
    number: number,
    status: status ?? this.status,
    statusLabel: statusLabel ?? this.statusLabel,
    kitchen: clearKitchen ? null : (kitchen ?? this.kitchen),
    total: total,
    refunded: refunded ?? this.refunded,
    lines: lines,
    customer: customer,
    createdAt: createdAt,
    paidAt: paidAt,
    nextStatuses: nextStatuses ?? this.nextStatuses,
    refund: refund ?? this.refund,
    refunds: refunds ?? this.refunds,
    deliverTo: deliverTo,
    delivery: delivery ?? this.delivery,
    amounts: amounts,
    payOutside: payOutside,
    shipment: shipment,
    stage: stage ?? this.stage,
    stageHistory: stageHistory ?? this.stageHistory,
    nextStages: nextStages ?? this.nextStages,
    refundDue: refundDue ?? this.refundDue,
    cancelRefund: clearCancelRefund
        ? null
        : (cancelRefund ?? this.cancelRefund),
  );
}

/// 132 The customer's money after a failed delivery ended with the order
/// cancelled: refunded at once, or needed (the owner pays it back), then
/// recorded.
class RefundDue {
  const RefundDue({
    required this.status,
    required this.amount,
    required this.at,
    this.why,
    this.whyCode,
    this.doneAt,
    this.doneBy,
  });

  static RefundDue? opt(Json json, String key) {
    final o = optObject(json, key);
    if (o == null) return null;
    return RefundDue(
      status: str(o, 'status'),
      amount: Money.fromJson(optObject(o, 'amount') ?? const {}),
      at: date(o, 'at'),
      why: optStr(o, 'why'),
      whyCode: optStr(o, 'why_code'),
      doneAt: optDate(o, 'done_at'),
      doneBy: optStr(o, 'done_by'),
    );
  }

  /// refunded, needed or recorded.
  final String status;
  final Money amount;
  final DateTime at;
  final String? why;

  /// paid_outside, no_provider or provider_refused (then [why] is the provider's answer).
  final String? whyCode;
  final DateTime? doneAt;
  final String? doneBy;
}

/// 132 One change of a store order's delivery stage: who, when, why, the
/// team's note (never the customer's to see) and what it set.
class OrderStage {
  const OrderStage({
    required this.stage,
    required this.label,
    required this.at,
    this.by,
    this.reason,
    this.reasonLabel,
    this.note,
    this.courierName,
    this.courierPhone,
    this.trackingUrl,
    this.day,
    this.dayLabel,
    this.slotId,
    this.slotLabel,
    this.nextStep,
    this.nextStepLabel,
  });

  factory OrderStage.fromJson(Json json) {
    final reason = optObject(json, 'reason');
    final courier = optObject(json, 'courier');
    final slot = optObject(json, 'slot');
    final next = optObject(json, 'next_step');
    return OrderStage(
      stage: str(json, 'stage'),
      label: str(json, 'label'),
      at: date(json, 'at'),
      by: optStr(json, 'by'),
      reason: reason == null ? null : optStr(reason, 'code'),
      reasonLabel: reason == null ? null : optStr(reason, 'label'),
      note: optStr(json, 'note'),
      courierName: courier == null ? null : optStr(courier, 'name'),
      courierPhone: courier == null ? null : optStr(courier, 'phone'),
      trackingUrl: optStr(json, 'tracking_url'),
      day: optStr(json, 'date'),
      dayLabel: optStr(json, 'date_label'),
      slotId: slot == null ? null : optStr(slot, 'id'),
      slotLabel: slot == null ? null : optStr(slot, 'label'),
      nextStep: next == null ? null : optStr(next, 'code'),
      nextStepLabel: next == null ? null : optStr(next, 'label'),
    );
  }

  /// preparing, shipped, postponed, failed, returned, delivered.
  final String stage;
  final String label;
  final DateTime at;

  /// The team member's name; null: the system.
  final String? by;
  final String? reason;
  final String? reasonLabel;
  final String? note;
  final String? courierName;
  final String? courierPhone;
  final String? trackingUrl;

  /// YYYY-MM-DD: the new delivery day (postponed, or tried again).
  final String? day;
  final String? dayLabel;
  final String? slotId;
  final String? slotLabel;

  /// retry, return or cancel, after a failed attempt.
  final String? nextStep;
  final String? nextStepLabel;
}

/// 132 What moving an order's delivery to a stage says.
class StageRequest {
  const StageRequest(
    this.stage, {
    this.reason,
    this.note,
    this.courierName,
    this.courierPhone,
    this.trackingUrl,
    this.date,
    this.slotId,
    this.nextStep,
  });

  final String stage;
  final String? reason;
  final String? note;
  final String? courierName;
  final String? courierPhone;
  final String? trackingUrl;
  final String? date;
  final String? slotId;
  final String? nextStep;

  Json toJson() => {
    'stage': stage,
    'reason': ?reason,
    'note': ?note,
    'courier_name': ?courierName,
    'courier_phone': ?courierPhone,
    'tracking_url': ?trackingUrl,
    'date': ?date,
    'slot_id': ?slotId,
    'next_step': ?nextStep,
  };
}

/// 132 A day's delivery times, to postpone an order to.
class DeliveryDay {
  const DeliveryDay({
    required this.date,
    required this.dateLabel,
    required this.slots,
  });

  factory DeliveryDay.fromJson(Json json) => DeliveryDay(
    date: str(json, 'date'),
    dateLabel: str(json, 'date_label'),
    slots: listOf(json, 'slots', DeliveryTime.fromJson),
  );

  final String date;
  final String dateLabel;
  final List<DeliveryTime> slots;
}

class DeliveryTime {
  const DeliveryTime({
    required this.id,
    required this.label,
    this.orders = 0,
    this.full = false,
    this.closed = false,
    this.started = false,
  });

  factory DeliveryTime.fromJson(Json json) => DeliveryTime(
    id: str(json, 'id'),
    label: str(json, 'label'),
    orders: optInt(json, 'orders') ?? 0,
    full: boolean(json, 'full'),
    closed: boolean(json, 'closed'),
    started: boolean(json, 'started'),
  );

  final String id;
  final String label;
  final int orders;
  final bool full;
  final bool closed;
  final bool started;

  /// It can still be chosen.
  bool get open => !closed && !started && !full;
}

class RefundRequest {
  const RefundRequest({
    required this.amount,
    required this.reason,
    this.note,
    this.method = 'api',
    this.reference,
    this.tickets = const [],
    this.courses = const [],
    this.memberships = const [],
  });

  final String amount;
  final String reason;
  final String? note;
  final String method;
  final String? reference;
  final List<int> tickets;
  final List<int> courses;
  final List<int> memberships;

  Json toJson() => {
    'amount': amount,
    'reason': reason,
    if (note != null && note!.isNotEmpty) 'note': note,
    'method': method,
    if (reference != null && reference!.isNotEmpty) 'reference': reference,
    if (tickets.isNotEmpty) 'tickets': tickets,
    if (courses.isNotEmpty) 'courses': courses,
    if (memberships.isNotEmpty) 'memberships': memberships,
  };
}

class RefundResult {
  const RefundResult({required this.message, required this.order});

  factory RefundResult.fromJson(Json json) => RefundResult(
    message: str(json, 'message'),
    order: Order.fromJson(asJson(json['order'])),
  );

  final String message;
  final Order order;
}

class Appointment {
  const Appointment({
    required this.id,
    required this.status,
    required this.service,
    required this.staff,
    required this.customerName,
    required this.startAt,
    required this.endAt,
    required this.localDate,
    required this.localTime,
    required this.price,
    required this.nextStatuses,
    this.statusLabel,
    this.customerPhone,
    this.customerEmail,
    this.notes,
    this.answers = const [],
    this.canReschedule = false,
  });

  factory Appointment.fromJson(Json json) {
    final customer = optObject(json, 'customer') ?? const {};
    return Appointment(
      id: integer(json, 'id'),
      status: str(json, 'status'),
      statusLabel: optStr(json, 'status_label'),
      service: str(json, 'service'),
      staff: str(json, 'staff'),
      customerName: str(customer, 'name'),
      customerPhone: optStr(customer, 'phone'),
      customerEmail: optStr(customer, 'email'),
      startAt: date(json, 'start_at'),
      endAt: date(json, 'end_at'),
      localDate: str(json, 'local_date'),
      localTime: str(json, 'local_time'),
      price: Money.fromJson(optObject(json, 'price') ?? const {}),
      notes: optStr(json, 'notes'),
      answers: [
        for (final a in jsonList(json, 'answers'))
          (label: str(a, 'label'), value: str(a, 'value')),
      ],
      nextStatuses: strings(json, 'next_statuses'),
      canReschedule: boolean(json, 'can_reschedule'),
    );
  }

  final int id;

  /// pending, approved, rejected, cancelled, completed, no_show.
  final String status;
  final String? statusLabel;
  final String service;
  final String staff;
  final String customerName;
  final String? customerPhone;
  final String? customerEmail;
  final DateTime startAt;
  final DateTime endAt;
  final String localDate;
  final String localTime;
  final Money price;
  final String? notes;
  final List<({String label, String value})> answers;
  final List<String> nextStatuses;

  /// 61 Pending or approved and not started: it can move to another time.
  final bool canReschedule;
}

/// 61 A free time to move an appointment to.
class FreeSlot {
  const FreeSlot({
    required this.start,
    required this.end,
    required this.localTime,
    required this.staffIds,
  });

  factory FreeSlot.fromJson(Json json) => FreeSlot(
    start: date(json, 'start'),
    end: date(json, 'end'),
    localTime: str(json, 'local_time'),
    staffIds: [
      for (final id in (json['staff_ids'] as List?) ?? const [])
        if (id is num) id.toInt(),
    ],
  );

  final DateTime start;
  final DateTime end;
  final String localTime;
  final List<int> staffIds;
}

/// 61 The free times of an appointment's service, by local day.
class RescheduleTimes {
  const RescheduleTimes({
    required this.timeZone,
    required this.staff,
    required this.days,
  });

  factory RescheduleTimes.fromJson(Json json) => RescheduleTimes(
    timeZone: str(json, 'time_zone'),
    staff: [
      for (final s in jsonList(json, 'staff'))
        (id: integer(s, 'id'), name: str(s, 'name')),
    ],
    days: [
      for (final d in jsonList(json, 'days'))
        (date: str(d, 'date'), slots: listOf(d, 'slots', FreeSlot.fromJson)),
    ],
  );

  final String timeZone;

  /// Who provides the service, the appointment's own staff member first.
  final List<({int id, String name})> staff;
  final List<({String date, List<FreeSlot> slots})> days;
}

class AppointmentsPage {
  const AppointmentsPage({required this.page, required this.timeZone});

  factory AppointmentsPage.fromJson(Json json) => AppointmentsPage(
    page: Paged.fromJson(json, Appointment.fromJson),
    timeZone: str(json, 'time_zone'),
  );

  final Paged<Appointment> page;
  final String timeZone;
}

class EventSummary {
  const EventSummary({
    required this.id,
    required this.title,
    required this.status,
    required this.startAt,
    required this.endAt,
    required this.valid,
    required this.used,
    this.venue,
    this.capacity,
  });

  factory EventSummary.fromJson(Json json) {
    final tickets = optObject(json, 'tickets') ?? const {};
    return EventSummary(
      id: integer(json, 'id'),
      title: str(json, 'title'),
      status: str(json, 'status'),
      startAt: date(json, 'start_at'),
      endAt: date(json, 'end_at'),
      venue: optStr(json, 'venue'),
      valid: integer(tickets, 'valid'),
      used: integer(tickets, 'used'),
      capacity: optInt(tickets, 'capacity'),
    );
  }

  final int id;
  final String title;
  final String status;
  final DateTime startAt;
  final DateTime endAt;
  final String? venue;

  /// Tickets not used yet.
  final int valid;

  /// Checked in.
  final int used;
  final int? capacity;

  int get issued => valid + used;
}

class EventsList {
  const EventsList({required this.items, required this.timeZone});

  factory EventsList.fromJson(Json json) => EventsList(
    items: listOf(json, 'items', EventSummary.fromJson),
    timeZone: str(json, 'time_zone'),
  );

  final List<EventSummary> items;
  final String timeZone;
}

class TicketInfo {
  const TicketInfo({
    this.code,
    this.holderName,
    this.typeName,
    this.eventId,
    this.eventTitle,
    this.usedAt,
  });

  factory TicketInfo.fromJson(Json json) => TicketInfo(
    code: optStr(json, 'code'),
    holderName: optStr(json, 'holder_name'),
    typeName: optStr(json, 'type_name'),
    eventId: optInt(json, 'event_id'),
    eventTitle: optStr(json, 'event_title'),
    usedAt: optDate(json, 'used_at'),
  );

  final String? code;
  final String? holderName;
  final String? typeName;
  final int? eventId;
  final String? eventTitle;
  final DateTime? usedAt;
}

class CheckIn {
  const CheckIn({
    required this.outcome,
    required this.admitted,
    required this.message,
    this.ticket,
  });

  factory CheckIn.fromJson(Json json) {
    final ticket = optObject(json, 'ticket');
    return CheckIn(
      outcome: str(json, 'outcome'),
      admitted: boolean(json, 'admitted'),
      message: str(json, 'message'),
      ticket: ticket == null ? null : TicketInfo.fromJson(ticket),
    );
  }

  /// admitted, used, cancelled, not_paid, other_event, not_found, forged,
  /// not_a_code.
  final String outcome;
  final bool admitted;
  final String message;
  final TicketInfo? ticket;
}

class Donation {
  const Donation({
    required this.id,
    required this.amount,
    required this.status,
    required this.campaignTitle,
    this.refunded,
    this.donorName,
    this.message,
    this.campaignId,
    this.paidAt,
  });

  factory Donation.fromJson(Json json) => Donation(
    id: integer(json, 'id'),
    amount: Money.fromJson(optObject(json, 'amount') ?? const {}),
    refunded: Money.opt(json, 'refunded'),
    status: str(json, 'status'),
    donorName: optStr(json, 'donor_name'),
    message: optStr(json, 'message'),
    campaignId: optInt(json, 'campaign_id'),
    campaignTitle: str(json, 'campaign_title'),
    paidAt: optDate(json, 'paid_at'),
  );

  final int id;
  final Money amount;
  final Money? refunded;
  final String status;

  /// Null when they gave anonymously.
  final String? donorName;
  final String? message;
  final int? campaignId;
  final String campaignTitle;
  final DateTime? paidAt;
}

class CampaignTotals {
  const CampaignTotals({
    required this.id,
    required this.title,
    required this.status,
    required this.raised,
    required this.donors,
    this.goal,
  });

  factory CampaignTotals.fromJson(Json json) => CampaignTotals(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    status: str(json, 'status'),
    raised: Money.fromJson(optObject(json, 'raised') ?? const {}),
    donors: integer(json, 'donors'),
    goal: Money.opt(json, 'goal'),
  );

  final int id;
  final String title;
  final String status;
  final Money raised;
  final int donors;
  final Money? goal;

  double? get progress {
    final g = goal;
    if (g == null || g.amountCents <= 0) return null;
    return (raised.amountCents / g.amountCents).clamp(0, 1).toDouble();
  }
}

class DonationsPage {
  const DonationsPage({required this.page, required this.campaigns});

  factory DonationsPage.fromJson(Json json) => DonationsPage(
    page: Paged.fromJson(json, Donation.fromJson),
    campaigns: listOf(json, 'campaigns', CampaignTotals.fromJson),
  );

  final Paged<Donation> page;
  final List<CampaignTotals> campaigns;
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.price,
    required this.available,
    required this.sales,
    this.salePrice,
    this.stock,
    this.imageUrl,
    this.addon = false,
  });

  factory Product.fromJson(Json json) => Product(
    id: integer(json, 'id'),
    name: str(json, 'name'),
    price: Money.fromJson(optObject(json, 'price') ?? const {}),
    salePrice: Money.opt(json, 'sale_price'),
    stock: optInt(json, 'stock'),
    available: boolean(json, 'available', true),
    imageUrl: optStr(json, 'image_url'),
    sales: integer(json, 'sales'),
    addon: boolean(json, 'addon'),
  );

  final int id;
  final String name;
  final Money price;

  /// 131 Sold only as a gift add-on with another product.
  final bool addon;
  final Money? salePrice;

  /// Null for no limit.
  final int? stock;
  final bool available;
  final String? imageUrl;
  final int sales;
}

/// The fields to change; a field left unset is not sent.
class ProductPatch {
  const ProductPatch({
    this.price,
    this.salePrice,
    this.clearSalePrice = false,
    this.stock,
    this.unlimitedStock = false,
    this.available,
  });

  final String? price;
  final String? salePrice;
  final bool clearSalePrice;
  final int? stock;
  final bool unlimitedStock;
  final bool? available;

  Json toJson() => {
    if (price != null) 'price': price,
    if (clearSalePrice)
      'sale_price': null
    else if (salePrice != null)
      'sale_price': salePrice,
    if (unlimitedStock) 'stock': null else if (stock != null) 'stock': stock,
    if (available != null) 'available': available,
  };
}

class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    required this.video,
    required this.preview,
    this.mediaId,
    this.durationMinutes,
  });

  factory Lesson.fromJson(Json json) => Lesson(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    video: str(json, 'video', 'none'),
    mediaId: optStr(json, 'media_id'),
    durationMinutes: optInt(json, 'duration_minutes'),
    preview: boolean(json, 'preview'),
  );

  final int id;
  final String title;

  /// media, link or none.
  final String video;
  final String? mediaId;
  final int? durationMinutes;
  final bool preview;
}

class Topic {
  const Topic({required this.id, required this.title, required this.lessons});

  factory Topic.fromJson(Json json) => Topic(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    lessons: listOf(json, 'lessons', Lesson.fromJson),
  );

  final int id;
  final String title;
  final List<Lesson> lessons;
}

class Course {
  const Course({
    required this.id,
    required this.title,
    required this.published,
    required this.price,
    required this.students,
    required this.topics,
  });

  factory Course.fromJson(Json json) => Course(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    published: boolean(json, 'published'),
    price: Money.fromJson(optObject(json, 'price') ?? const {}),
    students: integer(json, 'students'),
    topics: listOf(json, 'topics', Topic.fromJson),
  );

  final int id;
  final String title;
  final bool published;
  final Money price;
  final int students;
  final List<Topic> topics;

  int get lessonCount => topics.fold(0, (n, t) => n + t.lessons.length);
}

class LessonRequest {
  const LessonRequest({
    required this.title,
    this.videoMediaId,
    this.videoUrl,
    this.text,
    this.durationMinutes,
    this.preview = false,
  });

  final String title;
  final String? videoMediaId;
  final String? videoUrl;
  final String? text;
  final int? durationMinutes;
  final bool preview;

  Json toJson() => {
    'title': title,
    if (videoMediaId != null) 'video_media_id': videoMediaId,
    if (videoUrl != null) 'video_url': videoUrl,
    if (text != null && text!.isNotEmpty) 'text': text,
    if (durationMinutes != null) 'duration_minutes': durationMinutes,
    'preview': preview,
  };
}

class Article {
  const Article({
    required this.id,
    required this.title,
    required this.status,
    required this.featured,
    required this.updatedAt,
    this.publishedAt,
  });

  factory Article.fromJson(Json json) => Article(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    status: str(json, 'status'),
    featured: boolean(json, 'featured'),
    publishedAt: optDate(json, 'published_at'),
    updatedAt: date(json, 'updated_at'),
  );

  final int id;
  final String title;

  /// draft, published, scheduled.
  final String status;
  final bool featured;
  final DateTime? publishedAt;
  final DateTime updatedAt;
}

class Listing {
  const Listing({
    required this.id,
    required this.title,
    required this.status,
    required this.featured,
    required this.price,
    required this.city,
  });

  factory Listing.fromJson(Json json) => Listing(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    status: str(json, 'status'),
    featured: boolean(json, 'featured'),
    price: str(json, 'price'),
    city: str(json, 'city'),
  );

  final int id;
  final String title;

  /// draft, published, archived.
  final String status;
  final bool featured;
  final String price;
  final String city;
}

class MediaFile {
  const MediaFile({
    required this.id,
    required this.name,
    required this.kind,
    required this.contentType,
    required this.sizeBytes,
    required this.status,
    required this.public,
    required this.link,
    required this.createdAt,
  });

  factory MediaFile.fromJson(Json json) => MediaFile(
    id: str(json, 'id'),
    name: str(json, 'name'),
    kind: str(json, 'kind'),
    contentType: str(json, 'content_type'),
    sizeBytes: integer(json, 'size_bytes'),
    status: str(json, 'status', 'ready'),
    public: boolean(json, 'public'),
    link: str(json, 'link'),
    createdAt: date(json, 'created_at'),
  );

  final String id;
  final String name;

  /// video, image, pdf.
  final String kind;
  final String contentType;
  final int sizeBytes;

  /// uploading or ready.
  final String status;
  final bool public;
  final String link;
  final DateTime createdAt;

  bool get ready => status == 'ready';
}

class Upload {
  const Upload({
    required this.id,
    required this.uploadUrl,
    required this.chunkBytes,
    required this.size,
  });

  factory Upload.fromJson(Json json) => Upload(
    id: str(json, 'id'),
    uploadUrl: str(json, 'upload_url'),
    chunkBytes: integer(json, 'chunk_bytes', 5 * 1024 * 1024),
    size: integer(json, 'size'),
  );

  final String id;
  final String uploadUrl;
  final int chunkBytes;
  final int size;
}

class Storage {
  const Storage({
    required this.usedBytes,
    required this.used,
    required this.full,
    required this.manageUrl,
    this.limitBytes,
    this.limit,
  });

  factory Storage.fromJson(Json json) => Storage(
    usedBytes: integer(json, 'used_bytes'),
    limitBytes: optInt(json, 'limit_bytes'),
    used: str(json, 'used'),
    limit: optStr(json, 'limit'),
    full: boolean(json, 'full'),
    manageUrl: str(json, 'manage_url'),
  );

  final int usedBytes;
  final int? limitBytes;
  final String used;
  final String? limit;
  final bool full;
  final String manageUrl;

  double? get share {
    final l = limitBytes;
    if (l == null || l <= 0) return null;
    return (usedBytes / l).clamp(0, 1).toDouble();
  }
}

class MediaList {
  const MediaList({required this.items, required this.storage});

  factory MediaList.fromJson(Json json) => MediaList(
    items: listOf(json, 'items', MediaFile.fromJson),
    storage: Storage.fromJson(optObject(json, 'storage') ?? const {}),
  );

  final List<MediaFile> items;
  final Storage storage;
}

class Inquiry {
  const Inquiry({
    required this.id,
    required this.listingId,
    required this.listingTitle,
    required this.person,
    required this.status,
    required this.unread,
    required this.updatedAt,
    this.lastMessage,
  });

  factory Inquiry.fromJson(Json json) => Inquiry(
    id: integer(json, 'id'),
    listingId: integer(json, 'listing_id'),
    listingTitle: str(json, 'listing_title'),
    person: str(json, 'person'),
    status: str(json, 'status', 'open'),
    lastMessage: optStr(json, 'last_message'),
    unread: integer(json, 'unread'),
    updatedAt: date(json, 'updated_at'),
  );

  final int id;
  final int listingId;
  final String listingTitle;
  final String person;

  /// open or closed.
  final String status;
  final String? lastMessage;
  final int unread;
  final DateTime updatedAt;
}

class InquiryMessage {
  const InquiryMessage({
    required this.id,
    required this.fromOffice,
    required this.text,
    required this.createdAt,
  });

  factory InquiryMessage.fromJson(Json json) => InquiryMessage(
    id: integer(json, 'id'),
    fromOffice: str(json, 'from') == 'office',
    text: str(json, 'text'),
    createdAt: date(json, 'created_at'),
  );

  final int id;
  final bool fromOffice;
  final String text;
  final DateTime createdAt;
}

class InquiryDetail {
  const InquiryDetail({
    required this.inquiry,
    required this.messages,
    this.phone,
    this.email,
  });

  factory InquiryDetail.fromJson(Json json) => InquiryDetail(
    inquiry: Inquiry.fromJson(json),
    phone: optStr(json, 'phone'),
    email: optStr(json, 'email'),
    messages: listOf(json, 'messages', InquiryMessage.fromJson),
  );

  final Inquiry inquiry;
  final String? phone;
  final String? email;
  final List<InquiryMessage> messages;
}

class InquiriesPage {
  const InquiriesPage({required this.page, required this.unread});

  factory InquiriesPage.fromJson(Json json) => InquiriesPage(
    page: Paged.fromJson(json, Inquiry.fromJson),
    unread: integer(json, 'unread'),
  );

  final Paged<Inquiry> page;
  final int unread;
}

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.createdAt,
    this.phone,
    this.email,
    this.city,
  });

  factory AppUser.fromJson(Json json) => AppUser(
    id: integer(json, 'id'),
    name: str(json, 'name'),
    phone: optStr(json, 'phone'),
    email: optStr(json, 'email'),
    city: optStr(json, 'city'),
    createdAt: date(json, 'created_at'),
  );

  final int id;
  final String name;
  final String? phone;
  final String? email;
  final String? city;
  final DateTime createdAt;
}

class AppUsersPage {
  const AppUsersPage({required this.page, required this.count});

  factory AppUsersPage.fromJson(Json json) => AppUsersPage(
    page: Paged.fromJson(json, AppUser.fromJson),
    count: integer(json, 'count'),
  );

  final Paged<AppUser> page;

  /// Every user of the app (page.total counts the search's matches).
  final int count;
}

class Kpis {
  const Kpis({
    required this.installs,
    required this.activeAvg,
    required this.weekly,
    required this.monthly,
    required this.sessions,
  });

  factory Kpis.fromJson(Json json) => Kpis(
    installs: integer(json, 'installs'),
    activeAvg: number(json, 'active_avg'),
    weekly: integer(json, 'weekly'),
    monthly: integer(json, 'monthly'),
    sessions: integer(json, 'sessions'),
  );

  final int installs;
  final double activeAvg;
  final int weekly;
  final int monthly;
  final int sessions;
}

class DailyPoint {
  const DailyPoint({
    required this.day,
    required this.active,
    required this.installs,
    required this.sessions,
  });

  factory DailyPoint.fromJson(Json json) => DailyPoint(
    day: str(json, 'day'),
    active: integer(json, 'active'),
    installs: integer(json, 'installs'),
    sessions: integer(json, 'sessions'),
  );

  final String day;
  final int active;
  final int installs;
  final int sessions;
}

class Retention {
  const Retention({
    required this.days,
    required this.cohort,
    required this.returned,
    this.rate,
  });

  factory Retention.fromJson(Json json) => Retention(
    days: integer(json, 'days'),
    cohort: integer(json, 'cohort'),
    returned: integer(json, 'returned'),
    rate: optNumber(json, 'rate'),
  );

  final int days;
  final int cohort;
  final int returned;
  final double? rate;
}

class Share {
  const Share({
    required this.key,
    required this.label,
    required this.value,
    required this.share,
  });

  factory Share.fromJson(Json json) => Share(
    key: str(json, 'key'),
    label: str(json, 'label'),
    value: integer(json, 'value'),
    share: number(json, 'share'),
  );

  final String key;
  final String label;
  final int value;

  /// 0 to 1.
  final double share;
}

class Analytics {
  const Analytics({
    required this.preset,
    required this.from,
    required this.to,
    required this.days,
    required this.timeZone,
    required this.hasData,
    required this.kpis,
    required this.previous,
    required this.daily,
    required this.retention,
    required this.platforms,
    required this.countries,
    required this.screens,
  });

  factory Analytics.fromJson(Json json) {
    final range = optObject(json, 'range') ?? const {};
    return Analytics(
      preset: str(range, 'preset'),
      from: str(range, 'from'),
      to: str(range, 'to'),
      days: integer(range, 'days'),
      timeZone: str(json, 'time_zone'),
      hasData: boolean(json, 'has_data'),
      kpis: Kpis.fromJson(optObject(json, 'kpis') ?? const {}),
      previous: Kpis.fromJson(optObject(json, 'previous') ?? const {}),
      daily: listOf(json, 'daily', DailyPoint.fromJson),
      retention: listOf(json, 'retention', Retention.fromJson),
      platforms: listOf(json, 'platforms', Share.fromJson),
      countries: listOf(json, 'countries', Share.fromJson),
      screens: listOf(json, 'screens', Share.fromJson),
    );
  }

  final String preset;
  final String from;
  final String to;
  final int days;
  final String timeZone;
  final bool hasData;
  final Kpis kpis;
  final Kpis previous;
  final List<DailyPoint> daily;
  final List<Retention> retention;
  final List<Share> platforms;
  final List<Share> countries;
  final List<Share> screens;
}

class SentNotification {
  const SentNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.sentAt,
  });

  factory SentNotification.fromJson(Json json) => SentNotification(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    body: str(json, 'body'),
    sentAt: date(json, 'sent_at'),
  );

  final int id;
  final String title;
  final String body;
  final DateTime sentAt;
}

class SentNotifications {
  const SentNotifications({required this.push, required this.items});

  factory SentNotifications.fromJson(Json json) => SentNotifications(
    push: boolean(json, 'push'),
    items: listOf(json, 'items', SentNotification.fromJson),
  );

  /// The plan has push and a Firebase key is saved.
  final bool push;
  final List<SentNotification> items;
}

/// 61 A notification waiting to be sent later.
class ScheduledNotification {
  const ScheduledNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.sendAt,
    required this.localDate,
    required this.localTime,
    required this.status,
    this.result,
  });

  factory ScheduledNotification.fromJson(Json json) => ScheduledNotification(
    id: integer(json, 'id'),
    title: str(json, 'title'),
    body: str(json, 'body'),
    sendAt: date(json, 'send_at'),
    localDate: str(json, 'local_date'),
    localTime: str(json, 'local_time'),
    status: str(json, 'status'),
    result: optStr(json, 'result'),
  );

  final int id;
  final String title;
  final String body;
  final DateTime sendAt;

  /// In the app's time zone.
  final String localDate;
  final String localTime;

  /// scheduled, sending or failed.
  final String status;
  final String? result;
}

class ScheduledNotifications {
  const ScheduledNotifications({
    required this.timeZone,
    required this.max,
    required this.items,
  });

  factory ScheduledNotifications.fromJson(Json json) => ScheduledNotifications(
    timeZone: str(json, 'time_zone'),
    max: integer(json, 'max', 50),
    items: listOf(json, 'items', ScheduledNotification.fromJson),
  );

  final String timeZone;
  final int max;
  final List<ScheduledNotification> items;
}

class NotificationResult {
  const NotificationResult({required this.message, required this.pushed});

  factory NotificationResult.fromJson(Json json) => NotificationResult(
    message: str(json, 'message'),
    pushed: integer(json, 'pushed'),
  );

  final String message;
  final int pushed;
}

class Preview {
  const Preview({required this.url, required this.expiresAt});

  factory Preview.fromJson(Json json) =>
      Preview(url: str(json, 'url'), expiresAt: date(json, 'expires_at'));

  final String url;
  final DateTime expiresAt;
}

class BuildFile {
  const BuildFile({required this.kind, required this.label, this.url});

  factory BuildFile.fromJson(Json json) => BuildFile(
    kind: str(json, 'kind'),
    label: str(json, 'label'),
    url: optStr(json, 'url'),
  );

  final String kind;
  final String label;

  /// Signed for 15 minutes; null when not available.
  final String? url;
}

class Build {
  const Build({
    required this.id,
    required this.number,
    required this.version,
    required this.status,
    required this.statusLabel,
    required this.createdAt,
    required this.files,
    this.message,
    this.finishedAt,
  });

  factory Build.fromJson(Json json) => Build(
    id: str(json, 'id'),
    number: integer(json, 'number'),
    version: str(json, 'version'),
    status: str(json, 'status'),
    statusLabel: str(json, 'status_label'),
    message: optStr(json, 'message'),
    createdAt: date(json, 'created_at'),
    finishedAt: optDate(json, 'finished_at'),
    files: listOf(json, 'files', BuildFile.fromJson),
  );

  final String id;
  final int number;
  final String version;

  /// queued, building, ready, failed, cancelled.
  final String status;
  final String statusLabel;
  final String? message;
  final DateTime createdAt;
  final DateTime? finishedAt;
  final List<BuildFile> files;
}

class StoreStatus {
  const StoreStatus({required this.store, required this.status, this.url});

  factory StoreStatus.fromJson(Json json) => StoreStatus(
    store: str(json, 'store'),
    status: str(json, 'status'),
    url: optStr(json, 'url'),
  );

  final String store;
  final String status;
  final String? url;
}

class Builds {
  const Builds({
    required this.items,
    required this.publishingMode,
    required this.stores,
  });

  factory Builds.fromJson(Json json) {
    final publishing = optObject(json, 'publishing') ?? const {};
    return Builds(
      items: listOf(json, 'items', Build.fromJson),
      publishingMode: str(publishing, 'mode', 'self'),
      stores: listOf(publishing, 'stores', StoreStatus.fromJson),
    );
  }

  final List<Build> items;

  /// self or managed ("We publish for you").
  final String publishingMode;
  final List<StoreStatus> stores;
}

class NextPlan {
  const NextPlan({
    required this.id,
    required this.name,
    required this.startsAt,
  });

  factory NextPlan.fromJson(Json json) => NextPlan(
    id: str(json, 'id'),
    name: str(json, 'name'),
    startsAt: date(json, 'starts_at'),
  );

  final String id;
  final String name;
  final DateTime startsAt;
}

class License {
  const License({
    required this.state,
    required this.storage,
    required this.manageUrl,
    this.plan,
    this.nextPlan,
    this.features = const [],
  });

  factory License.fromJson(Json json) {
    final next = optObject(json, 'next_plan');
    return License(
      state: AccountState.parse(optStr(json, 'state')),
      plan: PlanSummary.opt(json, 'plan'),
      nextPlan: next == null ? null : NextPlan.fromJson(next),
      features: strings(json, 'features'),
      storage: Storage.fromJson(optObject(json, 'storage') ?? const {}),
      manageUrl: str(json, 'manage_url'),
    );
  }

  final AccountState state;
  final PlanSummary? plan;
  final NextPlan? nextPlan;
  final List<String> features;
  final Storage storage;

  /// Renewing, changing plans and storage packs: on yallapp.com.tr only.
  final String manageUrl;
}

// 63 Course questions and reviews, and a gym's members at the door.

class Question {
  const Question({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.person,
    required this.text,
    required this.status,
    required this.answerCount,
    required this.createdAt,
    required this.updatedAt,
    this.hidden = false,
  });

  factory Question.fromJson(Json json) => Question(
    id: integer(json, 'id'),
    courseId: integer(json, 'course_id'),
    courseTitle: str(json, 'course_title'),
    person: str(json, 'person'),
    text: str(json, 'text'),
    status: str(json, 'status', 'open'),
    hidden: boolean(json, 'hidden'),
    answerCount: integer(json, 'answer_count'),
    createdAt: date(json, 'created_at'),
    updatedAt: date(json, 'updated_at'),
  );

  final int id;
  final int courseId;
  final String courseTitle;
  final String person;
  final String text;

  /// open (waiting for the business) or answered.
  final String status;

  /// 64 Hidden from others; the student who asked still sees it.
  final bool hidden;

  /// The answers shown in the app (not the hidden ones).
  final int answerCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get open => status == 'open';
}

class QuestionAnswer {
  const QuestionAnswer({
    required this.id,
    required this.fromBusiness,
    required this.name,
    required this.text,
    required this.createdAt,
    this.hidden = false,
  });

  factory QuestionAnswer.fromJson(Json json) => QuestionAnswer(
    id: integer(json, 'id'),
    fromBusiness: str(json, 'from') == 'business',
    name: str(json, 'name'),
    text: str(json, 'text'),
    hidden: boolean(json, 'hidden'),
    createdAt: date(json, 'created_at'),
  );

  final int id;
  final bool fromBusiness;
  final String name;
  final String text;

  /// 64 A student's answer hidden from others; its author still sees it.
  final bool hidden;
  final DateTime createdAt;
}

class QuestionDetail {
  const QuestionDetail({required this.question, required this.answers});

  factory QuestionDetail.fromJson(Json json) => QuestionDetail(
    question: Question.fromJson(json),
    answers: listOf(json, 'answers', QuestionAnswer.fromJson),
  );

  final Question question;
  final List<QuestionAnswer> answers;
}

class QuestionsPage {
  const QuestionsPage({required this.page, required this.open});

  factory QuestionsPage.fromJson(Json json) => QuestionsPage(
    page: Paged.fromJson(json, Question.fromJson),
    open: integer(json, 'open'),
  );

  final Paged<Question> page;

  /// Questions waiting for the business.
  final int open;
}

class ReviewReply {
  const ReviewReply({required this.text, required this.createdAt});

  final String text;
  final DateTime createdAt;
}

class Review {
  const Review({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.person,
    required this.rating,
    required this.text,
    required this.hidden,
    required this.createdAt,
    this.reply,
  });

  factory Review.fromJson(Json json) {
    final reply = optObject(json, 'reply');
    return Review(
      id: integer(json, 'id'),
      courseId: integer(json, 'course_id'),
      courseTitle: str(json, 'course_title'),
      person: str(json, 'person'),
      rating: integer(json, 'rating', 5).clamp(1, 5),
      text: str(json, 'text'),
      hidden: boolean(json, 'hidden'),
      createdAt: date(json, 'created_at'),
      reply: reply == null
          ? null
          : ReviewReply(
              text: str(reply, 'text'),
              createdAt: date(reply, 'created_at'),
            ),
    );
  }

  final int id;
  final int courseId;
  final String courseTitle;
  final String person;
  final int rating;
  final String text;

  /// Hidden from others; its author still sees it.
  final bool hidden;
  final DateTime createdAt;
  final ReviewReply? reply;
}

class ReviewsPage {
  const ReviewsPage({
    required this.page,
    required this.rating,
    required this.ratingCount,
  });

  factory ReviewsPage.fromJson(Json json) => ReviewsPage(
    page: Paged.fromJson(json, Review.fromJson),
    rating: optNumber(json, 'rating'),
    ratingCount: integer(json, 'rating_count'),
  );

  final Paged<Review> page;

  /// The average of the reviews shown in the app; null without any.
  final double? rating;
  final int ratingCount;
}

class Member {
  const Member({
    required this.membershipId,
    required this.name,
    required this.planName,
    required this.status,
    this.phone,
    this.endsAt,
    this.creditsLeft,
    this.checkedInAt,
    this.frozenFrom,
    this.frozenUntil,
  });

  factory Member.fromJson(Json json) {
    final freeze = optObject(json, 'frozen');
    return Member(
      membershipId: integer(json, 'membership_id'),
      name: str(json, 'name'),
      phone: optStr(json, 'phone'),
      planName: str(json, 'plan_name'),
      status: str(json, 'status', 'active'),
      endsAt: optDate(json, 'ends_at'),
      creditsLeft: optInt(json, 'credits_left'),
      checkedInAt: optDate(json, 'checked_in_at'),
      frozenFrom: freeze == null ? null : optDate(freeze, 'from'),
      // The door's answer has `frozen_until`; a member in a list, `frozen`.
      frozenUntil: freeze == null
          ? optDate(json, 'frozen_until')
          : optDate(freeze, 'until'),
    );
  }

  final int membershipId;
  final String name;
  final String? phone;
  final String planName;

  /// active, frozen (64, now), expired or cancelled.
  final String status;
  final DateTime? endsAt;

  /// 64 A freeze now or to come: from the start of a day; null: none.
  final DateTime? frozenFrom;

  /// 64 The day it's back; null until the gym unfreezes it.
  final DateTime? frozenUntil;

  bool get frozen => status == 'frozen';

  /// 64 A freeze now or to come.
  bool get freezeSet => frozenFrom != null;

  /// Null for unlimited classes.
  final int? creditsLeft;

  /// When they came in today; null when not yet.
  final DateTime? checkedInAt;
}

class MembersPage {
  const MembersPage({required this.page, required this.timeZone});

  factory MembersPage.fromJson(Json json) => MembersPage(
    page: Paged.fromJson(json, Member.fromJson),
    timeZone: str(json, 'time_zone'),
  );

  final Paged<Member> page;
  final String timeZone;
}

class MemberCheckIn {
  const MemberCheckIn({
    required this.outcome,
    required this.admitted,
    required this.message,
    this.member,
  });

  factory MemberCheckIn.fromJson(Json json) {
    final member = optObject(json, 'member');
    return MemberCheckIn(
      outcome: str(json, 'outcome'),
      admitted: boolean(json, 'admitted'),
      message: str(json, 'message'),
      member: member == null ? null : Member.fromJson(member),
    );
  }

  /// admitted, already_in, expired, cancelled, not_started, frozen (64),
  /// no_credits, not_found, forged, not_a_code.
  final String outcome;
  final bool admitted;
  final String message;

  /// Its `checkedInAt` is today's check-in (now when admitted).
  final Member? member;
}

class MemberVisit {
  const MemberVisit({
    required this.id,
    required this.membershipId,
    required this.name,
    required this.planName,
    required this.checkedInAt,
    required this.by,
  });

  factory MemberVisit.fromJson(Json json) => MemberVisit(
    id: integer(json, 'id'),
    membershipId: integer(json, 'membership_id'),
    name: str(json, 'name'),
    planName: str(json, 'plan_name'),
    checkedInAt: date(json, 'checked_in_at'),
    by: str(json, 'by'),
  );

  final int id;
  final int membershipId;
  final String name;
  final String planName;
  final DateTime checkedInAt;
  final String by;
}

class MemberVisits {
  const MemberVisits({
    required this.date,
    required this.timeZone,
    required this.count,
    required this.items,
  });

  factory MemberVisits.fromJson(Json json) => MemberVisits(
    date: str(json, 'date'),
    timeZone: str(json, 'time_zone'),
    count: integer(json, 'count'),
    items: listOf(json, 'items', MemberVisit.fromJson),
  );

  final String date;
  final String timeZone;
  final int count;
  final List<MemberVisit> items;
}
