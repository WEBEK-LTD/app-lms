import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/auth/session.dart';
import '../../../../core/l10n.dart';
import '../../../../core/routing/feature_routes.dart';
import '../../../../core/routing/paths.dart';
import '../../../../core/widgets/coming_soon.dart';
import '../../../../core/widgets/community_header.dart';
import '../../../shell/side_menu.dart';

/// The shell's header on area E's tab roots (Q&A, Learn), as on Home: the
/// menu (this section current), the logo, search, messages, the bell with
/// its unread count, and the member.
class SectionHeader extends ConsumerWidget {
  const SectionHeader({super.key, required this.section});

  final MenuSection section;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    if (me == null) return const SizedBox(height: 58);
    return CommunityHeader(
      meId: me.member.id,
      meName: me.member.name,
      meAvatar: me.member.avatarUrl,
      notifications: ref.watch(unreadNotificationsProvider),
      onMenu: () => openSideMenu(context, current: section),
      onSearch: () => context.push(FeatureLinks.search),
      onMessages: () => showComingSoon(context, context.l10n.headerMessages),
      onNotifications: () => context.push(FeatureLinks.notifications),
      onProfile: () => context.push(Paths.me),
    );
  }
}
