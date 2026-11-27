import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderOrFamily;
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/widgets/common.dart';
import '../community_paths.dart';
import '../data/community_api.dart';

/// 235 The community's screens: flat cards with the app's own colours (the
/// Studio design's), so every screen follows the template it is in.

Widget _async<T>(
  WidgetRef ref,
  AsyncValue<T> value,
  ProviderOrFamily provider,
  Widget Function(T data) data,
) => switch (value) {
  AsyncData(:final value) => data(value),
  AsyncError(:final error) => ErrorView(
    error: error,
    onRetry: () => ref.invalidate(provider),
  ),
  _ => const LoadingView(),
};

Widget _empty(BuildContext context, IconData icon, String title) =>
    MessageView(icon: icon, title: title);

class _Avatar extends StatelessWidget {
  const _Avatar(this.member, {this.size = 36});

  final CommunityMember member;
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final url = member.avatarUrl;
    final initial = member.name.isEmpty ? '?' : member.name.characters.first;
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: scheme.surfaceContainerHighest,
      foregroundImage: url == null ? null : NetworkImage(url),
      child: Text(
        initial.toUpperCase(),
        style: TextStyle(color: scheme.onSurfaceVariant, fontSize: size * .4),
      ),
    );
  }
}

class _Byline extends StatelessWidget {
  const _Byline(this.member);

  final CommunityMember member;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        _Avatar(member, size: 28),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            member.name,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelLarge,
          ),
        ),
        if (member.username.isNotEmpty) ...[
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              '@${member.username}',
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _CountLine extends StatelessWidget {
  const _CountLine(this.icon, this.text);

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Row(
      children: [
        Icon(icon, size: 16, color: muted),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12.5, color: muted),
          ),
        ),
      ],
    );
  }
}

ListView _list(BuildContext context, List<Widget> children) =>
    ListView.separated(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        24 + MediaQuery.paddingOf(context).bottom,
      ),
      itemCount: children.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => children[i],
    );

Scaffold _screen(BuildContext context, String title, Widget body) => Scaffold(
  appBar: AppBar(
    title: Text(title),
    // A tab's own screen has no back button: its title keeps the margin.
    titleSpacing: ModalRoute.of(context)?.canPop == true ? null : 20,
  ),
  body: body,
);

/// The feed: posts and questions, newest first.
class CommunityFeedScreen extends ConsumerWidget {
  const CommunityFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return _screen(
      context,
      l.communityTabFeed,
      RefreshIndicator(
        onRefresh: () => ref.refresh(communityFeedProvider.future),
        child: _async(
          ref,
          ref.watch(communityFeedProvider),
          communityFeedProvider,
          (items) => items.isEmpty
              ? _empty(
                  context,
                  Symbols.dynamic_feed_rounded,
                  l.communityFeedEmpty,
                )
              : _list(context, [for (final e in items) _FeedCard(entry: e)]),
        ),
      ),
    );
  }
}

class _FeedCard extends StatelessWidget {
  const _FeedCard({required this.entry});

  final FeedEntry entry;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final question = entry.kind == FeedKind.question;
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: question
          ? () => context.push(CommunityPaths.question(entry.id))
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Byline(entry.author),
          const SizedBox(height: 10),
          if (entry.title != null && entry.title!.isNotEmpty) ...[
            Text(entry.title!, style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
          ],
          Text(
            entry.text,
            maxLines: 6,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 10),
          question
              ? _CountLine(
                  Symbols.forum_rounded,
                  l.communityAnswers(entry.count),
                )
              : _CountLine(
                  Symbols.chat_bubble_rounded,
                  l.communityComments(entry.count),
                ),
        ],
      ),
    );
  }
}

