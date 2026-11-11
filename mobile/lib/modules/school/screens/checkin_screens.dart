import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/data/delivery_providers.dart'
    show LocateProblem, locatorProvider;
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';
import '../../../core/widgets/studio_screen_scope.dart';

/// 113.2 Checking in and out at the school, for students, teachers and
/// staff: with the gate's code (the six digits on the school's screen at
/// the gate; the app has no camera scanner, the code is typed), inside the
/// school's area (the phone's location), either or both, as the school
/// chooses; today's times and the month's days.

/// A day's state in words and tone.
(String, PillTone) checkinStateLabel(AppLocalizations l10n, CheckinState s) =>
    switch (s) {
      CheckinState.notYet => (l10n.checkinStateNotYet, PillTone.neutral),
      CheckinState.checkedIn => (l10n.checkinStateIn, PillTone.good),
      CheckinState.left => (l10n.checkinStateLeft, PillTone.neutral),
      CheckinState.absent => (l10n.checkinStateAbsent, PillTone.bad),
      CheckinState.excused => (l10n.checkinStateExcused, PillTone.warn),
      CheckinState.leave => (l10n.checkinStateLeave, PillTone.warn),
      CheckinState.off => (l10n.checkinStateOff, PillTone.neutral),
    };

/// The day's in and out times, late and leaving early.
String checkinDayLine(AppLocalizations l10n, CheckinDay day) => [
  if (day.inTime != null) l10n.checkinInAt(day.inTime!),
  if (day.outTime != null) l10n.checkinOutAt(day.outTime!),
  if (day.late) l10n.checkinLate,
  if (day.leftEarly) l10n.checkinLeftEarly,
].join(' · ');

