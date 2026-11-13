import 'package:flutter/widgets.dart';

import '../../../../core/api/models/models.dart';
import 'premium_badge.dart';
import 'premium_bento.dart';
import 'premium_cta_bar.dart';
import 'premium_pricing.dart';
import 'premium_profile_card.dart';
import 'premium_progress.dart';
import 'premium_stats.dart';
import 'premium_testimonials.dart';
import 'premium_timeline.dart';

export 'premium_surface.dart' show PremiumSurface;

/// 129.11–129.20 Studio's premium content, trust and commerce elements
/// (platform/web/src/lib/pages/types.ts `STUDIO_PREMIUM_CONTENT_TYPES` and
/// `STUDIO_PREMIUM_CARD_TYPES`), each in its own file here: null for any
/// other element. A profile card's own elements come as [front].
Widget? studioPremiumContent(
  StudioNode node, {
  required bool dark,
  Widget? front,
}) => switch (node.type) {
  StudioNodeType.testimonials => PremiumTestimonials(node: node, dark: dark),
  StudioNodeType.pricing => PremiumPricing(node: node, dark: dark),
  StudioNodeType.stats => PremiumStats(node: node, dark: dark),
  StudioNodeType.progress => PremiumProgress(node: node, dark: dark),
  StudioNodeType.timeline => PremiumTimeline(node: node, dark: dark),
  StudioNodeType.profileCard => PremiumProfileCard(
    node: node,
    dark: dark,
    front: front,
  ),
  StudioNodeType.bento => PremiumBento(node: node, dark: dark),
  StudioNodeType.badgeText => PremiumBadge(node: node, dark: dark),
  StudioNodeType.ctaBar => PremiumCtaBar(node: node, dark: dark),
  _ => null,
};

/// 129.16 / 129.19 / 129.20 The elements that draw their own background, space
/// inside and tap (the generic decoration leaves them alone).
bool premiumDrawsItself(StudioNodeType type) =>
    type == StudioNodeType.profileCard ||
    type == StudioNodeType.ctaBar ||
    // 129.19 A badge's gradient is its chip's, not a box behind it.
    type == StudioNodeType.badgeText;