/// Q&A: the questions, and a question with its answers.
class CommunityQuestionsScreen extends ConsumerWidget {
  const CommunityQuestionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    return _screen(
      context,
      l.communityTabQuestions,
      RefreshIndicator(
        onRefresh: () => ref.refresh(communityQuestionsProvider.future),
        child: _async(
          ref,
          ref.watch(communityQuestionsProvider),
          communityQuestionsProvider,
          (items) => items.isEmpty
              ? _empty(
                  context,
                  Symbols.forum_rounded,
                  l.communityQuestionsEmpty,
                )
              : _list(context, [
                  for (final q in items)
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      onTap: () => context.push(CommunityPaths.question(q.id)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(q.title, style: theme.textTheme.titleMedium),
                          const SizedBox(height: 8),
                          _Byline(q.author),
                          const SizedBox(height: 8),
                          _CountLine(
                            Symbols.forum_rounded,
                            l.communityAnswers(q.answerCount),
                          ),
                        ],
                      ),
                    ),
                ]),
        ),
      ),
    );
  }
}

class CommunityQuestionScreen extends ConsumerWidget {
  const CommunityQuestionScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final provider = communityQuestionProvider(id);
    return _screen(
      context,
      l.communityTabQuestions,
      _async(
        ref,
        ref.watch(provider),
        provider,
        (q) => _list(context, [
          Text(q.title, style: theme.textTheme.headlineSmall),
          _Byline(q.author),
          if (q.body.isNotEmpty) Text(q.body, style: theme.textTheme.bodyLarge),
          _CountLine(
            Symbols.forum_rounded,
            l.communityAnswers(q.answers.length),
          ),
          for (final a in q.answers)
            AppCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: _Byline(a.author)),
                      if (a.accepted)
                        Icon(
                          Symbols.check_circle_rounded,
                          fill: 1,
                          size: 20,
                          color: theme.colorScheme.primary,
                          semanticLabel: l.communityAccepted,
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(a.body, style: theme.textTheme.bodyMedium),
                ],
              ),
            ),
          _Composer(
            hint: l.communityAnswerHint,
            onSend: (text) async {
              await ref.read(communityApiProvider).answer(id, text);
              ref.invalidate(provider);
            },
          ),
        ]),
      ),
    );
  }
}

/// Groups, with Join.
class CommunityGroupsScreen extends ConsumerWidget {
  const CommunityGroupsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return _screen(
      context,
      l.communityTabGroups,
      RefreshIndicator(
        onRefresh: () => ref.refresh(communityGroupsProvider.future),
        child: _async(
          ref,
          ref.watch(communityGroupsProvider),
          communityGroupsProvider,
          (items) => items.isEmpty
              ? _empty(context, Symbols.groups_rounded, l.communityGroupsEmpty)
              : _list(context, [
                  for (final g in items)
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  g.name,
                                  style: theme.textTheme.titleMedium,
                                ),
                                if (g.description.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    g.description,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                                const SizedBox(height: 8),
                                _CountLine(
                                  g.private
                                      ? Symbols.lock_rounded
                                      : Symbols.public_rounded,
                                  g.private
                                      ? '${l.communityPrivate} · ${l.communityMembers(g.memberCount)}'
                                      : l.communityMembers(g.memberCount),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          g.joined
                              ? Text(
                                  l.communityJoined,
                                  style: theme.textTheme.labelLarge,
                                )
                              : OutlinedButton(
                                  onPressed: () async {
                                    if (!signedIn) {
                                      context.push(Paths.signIn);
                                      return;
                                    }
                                    await ref
                                        .read(communityApiProvider)
                                        .join(g.id);
                                    ref.invalidate(communityGroupsProvider);
                                  },
                                  child: Text(l.communityJoin),
                                ),
                        ],
                      ),
                    ),
                ]),
        ),
      ),
    );
  }
}

/// Asks a signed-out person to sign in (the app's own sign-in).
class _SignInFirst extends StatelessWidget {
  const _SignInFirst();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return MessageView(
      icon: Symbols.person_rounded,
      title: l.communitySignInTitle,
      message: l.communitySignInMessage,
      actionLabel: l.signIn,
      onAction: () => context.push(Paths.signIn),
    );
  }
}

