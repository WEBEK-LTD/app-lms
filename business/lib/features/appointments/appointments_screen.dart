import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';

/// 59 Appointments: today's, the upcoming ones and the past ones; confirm,
/// decline, cancel, complete or mark a no-show (the dashboard's steps).
class AppointmentsScreen extends ConsumerStatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  ConsumerState<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends ConsumerState<AppointmentsScreen> {
  String _scope = 'today';
  int _version = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final appId = ref.watch(appIdProvider);
    final api = ref.watch(apiProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.appointments)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<String>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: 'today', label: Text(l10n.scopeToday)),
                  ButtonSegment(
                    value: 'upcoming',
                    label: Text(l10n.scopeUpcoming),
                  ),
                  ButtonSegment(value: 'past', label: Text(l10n.scopePast)),
                ],
                selected: {_scope},
                onSelectionChanged: (s) => setState(() => _scope = s.first),
              ),
            ),
          ),
          Expanded(
            child: PagedList<Appointment>(
              key: ValueKey('$appId-$_scope-$_version'),
              load: (page) async => (await api.appointments(
                appId,
                scope: _scope,
                page: page,
              )).page,
              empty: EmptyState(
                icon: AppIcons.appointments,
                title: switch (_scope) {
                  'today' => l10n.noAppointmentsToday,
                  'past' => l10n.noPastAppointments,
                  _ => l10n.noUpcomingAppointments,
                },
              ),
              itemBuilder: (context, a) => AppointmentCard(
                appointment: a,
                showDate: _scope != 'today',
                onChanged: () => setState(() => _version++),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String appointmentStatusLabel(BuildContext context, Appointment a) {
  final l10n = context.l10n;
  return a.statusLabel ??
      switch (a.status) {
        'pending' => l10n.apptPending,
        'approved' => l10n.apptApproved,
        'rejected' => l10n.apptRejected,
        'cancelled' => l10n.statusCancelled,
        'completed' => l10n.statusCompleted,
        'no_show' => l10n.apptNoShow,
        _ => a.status,
      };
}

String appointmentActionLabel(BuildContext context, String status) {
  final l10n = context.l10n;
  return switch (status) {
    'approved' => l10n.confirmAction,
    'rejected' => l10n.decline,
    'cancelled' => l10n.cancelAppointment,
    'completed' => l10n.markDone,
    'no_show' => l10n.apptNoShow,
    _ => status,
  };
}

class AppointmentCard extends ConsumerWidget {
  const AppointmentCard({
    super.key,
    required this.appointment,
    required this.onChanged,
    this.showDate = false,
  });

  final Appointment appointment;
  final VoidCallback onChanged;
  final bool showDate;

  Future<void> _change(
    BuildContext context,
    WidgetRef ref,
    String status,
  ) async {
    final l10n = context.l10n;
    if (status == 'rejected' || status == 'cancelled') {
      final ok = await confirm(
        context,
        title: status == 'rejected'
            ? l10n.declineAppointmentTitle
            : l10n.cancelAppointmentTitle,
        text: l10n.appointmentChangeText(appointment.customerName),
        action: appointmentActionLabel(context, status),
        destructive: true,
      );
      if (!ok) return;
    }
    try {
      final updated = await ref
          .read(apiProvider)
          .changeAppointmentStatus(
            ref.read(appIdProvider),
            appointment.id,
            status,
          );
      if (context.mounted) {
        showMessage(
          context,
          l10n.appointmentUpdated(appointmentStatusLabel(context, updated)),
        );
      }
      onChanged();
    } on Object catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final a = appointment;
    final forward = a.nextStatuses.where(
      (s) => s != 'cancelled' && s != 'rejected' && s != 'no_show',
    );
    final back = a.nextStatuses.where(
      (s) => s == 'cancelled' || s == 'rejected' || s == 'no_show',
    );
    return Panel(
      onTap: () => _details(context, ref),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a.localTime, style: theme.textTheme.titleLarge),
                  if (showDate)
                    Text(
                      context.day(a.localDate),
                      style: theme.textTheme.bodySmall,
                    ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(a.customerName, style: theme.textTheme.titleSmall),
                    Text(
                      '${a.service} · ${a.staff}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              StatusChip(
                appointmentStatusLabel(context, a),
                tone: StatusChip.toneOf(a.status),
              ),
            ],
          ),
          if (a.nextStatuses.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final s in back)
                  OutlinedButton(
                    onPressed: () => _change(context, ref, s),
                    child: Text(appointmentActionLabel(context, s)),
                  ),
                for (final s in forward)
                  FilledButton(
                    onPressed: () => _change(context, ref, s),
                    child: Text(appointmentActionLabel(context, s)),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  void _details(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final a = appointment;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheet) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          children: [
            Text(a.customerName, style: Theme.of(sheet).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              '${context.day(a.localDate)} · ${a.localTime} · ${a.price.formatted}',
            ),
            Text(
              '${a.service} · ${a.staff}',
              style: Theme.of(sheet).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            if (a.customerPhone != null)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(AppIcons.phone),
                title: Text(a.customerPhone!, textDirection: TextDirection.ltr),
                onTap: () => openLink(
                  context,
                  ref,
                  'tel:${a.customerPhone!.replaceAll(' ', '')}',
                ),
              ),
            if (a.customerEmail != null)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(AppIcons.email),
                title: Text(a.customerEmail!),
                onTap: () =>
                    openLink(context, ref, 'mailto:${a.customerEmail}'),
              ),
            if (a.notes != null) ...[
              Text(l10n.notes, style: Theme.of(sheet).textTheme.titleSmall),
              Text(a.notes!),
              const SizedBox(height: 8),
            ],
            for (final answer in a.answers)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text('${answer.label}: ${answer.value}'),
              ),
          ],
        ),
      ),
    );
  }
}
