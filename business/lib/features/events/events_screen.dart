import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final eventsScopeProvider = NotifierProvider<_Scope, String>(_Scope.new);

class _Scope extends Notifier<String> {
  @override
  String build() => 'open';
  void set(String value) => state = value;
}

final eventsProvider = FutureProvider.autoDispose<EventsList>(
  (ref) => ref
      .watch(apiProvider)
      .events(ref.watch(appIdProvider), scope: ref.watch(eventsScopeProvider)),
);

/// 59 Events with their tickets: how many are in, how many to come, and the
/// scanner for the door.
class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final scope = ref.watch(eventsScopeProvider);
    final events = ref.watch(eventsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.events)),
      floatingActionButton: app.features.checkIn
          ? FloatingActionButton.extended(
              onPressed: () => context.push(Paths.scan()),
              icon: const Icon(AppIcons.scan),
              label: Text(l10n.scanTickets),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<String>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: 'open', label: Text(l10n.eventsOpen)),
                  ButtonSegment(value: 'all', label: Text(l10n.eventsAll)),
                ],
                selected: {scope},
                onSelectionChanged: (s) =>
                    ref.read(eventsScopeProvider.notifier).set(s.first),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: pullToRefresh(
                context,
                () => ref.refresh(eventsProvider.future),
              ),
              child: AsyncBody(
                value: events,
                onRetry: () => ref.invalidate(eventsProvider),
                builder: (list) => list.items.isEmpty
                    ? EmptyState(icon: AppIcons.events, title: l10n.noEvents)
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                        itemCount: list.items.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (context, i) => _EventCard(
                          event: list.items[i],
                          canScan: app.features.checkIn,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event, required this.canScan});

  final EventSummary event;
  final bool canScan;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final total = event.capacity ?? event.issued;
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(event.title, style: theme.textTheme.titleMedium),
              ),
              if (event.status != 'published')
                StatusChip(
                  event.status == 'draft'
                      ? l10n.statusDraft
                      : l10n.statusCancelled,
                  tone: StatusChip.toneOf(event.status),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [context.dateTime(event.startAt), ?event.venue].join(' · '),
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          Semantics(
            label: l10n.ticketsInLabel(event.used, event.issued),
            child: ExcludeSemantics(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LinearProgressIndicator(
                    value: total == 0 ? 0 : event.used / total,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.ticketCounts(
                      context.number(event.used),
                      context.number(event.valid),
                      event.capacity == null
                          ? '—'
                          : context.number(event.capacity!),
                    ),
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          if (canScan && event.status == 'published') ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.push(Paths.scan(event.id)),
              icon: const Icon(AppIcons.scan),
              label: Text(l10n.scanForEvent),
            ),
          ],
        ],
      ),
    );
  }
}
