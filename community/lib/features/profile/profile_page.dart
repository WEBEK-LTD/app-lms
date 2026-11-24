import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/routing/feature_routes.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/avatar.dart';
import '../../core/widgets/badge_mark.dart';
import '../../core/widgets/floating_tab_bar.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/sym.dart';
import '../social/data/social.dart';
import '../social/report_sheet.dart';

/// The badges a member needs apps for: the Gold badge's form opens at 5.
const goldAppsNeeded = 5;

/// A member's profile ([id] null: the member's own).
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key, this.id});

  final String? id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final own = id == null || id == me?.member.id;
    if (own) {
      if (me == null) return const SizedBox.shrink();
      return _ProfileView(
        profile: me,
        own: true,
        onRefresh: () => ref.read(sessionProvider.notifier).refresh(),
      );
    }
    final profile = ref.watch(profileProvider(id!));
    return switch (profile) {
      AsyncData(:final value) => _ProfileView(
        profile: value,
        own: false,
        onRefresh: () async => ref.invalidate(profileProvider(id!)),
      ),
      AsyncError(:final error) => _Failed(
        error: error,
        retry: () => ref.invalidate(profileProvider(id!)),
      ),
      _ => Scaffold(
        backgroundColor: context.palette.screen,
        body: const Center(
          child: CircularProgressIndicator(color: Brand.orange),
        ),
      ),
    };
  }
}

class _ProfileView extends ConsumerWidget {
  const _ProfileView({
    required this.profile,
    required this.own,
    required this.onRefresh,
  });

