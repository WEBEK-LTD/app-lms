import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/auth/session.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/avatar.dart';
import '../../core/widgets/badge_mark.dart';
import '../../core/widgets/floating_tab_bar.dart';
import 'data/social.dart';

/// A member's followers, the members they follow, or their friends.
class MemberListPage extends ConsumerWidget {
  const MemberListPage({super.key, required this.id, required this.list});

  final String id;
  final MemberList list;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final title = switch (list) {
      MemberList.followers => l.profileFollowers,
      MemberList.following => l.profileFollowing,
      MemberList.friends => l.profileFriends,
      MemberList.blocked => l.settingsBlocked,
    };
    final empty = switch (list) {
      MemberList.followers => l.socialNoFollowers,
      MemberList.following => l.socialNoFollowing,
      MemberList.friends => l.socialNoFriends,
      MemberList.blocked => l.settingsNoBlocked,
    };
    final members = ref.watch(memberListProvider((id, list)));
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(
          title,
          style: TextStyle(fontWeight: FontWeight.w800, color: p.ink),
        ),
      ),
      body: switch (members) {
        AsyncData(:final value) when value.items.isEmpty => Center(
          child: Text(empty, style: TextStyle(color: p.muted)),
        ),
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.fromLTRB(
            14,
            4,
            14,
            FloatingTabBar.clearance,
          ),
          children: [
            for (final m in value.items) MemberRow(member: m),
            if (value.nextCursor != null)
              ShowMore(
                onTap: () =>
                    ref.read(memberListProvider((id, list)).notifier).more(),
              ),
          ],
        ),
        AsyncError() => Center(
          child: TextButton(
            onPressed: () => ref.invalidate(memberListProvider((id, list))),
            child: Text(l.commonRetry),
          ),
        ),
        _ => const Center(
          child: CircularProgressIndicator(color: Brand.orange),
        ),
      },
    );
  }
}

/// A member in a list: avatar, name and badge, username, Follow.
class MemberRow extends ConsumerWidget {
  const MemberRow({super.key, required this.member, this.trailing});

  final MemberSummary member;
  final Widget? trailing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final me = ref.watch(meProvider);
    final following = ref.watch(followingProvider(member.id));
    return Container(
      key: ValueKey('member-${member.id}'),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x0BFFFFFF) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: p.cardShadow,
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: ListTile(
          contentPadding: const EdgeInsetsDirectional.fromSTEB(12, 4, 10, 4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          onTap: () => context.push(Paths.member(member.id)),
          leading: Avatar(
            id: member.id,
            name: member.name,
            url: member.avatarUrl,
            size: 42,
          ),
          title: Row(
            children: [
              Flexible(
                child: Text(
                  member.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontWeight: FontWeight.w700, color: p.ink),
                ),
              ),
              const SizedBox(width: 4),
              BadgeMark(member.badge),
            ],
          ),
          subtitle: Text(
            [
              if (member.username.isNotEmpty) '@${member.username}',
              ?member.level,
            ].join(' · '),
            style: TextStyle(color: p.muted, fontSize: 12.5),
          ),
          trailing:
              trailing ??
              (me == null || member.id == me.member.id || member.team
                  ? null
                  : TextButton(
                      key: ValueKey('member-follow-${member.id}'),
                      onPressed: () async {
                        try {
                          await ref
                              .read(followingProvider(member.id).notifier)
                              .toggle();
                        } on ApiException {
                          // The tap is undone.
                        }
                      },
                      style: TextButton.styleFrom(
                        backgroundColor: following
                            ? null
                            : (p.dark ? Brand.orange : Brand.navy),
                        foregroundColor: following ? p.ink : Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: following
                              ? BorderSide(
                                  color: p.dark
                                      ? const Color(0x1AFFFFFF)
                                      : Brand.line,
                                )
                              : BorderSide.none,
                        ),
                        textStyle: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12.5,
                        ),
                      ),
                      child: Text(
                        following ? l.socialFollowingState : l.socialFollow,
                      ),
                    )),
        ),
      ),
    );
  }
}

/// "Show more" at a list's foot (the next page).
class ShowMore extends StatelessWidget {
  const ShowMore({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Center(
    child: TextButton(
      key: const ValueKey('list-more'),
      onPressed: onTap,
      style: TextButton.styleFrom(
        foregroundColor: Brand.orange,
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
      child: Text(context.l10n.commonShowMore),
    ),
  );
}

/// The member's friend requests: accept or decline each.
class FriendRequestsPage extends ConsumerWidget {
  const FriendRequestsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final requests = ref.watch(friendRequestsProvider);
    Future<void> answer(FriendRequest r, bool accept) async {
      final messenger = ScaffoldMessenger.of(context);
      try {
        await ref
            .read(communityApiProvider)
            .answerFriendRequest(r.id, accept: accept);
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
      ref.invalidate(friendRequestsProvider);
      ref.read(sessionProvider.notifier).refresh().ignore();
    }

    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(
          l.socialFriendRequests,
          style: TextStyle(fontWeight: FontWeight.w800, color: p.ink),
        ),
      ),
      body: switch (requests) {
        AsyncData(:final value) when value.where((r) => r.incoming).isEmpty =>
          Center(
            child: Text(l.socialNoRequests, style: TextStyle(color: p.muted)),
          ),
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.fromLTRB(14, 4, 14, 40),
          children: [
            for (final r in value.where((r) => r.incoming))
              MemberRow(
                member: r.member,
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton(
                      key: ValueKey('request-decline-${r.id}'),
                      onPressed: () => answer(r, false),
                      child: Text(
                        l.socialDecline,
                        style: TextStyle(color: p.muted),
                      ),
                    ),
                    FilledButton(
                      key: ValueKey('request-accept-${r.id}'),
                      onPressed: () => answer(r, true),
                      style: FilledButton.styleFrom(
                        backgroundColor: Brand.orange,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        textStyle: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      child: Text(l.socialAccept),
                    ),
                  ],
                ),
              ),
          ],
        ),
        AsyncError() => Center(
          child: TextButton(
            onPressed: () => ref.invalidate(friendRequestsProvider),
            child: Text(l.commonRetry),
          ),
        ),
        _ => const Center(
          child: CircularProgressIndicator(color: Brand.orange),
        ),
      },
    );
  }
}
