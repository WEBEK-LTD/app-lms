import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/floating_tab_bar.dart';
import '../../../core/widgets/sym.dart';
import '../data/groups_api.dart';
import '../links.dart';

/// The Groups tab: the member's groups, then the others to discover.
class GroupsPage extends ConsumerWidget {
  const GroupsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final mine = ref.watch(myGroupsProvider);
    final all = ref.watch(allGroupsProvider);
    final mineIds = {for (final g in mine.value ?? const <Group>[]) g.id};
    return Scaffold(
      backgroundColor: p.screen,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: Brand.orange,
          onRefresh: () async {
            ref.invalidate(myGroupsProvider);
            return ref.refresh(allGroupsProvider.future);
          },
          child: ListView(
            key: const ValueKey('groups-list'),
            padding: const EdgeInsets.only(bottom: FloatingTabBar.clearance),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        l.menuGroups,
                        style: TextStyle(
                          fontFamily: 'Readex Pro',
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: p.ink,
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      key: const ValueKey('group-create'),
                      style: FilledButton.styleFrom(
                        backgroundColor: Brand.orange,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () => context.push(GroupLinks.create),
                      icon: const Sym(
                        Symbols.add_rounded,
                        size: 20,
                        color: Colors.white,
                      ),
                      label: Text(l.groupCreate),
                    ),
                  ],
                ),
              ),
              _Heading(l.menuYourGroups),
              ...switch (mine) {
                AsyncData(:final value) when value.isEmpty => [
                  _Note(l.groupNoneYet),
                ],
                AsyncData(:final value) => [
                  for (final g in value) GroupTile(group: g),
                ],
                AsyncError() => [_Note(l.commonError)],
                _ => [const _Loading()],
              },
              _Heading(l.groupDiscover),
              ...switch (all) {
                AsyncData(:final value) => [
                  for (final g in value)
                    if (!mineIds.contains(g.id)) GroupTile(group: g),
                ],
                AsyncError() => [_Note(l.commonError)],
                _ => [const _Loading()],
              },
            ],
          ),
        ),
      ),
    );
  }
}

class GroupTile extends StatelessWidget {
  const GroupTile({super.key, required this.group});

  final Group group;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final g = group;
    return InkWell(
      key: ValueKey('group-${g.id}'),
      onTap: () => context.push(GroupLinks.group(g.id)),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: p.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: p.line),
        ),
        child: Row(
          children: [
            GroupMark(group: g),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          g.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: p.ink,
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      if (g.private) ...[
                        const SizedBox(width: 4),
                        Sym(Symbols.lock_rounded, size: 15, color: p.muted),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      l.groupMembers(g.memberCount),
                      if (g.status == 'pending') l.postPending,
                    ].join(' · '),
                    style: TextStyle(color: p.muted, fontSize: 12.5),
                  ),
                ],
              ),
            ),
            Sym(
              Directionality.of(context) == TextDirection.rtl
                  ? Symbols.chevron_left_rounded
                  : Symbols.chevron_right_rounded,
              color: p.muted,
            ),
          ],
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
    child: Text(
      text,
      style: TextStyle(
        color: context.palette.muted,
        fontSize: 12.5,
        fontWeight: FontWeight.w700,
        letterSpacing: .3,
      ),
    ),
  );
}

class _Note extends StatelessWidget {
  const _Note(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
    child: Text(text, style: TextStyle(color: context.palette.muted)),
  );
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(20),
    child: Center(child: CircularProgressIndicator(color: Brand.orange)),
  );
}

/// A new group: its name, what it is about, public or private. Who may
/// create one is the admin's setting; the server says no (403) otherwise.
class CreateGroupPage extends ConsumerStatefulWidget {
  const CreateGroupPage({super.key});

  @override
  ConsumerState<CreateGroupPage> createState() => _CreateGroupPageState();
}

class _CreateGroupPageState extends ConsumerState<CreateGroupPage> {
  final _name = TextEditingController();
  final _about = TextEditingController();
  var _private = false;
  var _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _about.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() => _busy = true);
    try {
      final g = await ref
          .read(groupsApiProvider)
          .create(_name.text.trim(), _about.text.trim(), private: _private);
      ref
        ..invalidate(myGroupsProvider)
        ..invalidate(allGroupsProvider);
      if (mounted) context.pushReplacement(GroupLinks.group(g.id));
    } on ApiException catch (e) {
      if (mounted) {
        final l = context.l10n;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.code == ApiException.notAllowed || e.code == 'forbidden'
                  ? l.groupCreateNotAllowed
                  : (e.message.isEmpty ? l.commonError : e.message),
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
    final ok = _name.text.trim().length >= 3 && !_busy;
    InputDecoration field(String label) => InputDecoration(
      labelText: label,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
    );
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.groupCreate),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            key: const ValueKey('group-name'),
            controller: _name,
            maxLength: 80,
            onChanged: (_) => setState(() {}),
            decoration: field(l.groupName),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const ValueKey('group-about'),
            controller: _about,
            maxLength: 2000,
            minLines: 3,
            maxLines: 6,
            decoration: field(l.groupAbout),
          ),
          const SizedBox(height: 8),
          Material(
            color: p.card,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: p.line),
            ),
            clipBehavior: Clip.antiAlias,
            child: SwitchListTile(
              key: const ValueKey('group-private'),
              activeThumbColor: Brand.orange,
              value: _private,
              onChanged: (v) => setState(() => _private = v),
              title: Text(l.groupPrivate, style: TextStyle(color: p.ink)),
              subtitle: Text(
                _private ? l.groupPrivateLine : l.groupPublicLine,
                style: TextStyle(color: p.muted),
              ),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            key: const ValueKey('group-create-go'),
            style: FilledButton.styleFrom(
              backgroundColor: Brand.orange,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: ok ? _create : null,
            child: Text(l.groupCreate),
          ),
        ],
      ),
    );
  }
}
