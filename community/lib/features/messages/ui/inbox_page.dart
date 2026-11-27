import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models.dart';
import '../../../core/auth/session.dart';
import '../../../core/format.dart';
import '../../../core/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/sym.dart';
import '../data/messages_api.dart';
import '../links.dart';

/// The conversations, latest first, each with its unread count.
class InboxPage extends ConsumerWidget {
  const InboxPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final me = ref.watch(meProvider)?.member.id;
    final lang = ref.watch(languageProvider);
    final list = ref.watch(conversationsProvider);
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.headerMessages),
        actions: [
          IconButton(
            key: const ValueKey('msg-new'),
            tooltip: l.msgNew,
            onPressed: () => context.push(MessagesLinks.start),
            icon: const Sym(Symbols.edit_square_rounded, color: Brand.orange),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: Brand.orange,
        onRefresh: () => ref.refresh(conversationsProvider.future),
        child: switch (list) {
          AsyncData(:final value) when value.isEmpty => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(40),
                child: Text(
                  l.msgEmpty,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: p.muted, height: 1.5),
                ),
              ),
            ],
          ),
          AsyncData(:final value) => ListView.separated(
            itemCount: value.length,
            separatorBuilder: (_, _) =>
                Divider(height: 1, color: p.line, indent: 76),
            itemBuilder: (context, i) {
              final c = value[i];
              final others = c.others(me);
              final last = c.lastMessage;
              return ListTile(
                key: ValueKey('conversation-${c.id}'),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 4,
                ),
                onTap: () async {
                  await context.push(MessagesLinks.thread(c.id));
                  ref
                    ..invalidate(conversationsProvider)
                    ..invalidate(unreadMessagesProvider);
                },
                leading: others.isEmpty
                    ? null
                    : c.isGroup
                    ? _GroupFace(members: others)
                    : Avatar(
                        id: others.first.id,
                        name: others.first.name,
                        url: others.first.avatarUrl,
                        size: 48,
                      ),
                title: Text(
                  c.name(me),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: p.ink,
                    fontWeight: c.unread > 0
                        ? FontWeight.w800
                        : FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  last == null
                      ? ''
                      : last.deleted
                      ? l.msgDeleted
                      : last.body.isEmpty && last.photos.isNotEmpty
                      ? l.msgPhoto
                      : last.body,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: c.unread > 0 ? p.ink : p.muted,
                    fontSize: 13,
                  ),
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      ago(last?.createdAt ?? c.updatedAt, lang: lang),
                      style: TextStyle(color: p.muted, fontSize: 11.5),
                    ),
                    const SizedBox(height: 4),
                    if (c.unread > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: Brand.orange,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${c.unread}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      )
                    else if (c.muted)
                      Sym(
                        Symbols.notifications_off_rounded,
                        size: 16,
                        color: p.muted,
                      ),
                  ],
                ),
              );
            },
          ),
          AsyncError() => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(40),
                child: Text(l.commonError, textAlign: TextAlign.center),
              ),
            ],
          ),
          _ => const Center(
            child: CircularProgressIndicator(color: Brand.orange),
          ),
        },
      ),
    );
  }
}

class _GroupFace extends StatelessWidget {
  const _GroupFace({required this.members});

  final List<MemberSummary> members;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 48,
    height: 48,
    child: Stack(
      children: [
        for (final (i, m) in members.take(2).indexed)
          PositionedDirectional(
            start: i * 14.0,
            top: i * 14.0,
            child: Avatar(
              id: m.id,
              name: m.name,
              url: m.avatarUrl,
              size: 34,
              border: context.palette.screen,
            ),
          ),
      ],
    ),
  );
}

/// A new conversation: one person for a one-to-one, up to nine for a
/// group (with a title), chosen from the members followed.
class NewChatPage extends ConsumerStatefulWidget {
  const NewChatPage({super.key});

  @override
  ConsumerState<NewChatPage> createState() => _NewChatPageState();
}

class _NewChatPageState extends ConsumerState<NewChatPage> {
  final _picked = <String>{};
  final _title = TextEditingController();
  var _busy = false;

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() => _busy = true);
    try {
      final c = await ref
          .read(messagesApiProvider)
          .start(
            _picked.toList(),
            title: _picked.length > 1 && _title.text.trim().isNotEmpty
                ? _title.text.trim()
                : null,
          );
      ref.invalidate(conversationsProvider);
      if (mounted) context.pushReplacement(MessagesLinks.thread(c.id));
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.code == ApiException.notAllowed
                  ? context.l10n.msgNotAllowed
                  : context.l10n.commonError,
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final me = ref.watch(meProvider)?.member.id;
    final people = ref.watch(_followedProvider(me ?? ''));
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.msgNew),
        actions: [
          TextButton(
            key: const ValueKey('msg-start'),
            onPressed: _picked.isEmpty || _busy ? null : _start,
            child: Text(l.msgStart),
          ),
        ],
      ),
      body: ListView(
        children: [
          if (_picked.length > 1)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: TextField(
                key: const ValueKey('msg-title'),
                controller: _title,
                maxLength: 80,
                decoration: InputDecoration(
                  hintText: l.msgGroupTitle,
                  counterText: '',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text(
              l.msgPickPeople(_picked.length, Conversation.maxPeople - 1),
              style: TextStyle(color: p.muted, fontSize: 13),
            ),
          ),
          ...switch (people) {
            AsyncData(:final value) => [
              for (final m in value)
                CheckboxListTile(
                  key: ValueKey('msg-pick-${m.id}'),
                  activeColor: Brand.orange,
                  value: _picked.contains(m.id),
                  onChanged:
                      _picked.contains(m.id) ||
                          _picked.length < Conversation.maxPeople - 1
                      ? (on) => setState(
                          () => on == true
                              ? _picked.add(m.id)
                              : _picked.remove(m.id),
                        )
                      : null,
                  secondary: Avatar(
                    id: m.id,
                    name: m.name,
                    url: m.avatarUrl,
                    size: 40,
                  ),
                  title: Text(m.name, style: TextStyle(color: p.ink)),
                  subtitle: Text(
                    '@${m.username}',
                    style: TextStyle(color: p.muted),
                  ),
                ),
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
        ],
      ),
    );
  }
}

final _followedProvider = FutureProvider.autoDispose
    .family<List<MemberSummary>, String>(
      (ref, me) async =>
          (await ref.watch(communityApiProvider).following(me)).items,
    );
