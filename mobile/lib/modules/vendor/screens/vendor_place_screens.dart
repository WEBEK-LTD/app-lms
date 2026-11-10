import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/vendor_providers.dart';

/// 115.20 What a marketplace place sets itself, beside busy and paused:
/// running late (still taking orders, with more minutes and a reason
/// customers see, ending by itself), and its weekly hours, days off and
/// preparation time (its owners and managers).

/// "Running about 20 min late: high demand", as customers read it.
String vendorLateText(AppLocalizations l10n, MarketVendorDelay delay) {
  final reason = switch (delay.reason) {
    MarketDelayReason.demand => l10n.marketLateDemand,
    MarketDelayReason.couriers => l10n.marketLateCouriers,
    MarketDelayReason.weather => l10n.marketLateWeather,
    MarketDelayReason.other => delay.note ?? '',
  };
  return l10n.marketLateBanner(delay.minutes, reason);
}

const vendorLateMinutes = [10, 15, 20, 30, 45, 60];
const vendorLateFor = <int?>[30, 60, 120, null];

/// The sheet that asks how late, why and for how long; null when closed.
Future<VendorDelaySet?> askVendorLate(BuildContext context) =>
    showModalBottomSheet<VendorDelaySet>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: context.palette.surface,
      builder: (context) => const _LateSheet(),
    );

class _LateSheet extends StatefulWidget {
  const _LateSheet();

  @override
  State<_LateSheet> createState() => _LateSheetState();
}

