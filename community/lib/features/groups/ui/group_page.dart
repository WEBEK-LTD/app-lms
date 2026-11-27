import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../../home/home_page.dart' show FeedQuestionCard;
import '../../posts/data/posts_api.dart';
import '../../posts/posts_state.dart';
import '../../posts/ui/composer_screen.dart';
import '../../posts/ui/post_card.dart';
import '../data/groups_api.dart';
import '../links.dart';

final groupFeedProvider = FutureProvider.autoDispose
    .family<List<FeedEntry>, String>(
      (ref, id) async =>
          (await ref.watch(postsApiProvider).groupFeed(id)).items,
    );

/// A group's page: its cover, name, counts and description; Join (or ask
/// to, for a private group); its posts and questions to those who may read
/// them; members; and, for its owner and moderators, requests and cover.
class GroupPage extends ConsumerWidget {
  const GroupPage({super.key, required this.id});

  final String id;

  Future<void> _membership(BuildContext context, WidgetRef ref, Group g) async {
    final api = ref.read(groupsApiProvider);
    try {
      if (g.standing.member || g.standing.requested) {
        await api.leave(g.id);
      } else {
        await api.join(g.id);
      }
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.code == 'owner_must_transfer'
                  ? context.l10n.groupOwnerMustTransfer
                  : context.l10n.commonError,
            ),
          ),
        );
      }
    }
    ref
      ..invalidate(groupProvider(id))
      ..invalidate(myGroupsProvider)
      ..invalidate(groupFeedProvider(id));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final group = ref.watch(groupProvider(id));
    return Scaffold(
      backgroundColor: p.screen,
      body: switch (group) {
        AsyncData(value: final g) => _body(context, ref, g),
        AsyncError() => Center(child: Text(l.commonError)),
        _ => const Center(
          child: CircularProgressIndicator(color: Brand.orange),
        ),
      },
    );
  }

  Widget _body(BuildContext context, WidgetRef ref, Group g) {
    final p = context.palette;
    final l = context.l10n;
    final s = g.standing;
    final feed = g.open ? ref.watch(groupFeedProvider(g.id)) : null;
    return CustomScrollView(
      key: const ValueKey('group-page'),
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 160,
          backgroundColor: p.screen,
          surfaceTintColor: Colors.transparent,
          flexibleSpace: FlexibleSpaceBar(
            background: g.coverUrl == null
                ? ColoredBox(color: Avatar.gradientFor(g.id).first)
                : Image(image: imageOf(g.coverUrl!), fit: BoxFit.cover),
          ),
          actions: [
            if (s.manages)
              IconButton(
                key: const ValueKey('group-manage'),
                tooltip: l.postMore,
                onPressed: () => _manage(context, ref, g),
                icon: const Sym(Symbols.more_vert_rounded),
              ),
          ],
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  g.name,
                  style: TextStyle(
                    fontFamily: 'Readex Pro',
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: p.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Sym(
                      g.private ? Symbols.lock_rounded : Symbols.public_rounded,
                      size: 16,
                      color: p.muted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${g.private ? l.groupPrivate : l.groupPublic} · '
                      '${l.groupMembers(g.memberCount)}',
                      style: TextStyle(color: p.muted, fontSize: 13),
                    ),
                  ],
                ),
                if (g.description.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    g.description,
                    style: TextStyle(color: p.ink, height: 1.5),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: s.member || s.requested
                          ? OutlinedButton(
                              key: const ValueKey('group-join'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: p.ink,
                                side: BorderSide(color: p.line),
                                minimumSize: const Size.fromHeight(42),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              onPressed: () => _membership(context, ref, g),
                              child: Text(
                                s.requested ? l.groupRequested : l.groupLeave,
                              ),
                            )
                          : FilledButton(
                              key: const ValueKey('group-join'),
                              style: FilledButton.styleFrom(
                                backgroundColor: Brand.orange,
                                minimumSize: const Size.fromHeight(42),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              onPressed: () => _membership(context, ref, g),
                              child: Text(
                                g.private ? l.groupAskToJoin : l.groupJoin,
                              ),
                            ),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      key: const ValueKey('group-members'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: p.ink,
                        side: BorderSide(color: p.line),
                        minimumSize: const Size(0, 42),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: g.open
                          ? () => context.push(GroupLinks.members(g.id))
                          : null,
                      icon: const Sym(Symbols.group_rounded, size: 20),
                      label: Text(l.groupMembersTitle),
                    ),
                  ],
                ),
                if (s.member) ...[
                  const SizedBox(height: 10),
                  InkWell(
                    key: const ValueKey('group-write'),
                    borderRadius: BorderRadius.circular(12),
                    onTap: () async {
                      await context.push(
                        '${PostLinks.compose}?group=${Uri.encodeQueryComponent(g.id)}',
                      );
                      ref.invalidate(groupFeedProvider(g.id));
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: p.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: p.line),
                      ),
                      child: Row(
                        children: [
                          Sym(Symbols.edit_square_rounded, color: p.muted),
                          const SizedBox(width: 10),
                          Text(l.groupWrite, style: TextStyle(color: p.muted)),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        if (!g.open)
          SliverToBoxAdapter(
            child: Padding(
              key: const ValueKey('group-closed'),
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Sym(Symbols.lock_rounded, size: 32, color: p.muted),
                  const SizedBox(height: 8),
                  Text(
                    l.groupJoinToRead,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: p.muted),
                  ),
                ],
              ),
            ),
          )
        else
          SliverList.list(
            children: switch (feed) {
              AsyncData(:final value) when value.isEmpty => [
                Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    l.groupNoPosts,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: p.muted),
                  ),
                ),
              ],
              AsyncData(:final value) => [
                const SizedBox(height: 6),
                for (final e in value)
                  if (e.post case final post?)
                    PostCard(post: post)
                  else if (e.question case final q?)
                    FeedQuestionCard(item: q),
              ],
              AsyncError() => [Center(child: Text(l.commonError))],
              _ => [
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: CircularProgressIndicator(color: Brand.orange),
                  ),
                ),
              ],
            },
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }

  Future<void> _manage(BuildContext context, WidgetRef ref, Group g) async {
    final l = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              key: const ValueKey('group-cover'),
              leading: const Sym(Symbols.image_rounded),
              title: Text(l.groupCover),
              onTap: () => Navigator.pop(sheet, 'cover'),
            ),
            if (g.private)
              ListTile(
                key: const ValueKey('group-requests'),
                leading: const Sym(Symbols.person_add_rounded),
                title: Text(l.groupRequests),
                onTap: () => Navigator.pop(sheet, 'requests'),
              ),
          ],
        ),
      ),
    );
    if (!context.mounted) return;
    switch (choice) {
      case 'cover':
        final file = await ref.read(mediaPickerProvider).photo();
        if (file == null) return;
        await ref.read(groupsApiProvider).setCover(g.id, file);
        ref.invalidate(groupProvider(id));
      case 'requests':
        await context.push(GroupLinks.members(g.id));
    }
  }
}

