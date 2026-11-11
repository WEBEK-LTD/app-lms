import 'dart:ui' show Color;

import 'json.dart';

/// 118.3 `Config.screens`: a Yallapp Studio app's sign-in screen and
/// account menu, as its owner designed them in Studio. Texts are per
/// language code; [textFor] picks the app's language's.

/// The owner's words in [language] (or its base language), else the first
/// given; null when there are none.
String? textFor(Map<String, String> texts, String language) {
  if (texts.isEmpty) return null;
  return texts[language] ??
      texts[language.split(RegExp('[-_]')).first] ??
      texts.values.first;
}

Map<String, String> _texts(Object? value) => {
  if (value is Map)
    for (final MapEntry(:key, value: text) in value.entries)
      if (key is String && text is String && text.trim().isNotEmpty)
        key: text.trim(),
};

enum SignInLookStyle { classic, photo, card, minimal }

class SignInLook {
  const SignInLook({
    this.style = SignInLookStyle.classic,
    this.imageUrl,
    this.title = const {},
    this.subtitle = const {},
    this.showLogo = true,
  });

  factory SignInLook.fromJson(Json json) {
    final style = SignInLookStyle.values.firstWhere(
      (s) => s.name == optString(json, 'style'),
      orElse: () => SignInLookStyle.classic,
    );
    final image = optString(json, 'image_url');
    return SignInLook(
      // A photo look without its photo shows as the classic one.
      style:
          (style == SignInLookStyle.photo || style == SignInLookStyle.card) &&
              (image == null || image.isEmpty)
          ? SignInLookStyle.classic
          : style,
      imageUrl: image,
      title: _texts(json['title']),
      subtitle: _texts(json['subtitle']),
      showLogo: json['show_logo'] != false,
    );
  }

  final SignInLookStyle style;
  final String? imageUrl;
  final Map<String, String> title;
  final Map<String, String> subtitle;
  final bool showLogo;
}

/// 118.3 The menu's top: the name and photo, a card in the app's colour, a
/// cover with shortcuts, quick tiles, or a dark page with a membership card.
/// 123 `academy`: the premium academy's card with the student's courses,
/// certificates and learning hours, and the dark mode, notifications and
/// language at hand.
enum AccountMenuHeader { plain, card, cover, tiles, night, academy }

class AccountMenuEntry {
  const AccountMenuEntry({
    required this.key,
    this.hidden = false,
    this.label = const {},
    this.icon,
    this.url,
    this.pageSlug,
  });

  factory AccountMenuEntry.fromJson(Json json) => AccountMenuEntry(
    key: optString(json, 'key') ?? '',
    hidden: json['hidden'] == true,
    label: _texts(json['label']),
    icon: optString(json, 'icon'),
    url: optString(json, 'url'),
    pageSlug: optString(json, 'page_slug'),
  );

  /// One of the app's entries, or `link` (the owner's own).
  final String key;
  final bool hidden;
  final Map<String, String> label;
  final String? icon;
  final String? url;
  final String? pageSlug;

  bool get isLink => key == 'link';
}

class AccountMenuDesign {
  const AccountMenuDesign({
    this.header = AccountMenuHeader.plain,
    this.accent,
    this.items = const [],
  });

  factory AccountMenuDesign.fromJson(Json json) => AccountMenuDesign(
    header: AccountMenuHeader.values.firstWhere(
      (h) => h.name == optString(json, 'header'),
      orElse: () => AccountMenuHeader.plain,
    ),
    accent: _hex(optString(json, 'accent')),
    items: [
      for (final item in json['items'] is List ? json['items'] as List : [])
        if (item is Map<String, dynamic>) AccountMenuEntry.fromJson(item),
    ],
  );

  final AccountMenuHeader header;

  /// `night`: the membership card's colour; null: gold.
  final Color? accent;
  final List<AccountMenuEntry> items;
}

/// 122 How a course shows in the lists (the catalog, My courses, a
/// teacher's and a bundle's courses): `classic` a row, `rich` a larger row
/// with the teacher's photo and the price in the accent, `cover` a wide
/// picture with the course over it, `tile` the picture over the course.
/// 123 `premium`: the premium academy's row (a square picture, the lessons
/// and rating over the course, the teacher, the price at the end).
enum CourseCardStyle { classic, rich, cover, tile, premium }

/// 122 What a course card leaves out.
enum CourseCardFact { teacher, rating, price, lessons }

class CourseCardLook {
  const CourseCardLook({
    this.style = CourseCardStyle.classic,
    this.radius,
    this.hide = const {},
  });