class _LateSheetState extends State<_LateSheet> {
  int _minutes = 20;
  MarketDelayReason _reason = MarketDelayReason.demand;
  int? _for = 60;
  final _note = TextEditingController();

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final label = TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      color: p.textSecondary,
    );
    String reasonText(MarketDelayReason r) => switch (r) {
      MarketDelayReason.demand => l10n.vendorLateDemand,
      MarketDelayReason.couriers => l10n.vendorLateCouriers,
      MarketDelayReason.weather => l10n.vendorLateWeather,
      MarketDelayReason.other => l10n.vendorLateOther,
    };
    String forText(int? m) => m == null
        ? l10n.vendorLateUntilEnd
        : m < 60
        ? l10n.vendorLateForMinutes(m)
        : l10n.vendorLateForHours(m ~/ 60);
    final ready =
        _reason != MarketDelayReason.other || _note.text.trim().isNotEmpty;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.vendorLateTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.vendorLateText,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const SizedBox(height: 14),
              Text(l10n.vendorLateMinutes, style: label),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final m in vendorLateMinutes)
                    ChoiceChip(
                      key: ValueKey('vendor-late-$m'),
                      label: Text(l10n.vendorLateExtra(m)),
                      selected: _minutes == m,
                      onSelected: (_) => setState(() => _minutes = m),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Text(l10n.vendorLateReason, style: label),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final r in MarketDelayReason.values)
                    ChoiceChip(
                      key: ValueKey('vendor-late-${r.name}'),
                      label: Text(reasonText(r)),
                      selected: _reason == r,
                      onSelected: (_) => setState(() => _reason = r),
                    ),
                ],
              ),
              if (_reason == MarketDelayReason.other) ...[
                const SizedBox(height: 10),
                TextField(
                  key: const ValueKey('vendor-late-note'),
                  controller: _note,
                  maxLength: 80,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(labelText: l10n.vendorLateNote),
                ),
              ],
              const SizedBox(height: 14),
              Text(l10n.vendorLateFor, style: label),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final m in vendorLateFor)
                    ChoiceChip(
                      key: ValueKey('vendor-late-for-${m ?? 'end'}'),
                      label: Text(forText(m)),
                      selected: _for == m,
                      onSelected: (_) => setState(() => _for = m),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              PrimaryButton(
                key: const ValueKey('vendor-late-set'),
                label: l10n.vendorLateSet,
                icon: Symbols.hourglass_top_rounded,
                onPressed: ready
                    ? () => Navigator.of(context).pop(
                        VendorDelaySet(
                          minutes: _minutes,
                          reason: _reason,
                          note: _reason == MarketDelayReason.other
                              ? _note.text.trim()
                              : null,
                          forMinutes: _for,
                        ),
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The weekly days, Monday first, as the contract writes them.
const _days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

String _hhmm(TimeOfDay t) =>
    '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

TimeOfDay _timeOf(String text) {
  final parts = text.split(':');
  return TimeOfDay(
    hour: int.tryParse(parts.first) ?? 9,
    minute: int.tryParse(parts.length > 1 ? parts[1] : '') ?? 0,
  );
}

/// 115.20 The place's weekly hours, days off and preparation time, for its
/// owners and managers: saved at once, and the app's team can put them back.
class VendorHoursScreen extends ConsumerStatefulWidget {
  const VendorHoursScreen({super.key});

  @override
  ConsumerState<VendorHoursScreen> createState() => _VendorHoursScreenState();
}

class _VendorHoursScreenState extends ConsumerState<VendorHoursScreen> {
  List<MarketHours>? _hours;
  int? _prep;
  bool _saving = false;

  Future<void> _save(Future<VendorDesk> Function() call) async {
    setState(() => _saving = true);
    try {
      await call();
      ref.invalidate(vendorDeskProvider);
      if (mounted) showMessage(context, context.l10n.vendorHoursSaved);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addPeriod(String day, List<MarketHours> hours) async {
    final opens = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
    );
    if (opens == null || !mounted) return;
    final closes = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 23, minute: 0),
    );
    if (closes == null || !mounted) return;
    setState(
      () => _hours = [
        ...hours,
        MarketHours(day: day, opens: _hhmm(opens), closes: _hhmm(closes)),
      ],
    );
  }

  Future<void> _changeTime(
    List<MarketHours> hours,
    MarketHours period, {
    required bool opens,
  }) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _timeOf(opens ? period.opens : period.closes),
    );
    if (picked == null || !mounted) return;
    setState(
      () => _hours = [
        for (final h in hours)
          if (identical(h, period))
            MarketHours(
              day: h.day,
              opens: opens ? _hhmm(picked) : h.opens,
              closes: opens ? h.closes : _hhmm(picked),
            )
          else
            h,
      ],
    );
  }

  Future<void> _addDaysOff(VendorDesk desk) async {
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (range == null || !mounted) return;
    await _save(
      () => ref
          .read(yallappApiProvider)
          .updateVendorDesk(
            closedDates: [
              ...desk.closedDates,
              VendorClosedDates(
                from: isoDate(range.start),
                to: isoDate(range.end),
              ),
            ],
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final desk = ref.watch(vendorDeskProvider);
    final d = desk.value;
    final section = TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w800,
      color: p.text,
    );
    final hint = TextStyle(fontSize: 13, color: p.textSecondary);
    Widget body;
    if (d == null) {
      body = desk.error != null
          ? ErrorView(
              error: desk.error!,
              onRetry: () => ref.invalidate(vendorDeskProvider),
            )
          : const SkeletonList(layout: SkeletonLayout.text);
    } else {
      final hours = _hours ?? d.hours;
      final prep = _prep ?? d.prepMinutes;
      final changed = _hours != null || _prep != null;
      body = ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          Text(l10n.vendorHoursNote, style: hint),
          const SizedBox(height: 18),
          Text(l10n.vendorHoursWeek, style: section),
          const SizedBox(height: 4),
          Text(l10n.vendorHoursHint, style: hint),
          const SizedBox(height: 8),
          for (final (i, day) in _days.indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                key: ValueKey('vendor-day-$day'),
                padding: const EdgeInsets.fromLTRB(14, 4, 4, 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            weekdayName(i + 1),
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ),
                        if (!hours.any((h) => h.day == day))
                          Text(l10n.vendorHoursClosed, style: hint),
                        if (hours.where((h) => h.day == day).length < 2)
                          IconButton(
                            key: ValueKey('vendor-day-add-$day'),
                            tooltip: l10n.vendorHoursAdd,
                            icon: const Icon(Symbols.add),
                            onPressed: () => _addPeriod(day, hours),
                          )
                        else
                          const SizedBox(height: 48),
                      ],
                    ),
                    for (final h in hours.where((h) => h.day == day))
                      Row(
                        children: [
                          TextButton(
                            onPressed: () => _changeTime(hours, h, opens: true),
                            child: Text(h.opens),
                          ),
                          const Text('–'),
                          TextButton(
                            onPressed: () =>
                                _changeTime(hours, h, opens: false),
                            child: Text(h.closes),
                          ),
                          const Spacer(),
                          IconButton(
                            tooltip: l10n.vendorHoursRemove,
                            icon: const Icon(Symbols.close),
                            onPressed: () => setState(
                              () => _hours = [
                                for (final x in hours)
                                  if (!identical(x, h)) x,
                              ],
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 18),
          Text(l10n.vendorPrepTitle, style: section),
          const SizedBox(height: 4),
          Text(l10n.vendorPrepHint, style: hint),
          const SizedBox(height: 8),
          Row(
            children: [
              IconButton.outlined(
                key: const ValueKey('vendor-prep-less'),
                icon: const Icon(Symbols.remove),
                onPressed: prep > 5
                    ? () => setState(() => _prep = (prep - 5).clamp(5, 180))
                    : null,
              ),
              Expanded(
                child: Text(
                  l10n.restaurantMinutes(prep),
                  key: const ValueKey('vendor-prep'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              IconButton.outlined(
                key: const ValueKey('vendor-prep-more'),
                icon: const Icon(Symbols.add),
                onPressed: prep < 180
                    ? () => setState(() => _prep = (prep + 5).clamp(5, 180))
                    : null,
              ),
            ],
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            key: const ValueKey('vendor-hours-save'),
            label: l10n.vendorHoursSave,
            loading: _saving,
            onPressed: changed && !_saving
                ? () async {
                    await _save(
                      () => ref
                          .read(yallappApiProvider)
                          .updateVendorDesk(hours: _hours, prepMinutes: _prep),
                    );
                    if (mounted) {
                      setState(() {
                        _hours = null;
                        _prep = null;
                      });
                    }
                  }
                : null,
          ),
          const SizedBox(height: 28),
          Text(l10n.vendorDaysOff, style: section),
          const SizedBox(height: 4),
          Text(l10n.vendorDaysOffHint, style: hint),
          const SizedBox(height: 8),
          if (d.closedDates.isEmpty) Text(l10n.vendorDaysOffNone, style: hint),
          for (final c in d.closedDates)
            AppCard(
              key: ValueKey('vendor-off-${c.from}'),
              padding: const EdgeInsets.fromLTRB(14, 4, 4, 4),
              child: Row(
                children: [
                  Icon(Symbols.event_busy, color: p.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      c.from == c.to
                          ? isoDayLabel(c.from)
                          : '${isoDayLabel(c.from)} – ${isoDayLabel(c.to)}',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: l10n.vendorHoursRemove,
                    icon: const Icon(Symbols.delete),
                    onPressed: _saving
                        ? null
                        : () => _save(
                            () => ref
                                .read(yallappApiProvider)
                                .updateVendorDesk(
                                  closedDates: [
                                    for (final x in d.closedDates)
                                      if (x.from != c.from || x.to != c.to) x,
                                  ],
                                ),
                          ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            key: const ValueKey('vendor-off-add'),
            onPressed: _saving ? null : () => _addDaysOff(d),
            icon: const Icon(Symbols.event_busy),
            label: Text(l10n.vendorDaysOffAdd),
          ),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.vendorHoursTitle),
      ),
      body: body,
    );
  }
}
