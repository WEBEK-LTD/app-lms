import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/lesson/content/html_content.dart';
import '../data/bookings_providers.dart';
import '../widgets/booking_widgets.dart';

/// The `slot_taken` error: someone booked the time first.
const slotTaken = 'slot_taken';

/// A service: what it is, who provides it, its free times and booking.
class ServiceScreen extends ConsumerWidget {
  const ServiceScreen({super.key, required this.serviceId, this.today});

  final int serviceId;

  /// The first day to show. Defaults to today; tests pass a fixed day.
  final DateTime? today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final service = ref.watch(serviceProvider(serviceId));
    return switch (service) {
      AsyncData(:final value) => _ServiceView(service: value, today: today),
      AsyncError(:final error) => Scaffold(
        appBar: AppBar(leading: const AppBackButton()),
        body: ErrorView(
          error: error,
          onRetry: () => ref.invalidate(serviceProvider(serviceId)),
        ),
      ),
      _ => Scaffold(
        appBar: AppBar(leading: const AppBackButton()),
        body: const LoadingView(label: 'Loading service'),
      ),
    };
  }
}

class _ServiceView extends ConsumerStatefulWidget {
  const _ServiceView({required this.service, this.today});

  final ServiceDetail service;
  final DateTime? today;

  @override
  ConsumerState<_ServiceView> createState() => _ServiceViewState();
}

class _ServiceViewState extends ConsumerState<_ServiceView> {
  late final DateTime _today;
  late DateTime _weekStart;
  int? _staffId;
  String? _day;
  TimeSlot? _slot;

  ServiceDetail get _service => widget.service;

  @override
  void initState() {
    super.initState();
    final now = widget.today ?? DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _weekStart = _today;
  }

  BookingsConfig? get _rules => ref.read(appConfigProvider).bookings;

  /// The last day customers can book.
  DateTime get _lastDay => addDays(_today, (_rules?.maxDaysAhead ?? 60) - 1);

  bool get _canGoBack => _weekStart.isAfter(_today);
  bool get _canGoForward => !addDays(_weekStart, 7).isAfter(_lastDay);

  void _moveWeek(int weeks) => setState(() {
    _weekStart = addDays(_weekStart, 7 * weeks);
    if (_weekStart.isBefore(_today)) _weekStart = _today;
    _day = null;
    _slot = null;
  });

  void _chooseStaff(int? id) => setState(() {
    _staffId = id;
    _slot = null;
  });

  AvailabilityQuery get _query =>
      (service: _service.id, staff: _staffId, from: isoDate(_weekStart));

  StaffMember? get _staff =>
      _service.staff.where((s) => s.id == _staffId).firstOrNull;

  BookingPrice get _price => _staff?.price ?? _service.summary.price;