  factory CourseCardLook.fromJson(Map<String, dynamic> json) {
    final style = CourseCardStyle.values
        .where((s) => s.name == json['style'])
        .firstOrNull;
    final radius = json['radius'];
    return CourseCardLook(
      style: style ?? CourseCardStyle.classic,
      radius: radius is num && radius >= 0 && radius <= 32
          ? radius.toDouble()
          : null,
      hide: {
        for (final f in json['hide'] is List ? json['hide'] as List : const [])
          ?CourseCardFact.values.where((c) => c.name == f).firstOrNull,
      },
    );
  }

  final CourseCardStyle style;

  /// The card's and its picture's corners; null, the look's own.
  final double? radius;
  final Set<CourseCardFact> hide;

  bool shows(CourseCardFact fact) => !hide.contains(fact);
}

/// 122 A course's page: `classic` its picture over the course, `full` a
/// tall picture with the course's name and facts on it; its purchase bar
/// `classic` or `glass` (frosted over the page); the tab it opens on for
/// visitors; and what it leaves out.
enum CoursePageCover { classic, full }

enum CoursePageBar { classic, glass }

enum CoursePageFact { students, level, duration, certificate, reviews }

class CoursePageLook {
  const CoursePageLook({
    this.cover = CoursePageCover.classic,
    this.bar = CoursePageBar.classic,
    this.firstTab,
    this.hide = const {},
    this.premium = false,
  });

  factory CoursePageLook.fromJson(Map<String, dynamic> json) {
    T? pick<T extends Enum>(List<T> values, Object? name) =>
        values.where((v) => v.name == name).firstOrNull;
    final first = json['first_tab'];
    return CoursePageLook(
      cover:
          pick(CoursePageCover.values, json['cover']) ??
          CoursePageCover.classic,
      bar: pick(CoursePageBar.values, json['bar']) ?? CoursePageBar.classic,
      firstTab: first == 'overview' || first == 'curriculum'
          ? first as String
          : null,
      hide: {
        for (final f in json['hide'] is List ? json['hide'] as List : const [])
          ?pick(CoursePageFact.values, f),
      },
      premium: json['look'] == 'premium',
    );
  }

  final CoursePageCover cover;
  final CoursePageBar bar;

  /// `overview` or `curriculum`, for people not enrolled; null, the app's
  /// own choice.
  final String? firstTab;
  final Set<CoursePageFact> hide;

  /// 123 The premium academy's page: the course's subject and certificate
  /// on its cover, the teacher on a card, the tabs as chips with the
  /// curriculum first, and the purchase in gold.
  final bool premium;

  bool shows(CoursePageFact fact) => !hide.contains(fact);
}

class StudioScreens {
  const StudioScreens({
    this.signIn,
    this.accountMenu,
    this.courseCard,
    this.coursePage,
    this.looks = const {},
  });

  static StudioScreens? fromJson(Object? value) {
    if (value is! Map<String, dynamic>) return null;
    final signIn = value['sign_in'];
    final menu = value['account_menu'];
    final card = value['course_card'];
    final page = value['course_page'];
    return StudioScreens(
      signIn: signIn is Map<String, dynamic>
          ? SignInLook.fromJson(signIn)
          : null,
      accountMenu: menu is Map<String, dynamic>
          ? AccountMenuDesign.fromJson(menu)
          : null,
      courseCard: card is Map<String, dynamic>
          ? CourseCardLook.fromJson(card)
          : null,
      coursePage: page is Map<String, dynamic>
          ? CoursePageLook.fromJson(page)
          : null,
      looks: {
        if (value['looks'] case final Map<String, dynamic> looks)
          for (final MapEntry(:key, :value) in looks.entries)
            if (ScreenLookKey.values.where((k) => k.wire == key).firstOrNull
                case final k? when value == k.look)
              k,
      },
    );
  }

  final SignInLook? signIn;
  final AccountMenuDesign? accountMenu;

  /// 122 The courses' card in the lists; null, the app's own.
  final CourseCardLook? courseCard;

  /// 122 A course's page; null, the app's own.
  final CoursePageLook? coursePage;

  /// 123 The screens drawn in their premium look.
  final Set<ScreenLookKey> looks;

  bool has(ScreenLookKey key) => looks.contains(key);
}

/// 123 A screen with a look of its own (`Config.screens.looks`), and the
/// name of that look: the catalog as Explore, the others premium.
enum ScreenLookKey {
  catalog('catalog', 'explore'),
  myCourses('my_courses', 'premium'),
  lesson('lesson', 'premium'),
  code('code', 'premium'),
  cart('cart', 'premium');

  const ScreenLookKey(this.wire, this.look);
  final String wire;
  final String look;
}

Color? _hex(String? value) {
  if (value == null || !RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(value)) {
    return null;
  }
  return Color(int.parse('FF${value.substring(1)}', radix: 16));
}