  final Profile profile;
  final bool own;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final m = profile.member;
    final top = MediaQuery.paddingOf(context).top;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Scaffold(
      key: ValueKey('profile-${m.id}'),
      backgroundColor: p.screen,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 320 + top,
            child: const IgnorePointer(child: _ProfileGlow()),
          ),
          RefreshIndicator(
            color: Brand.orange,
            onRefresh: onRefresh,
            child: ListView(
              padding: EdgeInsets.fromLTRB(0, top, 0, FloatingTabBar.clearance),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 4, 18, 8),
                  child: Row(
                    children: [
                      IconBtn(
                        key: const ValueKey('profile-back'),
                        icon: rtl
                            ? Symbols.arrow_forward_rounded
                            : Symbols.arrow_back_rounded,
                        label: l.commonBack,
                        onTap: () => context.canPop()
                            ? context.pop()
                            : context.go(Paths.home),
                      ),
                      const Spacer(),
                      if (own)
                        IconBtn(
                          key: const ValueKey('profile-settings'),
                          icon: Symbols.settings_rounded,
                          label: l.menuSettings,
                          onTap: () => context.push(Paths.settings),
                        )
                      else
                        IconBtn(
                          key: const ValueKey('profile-more'),
                          icon: Symbols.more_horiz_rounded,
                          label: l.socialMore,
                          onTap: () => _more(context, ref),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Center(
                  child: own
                      ? MeAvatar(
                          id: m.id,
                          name: m.name,
                          url: m.avatarUrl,
                          size: 92,
                        )
                      : Avatar(
                          id: m.id,
                          team: m.team,
                          name: m.name,
                          url: m.avatarUrl,
                          size: 92,
                          border: p.screen,
                          borderWidth: 3,
                        ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        m.name,
                        key: const ValueKey('profile-name'),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -.5,
                          color: p.ink,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    BadgeMark(
                      topBadge(profile.badges)?.kind ?? m.badge,
                      size: 20,
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (m.username.isNotEmpty) '@${m.username}',
                    if (m.team) l.profileTeam else ?m.level,
                  ].join(' · '),
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: p.muted),
                ),
                if (profile.relationship.followsYou && !own)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Center(child: _Chip(text: l.socialFollowsYou)),
                  ),
                if (profile.bio.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(28, 12, 28, 0),
                    child: Text(
                      profile.bio,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14.5,
                        height: 1.5,
                        color: p.soft,
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                _Counts(profile: profile),
                const SizedBox(height: 16),
                if (profile.relationship.blocked && !own)
                  _BlockedNote(id: m.id)
                else
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    child: own
                        ? _OwnActions(profile: profile)
                        : _Actions(profile: profile),
                  ),
                _Section(
                  title: l.profileBadges,
                  child: profile.badges.isEmpty
                      ? _Muted(l.profileNoBadges)
                      : Column(
                          children: [
                            for (final b in ([
                              ...profile.badges,
                            ]..sort((a, b) => a.kind.rank - b.kind.rank)))
                              _BadgeRow(badge: b),
                          ],
                        ),
                ),
                if (own &&
                    max(profile.appsCount, profile.apps.length) >=
                        goldAppsNeeded &&
                    !profile.badges.any((b) => b.kind == BadgeKind.gold))
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 0, 18, 0),
                    child: _Cta(
                      key: const ValueKey('profile-apply-gold'),
                      icon: Symbols.verified_rounded,
                      title: l.profileBadgeGold,
                      line: l.profileApplyLine,
                      action: l.profileApply,
                      onTap: () => context.push(FeatureLinks.verify),
                    ),
                  ),
                if (profile.skills.isNotEmpty)
                  _Section(
                    title: l.profileSkills,
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final s in profile.skills) _Chip(text: s),
                      ],
                    ),
                  ),
                _Section(
                  title: l.profileApps,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (profile.apps.isEmpty) _Muted(l.profileNoApps),
                      for (final a in profile.apps) _AppRow(app: a),
                      if (own && !profile.yallappLinked) ...[
                        const SizedBox(height: 10),
                        _Cta(
                          key: const ValueKey('profile-link'),
                          icon: Symbols.link_rounded,
                          title: l.profileLinkYallapp,
                          line: l.profileLinkLine,
                          action: l.settingsLink,
                          onTap: () => linkYallapp(context, ref),
                        ),
                      ],
                    ],
                  ),
                ),
                if (profile.joinedAt != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                    child: Text(
                      l.profileJoined(
                        MaterialLocalizations.of(context)
                            .formatMediumDate(profile.joinedAt!),
                      ),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12.5, color: p.muted),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _more(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final m = profile.member;
    final choice = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (sheet) {
        final p = sheet.palette;
        return SafeArea(
          child: Container(
            margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: p.dark ? Brand.navy2 : Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Material(
              type: MaterialType.transparency,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (profile.relationship.friend == FriendState.friends)
                    ListTile(
                      key: const ValueKey('profile-unfriend'),
                      leading: Sym(Symbols.person_remove_rounded, color: p.ink),
                      title: Text(
                        l.socialRemoveFriend,
                        style: TextStyle(color: p.ink),
                      ),
                      onTap: () => Navigator.pop(sheet, 'unfriend'),
                    ),
                  ListTile(
                    key: const ValueKey('profile-report'),
                    leading: Sym(Symbols.flag_rounded, color: p.ink),
                    title: Text(l.socialReport, style: TextStyle(color: p.ink)),
                    onTap: () => Navigator.pop(sheet, 'report'),
                  ),
                  ListTile(
                    key: const ValueKey('profile-block'),
                    leading: const Sym(
                      Symbols.block_rounded,
                      color: Color(0xFFE5484D),
                    ),
                    title: Text(
                      l.socialBlock,
                      style: const TextStyle(
                        color: Color(0xFFE5484D),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    onTap: () => Navigator.pop(sheet, 'block'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
    if (!context.mounted || choice == null) return;
    final api = ref.read(communityApiProvider);
    switch (choice) {
      case 'report':
        await showReportSheet(context, targetType: 'member', targetId: m.id);
      case 'unfriend':
        await _run(context, () => api.removeFriend(m.id));
        ref.invalidate(profileProvider(m.id));
      case 'block':
        final ok = await showDialog<bool>(
          context: context,
          builder: (d) => AlertDialog(
            content: Text(l.socialBlockConfirm(m.name)),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(d, false),
                child: Text(l.commonCancel),
              ),
              TextButton(
                key: const ValueKey('block-confirm'),
                onPressed: () => Navigator.pop(d, true),
                child: Text(
                  l.socialBlock,
                  style: const TextStyle(color: Color(0xFFE5484D)),
                ),
              ),
            ],
          ),
        );
        if (ok != true || !context.mounted) return;
        await _run(context, () => api.block(m.id));
        ref.invalidate(profileProvider(m.id));
    }
  }
}

/// Runs [call], telling the member when it fails.
Future<void> _run(BuildContext context, Future<void> Function() call) async {
  final messenger = ScaffoldMessenger.of(context);
  final l = context.l10n;
  try {
    await call();
  } on ApiException catch (e) {
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          e.offline
              ? l.commonOffline
              : (e.message.isEmpty ? l.commonError : e.message),
        ),
      ),
    );
  }
}

/// Starts linking a Yallapp account: the page where the member confirms it.
Future<void> linkYallapp(BuildContext context, WidgetRef ref) async {
  final messenger = ScaffoldMessenger.of(context);
  // The app's container, not this page's ref: the page may be gone when
  // the browser comes back.
  final container = ProviderScope.containerOf(context, listen: false);
  final l = context.l10n;
  try {
    final page = await ref.read(communityApiProvider).startYallappLink();
    // The browser comes back (yallappcommunity://linked): then the
    // profile shows the account and its apps.
    late final AppLifecycleListener back;
    back = AppLifecycleListener(
      onResume: () {
        back.dispose();
        container.read(sessionProvider.notifier).refresh().ignore();
      },
    );
    await ref.read(openExternalProvider)(page);
    messenger.showSnackBar(SnackBar(content: Text(l.profileLinkOpened)));
  } on ApiException catch (e) {
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          e.offline
              ? l.commonOffline
              : (e.message.isEmpty ? l.commonError : e.message),
        ),
      ),
    );
  }
}

