import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import 'member_check_in.dart';

/// 63 Today's check-ins of the gym (Today's tile and the scanner count them).
final memberVisitsProvider = FutureProvider.autoDispose<MemberVisits>(
  (ref) => ref.watch(apiProvider).memberCheckIns(ref.watch(appIdProvider)),
);

/// 63 Members: find one by name or phone and check them in, and who came
/// in today, the latest first.
class MembersScreen extends ConsumerStatefulWidget {
  const MembersScreen({super.key});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';
  int _version = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _changed(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  Future<void> _checkIn(Member m) async {
    try {
      final result = await ref
          .read(apiProvider)
          .checkInMember(ref.read(appIdProvider), membershipId: m.membershipId);
      ref.invalidate(memberVisitsProvider);
      if (!mounted) return;
      setState(() => _version++);
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (_) => Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          child: MemberResultCard(result: result),
        ),
      );
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  /// 64 Freezes a membership from a day, until the day it's back or until
  /// unfrozen.
  Future<void> _freeze(Member m) async {
    final chosen = await showModalBottomSheet<(DateTime, DateTime?)>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => _FreezeSheet(member: m),
    );
    if (chosen == null || !mounted) return;
    String day(DateTime d) =>
        '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    await _change(
      () => ref
          .read(apiProvider)
          .freezeMember(
            ref.read(appIdProvider),
            m.membershipId,
            from: day(chosen.$1),
            until: chosen.$2 == null ? null : day(chosen.$2!),
          ),
      context.l10n.frozenDone,
    );
  }

  Future<void> _unfreeze(Member m) => _change(
    () => ref
        .read(apiProvider)
        .unfreezeMember(ref.read(appIdProvider), m.membershipId),
    context.l10n.unfrozenDone,
  );

  Future<void> _change(Future<Member> Function() run, String done) async {
    try {
      await run();
      if (!mounted) return;
      setState(() => _version++);
      showMessage(context, done);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final appId = ref.watch(appIdProvider);
    final api = ref.watch(apiProvider);
    final visits = ref.watch(memberVisitsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.members),
        actions: [
          IconButton(
            tooltip: l10n.scanMembers,
            onPressed: () => context.push(Paths.memberScan),
            icon: const Icon(AppIcons.scan),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _search,
              onChanged: _changed,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                prefixIcon: const Icon(AppIcons.search),
                hintText: l10n.searchMembers,
              ),
            ),
          ),
          Expanded(
            child: PagedList<Member>(
              key: ValueKey('$appId-$_query-$_version'),
              header: _query.isEmpty ? _Today(visits: visits) : null,
              load: (page) async =>
                  (await api.members(appId, query: _query, page: page)).page,
              empty: EmptyState(
                icon: AppIcons.members,
                title: _query.isEmpty ? l10n.noMembers : l10n.noMembersFound,
              ),
              itemBuilder: (context, m) => _MemberTile(
                member: m,
                onCheckIn: () => _checkIn(m),
                onFreeze: () => _freeze(m),
                onUnfreeze: () => _unfreeze(m),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Today extends StatelessWidget {
  const _Today({required this.visits});

  final AsyncValue<MemberVisits> visits;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final v = visits.value;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              header: true,
              child: Text(l10n.cameInToday, style: theme.textTheme.titleSmall),
            ),
            const SizedBox(height: 4),
            if (v == null)
              const LinearProgressIndicator()
            else if (v.items.isEmpty)
              Text(l10n.nobodyInYet)
            else ...[
              Text(l10n.membersInCount(v.count)),
              const SizedBox(height: 6),
              for (final visit in v.items.take(20))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(AppIcons.checkIns, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '${visit.name} · ${visit.planName}',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                      // 64 Long names wrap instead of overflowing.
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          l10n.checkedInBy(
                            context.time(visit.checkedInAt),
                            visit.by,
                          ),
                          textAlign: TextAlign.end,
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({
    required this.member,
    required this.onCheckIn,
    required this.onFreeze,
    required this.onUnfreeze,
  });

  final Member member;
  final VoidCallback onCheckIn;
  final VoidCallback onFreeze;
  final VoidCallback onUnfreeze;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final m = member;
    final status = switch (m.status) {
      'active' => l10n.stateActive,
      'frozen' => l10n.frozen,
      'expired' => l10n.ended,
      _ => l10n.statusCancelled,
    };
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(m.name, style: theme.textTheme.titleSmall)),
              StatusChip(status, tone: StatusChip.toneOf(m.status)),
            ],
          ),
          const SizedBox(height: 2),
          Text(memberDetails(context, m), style: theme.textTheme.bodySmall),
          if (m.phone != null)
            Text(
              m.phone!,
              textDirection: TextDirection.ltr,
              style: theme.textTheme.bodySmall,
            ),
          // 64 A freeze now or to come.
          if (freezeText(context, m) case final freeze?)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  const Icon(AppIcons.freeze, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(freeze, style: theme.textTheme.bodyMedium),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (m.checkedInAt != null)
                StatusChip(
                  l10n.inAt(context.time(m.checkedInAt!)),
                  tone: Tone.good,
                )
              else if (!m.frozen)
                FilledButton.icon(
                  onPressed: onCheckIn,
                  icon: const Icon(AppIcons.checkIns),
                  label: Text(l10n.checkInNamed(m.name)),
                ),
              if (m.freezeSet)
                OutlinedButton.icon(
                  onPressed: onUnfreeze,
                  icon: const Icon(AppIcons.play),
                  label: Text(m.frozen ? l10n.unfreeze : l10n.removeFreeze),
                )
              else if (m.status == 'active')
                Semantics(
                  label: l10n.freezeNamed(m.name),
                  button: true,
                  excludeSemantics: true,
                  child: OutlinedButton.icon(
                    onPressed: onFreeze,
                    icon: const Icon(AppIcons.freeze),
                    label: Text(l10n.freeze),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 64 The first frozen day (today or later) and, if chosen, the day it's back.
class _FreezeSheet extends StatefulWidget {
  const _FreezeSheet({required this.member});

  final Member member;

  @override
  State<_FreezeSheet> createState() => _FreezeSheetState();
}

class _FreezeSheetState extends State<_FreezeSheet> {
  late DateTime _from = _today;
  DateTime? _back;

  DateTime get _today {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  Future<void> _pickFrom() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _from,
      firstDate: _today,
      lastDate: _today.add(const Duration(days: 90)),
    );
    if (picked == null) return;
    setState(() {
      _from = picked;
      if (_back != null && !_back!.isAfter(picked)) _back = null;
    });
  }

  Future<void> _pickBack() async {
    final first = _from.add(const Duration(days: 1));
    final picked = await showDatePicker(
      context: context,
      initialDate: _back ?? first.add(const Duration(days: 6)),
      firstDate: first,
      lastDate: _from.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _back = picked);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.freezeNamed(widget.member.name),
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(l10n.freezeHelp, style: theme.textTheme.bodySmall),
            const SizedBox(height: 8),
            ListTile(
              key: const ValueKey('freeze-from'),
              contentPadding: EdgeInsets.zero,
              leading: const Icon(AppIcons.reschedule),
              title: Text(l10n.freezeFrom),
              subtitle: Text(context.date(_from)),
              onTap: _pickFrom,
            ),
            ListTile(
              key: const ValueKey('freeze-back'),
              contentPadding: EdgeInsets.zero,
              leading: const Icon(AppIcons.reschedule),
              title: Text(l10n.freezeBackOn),
              subtitle: Text(
                _back == null ? l10n.freezeNoEnd : context.date(_back!),
              ),
              onTap: _pickBack,
              trailing: _back == null
                  ? null
                  : IconButton(
                      tooltip: l10n.freezeNoEnd,
                      onPressed: () => setState(() => _back = null),
                      icon: const Icon(AppIcons.close),
                    ),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop((_from, _back)),
              icon: const Icon(AppIcons.freeze),
              label: Text(l10n.freeze),
            ),
          ],
        ),
      ),
    );
  }
}
