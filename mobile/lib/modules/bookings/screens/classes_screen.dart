import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/bookings_providers.dart';
import '../widgets/booking_widgets.dart';
import '../../../core/format/bidi.dart';

/// 27 A gym's or studio's weekly timetable: a week of day tabs, each day's
/// classes with their coach and the spots left, and Book or Cancel.
class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key, this.today});

  /// The first day shown (tests); today by default.
  final DateTime? today;

  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen> {
  late final DateTime _today;
  late DateTime _weekStart;
  late DateTime _day;

  /// The class being booked or given back.
  int? _busy;

  @override
  void initState() {
    super.initState();
    final now = widget.today ?? DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _weekStart = _today;
    _day = _today;
  }

  ClassesQuery get _query =>
      (from: isoDate(_weekStart), to: isoDate(addDays(_weekStart, 6)));

  void _moveWeek(int weeks) => setState(() {
    _weekStart = addDays(_weekStart, 7 * weeks);
    if (_weekStart.isBefore(_today)) _weekStart = _today;
    _day = _weekStart;
  });

  bool get _signedIn => ref.read(authControllerProvider).isSignedIn;

  void _signIn() => context.push(
    Uri(
      path: Paths.signIn,
      queryParameters: {'from': Paths.classes},
    ).toString(),
  );

  Future<void> _book(ClassSession session) async {
    if (!_signedIn) return _signIn();
    setState(() => _busy = session.id);
    try {
      await ref.read(yallappApiProvider).bookClass(session.id);
      if (!mounted) return;
      invalidateClasses(ref);
      showMessage(context, context.l10n.classBooked(session.serviceName));
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == ApiException.membershipRequired ||
          e.code == ApiException.noCredits) {
        // Straight to the plans: that's what the member needs.
        _showWithPlans(e.message);
      } else {
        if (e.code == ApiException.classFull) invalidateClasses(ref);
        showMessage(context, e.message);
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  void _showWithPlans(String message) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          action: SnackBarAction(
            label: context.l10n.membershipSeePlans,
            onPressed: () => context.go(Paths.memberships),
          ),
        ),
      );
  }

  Future<void> _cancel(ClassSession session) async {
    final ok = await confirmAction(
      context,
      title: context.l10n.classCancelTitle,
      message: context.l10n.classCancelMessage(
        session.serviceName,
        _when(session),
      ),
      confirmLabel: context.l10n.classGiveBack,
      destructive: true,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = session.id);
    try {
      await ref.read(yallappApiProvider).cancelClass(session.id);
      if (!mounted) return;
      invalidateClasses(ref);
      showMessage(context, context.l10n.classSpotCancelled);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  String _when(ClassSession session) {
    final day = parseIsoDate(session.localDate);
    return day == null
        ? context.l10n.dayAtTime(session.localDate, session.localTime)
        : context.l10n.dayAtTime(shortDayLabel(day), session.localTime);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final config = ref.watch(appConfigProvider).bookings?.classes;
    final header = Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Semantics(
        header: true,
        child: Text(
          context.words.classes,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
      ),
    );
    if (config == null) {
      return Scaffold(
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: AppIcons.fitness,
                  title: context.l10n.classesNoTimetable,
                  message: context.l10n.classesNoTimetableMessage(
                    ref.watch(appConfigProvider).site.name,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final classes = ref.watch(classesProvider(_query));
    final days = [for (var i = 0; i < 7; i++) addDays(_weekStart, i)];
    final Widget body = classes.when(
      loading: () => SkeletonList(count: 4, label: context.l10n.classesLoading),
      error: (e, _) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(classesProvider(_query)),
      ),
      data: (list) {
        final today = list.items
            .where((c) => c.localDate == isoDate(_day))
            .toList();
        if (today.isEmpty) {
          // 110 The next day of the week with a class, else the next week.
          final next = [
            for (final d in days)
              if (d.isAfter(_day) &&
                  list.items.any((c) => c.localDate == isoDate(d)))
                d,
          ].firstOrNull;
          final canMove = addDays(_weekStart, 7).difference(_today).inDays < 56;
          return MessageView(
            icon: AppIcons.calendar,
            title: context.l10n.classesNone,
            message: context.l10n.classesNoneMessage,
            compact: true,
            actionLabel: next != null
                ? context.l10n.classesNextClass
                : canMove
                ? context.l10n.nextWeek
                : null,
            onAction: next != null
                ? () => setState(() => _day = next)
                : () => _moveWeek(1),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(classesProvider(_query)),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemCount: today.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) => ClassCard(
              session: today[i],
              busy: _busy == today[i].id,
              onBook: _busy == null ? () => _book(today[i]) : null,
              onCancel: _busy == null ? () => _cancel(today[i]) : null,
            ),
          ),
        );
      },
    );

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Row(
                children: [
                  SquareIconButton(
                    icon: AppIcons.back,
                    label: context.l10n.previousWeek,
                    onPressed: _weekStart.isAfter(_today)
                        ? () => _moveWeek(-1)
                        : null,
                    size: 40,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: _DayTabs(
                      days: days,
                      selected: _day,
                      onChanged: (d) => setState(() => _day = d),
                    ),
                  ),
                  const SizedBox(width: 4),
                  SquareIconButton(
                    icon: AppIcons.forward,
                    label: context.l10n.nextWeek,
                    // The gym's classes are made eight weeks ahead.
                    onPressed:
                        addDays(_weekStart, 7).difference(_today).inDays < 56
                        ? () => _moveWeek(1)
                        : null,
                    size: 40,
                  ),
                ],
              ),
            ),
            if (config.membershipRequired && _signedIn)
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 4, 20, 4),
                child: MembershipSummary(),
              ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

/// The week's days as tabs: weekday and day of the month.
class _DayTabs extends StatelessWidget {
  const _DayTabs({
    required this.days,
    required this.selected,
    required this.onChanged,
  });

  final List<DateTime> days;
  final DateTime selected;
  final ValueChanged<DateTime> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        for (final day in days)
          Expanded(
            child: Builder(
              builder: (context) {
                final isSelected = day == selected;
                final fg = isSelected ? p.onPrimary : p.text;
                return Semantics(
                  button: true,
                  selected: isSelected,
                  label: dayLabel(day),
                  excludeSemantics: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: InkWell(
                      onTap: () => onChanged(day),
                      borderRadius: BorderRadius.circular(
                        context.shapes.button,
                      ),
                      child: Container(
                        // 110 Room for the name inside the rounded edge.
                        padding: const EdgeInsets.symmetric(
                          vertical: 8,
                          horizontal: 3,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected ? p.primary : null,
                          borderRadius: BorderRadius.circular(
                            context.shapes.button,
                          ),
                          border: isSelected
                              ? null
                              : Border.all(color: p.border),
                        ),
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Column(
                            children: [
                              Text(
                                chipWeekday(day),
                                style: TextStyle(fontSize: 12, color: fg),
                              ),
                              Text(
                                '${day.day}',
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                  color: fg,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}

/// One class: its start and length, name, coach, spots left, and Book or
/// Cancel.
class ClassCard extends StatelessWidget {
  const ClassCard({
    super.key,
    required this.session,
    required this.onBook,
    required this.onCancel,
    this.busy = false,
  });

  final ClassSession session;
  final VoidCallback? onBook;
  final VoidCallback? onCancel;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final color = _hexColor(session.color) ?? p.primary;
    final (String status, Color statusColor) = session.cancelled
        ? (l10n.classCancelledLabel, p.danger)
        : session.booked
        ? (l10n.classBookedLabel, p.success)
        : session.full
        ? (l10n.classFull, p.danger)
        : (l10n.classSpotsLeft(session.spotsLeft), p.textSecondary);
    final Widget action;
    if (busy) {
      action = const SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(strokeWidth: 2.5),
      );
    } else if (session.cancelled) {
      action = const SizedBox.shrink();
    } else if (session.booked) {
      action = session.canCancel
          ? _SmallButton(
              label: l10n.classCancel,
              semanticLabel: l10n.classCancelName(session.serviceName),
              onPressed: onCancel,
              outlined: true,
            )
          : const SizedBox.shrink();
    } else {
      action = _SmallButton(
        label: l10n.classBook,
        semanticLabel: l10n.classBookName(session.serviceName),
        onPressed: session.full ? null : onBook,
      );
    }
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 56,
            decoration: BoxDecoration(
              color: session.cancelled ? p.border : color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 52,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.localTime,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                Text(
                  formatMinutes(session.durationMinutes),
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.serviceName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                    decoration: session.cancelled
                        ? TextDecoration.lineThrough
                        : null,
                  ),
                ),
                if (session.staff != null) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      StaffAvatar(staff: session.staff!, size: 18),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          l10n.classWith(session.staff!.name),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  status,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          action,
        ],
      ),
    );
  }
}

/// A compact button for a class card.
class _SmallButton extends StatelessWidget {
  const _SmallButton({
    required this.label,
    required this.semanticLabel,
    required this.onPressed,
    this.outlined = false,
  });

  final String label;
  final String semanticLabel;
  final VoidCallback? onPressed;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.shapes.button),
    );
    final text = Text(label, style: const TextStyle(fontSize: 14));
    return Semantics(
      button: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: outlined
          ? OutlinedButton(
              onPressed: onPressed,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(72, 40),
                foregroundColor: p.text,
                side: BorderSide(color: p.border),
                shape: shape,
              ),
              child: text,
            )
          : FilledButton(
              onPressed: onPressed,
              style: FilledButton.styleFrom(
                minimumSize: const Size(72, 40),
                shape: shape,
                disabledBackgroundColor: p.segment,
                disabledForegroundColor: p.textTertiary,
              ),
              child: text,
            ),
    );
  }
}

/// The member's membership in one line, opening the Membership screen.
class MembershipSummary extends ConsumerWidget {
  const MembershipSummary({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final memberships = ref.watch(myMembershipsProvider).asData?.value;
    if (memberships == null) return const SizedBox.shrink();
    final active = memberships.where((m) => m.isActive).firstOrNull;
    final text = active == null
        ? context.l10n.membershipNone
        : '${isolate(active.planName)} · ${membershipCreditsText(active)}';
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      onTap: () => context.go(Paths.memberships),
      semanticLabel: '${context.l10n.membershipMine}: $text',
      child: Row(
        children: [
          AppIcon(AppIcons.membership, size: 20, color: p.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 14, color: p.text),
            ),
          ),
          AppIcon(AppIcons.forward, size: 20, color: p.textTertiary),
        ],
      ),
    );
  }
}

/// "Unlimited classes" or "4 classes left".
String membershipCreditsText(Membership m) => m.creditsLeft == null
    ? currentL10n.membershipUnlimited
    : currentL10n.membershipClassesLeft(m.creditsLeft!);

Color? _hexColor(String? hex) {
  final m = RegExp(r'^#([0-9a-fA-F]{6})$').firstMatch(hex ?? '');
  return m == null ? null : Color(0xFF000000 | int.parse(m[1]!, radix: 16));
}