/// Today at the gate on the School, Classroom and Staff tabs: its state and
/// a button to the check-in screen. Nothing when the school doesn't take
/// check-ins in the app.
class CheckinCard extends ConsumerWidget {
  const CheckinCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(checkinOnProvider)) return const SizedBox.shrink();
    final p = context.palette;
    final l10n = context.l10n;
    final today = ref.watch(checkinTodayProvider).value;
    final day = today?.today;
    final (label, tone) = checkinStateLabel(
      l10n,
      day?.state ?? CheckinState.notYet,
    );
    final line = day == null ? '' : checkinDayLine(l10n, day);
    final canIn = day != null && !day.isIn && today!.schoolDay;
    final canOut = day != null && day.isIn && !day.isOut;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: AppCard(
        key: const ValueKey('checkin-card'),
        padding: const EdgeInsets.all(14),
        onTap: () => context.push(Paths.checkin),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                AppIcon(AppIcons.qrCode, size: 22, color: p.text),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l10n.checkinCardTitle,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                ),
                SchoolPill(label: label, tone: tone),
              ],
            ),
            if (line.isNotEmpty || today != null) ...[
              const SizedBox(height: 6),
              Text(
                [
                  if (line.isNotEmpty) line,
                  if (today != null)
                    l10n.checkinTimes(
                      today.times.starts,
                      today.times.ends,
                      today.times.lateFrom,
                    ),
                ].join('\n'),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ],
            if (canIn || canOut) ...[
              const SizedBox(height: 12),
              PrimaryButton(
                key: const ValueKey('checkin-open'),
                label: canIn ? l10n.checkinButton : l10n.checkoutButton,
                icon: canIn ? AppIcons.checkIn : AppIcons.checkOut,
                height: 46,
                onPressed: () => context.push(Paths.checkin),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class CheckinScreen extends ConsumerStatefulWidget {
  const CheckinScreen({super.key});

  @override
  ConsumerState<CheckinScreen> createState() => _CheckinScreenState();
}

class _CheckinScreenState extends ConsumerState<CheckinScreen> {
  final _code = TextEditingController();
  bool _sending = false;
  bool _locating = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  /// Checks in or out with what the school asks: the code typed, the
  /// phone's position (read only now), or both.
  Future<void> _send(CheckinToday today, {required bool withLocation}) async {
    final l10n = context.l10n;
    final action = today.today.isIn ? 'out' : 'in';
    final methods = today.methods;
    final code = _code.text.trim();
    final sendCode = switch (methods) {
      CheckinMethods.qr || CheckinMethods.both => true,
      CheckinMethods.either => !withLocation,
      CheckinMethods.location => false,
    };
    final needsPlace = switch (methods) {
      CheckinMethods.location || CheckinMethods.both => true,
      CheckinMethods.either => withLocation,
      CheckinMethods.qr => false,
    };
    if (sendCode && code.isEmpty) {
      showMessage(context, l10n.checkinCodeHint);
      return;
    }
    setState(() => _sending = true);
    try {
      double? lat;
      double? lng;
      if (needsPlace) {
        setState(() => _locating = true);
        final found = await ref.read(locatorProvider).current();
        if (!mounted) return;
        setState(() => _locating = false);
        final position = found.position;
        if (position == null) {
          showMessage(context, switch (found.problem) {
            LocateProblem.off => l10n.checkinLocationOff,
            LocateProblem.denied => l10n.checkinLocationDenied,
            _ => l10n.checkinLocationFailed,
          });
          return;
        }
        lat = position.lat;
        lng = position.lng;
      }
      final result = await ref
          .read(yallappApiProvider)
          .checkIn(
            action: action,
            code: sendCode ? code : null,
            lat: lat,
            lng: lng,
          );
      if (!mounted) return;
      _code.clear();
      showMessage(context, switch (result.result) {
        CheckinOutcome.onTime => l10n.checkinDoneOnTime(result.time),
        CheckinOutcome.late => l10n.checkinDoneLate(result.time),
        CheckinOutcome.out => l10n.checkinDoneOut(result.time),
        CheckinOutcome.leftEarly => l10n.checkinDoneEarly(result.time),
      });
      ref
        ..invalidate(checkinTodayProvider)
        ..invalidate(checkinHistoryProvider(null));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
          _locating = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(leading: appBarBack(context), title: Text(l10n.checkinTitle)),
      ),
      body: SafeArea(
        top: false,
        child: switch (ref.watch(checkinTodayProvider)) {
          AsyncValue(value: final today?) => RefreshIndicator(
            onRefresh: () async => ref
              ..invalidate(checkinTodayProvider)
              ..invalidate(checkinHistoryProvider(null)),
            child: ListView(
              key: const ValueKey('checkin'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                _Today(today: today),
                const SizedBox(height: 16),
                if (!today.on)
                  _Note(text: l10n.checkinOff)
                else if (!today.schoolDay && !today.today.isIn)
                  _Note(text: l10n.checkinNotSchoolDay)
                else if (!today.today.isOut &&
                    today.today.state != CheckinState.excused &&
                    today.today.state != CheckinState.absent)
                  _Actions(
                    today: today,
                    code: _code,
                    sending: _sending,
                    locating: _locating,
                    onSend: (withLocation) =>
                        _send(today, withLocation: withLocation),
                  ),
                const SizedBox(height: 24),
                SectionHeader(title: l10n.checkinMonth, size: 16),
                const SizedBox(height: 4),
                switch (ref.watch(checkinHistoryProvider(null))) {
                  AsyncValue(value: final month?) => CheckinMonthView(
                    month: month,
                  ),
                  AsyncValue(error: final e?) => ErrorView(
                    error: e,
                    onRetry: () => ref.invalidate(checkinHistoryProvider(null)),
                  ),
                  _ => const SizedBox(height: 60),
                },
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(checkinTodayProvider),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _Today extends StatelessWidget {
  const _Today({required this.today});

  final CheckinToday today;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final day = today.today;
    final (label, tone) = checkinStateLabel(l10n, day.state);
    final line = checkinDayLine(l10n, day);
    return AppCard(
      key: const ValueKey('checkin-today'),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  isoDayLabel(today.date),
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              SchoolPill(label: label, tone: tone),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            l10n.checkinTimes(
              today.times.starts,
              today.times.ends,
              today.times.lateFrom,
            ),
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
          if (line.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              line,
              key: const ValueKey('checkin-line'),
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    key: const ValueKey('checkin-note'),
    style: TextStyle(fontSize: 14, color: context.palette.textSecondary),
  );
}

/// The code field and the buttons the school's methods call for.
class _Actions extends StatelessWidget {
  const _Actions({
    required this.today,
    required this.code,
    required this.sending,
    required this.locating,
    required this.onSend,
  });

  final CheckinToday today;
  final TextEditingController code;
  final bool sending;
  final bool locating;
  final void Function(bool withLocation) onSend;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final methods = today.methods;
    final out = today.today.isIn;
    final label = out ? l10n.checkoutButton : l10n.checkinButton;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (methods == CheckinMethods.both) ...[
          Text(
            l10n.checkinBothNote,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
          const SizedBox(height: 12),
        ],
        if (methods.usesCode) ...[
          Semantics(
            textField: true,
            label: l10n.checkinCodeLabel,
            child: TextField(
              key: const ValueKey('checkin-code'),
              controller: code,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: 8,
                color: p.text,
              ),
              decoration: InputDecoration(
                labelText: l10n.checkinCodeLabel,
                helperText: l10n.checkinCodeHint,
                counterText: '',
              ),
            ),
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            key: const ValueKey('checkin-send'),
            label: label,
            icon: out ? AppIcons.checkOut : AppIcons.checkIn,
            loading: sending && !locating,
            height: 52,
            onPressed: sending ? null : () => onSend(false),
          ),
        ],
        if (methods == CheckinMethods.location) ...[
          PrimaryButton(
            key: const ValueKey('checkin-send'),
            label: label,
            icon: AppIcons.myLocation,
            loading: sending,
            height: 52,
            onPressed: sending ? null : () => onSend(true),
          ),
        ],
        if (methods == CheckinMethods.either) ...[
          const SizedBox(height: 8),
          SecondaryButton(
            key: const ValueKey('checkin-location'),
            label: l10n.checkinWithLocation,
            icon: AppIcons.myLocation,
            height: 48,
            onPressed: sending ? null : () => onSend(true),
          ),
        ],
        if (locating) ...[
          const SizedBox(height: 8),
          Text(
            l10n.checkinLocating,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ],
    );
  }
}

/// A month at the gate: its counts and each day (newest first), with the
/// school's corrections.
class CheckinMonthView extends StatelessWidget {
  const CheckinMonthView({super.key, required this.month});

  final CheckinMonth month;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final counts = [
      ('present', l10n.checkinCountPresent),
      ('late', l10n.checkinLate),
      ('left_early', l10n.checkinLeftEarly),
      ('absent', l10n.checkinCountAbsent),
    ];
    return Column(
      key: const ValueKey('checkin-month'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            for (final (key, label) in counts) ...[
              Expanded(
                child: AppCard(
                  key: ValueKey('checkin-count-$key'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 10,
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${month.count(key)}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                      Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
              if (key != 'absent') const SizedBox(width: 6),
            ],
          ],
        ),
        const SizedBox(height: 12),
        if (month.days.isEmpty)
          Text(
            l10n.checkinNoDays,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          )
        else
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Column(
              children: [
                for (final day in month.days)
                  ListTile(
                    key: ValueKey('checkin-day-${day.date}'),
                    contentPadding: EdgeInsets.zero,
                    title: Text(isoDayLabel(day.date)),
                    subtitle: _dayDetail(l10n, day),
                    trailing: SchoolPill(
                      label: checkinStateLabel(l10n, day.state).$1,
                      tone: checkinStateLabel(l10n, day.state).$2,
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }

  Widget? _dayDetail(AppLocalizations l10n, CheckinDay day) {
    final text = [
      checkinDayLine(l10n, day),
      for (final c in day.corrections) l10n.checkinCorrected(c.reason),
    ].where((t) => t.isNotEmpty).join('\n');
    return text.isEmpty ? null : Text(text);
  }
}

/// 113.2 A student's month at the gate on their attendance, for them and
/// their parents; nothing when the school doesn't take check-ins.
class StudentGateDays extends ConsumerWidget {
  const StudentGateDays({super.key, required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(checkinOnProvider)) return const SizedBox.shrink();
    return switch (ref.watch(studentCheckinsProvider(studentId))) {
      AsyncValue(value: final month?) => Column(
        key: const ValueKey('student-gate-days'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),
          SectionHeader(title: context.l10n.checkinAtGate, size: 16),
          const SizedBox(height: 4),
          CheckinMonthView(month: month),
        ],
      ),
      _ => const SizedBox.shrink(),
    };
  }
}
