import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/delivery_providers.dart';
import '../widgets/delivery_widgets.dart';

/// 104 One job as the courier works it: where to pick it up and drop it
/// off (with directions), who to call, the cash to collect, and the next
/// stage. While the parcel is on the way and this screen is open, the
/// courier's position goes to the customer (live tracking).
class CourierJobScreen extends ConsumerStatefulWidget {
  const CourierJobScreen({super.key, required this.jobId});

  final int jobId;

  @override
  ConsumerState<CourierJobScreen> createState() => _CourierJobScreenState();
}

class _CourierJobScreenState extends ConsumerState<CourierJobScreen> {
  LocationSharer? _sharer;

  @override
  void dispose() {
    // Sharing stops with the screen.
    _sharer?.stop();
    super.dispose();
  }

  bool _busy = false;

  void _refreshLists() {
    ref
      ..invalidate(courierJobProvider(widget.jobId))
      ..invalidate(activeJobsProvider)
      ..invalidate(availableJobsProvider)
      ..invalidate(doneJobsProvider)
      ..invalidate(courierProfileProvider);
  }

  Future<void> _run(Future<CourierJob> Function() action, String done) async {
    setState(() => _busy = true);
    try {
      await action();
      if (!mounted) return;
      showMessage(context, done);
      _refreshLists();
    } on ApiException catch (e) {
      if (!mounted) return;
      showMessage(context, e.message);
      _refreshLists();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _take() {
    final l10n = context.l10n;
    return _run(
      () => ref.read(yallappApiProvider).acceptCourierJob(widget.jobId),
      l10n.jobTaken,
    );
  }

  Future<void> _step(JobStep step) async {
    final l10n = context.l10n;
    String? note;
    if (step == JobStep.failed) {
      note = await showDialog<String>(
        context: context,
        builder: (_) => const _ReasonDialog(),
      );
      if (note == null || note.trim().isEmpty || !mounted) return;
    }
    if (step == JobStep.released) {
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(l10n.releaseConfirm),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(l10n.stepReleased),
            ),
          ],
        ),
      );
      if (yes != true || !mounted) return;
    }
    final done = step == JobStep.delivered
        ? l10n.deliveredDone
        : l10n.jobUpdated;
    await _run(
      () => ref
          .read(yallappApiProvider)
          .moveCourierJob(widget.jobId, step, note: note),
      done,
    );
  }

  String _stepLabel(JobStep step) {
    final l10n = context.l10n;
    return switch (step) {
      JobStep.pickedUp => l10n.stepPickedUp,
      JobStep.onTheWay => l10n.stepOnTheWay,
      JobStep.delivered => l10n.stepDelivered,
      JobStep.failed => l10n.stepFailed,
      JobStep.released => l10n.stepReleased,
    };
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(courierJobProvider(widget.jobId));
    final job = async.value;
    final live =
        job != null &&
        job.status.live &&
        ref.watch(deliveryConfigProvider).tracking == DeliveryTracking.live;
    final sharer = ref.watch(locationSharerProvider);
    _sharer = sharer;
    if (live) {
      sharer.start();
    } else {
      sharer.stop();
    }
    final mine = job != null && job.senderPhone != null;
    final available = job != null && job.status == ShipmentStatus.pending;
    final steps = job?.steps ?? const <JobStep>[];
    final main = steps
        .where((s) => s != JobStep.failed && s != JobStep.released)
        .toList();
    final other = steps
        .where((s) => s == JobStep.failed || s == JobStep.released)
        .toList();
    return Scaffold(
      appBar: AppBar(
        title: Text(
          job == null ? l10n.courierTitle : l10n.jobTitle(job.reference),
        ),
      ),
      body: switch (async) {
        AsyncValue(value: final j?) => RefreshIndicator(
          onRefresh: () async =>
              ref.invalidate(courierJobProvider(widget.jobId)),
          child: ListView(
            key: const ValueKey('job-view'),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              Text(
                shipmentStatusLabel(l10n, j.status),
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
              Text(
                dayAndTime(j.createdAt),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const SizedBox(height: 12),
              if (j.collectFormatted != null)
                AppCard(
                  color: p.accentSoft,
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      AppIcon(AppIcons.cash, size: 24, color: p.text),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          l10n.jobCollectBanner(j.collectFormatted!),
                          key: const ValueKey('job-collect'),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Text(
                  l10n.jobPaidByCard,
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
              if (live) ...[
                const SizedBox(height: 8),
                Text(
                  l10n.sharingLocation,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
              const SizedBox(height: 12),
              AppCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    PlaceRow(
                      label: l10n.sendPickup,
                      place: j.pickup,
                      icon: AppIcons.parcel,
                    ),
                    if (j.senderPhone != null)
                      Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: CallButton(
                          phone: j.senderPhone!,
                          label: l10n.callSender(j.senderName),
                        ),
                      ),
                    const Divider(height: 24),
                    PlaceRow(
                      label: l10n.sendDropoff,
                      place: j.dropoff,
                      icon: AppIcons.location,
                    ),
                    if (j.recipientPhone != null)
                      Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: CallButton(
                          phone: j.recipientPhone!,
                          label: l10n.callRecipient(j.recipientName),
                        ),
                      ),
                    if (!mine) ...[
                      const SizedBox(height: 8),
                      Text(
                        l10n.jobPhonesAfterTaking,
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                    ],
                    const Divider(height: 24),
                    Text(
                      [
                        packageSizeLabel(l10n, j.size),
                        if (j.description != null) j.description!,
                        if (j.service != null) j.service!,
                        if (j.distanceKm != null)
                          l10n.distanceKm(j.distanceKm!.toStringAsFixed(1)),
                      ].join(' · '),
                      style: TextStyle(fontSize: 15, color: p.text),
                    ),
                    if (j.notes != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        j.notes!,
                        style: TextStyle(fontSize: 14, color: p.textBody),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              StagesTimeline(stages: j.timeline),
            ],
          ),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(courierJobProvider(widget.jobId)),
        ),
        _ => const SkeletonDetail(),
      },
      bottomNavigationBar: job == null || (!available && steps.isEmpty)
          ? null
          : BottomActionBar(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (available)
                    PrimaryButton(
                      key: const ValueKey('job-take'),
                      label: l10n.jobTake,
                      icon: AppIcons.courier,
                      loading: _busy,
                      onPressed: _take,
                    ),
                  for (final step in main) ...[
                    PrimaryButton(
                      key: ValueKey('job-${step.name}'),
                      label: _stepLabel(step),
                      loading: _busy,
                      onPressed: () => _step(step),
                    ),
                    const SizedBox(height: 6),
                  ],
                  if (other.isNotEmpty)
                    Wrap(
                      alignment: WrapAlignment.center,
                      children: [
                        for (final step in other)
                          TextButton(
                            key: ValueKey('job-${step.name}'),
                            onPressed: _busy ? null : () => _step(step),
                            child: Text(_stepLabel(step)),
                          ),
                      ],
                    ),
                ],
              ),
            ),
    );
  }
}

class _ReasonDialog extends StatefulWidget {
  const _ReasonDialog();

  @override
  State<_ReasonDialog> createState() => _ReasonDialogState();
}

class _ReasonDialogState extends State<_ReasonDialog> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.failReasonTitle),
      content: TextField(
        key: const ValueKey('fail-reason'),
        controller: _text,
        autofocus: true,
        maxLength: 300,
        decoration: InputDecoration(
          hintText: l10n.failReasonHint,
          counterText: '',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_text.text),
          child: Text(l10n.failReasonSend),
        ),
      ],
    );
  }
}