/// The group's members, owner and moderators first; for its owner and
/// moderators, the requests to join and each member's role.
class GroupMembersPage extends ConsumerStatefulWidget {
  const GroupMembersPage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<GroupMembersPage> createState() => _GroupMembersPageState();
}

class _GroupMembersPageState extends ConsumerState<GroupMembersPage> {
  List<GroupMember>? _members;
  List<GroupMember> _requests = const [];

  GroupsApi get _api => ref.read(groupsApiProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final g = await ref.read(groupProvider(widget.id).future);
    final members = (await _api.members(widget.id)).items;
    final requests = g.standing.manages && g.private
        ? (await _api.requests(widget.id)).items
        : const <GroupMember>[];
    if (mounted) {
      setState(() {
        _members = members;
        _requests = requests;
      });
    }
  }

  Future<void> _act(Future<void> Function() call) async {
    try {
      await call();
    } on ApiException {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(context.l10n.commonError)));
      }
    }
    ref.invalidate(groupProvider(widget.id));
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final me = ref.watch(meProvider)?.member.id;
    final g = ref.watch(groupProvider(widget.id)).value;
    final myRole = g?.standing.role;
    final members = _members;
    String roleName(GroupRole r) => switch (r) {
      GroupRole.owner => l.groupOwner,
      GroupRole.moderator => l.groupModerator,
      GroupRole.member => '',
    };
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.groupMembersTitle),
      ),
      body: members == null
          ? const Center(child: CircularProgressIndicator(color: Brand.orange))
          : ListView(
              children: [
                if (_requests.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Text(
                      l.groupRequests,
                      style: TextStyle(
                        color: p.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  for (final r in _requests)
                    ListTile(
                      key: ValueKey('request-${r.member.id}'),
                      leading: Avatar(
                        id: r.member.id,
                        name: r.member.name,
                        url: r.member.avatarUrl,
                      ),
                      title: Text(
                        r.member.name,
                        style: TextStyle(color: p.ink),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            key: ValueKey('request-decline-${r.member.id}'),
                            tooltip: l.groupDecline,
                            onPressed: () => _act(
                              () => _api.decline(widget.id, r.member.id),
                            ),
                            icon: Sym(Symbols.close_rounded, color: p.muted),
                          ),
                          IconButton(
                            key: ValueKey('request-accept-${r.member.id}'),
                            tooltip: l.socialAccept,
                            onPressed: () =>
                                _act(() => _api.accept(widget.id, r.member.id)),
                            icon: const Sym(
                              Symbols.check_rounded,
                              color: Brand.orange,
                            ),
                          ),
                        ],
                      ),
                    ),
                  Divider(color: p.line),
                ],
                for (final m in members)
                  ListTile(
                    key: ValueKey('member-${m.member.id}'),
                    onTap: () => context.push(Paths.member(m.member.id)),
                    leading: Avatar(
                      id: m.member.id,
                      name: m.member.name,
                      url: m.member.avatarUrl,
                    ),
                    title: Text(m.member.name, style: TextStyle(color: p.ink)),
                    subtitle: roleName(m.role).isEmpty
                        ? null
                        : Text(
                            roleName(m.role),
                            style: const TextStyle(color: Brand.orange),
                          ),
                    trailing:
                        m.member.id == me ||
                            m.role == GroupRole.owner ||
                            myRole == null ||
                            myRole == GroupRole.member ||
                            (myRole == GroupRole.moderator &&
                                m.role != GroupRole.member)
                        ? null
                        : PopupMenuButton<String>(
                            key: ValueKey('member-menu-${m.member.id}'),
                            onSelected: (v) => _act(
                              () => switch (v) {
                                'remove' => _api.remove(widget.id, m.member.id),
                                _ => _api.setRole(
                                  widget.id,
                                  m.member.id,
                                  GroupRole.values.byName(v),
                                ),
                              },
                            ),
                            itemBuilder: (_) => [
                              if (myRole == GroupRole.owner &&
                                  m.role == GroupRole.member)
                                PopupMenuItem(
                                  key: const ValueKey('member-make-moderator'),
                                  value: 'moderator',
                                  child: Text(l.groupMakeModerator),
                                ),
                              if (myRole == GroupRole.owner &&
                                  m.role == GroupRole.moderator)
                                PopupMenuItem(
                                  value: 'member',
                                  child: Text(l.groupMakeMember),
                                ),
                              if (myRole == GroupRole.owner)
                                PopupMenuItem(
                                  value: 'owner',
                                  child: Text(l.groupHandOver),
                                ),
                              PopupMenuItem(
                                key: const ValueKey('member-remove'),
                                value: 'remove',
                                child: Text(l.groupRemove),
                              ),
                            ],
                          ),
                  ),
              ],
            ),
    );
  }
}
