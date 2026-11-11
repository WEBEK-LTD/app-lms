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

enum AccountMenuHeader { plain, card }

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
    this.items = const [],
  });

  factory AccountMenuDesign.fromJson(Json json) => AccountMenuDesign(
    header: optString(json, 'header') == 'card'
        ? AccountMenuHeader.card
        : AccountMenuHeader.plain,
    items: [
      for (final item in json['items'] is List ? json['items'] as List : [])
        if (item is Map<String, dynamic>) AccountMenuEntry.fromJson(item),
    ],
  );

  final AccountMenuHeader header;
  final List<AccountMenuEntry> items;
}

class StudioScreens {
  const StudioScreens({this.signIn, this.accountMenu});

  static StudioScreens? fromJson(Object? value) {
    if (value is! Map<String, dynamic>) return null;
    final signIn = value['sign_in'];
    final menu = value['account_menu'];
    return StudioScreens(
      signIn: signIn is Map<String, dynamic>
          ? SignInLook.fromJson(signIn)
          : null,
      accountMenu: menu is Map<String, dynamic>
          ? AccountMenuDesign.fromJson(menu)
          : null,
    );
  }

  final SignInLook? signIn;
  final AccountMenuDesign? accountMenu;
}