class _ProfileGlow extends StatelessWidget {
  const _ProfileGlow();

  @override
  Widget build(BuildContext context) {
    final dark = context.palette.dark;
    return LayoutBuilder(
      builder: (context, box) => Stack(
        children: [
          Positioned(
            left: box.maxWidth * .85 - 260,
            top: -170,
            width: 520,
            height: 400,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    dark ? const Color(0x59FF5A1F) : const Color(0x52FF8A3D),
                    const Color(0x00FF8A3D),
                  ],
                  stops: const [0, .7],
                ),
              ),
            ),
          ),
          Positioned(
            left: -300,
            top: box.maxHeight * .4 - 220,
            width: 600,
            height: 440,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    dark ? const Color(0x4D6B5BFF) : const Color(0x387C6BFF),
                    const Color(0x007C6BFF),
                  ],
                  stops: const [0, .7],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Followers, following, friends and points, the first three opening their
/// lists.
class _Counts extends StatelessWidget {
  const _Counts({required this.profile});

  final Profile profile;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final id = profile.member.id;
    Widget cell(String key, int n, String label, String? path) => Expanded(
      child: GestureDetector(
        key: ValueKey('profile-count-$key'),
        onTap: path == null ? null : () => context.push(path),
        behavior: HitTestBehavior.opaque,
        child: Column(
          children: [
            Text(
              count(n, short: true),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: p.ink,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: p.muted),
            ),
          ],
        ),
      ),
    );
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x0BFFFFFF) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: p.dark ? Border.all(color: const Color(0x12FFFFFF)) : null,
        boxShadow: [
          BoxShadow(
            color: p.cardShadow,
            blurRadius: 34,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        children: [
          cell(
            'followers',
            profile.followers,
            l.profileFollowers,
            Paths.followers(id),
          ),
          cell(
            'following',
            profile.following,
            l.profileFollowing,
            Paths.following(id),
          ),
          cell('friends', profile.friends, l.profileFriends, Paths.friends(id)),
          cell('points', profile.points, l.profilePoints, null),
        ],
      ),
    );
  }
}

