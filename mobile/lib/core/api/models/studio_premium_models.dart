import 'json.dart';
import 'page_models.dart';

/// 129.11–129.20 What Studio's premium content, trust and commerce elements
/// hold (`StudioEntry`, `StudioTestimonials`, `StudioPricing`,
/// `StudioStats`, `StudioProgress`, `StudioTimeline`, `StudioProfile`,
/// `StudioBadge`, `StudioCta` and `StudioSurface` in the app API).

/// One entry of a premium element's list: a quote, a plan, a number, a bar,
/// a step or a bento tile. Each element reads the fields it draws.
class StudioEntry {
  const StudioEntry({
    this.title,
    this.subtitle,
    this.text,
    this.label,
    this.imageUrl,
    this.icon,
    this.value,
    this.price,
    this.priceYearly,
    this.prefix,
    this.suffix,
    this.highlight = false,
    this.size = StudioTileSize.small,
    this.gradient,
    this.color,
    this.action,
  });

  static StudioEntry? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    return StudioEntry(
      title: optString(json, 'title'),
      subtitle: optString(json, 'subtitle'),
      text: optString(json, 'text'),
      label: optString(json, 'label'),
      imageUrl: optString(json, 'image_url'),
      icon: optString(json, 'icon'),
      value: optDouble(json, 'value'),
      price: optInt(json, 'price'),
      priceYearly: optInt(json, 'price_yearly'),
      prefix: optString(json, 'prefix'),
      suffix: optString(json, 'suffix'),
      highlight: boolOr(json, 'highlight', false),
      size: enumFrom(StudioTileSize.values, json['size'], StudioTileSize.small),
      gradient: StudioGradient.tryParse(json['gradient']),
      color: optString(json, 'color'),
      action: PageAction.tryParse(json['action']),
    );
  }

  /// At most 12, as the servers keep them.
  static List<StudioEntry> listFrom(Object? value) => [
    for (final e in value is List ? value.take(12) : const [])
      ?StudioEntry.tryParse(e),
  ];

  final String? title;
  final String? subtitle;
  final String? text;

  /// A button's words (a plan's, a tile's link).
  final String? label;
  final String? imageUrl;
  final String? icon;

  /// Stars 0 to 5, a number, or a share 0 to 100.
  final double? value;

  /// 129.12 In cents of the plans' currency; null: not set (none shown).
  final int? price;
  final int? priceYearly;
  final String? prefix;
  final String? suffix;

  /// The most popular plan, the active step, a number in the second colour.
  final bool highlight;
  final StudioTileSize size;
  final StudioGradient? gradient;
  final String? color;
  final PageAction? action;
}

/// 129.17 How many cells a bento tile takes: one, two across, two down, or
/// two by two.
enum StudioTileSize { small, wide, tall, large }

/// 129.19 How a badge looks.
enum StudioBadgeStyle { pill, outline, gradient, glass, text }

/// 129.11–129.20 A premium element's options, from whichever object its
/// type has (`testimonials`, `pricing`, `stats`, `progress`, `timeline`,
/// `profile`, `badge`, `cta`).
class StudioPremium {
  const StudioPremium({
    this.stacked = false,
    this.reviewsSource,
    this.reviewsId,
    this.currency = 'TRY',
    this.yearly = false,
    this.cards = false,
    this.dividers = false,
    this.rings = false,
    this.horizontal = false,
    this.coverUrl,
    this.squarePhoto = false,
    this.socials = const [],
    this.badge = StudioBadgeStyle.pill,
    this.fab = false,
  });

  static StudioPremium? tryParse(Json json) {
    Json? of(String key) => json[key] is Map ? asJson(json[key]) : null;
    final testimonials = of('testimonials');
    final reviews = testimonials?['reviews'] is Map
        ? asJson(testimonials!['reviews'])
        : null;
    final pricing = of('pricing');
    final stats = of('stats');
    final profile = of('profile');
    final socials = profile?['socials'];
    if (testimonials == null &&
        pricing == null &&
        stats == null &&
        of('progress') == null &&
        of('timeline') == null &&
        profile == null &&
        of('badge') == null &&
        of('cta') == null) {
      return null;
    }
    final source = reviews?['source'];
    return StudioPremium(
      stacked: testimonials?['style'] == 'stacked',
      reviewsSource: source == 'courses' || source == 'products'
          ? source as String
          : null,
      reviewsId: int.tryParse('${reviews?['id'] ?? ''}'),
      currency: (pricing?['currency'] as String?) ?? 'TRY',
      yearly: pricing?['yearly'] == true,
      cards: stats?['style'] == 'cards',
      dividers: stats?['dividers'] == true,
      rings: of('progress')?['style'] == 'rings',
      horizontal: of('timeline')?['style'] == 'horizontal',
      coverUrl: profile == null ? null : optString(profile, 'cover_url'),
      squarePhoto: profile?['shape'] == 'square',
      socials: [
        for (final s in socials is List ? socials.take(6) : const [])
          if (s is Map) ?SocialProfile.tryParse(asJson(s)),
      ],
      badge: enumFrom(
        StudioBadgeStyle.values,
        of('badge')?['style'],
        StudioBadgeStyle.pill,
      ),
      fab: of('cta')?['style'] == 'fab',
    );
  }

  /// 129.11 Quote cards under each other instead of side by side.
  final bool stacked;

  /// 129.11 The course's or product's real reviews shown instead.
  final String? reviewsSource;
  final int? reviewsId;

  /// 129.12 The plans' currency, and the monthly / yearly switch.
  final String currency;
  final bool yearly;

  /// 129.13 Each number in a card; lines between them.
  final bool cards;
  final bool dividers;

  /// 129.14 Rings instead of bars.
  final bool rings;

  /// 129.15 Steps across instead of down.
  final bool horizontal;

  /// 129.16 The cover photo, a place's square photo, the social links.
  final String? coverUrl;
  final bool squarePhoto;
  final List<SocialProfile> socials;

  /// 129.19 How a badge looks.
  final StudioBadgeStyle badge;

  /// 129.20 A round floating button instead of a bar.
  final bool fab;
}

/// 129.18 A layout's premium card style: frosted glass over what is behind
/// it, a border in two colours, a glow inside its edge, soft shadows.
class StudioSurface {
  const StudioSurface({
    this.glass,
    this.tint = 0.18,
    this.borderFrom,
    this.borderTo,
    this.borderWidth = 1.5,
    this.glow,
    this.soft = 0,
  });

  static StudioSurface? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final border = json['border'] is Map ? asJson(json['border']) : null;
    final from = border == null ? null : optString(border, 'from');
    final to = border == null ? null : optString(border, 'to');
    return StudioSurface(
      glass: optDouble(json, 'glass')?.clamp(4, 40).toDouble(),
      tint: (optDouble(json, 'tint') ?? 0.18).clamp(0.05, 0.9).toDouble(),
      borderFrom: to == null ? null : from,
      borderTo: from == null ? null : to,
      borderWidth:
          (border == null ? null : optDouble(border, 'width'))
              ?.clamp(1, 6)
              .toDouble() ??
          1.5,
      glow: optString(json, 'glow'),
      soft: (optInt(json, 'soft') ?? 0).clamp(0, 3),
    );
  }

  final double? glass;
  final double tint;
  final String? borderFrom;
  final String? borderTo;
  final double borderWidth;
  final String? glow;

  /// 0: none; 1 to 3, softer to deeper.
  final int soft;
}
