import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/bookings_providers.dart';
import '../widgets/booking_widgets.dart';
import '../widgets/intake_form.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';

/// The Appointments tab: upcoming ones soonest first, past and cancelled
/// ones newest first.
class AppointmentsScreen extends ConsumerStatefulWidget {
  const AppointmentsScreen({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  ConsumerState<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends ConsumerState<AppointmentsScreen> {
  late int _tab = widget.initialTab;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final words = context.words;
    final filter = AppointmentsFilter.values[_tab];
    final state = ref.watch(appointmentsProvider(filter));
    final notifier = ref.read(appointmentsProvider(filter).notifier);

    final Widget list;
    if (state.isInitialLoading) {
      list = SkeletonList(count: 4, label: words.loadingAppointments);
    } else if (state.error != null && state.items.isEmpty) {
      list = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      list = filter == AppointmentsFilter.upcoming
          ? MessageView(
              icon: AppIcons.appointments,
              title: words.noUpcomingAppointments,
              message: words.noUpcomingAppointmentsMessage,
              actionLabel: words.bookAppointment,
              onAction: () => context.go(Paths.services),
            )
          : MessageView(
              icon: AppIcons.appointments,
              title: words.noPastAppointments,
              // 110 Every empty list leads somewhere.
              actionLabel: words.bookAppointment,
              onAction: () => context.go(Paths.services),
            );
    } else {
      list = RefreshIndicator(
        onRefresh: notifier.refresh,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 300 && state.hasMore) {
              notifier.loadMore();
            }
            return false;
          },
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemCount: state.items.length + (state.hasMore ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              if (i >= state.items.length) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              final a = state.items[i];
              return AppointmentCard(
                appointment: a,
                onTap: () => context.push(Paths.appointment(a.id)),
              );
            },
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Semantics(
                header: true,
                child: Text(
                  words.appointments,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: SegmentedTabs(
                labels: [context.l10n.upcoming, context.l10n.past],
                selected: _tab,
                onChanged: (i) => setState(() => _tab = i),
              ),
            ),
            Expanded(child: list),
          ],
        ),
      ),
    );
  }
}

/// One appointment, with cancelling when the business allows it.
class AppointmentScreen extends ConsumerStatefulWidget {
  const AppointmentScreen({super.key, required this.appointmentId});

  final int appointmentId;

  @override
  ConsumerState<AppointmentScreen> createState() => _AppointmentScreenState();
}

class _AppointmentScreenState extends ConsumerState<AppointmentScreen> {
  bool _cancelling = false;

  Future<void> _cancel(Appointment a) async {
    final ok = await confirmAction(
      context,
      title: context.words.cancelAppointmentTitle,
      message: '${a.serviceName}, ${appointmentWhen(a)}.',
      confirmLabel: context.words.cancelAppointment,
      destructive: true,
    );
    if (!ok || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await ref.read(yallappApiProvider).cancelMyAppointment(a.id);
      if (!mounted) return;
      invalidateAppointments(ref);
      showMessage(context, context.words.appointmentCancelled);
    } catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appointment = ref.watch(appointmentProvider(widget.appointmentId));
    final words = context.words;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBarBackButton(),
        title: Text(words.appointment),
      ),
      body: switch (appointment) {
        AsyncData(:final value) => _details(value),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () =>
              ref.invalidate(appointmentProvider(widget.appointmentId)),
        ),
        _ => LoadingView(label: words.loadingAppointment),
      },
      bottomNavigationBar: switch (appointment) {
        AsyncData(:final value) when value.canCancel => BottomActionBar(
          child: SecondaryButton(
            label: _cancelling
                ? context.l10n.cancelling
                : words.cancelAppointment,
            onPressed: _cancelling ? null : () => _cancel(value),
          ),
        ),
        _ => null,
      },
    );
  }

  Widget _details(Appointment a) {
    final p = context.palette;
    final rules = ref.watch(appConfigProvider).bookings;
    final staff = a.staff;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        Text(
          a.statusLabel,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: statusColor(p, a.status),
          ),
        ),
        const SizedBox(height: 4),
        Semantics(
          header: true,
          child: Text(
            a.serviceName,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              height: 1.3,
              color: p.text,
            ),
          ),
        ),
        const SizedBox(height: 16),
        AppCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            children: [
              _Row(icon: AppIcons.calendar, text: appointmentWhen(a)),
              _Row(
                icon: AppIcons.schedule,
                text: formatMinutes(a.end.difference(a.start).inMinutes),
              ),
              if (staff != null)
                _Row(
                  icon: AppIcons.staff,
                  text: context.l10n.withStaff(staff.name),
                ),
              _Row(icon: AppIcons.orders, text: bookingPriceLabel(a.price)),
              if (a.location != null && a.location!.trim().isNotEmpty)
                _Row(icon: AppIcons.location, text: a.location!),
              if (a.notes != null && a.notes!.trim().isNotEmpty)
                _Row(icon: AppIcons.notes, text: a.notes!),
            ],
          ),
        ),
        if (a.isActive && !a.canCancel) ...[
          const SizedBox(height: 16),
          Text(
            rules?.cancelBeforeMinutes == null
                ? context.l10n.contactToChange
                : context.l10n.tooLateToCancel,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        ],
        if (a.canCancel && rules?.cancelBeforeMinutes != null) ...[
          const SizedBox(height: 16),
          Text(
            context.l10n.cancelUpTo(formatMinutes(rules!.cancelBeforeMinutes!)),
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        ],
        // 21 The customer's own intake answers.
        if (a.answers.isNotEmpty) ...[
          const SizedBox(height: 24),
          IntakeAnswersCard(
            answers: a.answers,
            business: ref.watch(appConfigProvider).site.name,
          ),
        ],
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
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