/// The member's own profile, and their account.
class CommunityProfileScreen extends ConsumerWidget {
  const CommunityProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return _screen(
      context,
      l.communityTabProfile,
      !signedIn
          ? const _SignInFirst()
          : _async(
              ref,
              ref.watch(communityMeProvider),
              communityMeProvider,
              (me) => _list(context, [
                Center(child: _Avatar(me, size: 88)),
                Center(
                  child: Text(me.name, style: theme.textTheme.headlineSmall),
                ),
                if (me.username.isNotEmpty)
                  Center(
                    child: Text(
                      '@${me.username}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                if (me.headline != null)
                  Center(
                    child: Text(
                      me.headline!,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                AppCard(
                  onTap: () => context.go(Paths.account),
                  child: ListTile(
                    leading: const Icon(Symbols.manage_accounts_rounded),
                    title: Text(l.communityAccount),
                    trailing: const Icon(Symbols.chevron_forward_rounded),
                  ),
                ),
              ]),
            ),
    );
  }
}

/// Member-to-member messages: the conversations, and one conversation.
class CommunityMessagesScreen extends ConsumerWidget {
  const CommunityMessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return _screen(
      context,
      l.communityTabMessages,
      !signedIn
          ? const _SignInFirst()
          : RefreshIndicator(
              onRefresh: () =>
                  ref.refresh(communityConversationsProvider.future),
              child: _async(
                ref,
                ref.watch(communityConversationsProvider),
                communityConversationsProvider,
                (items) => items.isEmpty
                    ? _empty(
                        context,
                        Symbols.chat_rounded,
                        l.communityMessagesEmpty,
                      )
                    : _list(context, [
                        for (final c in items)
                          AppCard(
                            onTap: () =>
                                context.push(CommunityPaths.conversation(c.id)),
                            child: ListTile(
                              title: Text(
                                c.title,
                                style: c.unread
                                    ? theme.textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w700,
                                      )
                                    : theme.textTheme.titleSmall,
                              ),
                              subtitle: Text(
                                c.lastMessage,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: c.unread
                                  ? Icon(
                                      Symbols.circle_rounded,
                                      fill: 1,
                                      size: 10,
                                      color: theme.colorScheme.primary,
                                      semanticLabel: l.communityUnread,
                                    )
                                  : null,
                            ),
                          ),
                      ]),
              ),
            ),
    );
  }
}

class CommunityConversationScreen extends ConsumerWidget {
  const CommunityConversationScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final provider = communityMessagesProvider(id);
    final myId = ref.watch(communityMeProvider).value?.id;
    return _screen(
      context,
      l.communityTabMessages,
      Column(
        children: [
          Expanded(
            child: _async(
              ref,
              ref.watch(provider),
              provider,
              (items) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final m in items)
                    _Bubble(m, mine: myId != null && m.author?.id == myId),
                ],
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: _Composer(
                hint: l.communityMessageHint,
                onSend: (text) async {
                  await ref.read(communityApiProvider).send(id, text);
                  ref.invalidate(provider);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A one-line text field with Send.
class _Composer extends StatefulWidget {
  const _Composer({required this.hint, required this.onSend});

  final String hint;
  final Future<void> Function(String text) onSend;

  @override
  State<_Composer> createState() => _ComposerState();
}

class _ComposerState extends State<_Composer> {
  final _text = TextEditingController();
  var _sending = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await widget.onSend(text);
      _text.clear();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(friendlyError(e))));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: TextField(
          controller: _text,
          minLines: 1,
          maxLines: 4,
          decoration: InputDecoration(hintText: widget.hint),
        ),
      ),
      const SizedBox(width: 8),
      IconButton.filled(
        onPressed: _sending ? null : _send,
        tooltip: context.l10n.communitySend,
        icon: const Icon(Symbols.send_rounded),
      ),
    ],
  );
}

class _Bubble extends StatelessWidget {
  const _Bubble(this.message, {required this.mine});

  final CommunityMessage message;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: const BoxConstraints(maxWidth: 300),
        decoration: BoxDecoration(
          color: mine ? scheme.primary : scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message.body,
          style: TextStyle(color: mine ? scheme.onPrimary : scheme.onSurface),
        ),
      ),
    );
  }
}