/// The member's own: Edit profile, and their friend requests.
class _OwnActions extends ConsumerWidget {
  const _OwnActions({required this.profile});

  final Profile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final requests =
        ref
            .watch(friendRequestsProvider)
            .value
            ?.where((r) => r.incoming)
            .length ??
        0;
    return Row(
      children: [
        Expanded(
          child: _Button(
            key: const ValueKey('profile-edit'),
            label: l.profileEdit,
            icon: Symbols.edit_rounded,
            filled: true,
            onTap: () => context.push(Paths.editProfile),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _Button(
            key: const ValueKey('profile-requests'),
            label: requests > 0
                ? '${l.socialFriendRequests} · $requests'
                : l.socialFriendRequests,
            icon: Symbols.group_add_rounded,
            onTap: () => context.push(Paths.friendRequests),
          ),
        ),
      ],
    );
  }
}

/// Another member: Follow (one way) and Add friend (asked, then accepted).
class _Actions extends ConsumerWidget {
  const _Actions({required this.profile});

  final Profile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final m = profile.member;
    final following = ref.watch(followingProvider(m.id));
    final api = ref.read(communityApiProvider);
    final friend = profile.relationship.friend;
    Future<void> after(Future<void> Function() call) async {
      await _run(context, call);
      ref.invalidate(profileProvider(m.id));
    }

    return Row(
      children: [
        Expanded(
          child: _Button(
            key: const ValueKey('profile-follow'),
            label: following ? l.socialFollowingState : l.socialFollow,
            icon: following
                ? Symbols.check_rounded
                : Symbols.person_add_rounded,
            filled: !following,
            onTap: () => _run(
              context,
              () => ref.read(followingProvider(m.id).notifier).toggle(),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: switch (friend) {
            FriendState.none => _Button(
              key: const ValueKey('profile-friend'),
              label: l.socialAddFriend,
              icon: Symbols.group_add_rounded,
              onTap: () => after(() => api.requestFriend(m.id)),
            ),
            FriendState.requested => _Button(
              key: const ValueKey('profile-friend'),
              label: l.socialRequested,
              icon: Symbols.schedule_rounded,
              onTap: () => after(() => api.removeFriend(m.id)),
            ),
            // Asking back accepts their request.
            FriendState.incoming => _Button(
              key: const ValueKey('profile-friend'),
              label: l.socialAccept,
              icon: Symbols.how_to_reg_rounded,
              filled: true,
              onTap: () => after(() => api.requestFriend(m.id)),
            ),
            FriendState.friends => _Button(
              key: const ValueKey('profile-friend'),
              label: l.socialFriendsState,
              icon: Symbols.diversity_3_rounded,
              onTap: () {},
            ),
          },
        ),
      ],
    );
  }
}

class _BlockedNote extends ConsumerWidget {
  const _BlockedNote({required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Column(
        children: [
          Text(l.socialBlockedNote, style: TextStyle(color: p.muted)),
          const SizedBox(height: 8),
          _Button(
            key: const ValueKey('profile-unblock'),
            label: l.socialUnblock,
            icon: Symbols.lock_open_rounded,
            onTap: () async {
              await _run(
                context,
                () => ref.read(communityApiProvider).unblock(id),
              );
              ref.invalidate(profileProvider(id));
            },
          ),
        ],
      ),
    );
  }
}

class _Button extends StatelessWidget {
  const _Button({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
    this.filled = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = filled ? Colors.white : p.ink;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            gradient: filled ? (p.dark ? Brand.sunrise : Brand.tabOnDay) : null,
            color: filled
                ? null
                : (p.dark ? const Color(0x12FFFFFF) : Colors.white),
            borderRadius: BorderRadius.circular(16),
            border: filled
                ? null
                : Border.all(
                    color: p.dark ? const Color(0x1AFFFFFF) : Brand.line,
                  ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Sym(icon, size: 19, color: filled && !p.dark ? Brand.peach : fg),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: fg,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 22, 18, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: p.ink,
              letterSpacing: -.2,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _Muted extends StatelessWidget {
  const _Muted(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(
      fontSize: 13.5,
      color: context.palette.muted,
      height: 1.45,
    ),
  );
}

class _Chip extends StatelessWidget {
  const _Chip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x14FFFFFF) : const Color(0x14FF5A1F),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w600,
          color: p.dark ? const Color(0xFFCFCBE0) : const Color(0xFFC8410F),
        ),
      ),
    );
  }
}