  Future<void> _book() async {
    final slot = _slot;
    if (slot == null) return;
    if (!ref.read(authControllerProvider).isSignedIn) {
      context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': Paths.service(_service.id)},
        ).toString(),
      );
      return;
    }
    final result = await showModalBottomSheet<Object>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _ConfirmSheet(
        service: _service,
        slot: slot,
        staff: _staff,
        price: _price,
        notes: _rules?.notes ?? false,
        when: _whenLabel(slot),
      ),
    );
    if (!mounted || result == null) return;
    if (result is Appointment) {
      invalidateAppointments(ref);
      showMessage(context, 'Your appointment is booked.');
      context.pushReplacement(Paths.appointment(result.id));
    } else if (result == slotTaken) {
      setState(() => _slot = null);
      ref.invalidate(availabilityProvider(_query));
      showMessage(
        context,
        'This time was just taken. Please choose another one.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final service = _service;
    final staffChoice =
        (_rules?.staffChoice ?? true) && service.staff.length > 1;
    final availability = ref.watch(availabilityProvider(_query));

    return Scaffold(
      backgroundColor: p.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: service.summary.imageUrl == null ? null : 220,
            backgroundColor: p.surface,
            leading: const Padding(
              padding: EdgeInsets.all(6),
              child: AppBackButton(),
            ),
            flexibleSpace: service.summary.imageUrl == null
                ? null
                : FlexibleSpaceBar(
                    background: AppNetworkImage(
                      url: service.summary.imageUrl,
                      seed: service.id,
                    ),
                  ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            sliver: SliverList.list(
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    service.name,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      height: 1.3,
                      color: p.text,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  serviceFacts(service.summary, price: _price),
                  style: TextStyle(fontSize: 15, color: p.textSecondary),
                ),
                if (service.descriptionHtml.trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  HtmlContent(html: service.descriptionHtml),
                ],
                if (staffChoice) ...[
                  const SizedBox(height: 22),
                  const SectionHeader(title: 'With'),
                  const SizedBox(height: 10),
                  _StaffPicker(
                    staff: service.staff,
                    selected: _staffId,
                    onChanged: _chooseStaff,
                  ),
                ],
                const SizedBox(height: 22),
                const SectionHeader(title: 'Choose a time'),
                const SizedBox(height: 6),
                _WeekBar(
                  start: _weekStart,
                  onBack: _canGoBack ? () => _moveWeek(-1) : null,
                  onForward: _canGoForward ? () => _moveWeek(1) : null,
                ),
                const SizedBox(height: 8),
                switch (availability) {
                  AsyncData(:final value) => _times(value),
                  AsyncError(:final error) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: ErrorView(
                      error: error,
                      onRetry: () =>
                          ref.invalidate(availabilityProvider(_query)),
                    ),
                  ),
                  _ => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: LoadingView(label: 'Finding free times'),
                  ),
                },
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomActionBar(
        child: _slot == null
            ? const PrimaryButton(label: 'Choose a time', onPressed: null)
            : PrimaryButton(
                label: 'Book ${_slotLabel(_slot!)}',
                icon: AppIcons.book,
                onPressed: _book,
              ),
      ),
    );
  }

  String _whenLabel(TimeSlot slot) {
    final day = _day == null ? null : parseIsoDate(_day!);
    return day == null
        ? slot.localTime
        : '${dayLabel(day)} at ${slot.localTime}';
  }

  String _slotLabel(TimeSlot slot) {
    final day = _day == null ? null : parseIsoDate(_day!);
    return day == null
        ? slot.localTime
        : '${shortDayLabel(day)}, ${slot.localTime}';
  }

  Widget _times(Availability availability) {
    final p = context.palette;
    final days = availability.days;
    if (days.isEmpty || days.every((d) => d.slots.isEmpty)) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: MessageView(
          icon: AppIcons.calendar,
          title: 'No free times this week',
          message: _staff == null
              ? null
              : 'Try another week, or anyone available.',
          actionLabel: _canGoForward ? 'Next week' : null,
          onAction: _canGoForward ? () => _moveWeek(1) : null,
          compact: true,
        ),
      );
    }
    final selected =
        days.where((d) => d.date == _day).firstOrNull ??
        days.firstWhere((d) => d.slots.isNotEmpty);
    final slots = selected.slots;
    // Times are the business's; say so when the phone is somewhere else.
    final elsewhere = slots.isNotEmpty && !_sameClock(slots.first);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _DayStrip(
          days: days,
          selected: selected.date,
          onChanged: (date) => setState(() {
            _day = date;
            _slot = null;
          }),
        ),
        const SizedBox(height: 16),
        if (slots.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'No free times on this day.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final slot in slots)
                PillChip(
                  label: slot.localTime,
                  selected: _slot?.start == slot.start,
                  onTap: () => setState(() {
                    _day = selected.date;
                    _slot = _slot?.start == slot.start ? null : slot;
                  }),
                ),
            ],
          ),
        if (elsewhere) ...[
          const SizedBox(height: 12),
          Text(
            'Times are in ${availability.timezone.replaceAll('_', ' ')} time.',
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ],
    );
  }

  static bool _sameClock(TimeSlot slot) {
    final local = slot.start.toLocal();
    final clock =
        '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
    return clock == slot.localTime;
  }
}

class _StaffPicker extends StatelessWidget {
  const _StaffPicker({
    required this.staff,
    required this.selected,
    required this.onChanged,
  });

  final List<StaffMember> staff;
  final int? selected;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context);
    return SizedBox(
      height: 64 + scale.scale(40),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _StaffChoice(
            label: 'Anyone',
            selected: selected == null,
            onTap: () => onChanged(null),
            avatar: _AnyoneAvatar(selected: selected == null),
          ),
          for (final s in staff)
            _StaffChoice(
              label: s.name,
              detail: s.price == null ? null : bookingPriceLabel(s.price!),
              selected: selected == s.id,
              onTap: () => onChanged(s.id),
              avatar: StaffAvatar(staff: s),
            ),
        ],
      ),
    );
  }
}

class _AnyoneAvatar extends StatelessWidget {
  const _AnyoneAvatar({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(color: p.surfaceMuted, shape: BoxShape.circle),
      child: AppIcon(AppIcons.staff, color: p.textSecondary),
    );
  }
}

class _StaffChoice extends StatelessWidget {
  const _StaffChoice({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.avatar,
    this.detail,
  });

