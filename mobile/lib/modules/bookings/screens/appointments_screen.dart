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
    final filter = AppointmentsFilter.values[_tab];
    final state = ref.watch(appointmentsProvider(filter));
    final notifier = ref.read(appointmentsProvider(filter).notifier);

    final Widget list;
    if (state.isInitialLoading) {
      list = const LoadingView(label: 'Loading appointments');
    } else if (state.error != null && state.items.isEmpty) {
      list = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      list = filter == AppointmentsFilter.upcoming
          ? MessageView(
              icon: AppIcons.appointments,
              title: 'No upcoming appointments',
              message: 'Book a time and it shows up here.',
              actionLabel: 'Book an appointment',
              onAction: () => context.go(Paths.services),
            )
          : const MessageView(
              icon: AppIcons.appointments,
              title: 'No past appointments',
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
                  'Appointments',
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
                labels: const ['Upcoming', 'Past'],
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
      title: 'Cancel this appointment?',
      message: '${a.serviceName}, ${appointmentWhen(a)}.',
      confirmLabel: 'Cancel appointment',
      destructive: true,
    );
    if (!ok || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await ref.read(yallappApiProvider).cancelMyAppointment(a.id);
      if (!mounted) return;
      invalidateAppointments(ref);
      showMessage(context, 'Your appointment is cancelled.');
    } catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appointment = ref.watch(appointmentProvider(widget.appointmentId));
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Appointment'),
      ),
      body: switch (appointment) {
        AsyncData(:final value) => _details(value),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () =>
              ref.invalidate(appointmentProvider(widget.appointmentId)),
        ),
        _ => const LoadingView(label: 'Loading appointment'),
      },
      bottomNavigationBar: switch (appointment) {
        AsyncData(:final value) when value.canCancel => BottomActionBar(
          child: SecondaryButton(
            label: _cancelling ? 'Cancelling' : 'Cancel appointment',
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
                _Row(icon: AppIcons.staff, text: 'With ${staff.name}'),
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
                ? 'To change or cancel it, please contact us.'
                : "It's too late to cancel in the app. To change it, "
                      'please contact us.',
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        ],
        if (a.canCancel && rules?.cancelBeforeMinutes != null) ...[
          const SizedBox(height: 16),
          Text(
            'You can cancel up to '
            '${formatMinutes(rules!.cancelBeforeMinutes!)} before it starts.',
            style: TextStyle(fontSize: 14, color: p.textSecondary),
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
