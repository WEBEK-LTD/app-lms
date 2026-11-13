import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/services/external_links.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/widgets/common.dart';
import '../content_blocks.dart' show SocialView;
import 'premium_shared.dart';

/// Material Symbols has no brand marks: a plain icon for each network, as
/// the social block draws them, its name for screen readers.
const _socialIcons = {
  SocialNetwork.instagram: AppIcons.photo,
  SocialNetwork.facebook: AppIcons.people,
  SocialNetwork.x: AppIcons.forum,
  SocialNetwork.tiktok: AppIcons.music,
  SocialNetwork.youtube: AppIcons.video,
  SocialNetwork.linkedin: AppIcons.work,
  SocialNetwork.snapchat: AppIcons.photo,
  SocialNetwork.telegram: AppIcons.send,
  SocialNetwork.whatsappChannel: AppIcons.campaignUpdate,
};

/// 129.16 A person's or a place's card: the cover photo (else the brand's
/// gradient), the round photo (a place's rounded square) over its foot,
/// the name and role, what the card holds ([front]: badges, two buttons)
/// and its social links.
class PremiumProfileCard extends ConsumerWidget {
  const PremiumProfileCard({
    super.key,
    required this.node,
    required this.dark,
    required this.front,
  });

  final StudioNode node;
  final bool dark;
  final Widget? front;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tones = PremiumTones.of(context, dark: dark);
    final premium = node.premium;
    final square = premium?.squarePhoto ?? false;
    final cover = premium?.coverUrl;
    final photo = node.imageUrl;
    final name = node.title ?? '';
    final role = node.text ?? '';
    final background =
        parseHexColor(
          dark ? (node.darkBackground ?? node.background) : node.background,
        ) ??
        tones.card;
    final ink =
        parseHexColor(dark ? (node.darkColor ?? node.color) : node.color) ??
        tones.ink;
    final pad = node.padding ?? const StudioSides();
    final radius = BorderRadius.circular(node.radius > 0 ? node.radius : 26);
    final avatarRadius = BorderRadius.circular(square ? 24 : 46);
    final open = ref.read(openExternalProvider);
    return Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: radius,
        border: Border.all(color: tones.edge),
        boxShadow: tones.shadow,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 166,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 120,
                    child: cover != null
                        ? AppNetworkImage(url: cover, seed: node.id.hashCode)
                        : DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: AlignmentDirectional.topStart,
                                end: AlignmentDirectional.bottomEnd,
                                colors: [tones.brand, tones.accent],
                              ),
                            ),
                          ),
                  ),
                  Positioned(
                    top: 74,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        key: ValueKey('premium-avatar-${node.id}'),
                        width: 92,
                        height: 92,
                        decoration: BoxDecoration(
                          color: tones.brand,
                          borderRadius: avatarRadius,
                          border: Border.all(color: background, width: 4),
                        ),
                        child: ClipRRect(
                          borderRadius: avatarRadius - BorderRadius.circular(4),
                          child: photo != null
                              ? AppNetworkImage(url: photo, seed: name.hashCode)
                              : Center(
                                  child: name.trim().isEmpty
                                      ? const Icon(
                                          Symbols.person_rounded,
                                          size: 40,
                                          color: Colors.white,
                                        )
                                      : Text(
                                          name
                                              .trim()
                                              .characters
                                              .first
                                              .toUpperCase(),
                                          style: const TextStyle(
                                            fontSize: 32,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                          ),
                                        ),
                                ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Column(
                children: [
                  Text(
                    name,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: ink,
                    ),
                  ),
                  if (role.isNotEmpty)
                    Text(
                      role,
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: tones.muted),
                    ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsetsDirectional.only(
                top: 12,
                start: pad.start > 0 ? pad.start : 16,
                end: pad.end > 0 ? pad.end : 16,
                bottom: pad.bottom > 0 ? pad.bottom : 18,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ?front,
                  if (premium?.socials.isNotEmpty ?? false) ...[
                    if (front != null)
                      SizedBox(height: node.gap > 0 ? node.gap : 12),
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 10,
                      children: [
                        for (final s in premium!.socials)
                          Semantics(
                            button: true,
                            label: SocialView.name(s.network, context),
                            child: InkResponse(
                              key: ValueKey('premium-social-${s.network.name}'),
                              onTap: () => open(s.url),
                              child: Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: tones.track,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _socialIcons[s.network],
                                  size: 19,
                                  color: ink,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