  final String label;
  final String? detail;
  final bool selected;
  final VoidCallback onTap;
  final Widget avatar;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      selected: selected,
      label: detail == null ? label : '$label, $detail',
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(context.shapes.card),
        child: Container(
          width: 88,
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(context.shapes.card),
            border: Border.all(
              color: selected ? p.primary : p.border,
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              avatar,
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: p.text,
                ),
              ),
              if (detail != null)
                Text(
                  detail!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: p.textSecondary),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WeekBar extends StatelessWidget {
  const _WeekBar({required this.start, this.onBack, this.onForward});

  final DateTime start;
  final VoidCallback? onBack;
  final VoidCallback? onForward;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final end = addDays(start, 6);
    final label = start.month == end.month
        ? '${start.day} – ${end.day} ${shortMonth(end)}'
        : '${start.day} ${shortMonth(start)} – ${end.day} ${shortMonth(end)}';
    return Row(
      children: [
        SquareIconButton(
          icon: AppIcons.back,
          label: 'Previous week',
          onPressed: onBack,
          size: 40,
        ),
        Expanded(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
        ),
        SquareIconButton(
          icon: AppIcons.forward,
          label: 'Next week',
          onPressed: onForward,
          size: 40,
        ),
      ],
    );
  }
}

class _DayStrip extends StatelessWidget {
  const _DayStrip({
    required this.days,
    required this.selected,
    required this.onChanged,
  });

  final List<AvailabilityDay> days;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        for (final d in days)
          Expanded(
            child: Builder(
              builder: (context) {
                final date = parseIsoDate(d.date);
                final open = d.slots.isNotEmpty;
                final isSelected = d.date == selected;
                final fg = isSelected
                    ? p.onPrimary
                    : open
                    ? p.text
                    : p.textTertiary;
                return Semantics(
                  button: open,
                  selected: isSelected,
                  label: date == null
                      ? d.date
                      : '${dayLabel(date)}, '
                            '${open ? plural(d.slots.length, 'free time') : 'no free times'}',
                  excludeSemantics: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: InkWell(
                      onTap: open ? () => onChanged(d.date) : null,
                      borderRadius: BorderRadius.circular(
                        context.shapes.button,
                      ),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
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
                                date == null ? '' : shortWeekday(date),
                                style: TextStyle(fontSize: 12, color: fg),
                              ),
                              Text(
                                date == null ? d.date : '${date.day}',
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

/// Confirms a booking. Pops with the [Appointment], or [slotTaken].
class _ConfirmSheet extends ConsumerStatefulWidget {
  const _ConfirmSheet({
    required this.service,
    required this.slot,
    required this.staff,
    required this.price,
    required this.notes,
    required this.when,
  });

  final ServiceDetail service;
  final TimeSlot slot;

  /// "Monday, 19 October at 10:00".
  final String when;
  final StaffMember? staff;
  final BookingPrice price;
  final bool notes;

  @override
  ConsumerState<_ConfirmSheet> createState() => _ConfirmSheetState();
}

class _ConfirmSheetState extends ConsumerState<_ConfirmSheet> {
  final _notes = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final appointment = await ref
          .read(yallappApiProvider)
          .bookAppointment(
            serviceId: widget.service.id,
            start: widget.slot.start,
            staffId: widget.staff?.id,
            notes: widget.notes ? _notes.text : null,
          );
      if (mounted) Navigator.of(context).pop(appointment);
    } catch (e) {
      if (!mounted) return;
      final error = unwrapError(e);
      if (error is ApiException && error.code == slotTaken) {
        Navigator.of(context).pop(slotTaken);
        return;
      }
      setState(() {
        _busy = false;
        _error = friendlyError(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(
                'Confirm your booking',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _Fact(icon: AppIcons.book, text: widget.service.name),
            _Fact(icon: AppIcons.calendar, text: widget.when),
            _Fact(
              icon: AppIcons.staff,
              text: widget.staff?.name ?? 'Anyone available',
            ),
            _Fact(
              icon: AppIcons.schedule,
              text:
                  '${formatMinutes(widget.service.summary.durationMinutes)} · '
                  '${bookingPriceLabel(widget.price)}',
            ),
            if (widget.notes) ...[
              const SizedBox(height: 8),
              TextField(
                controller: _notes,
                maxLength: 1000,
                minLines: 2,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Note for the business (optional)',
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(fontSize: 14, color: p.danger)),
            ],
            const SizedBox(height: 16),
            PrimaryButton(
              label: 'Confirm booking',
              loading: _busy,
              onPressed: _busy ? null : _confirm,
            ),
          ],
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          AppIcon(icon, size: 20, color: p.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(text, style: TextStyle(fontSize: 15, color: p.text)),
          ),
        ],
      ),
    );
  }
}