class _BadgeRow extends StatelessWidget {
  const _BadgeRow({required this.badge});

  final EarnedBadge badge;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final name = switch (badge.kind) {
      BadgeKind.gold => l.profileBadgeGold,
      BadgeKind.green => l.profileBadgeGreen,
      BadgeKind.blue => l.profileBadgeBlue,
    };
    final color = BadgeMark.colorOf(badge.kind);
    return Container(
      key: ValueKey('badge-${badge.kind.name}'),
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x0BFFFFFF) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: .45)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .16),
              borderRadius: BorderRadius.circular(13),
            ),
            child: BadgeMark(badge.kind, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: p.ink,
                  ),
                ),
                if (badge.company != null)
                  Text(
                    badge.company!,
                    style: TextStyle(fontSize: 12.5, color: p.muted),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AppRow extends ConsumerWidget {
  const _AppRow({required this.app});

  final LinkedApp app;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final url = app.url;
    return GestureDetector(
      key: ValueKey('app-${app.id}'),
      onTap: url == null
          ? null
          : () => ref.read(openExternalProvider)(Uri.parse(url)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: p.dark ? const Color(0x0BFFFFFF) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: p.cardShadow,
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: Avatar.gradientFor(app.id)),
                borderRadius: BorderRadius.circular(13),
                image: app.iconUrl == null
                    ? null
                    : DecorationImage(
                        image: NetworkImage(app.iconUrl!),
                        fit: BoxFit.cover,
                      ),
              ),
              child: app.iconUrl == null
                  ? const Sym(
                      Symbols.storefront_rounded,
                      size: 21,
                      color: Colors.white,
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    app.name,
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: p.ink,
                    ),
                  ),
                  if (url != null)
                    Text(
                      Uri.parse(url).host,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12.5, color: p.muted),
                    ),
                ],
              ),
            ),
            if (url != null)
              Sym(Symbols.open_in_new_rounded, size: 19, color: p.muted),
          ],
        ),
      ),
    );
  }
}

class _Cta extends StatelessWidget {
  const _Cta({
    super.key,
    required this.icon,
    required this.title,
    required this.line,
    required this.action,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String line;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0x24FF8A3D),
            p.dark ? const Color(0x0AFFFFFF) : const Color(0x0DFFFFFF),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x4DFF5A1F)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: Brand.sunrise,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Sym(icon, size: 21, fill: true, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: p.ink,
                  ),
                ),
                Text(
                  line,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: p.muted,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: onTap,
            style: TextButton.styleFrom(
              foregroundColor: Brand.orange,
              textStyle: const TextStyle(fontWeight: FontWeight.w700),
            ),
            child: Text(action),
          ),
        ],
      ),
    );
  }
}

class _Failed extends StatelessWidget {
  const _Failed({required this.error, required this.retry});

  final Object error;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final e = error;
    final text = e is ApiException && e.offline
        ? l.commonOffline
        : (e is ApiException && e.code == ApiException.notFound
              ? l.commonEmpty
              : l.commonError);
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(text, style: TextStyle(color: p.muted)),
            TextButton(onPressed: retry, child: Text(l.commonRetry)),
          ],
        ),
      ),
    );
  }
}
