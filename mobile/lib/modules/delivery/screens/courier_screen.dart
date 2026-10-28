import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/delivery_providers.dart';
import '../widgets/delivery_widgets.dart';

/// 104 The courier's screen: on or off duty, their jobs, the jobs waiting
/// for a courier (when the company lets couriers take them) and the done
/// ones. Couriers who also send parcels switch back to the customer's
/// screens from here. Anyone else sees that it is for couriers only.
class CourierScreen extends ConsumerStatefulWidget {
  const CourierScreen({super.key});

  @override
  ConsumerState<CourierScreen> createState() => _CourierScreenState();
}

class _CourierScreenState extends ConsumerState<CourierScreen> {
  LocationSharer? _sharer;

  @override
  void dispose() {
    // Sharing stops with the screen.
    _sharer?.stop();
    super.dispose();
  }

  int _tab = 0;
  bool _switching = false;

  Future<void> _setDuty(bool onDuty) async {
    setState(() => _switching = true);
    try {
      await ref.read(yallappApiProvider).setCourierDuty(onDuty);
      ref
        ..invalidate(courierProfileProvider)
        ..invalidate(availableJobsProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _switching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final header = TabHeader(
      title: l10n.courierTitle,
      // 104.6 The courier app has no customer's screens to go back to.
      trailing: ref.watch(courierAppProvider)
          ? null
          : TextButton.icon(
              key: const ValueKey('courier-customer-view'),
              onPressed: () => context.go(Paths.home),
              icon: AppIcon(AppIcons.swap, size: 18, color: p.link),
              label: Text(l10n.customerView),
              style: TextButton.styleFrom(foregroundColor: p.link),
            ),
    );
    if (!ref.watch(isCourierProvider)) {
      // Nothing is asked of the server for someone who isn't a courier.
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: AppIcons.courier,
                  title: l10n.notCourierTitle,
                  message: l10n.notCourierMessage,
                ),
              ),
            ],
          ),
        ),
      );
    }
    final profile = ref.watch(courierProfileProvider);
    final active = ref.watch(activeJobsProvider);
    // A parcel on the way: its customer sees where the courier is while this screen is open.
    final sharing =
        active.items.any((j) => j.status.live) &&
        ref.watch(deliveryConfigProvider).tracking == DeliveryTracking.live;
    final sharer = ref.watch(locationSharerProvider);
    _sharer = sharer;
    if (sharing) {
      sharer.start();
    } else {
      sharer.stop();
    }
    final open = profile.value?.assignment == DeliveryAssignment.open;
    final tabs = [
      l10n.courierMyJobs,
      if (open) l10n.courierWaiting,
      l10n.courierDone,
    ];
    final tab = _tab.clamp(0, tabs.length - 1);
    final provider = switch ((tab, open)) {
      (0, _) => activeJobsProvider,
      (1, true) => availableJobsProvider,
      _ => doneJobsProvider,
    };
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            ...[
              switch (profile) {
                AsyncValue(value: final me?) => Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: AppCard(
                    padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                me.name,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: p.text,
                                ),
                              ),
                              Text(
                                me.onDuty
                                    ? l10n.courierDeliveredToday(
                                        me.deliveredToday,
                                      )
                                    : l10n.courierOffDutyHint,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: p.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          l10n.courierOnDuty,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: p.text,
                          ),
                        ),
                        Switch(
                          key: const ValueKey('courier-duty'),
                          value: me.onDuty,
                          onChanged: _switching ? null : _setDuty,
                        ),
                      ],
                    ),
                  ),
                ),
                AsyncValue(error: final e?) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: ErrorView(
                    error: e,
                    onRetry: () => ref.invalidate(courierProfileProvider),
                  ),
                ),
                _ => const SizedBox(height: 72),
              },
              if (sharing)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text(
                    l10n.sharingLocation,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SegmentedTabs(
                  labels: tabs,
                  selected: tab,
                  onChanged: (i) => setState(() => _tab = i),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: _JobList(
                  key: ValueKey('jobs-$tab'),
                  provider: provider,
                  empty: (tab == 1 && open)
                      ? (profile.value?.onDuty ?? false
                            ? l10n.noWaitingTitle
                            : l10n.noWaitingOffDuty)
                      : l10n.noJobsTitle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _JobList extends ConsumerWidget {
  const _JobList({super.key, required this.provider, required this.empty});

  final NotifierProvider<PagedController<CourierJob>, PagedState<CourierJob>>
  provider;
  final String empty;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(provider);
    final notifier = ref.read(provider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(layout: SkeletonLayout.text, label: l10n.loadingJobs);
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          children: [
            MessageView(
              icon: AppIcons.courier,
              title: empty,
              message: l10n.noJobsMessage,
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        itemCount: state.items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, i) => JobTile(
          job: state.items[i],
          onTap: () => context.push(Paths.courierJob(state.items[i].id)),
        ),
      ),
    );
  }
}
