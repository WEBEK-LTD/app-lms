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
              itemBuilder: (context, m) =>
                  _MemberTile(member: m, onCheckIn: () => _checkIn(m)),
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
                      Text(
                        l10n.checkedInBy(
                          context.time(visit.checkedInAt),
                          visit.by,
                        ),
                        style: theme.textTheme.bodySmall,
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
  const _MemberTile({required this.member, required this.onCheckIn});

  final Member member;
  final VoidCallback onCheckIn;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final m = member;
    final status = switch (m.status) {
      'active' => l10n.stateActive,
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
          const SizedBox(height: 8),
          if (m.checkedInAt != null)
            StatusChip(l10n.inAt(context.time(m.checkedInAt!)), tone: Tone.good)
          else
            FilledButton.icon(
              onPressed: onCheckIn,
              icon: const Icon(AppIcons.checkIns),
              label: Text(l10n.checkInNamed(m.name)),
            ),
        ],
      ),
    );
  }
}
