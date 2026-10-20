import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 61 Change time: the free times of the appointment's service a week at a
/// time, as booking in the app offers them (the dashboard's Change time, the
/// same rule on the server). The customer is told when it moves.
class RescheduleScreen extends ConsumerStatefulWidget {
  const RescheduleScreen({
    super.key,
    required this.appointmentId,
    this.appointment,
  });

  final int appointmentId;

  /// The appointment as listed, for its summary (missing from a deep link).
  final Appointment? appointment;

  @override
  ConsumerState<RescheduleScreen> createState() => _RescheduleScreenState();
}

class _RescheduleScreenState extends ConsumerState<RescheduleScreen> {
  static const _days = 7;

  /// The first local day shown; null is today.
  String? _from;

  /// Whose times; null is anyone free.
  int? _staffId;
  RescheduleTimes? _times;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _times = null;
      _error = null;
    });
    try {
      final times = await ref
          .read(apiProvider)
          .rescheduleTimes(
            ref.read(appIdProvider),
            widget.appointmentId,
            from: _from,
            days: _days,
            staffId: _staffId,
          );
      if (mounted) setState(() => _times = times);
    } on Object catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  static String _shift(String date, int days) {
    final d = DateTime.parse(date);
    final next = DateTime.utc(d.year, d.month, d.day + days);
    return '${next.year.toString().padLeft(4, '0')}-${next.month.toString().padLeft(2, '0')}-${next.day.toString().padLeft(2, '0')}';
  }

  Future<void> _move(FreeSlot slot, String date) async {
    final l10n = context.l10n;
    final a = widget.appointment;
    final when = l10n.moveWhen(context.day(date), slot.localTime);
    final ok = await confirm(
      context,
      title: l10n.moveConfirmTitle(when),
      text: l10n.moveConfirmText(a?.customerName ?? l10n.theCustomer),
      action: l10n.moveAction,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiProvider)
          .reschedule(
            ref.read(appIdProvider),
            widget.appointmentId,
            start: slot.start,
            staffId: _staffId,
          );
      if (!mounted) return;
      showMessage(context, l10n.movedTo(when));
      context.pop(true);
    } on Object catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      showError(context, e);
      // Someone took it meanwhile: show the times as they are now.
      if (e is ApiException && e.code == 'slot_taken') await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final a = widget.appointment;
    final times = _times;
    final Widget body;
    if (times == null) {
      body = _error == null
          ? const LoadingState()
          : ErrorState(error: _error!, onRetry: _load);
    } else {
      final open = times.days.where((d) => d.slots.isNotEmpty).toList();
      final first = times.days.isEmpty ? null : times.days.first.date;
      body = ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          if (a != null)
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a.customerName, style: theme.textTheme.titleSmall),
                  Text(
                    '${a.service} · ${a.staff}',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 6),
                  Text(l10n.moveNow(context.day(a.localDate), a.localTime)),
                ],
              ),
            ),
          const SizedBox(height: 12),
          Text(
            l10n.moveIntro(times.timeZone),
            style: theme.textTheme.bodySmall,
          ),
          if (times.staff.length > 1) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ChoiceChip(
                  label: Text(l10n.anyoneFree),
                  selected: _staffId == null,
                  onSelected: (_) {
                    _staffId = null;
                    _load();
                  },
                ),
                for (final s in times.staff)
                  ChoiceChip(
                    label: Text(s.name),
                    selected: _staffId == s.id,
                    onSelected: (_) {
                      _staffId = s.id;
                      _load();
                    },
                  ),
              ],
            ),
          ],
          if (open.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(l10n.noFreeTimes, textAlign: TextAlign.center),
            ),
          for (final day in open) ...[
            SectionTitle(context.day(day.date)),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final slot in day.slots)
                  OutlinedButton(
                    onPressed:
                        _busy ||
                            (a != null &&
                                slot.start.isAtSameMomentAs(a.startAt) &&
                                (_staffId == null ||
                                    a.staff == _staffName(times)))
                        ? null
                        : () => _move(slot, day.date),
                    child: Text(slot.localTime),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          if (first != null)
            Row(
              children: [
                if (_from != null)
                  TextButton(
                    onPressed: () {
                      final back = _shift(first, -_days);
                      final today = _times?.days.first.date;
                      _from = today != null && back.compareTo(today) < 0
                          ? null
                          : back;
                      _load();
                    },
                    child: Text(l10n.previousDays),
                  ),
                const Spacer(),
                TextButton(
                  onPressed: () {
                    _from = _shift(first, _days);
                    _load();
                  },
                  child: Text(l10n.nextDays),
                ),
              ],
            ),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(l10n.changeTime)),
      body: body,
    );
  }

  String? _staffName(RescheduleTimes times) =>
      times.staff.where((s) => s.id == _staffId).firstOrNull?.name;
}

/// The appointment card's "Change time" button.
class ChangeTimeButton extends StatelessWidget {
  const ChangeTimeButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    onPressed: onPressed,
    icon: const Icon(AppIcons.reschedule, size: 20),
    label: Text(context.l10n.changeTime),
  );
}
