import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import '../food/food_sheets.dart';
import '../studio/studio_widgets.dart';

Tone shipmentTone(Shipment s) => switch (s.status) {
  'pending' => Tone.warn,
  'assigned' || 'accepted' || 'picked_up' || 'on_the_way' => Tone.info,
  'delivered' => Tone.good,
  'failed' || 'cancelled' => Tone.bad,
  _ => Tone.neutral,
};

/// 125 Shipments (the Shipments board): who is on duty, on the way and
/// waiting; a waiting shipment is given to the closest courier.
class ShipmentsScreen extends ConsumerStatefulWidget {
  const ShipmentsScreen({super.key, this.initialFilter});

  final String? initialFilter;

  @override
  ConsumerState<ShipmentsScreen> createState() => _ShipmentsScreenState();
}

class _ShipmentsScreenState extends ConsumerState<ShipmentsScreen> {
  static const filters = ['waiting', 'active', 'done', 'problems'];
  late int _filter = filters.indexOf(widget.initialFilter ?? '').clamp(0, 3);
  int _version = 0;
  bool _searching = false;
  String? _query;
  Map<String, int> _counts = const {};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final api = ref.watch(apiProvider);
    final filter = filters[_filter];
    String n(String key) => context.number(_counts[key] ?? 0);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            StudioHeader(
              title: l10n.shipmentsTitle,
              actions: [
                IconButton(
                  tooltip: l10n.searchAction,
                  icon: const Icon(AppIcons.search),
                  onPressed: () => setState(() => _searching = !_searching),
                ),
                HeaderLink(
                  icon: AppIcons.couriers,
                  label: l10n.couriersTitle,
                  onPressed: () => context.push(Paths.couriers),
                ),
              ],
            ),
            if (_searching)
              SearchBarField(
                hint: l10n.searchShipmentsHint,
                onSubmitted: (q) => setState(() {
                  _query = q;
                  _version++;
                }),
                onClose: () => setState(() {
                  _searching = false;
                  if (_query != null) _version++;
                  _query = null;
                }),
              ),
            CountRow(
              tiles: [
                CountTile(value: n('on_duty'), label: l10n.onDuty),
                CountTile(value: n('on_the_way'), label: l10n.onTheWay),
                CountTile(
                  value: n('waiting'),
                  label: l10n.filterWaiting,
                  tone: Tone.warn,
                ),
              ],
            ),
            FilterTabs(
              labels: [
                l10n.filterWaiting,
                l10n.filterActive,
                l10n.filterDone,
                l10n.filterProblems,
              ],
              selected: _filter,
              onSelected: (i) => setState(() => _filter = i),
            ),
            Expanded(
              child: PagedList<Shipment>(
                key: ValueKey('${app.id}-$filter-$_query-$_version'),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                spacing: 12,
                load: (page) async {
                  final result = await api.shipments(
                    app.id,
                    filter: filter,
                    query: _query,
                    page: page,
                  );
                  if (mounted && result.counts.isNotEmpty) {
                    setState(() => _counts = result.counts);
                  }
                  return result;
                },
                empty: EmptyState(
                  icon: AppIcons.shipments,
                  title: l10n.noShipments,
                  text: l10n.noShipmentsText,
                ),
                itemBuilder: (context, s) => ShipmentCard(
                  shipment: s,
                  onChanged: () => setState(() => _version++),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ShipmentCard extends ConsumerWidget {
  const ShipmentCard({
    super.key,
    required this.shipment,
    required this.onChanged,
  });

  final Shipment shipment;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final s = shipment;
    final food = s.foodOrder;
    final collect = s.collect;
    return Box(
      onTap: () async {
        if (s.needsCourier && s.assignable) {
          final done = await giveToCourier(context, ref, s);
          if (done != null) onChanged();
        } else {
          await context.push(Paths.shipment(s.id));
          onChanged();
        }
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                s.reference,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Tag(
                  s.needsCourier ? l10n.needsCourier : s.statusLabel,
                  tone: shipmentTone(s),
                ),
              ),
              const Spacer(),
              if (s.waitingMinutes != null)
                Text(
                  l10n.minutesShort(s.waitingMinutes!),
                  style: TextStyle(fontSize: 13, color: c.ink2),
                ),
            ],
          ),
          const SizedBox(height: 8),
          IconLine(
            AppIcons.origin,
            [
              s.pickup.name,
              s.pickup.address,
            ].where((t) => t.isNotEmpty).map(isolate).join(' · '),
          ),
          const SizedBox(height: 8),
          IconLine(
            AppIcons.location,
            [
              isolate(s.dropoff.address),
              if (s.distanceKm != null) km(context, s.distanceKm!),
            ].join(' · '),
          ),
          if (food != null || collect != null || s.courier != null) ...[
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(
                style: const TextStyle(fontSize: 14),
                children: [
                  if (food != null)
                    TextSpan(
                      text: l10n.shipFoodOrder(food.reference),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    )
                  else if (s.courier != null)
                    TextSpan(
                      text: s.courier!.name,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  if (collect != null)
                    TextSpan(
                      text:
                          '${food != null || s.courier != null ? ' · ' : ''}${l10n.shipCollect(isolate(collect.formatted))}',
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// "Give S-2031 to": couriers on duty, closest first, then the one chosen.
Future<ShipmentDetail?> giveToCourier(
  BuildContext context,
  WidgetRef ref,
  Shipment shipment,
) async {
  final appId = ref.read(appIdProvider);
  final api = ref.read(apiProvider);
  final chosen = await showFootSheet<Courier>(
    context,
    (sheet) => _CourierPicker(
      shipment: shipment,
      load: () => api.couriers(appId, shipmentId: shipment.id),
    ),
  );
  if (chosen == null || !context.mounted) return null;
  try {
    final after = await api.assignShipment(appId, shipment.id, chosen.id);
    if (context.mounted) {
      showMessage(
        context,
        context.l10n.shipmentGiven(shipment.reference, chosen.name),
      );
    }
    return after;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

/// What a courier is doing, in a few words.
String courierState(BuildContext context, Courier c) {
  final l10n = context.l10n;
  return switch (c.state) {
    'busy' => l10n.jobsNow(c.activeJobs),
    'free' => l10n.courierFree,
    'paused' => l10n.courierPaused,
    _ => l10n.courierOff,
  };
}

class _CourierPicker extends StatefulWidget {
  const _CourierPicker({required this.shipment, required this.load});

  final Shipment shipment;
  final Future<List<Courier>> Function() load;

  @override
  State<_CourierPicker> createState() => _CourierPickerState();
}

class _CourierPickerState extends State<_CourierPicker> {
  late Future<List<Courier>> _couriers = widget.load();
  Courier? _chosen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.7,
      ),
      child: FutureBuilder<List<Courier>>(
        future: _couriers,
        builder: (context, snapshot) {
          final header = [
            Semantics(
              header: true,
              child: Text(
                l10n.giveTo(widget.shipment.reference),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              l10n.closestFirst,
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
            const SizedBox(height: 10),
          ];
          if (snapshot.hasError) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ...header,
                SizedBox(
                  height: 220,
                  child: ErrorState(
                    error: snapshot.error!,
                    onRetry: () => setState(() => _couriers = widget.load()),
                  ),
                ),
              ],
            );
          }
          if (!snapshot.hasData) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [...header, const LoadingState()],
            );
          }
          final onDuty = [
            for (final x in snapshot.data!)
              if (x.onDuty && x.active) x,
          ];
          final chosen = _chosen ?? onDuty.firstOrNull;
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ...header,
              if (onDuty.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(l10n.noCouriersOnDuty),
                )
              else
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final x in onDuty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: PersonChoice(
                            initials: x.initials.isEmpty
                                ? initialsOf(x.name)
                                : x.initials,
                            name: x.name,
                            line: [
                              if (x.distanceKm != null)
                                kmAway(context, x.distanceKm!),
                              courierState(context, x),
                            ].join(' · '),
                            dot: x.state == 'free' ? c.success : c.warning,
                            chosen: x.id == chosen?.id,
                            onTap: () => setState(() => _chosen = x),
                          ),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 4),
              BigButton(
                label: chosen == null
                    ? l10n.giveCourier
                    : l10n.giveItTo(chosen.name.split(' ').first),
                onPressed: chosen == null
                    ? null
                    : () => Navigator.pop(context, chosen),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// A person to give a job to: initials, name, a line, a dot; the chosen one
/// has a 2-point border.
class PersonChoice extends StatelessWidget {
  const PersonChoice({
    super.key,
    required this.initials,
    required this.name,
    required this.line,
    required this.dot,
    required this.chosen,
    required this.onTap,
  });

  final String initials;
  final String name;
  final String line;
  final Color dot;
  final bool chosen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Semantics(
      selected: chosen,
      button: true,
      child: Material(
        color: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: chosen
              ? BorderSide(color: c.ink, width: 2)
              : BorderSide(color: c.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Initials(initials),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(line, style: TextStyle(fontSize: 13, color: c.ink2)),
                    ],
                  ),
                ),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

final couriersProvider = FutureProvider.autoDispose<List<Courier>>(
  (ref) => ref.watch(apiProvider).couriers(ref.watch(appIdProvider)),
);

/// 125 Every courier: on duty first, their jobs, a call.
class CouriersScreen extends ConsumerWidget {
  const CouriersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.couriersTitle)),
      body: AsyncBody(
        value: ref.watch(couriersProvider),
        onRetry: () => ref.invalidate(couriersProvider),
        builder: (items) => items.isEmpty
            ? EmptyState(icon: AppIcons.couriers, title: l10n.noCouriers)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(couriersProvider.future),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    for (final x in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Box(
                          padding: const EdgeInsets.all(12),
                          radius: 16,
                          child: Row(
                            children: [
                              Initials(
                                x.initials.isEmpty
                                    ? initialsOf(x.name)
                                    : x.initials,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      x.name,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      [
                                        if (x.onDuty) l10n.onDuty,
                                        courierState(context, x),
                                      ].join(' · '),
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: c.ink2,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (x.phone != null)
                                IconButton(
                                  tooltip: l10n.call,
                                  icon: const Icon(AppIcons.phone),
                                  onPressed: () =>
                                      callNumber(context, ref, x.phone),
                                ),
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: switch (x.state) {
                                    'free' => c.success,
                                    'busy' => c.warning,
                                    _ => c.outline,
                                  },
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
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
