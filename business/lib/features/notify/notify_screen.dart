import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../account/apps_screen.dart';

final sentProvider = FutureProvider.autoDispose<SentNotifications>(
  (ref) => ref.watch(apiProvider).sentNotifications(ref.watch(appIdProvider)),
);

/// 61 Those waiting to be sent later.
final scheduledProvider = FutureProvider.autoDispose<ScheduledNotifications>(
  (ref) =>
      ref.watch(apiProvider).scheduledNotifications(ref.watch(appIdProvider)),
);

/// `2026-10-21` and `09:30`, as the Owner API takes them.
String isoDay(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
String hhmm(TimeOfDay t) =>
    '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

/// 59 Send a notification to everyone who uses the app: it lands in the
/// app's inbox, and as a push on phones that allow it when the plan has
/// push. 10 an hour, with the dashboard's. 61 Now, or later at a date and
/// time in the app's time zone (sent by Yallapp within 5 minutes of it);
/// those waiting can be changed or cancelled. 68 Nothing is sent while the
/// app's plan has ended: the composer says so and its buttons wait.
class NotifyScreen extends ConsumerStatefulWidget {
  const NotifyScreen({super.key});

  @override
  ConsumerState<NotifyScreen> createState() => _NotifyScreenState();
}

class _NotifyScreenState extends ConsumerState<NotifyScreen> {
  static const titleMax = 65;
  static const bodyMax = 240;
  final _title = TextEditingController();
  final _body = TextEditingController();
  bool _busy = false;
  bool _later = false;
  late DateTime _date = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _time = const TimeOfDay(hour: 9, minute: 0);

  @override
  void initState() {
    super.initState();
    _title.addListener(() => setState(() {}));
    _body.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  bool get _valid =>
      _title.text.trim().isNotEmpty &&
      _body.text.trim().isNotEmpty &&
      _title.text.length <= titleMax &&
      _body.text.length <= bodyMax;

  /// 61 Adds it for later.
  Future<void> _schedule() async {
    final l10n = context.l10n;
    final app = ref.read(currentAppProvider);
    if (app == null) return;
    setState(() => _busy = true);
    try {
      final made = await ref
          .read(apiProvider)
          .scheduleNotification(
            app.id,
            title: _title.text.trim(),
            body: _body.text.trim(),
            date: isoDay(_date),
            time: hhmm(_time),
          );
      if (!mounted) return;
      _title.clear();
      _body.clear();
      ref.invalidate(scheduledProvider);
      showMessage(
        context,
        l10n.scheduledFor(context.day(made.localDate), made.localTime),
      );
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final app = ref.read(currentAppProvider);
    if (app == null) return;
    final ok = await confirm(
      context,
      title: l10n.sendToEveryoneTitle,
      text: l10n.sendToEveryoneText(app.name),
      action: l10n.send,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      final result = await ref
          .read(apiProvider)
          .sendNotification(
            app.id,
            title: _title.text.trim(),
            body: _body.text.trim(),
          );
      if (!mounted) return;
      _title.clear();
      _body.clear();
      ref.invalidate(sentProvider);
      showMessage(
        context,
        result.pushed > 0
            ? '${result.message} ${l10n.pushedTo(result.pushed)}'
            : result.message,
      );
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final sent = ref.watch(sentProvider);
    final scheduled = ref.watch(scheduledProvider);
    final push = sent.value?.push;
    // 68 The Owner API refuses sending with `plan_not_active` until the plan is renewed.
    final ended = app.state == AccountState.expired;
    final canSend = _valid && !_busy && !ended;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.sendNotification)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (ended) ...[
              Panel(
                color: context.yb.warningBg,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(AppIcons.warning, color: context.yb.warning),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.planEndedTitle,
                            style: theme.textTheme.titleSmall,
                          ),
                          const SizedBox(height: 2),
                          Text(l10n.notifyPlanEnded),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            Panel(
              color: context.yb.infoBg,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.users, color: context.yb.info),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.sendsToEveryone(app.name),
                          style: theme.textTheme.titleSmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          push == false ? l10n.inboxOnly : l10n.inboxAndPush,
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _title,
              maxLength: titleMax,
              decoration: InputDecoration(labelText: l10n.notificationTitle),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _body,
              maxLength: bodyMax,
              minLines: 3,
              maxLines: 6,
              decoration: InputDecoration(
                labelText: l10n.notificationMessage,
                alignLabelWithHint: true,
              ),
            ),
            SectionTitle(l10n.previewOnPhone),
            _PhonePreview(
              app: app,
              title: _title.text.trim(),
              body: _body.text.trim(),
            ),
            const SizedBox(height: 20),
            // 61 Now or later.
            SegmentedButton<bool>(
              showSelectedIcon: false,
              segments: [
                ButtonSegment(value: false, label: Text(l10n.sendNowShort)),
                ButtonSegment(value: true, label: Text(l10n.sendLater)),
              ],
              selected: {_later},
              onSelectionChanged: (s) => setState(() => _later = s.first),
            ),
            if (_later) ...[
              const SizedBox(height: 12),
              WhenPicker(
                date: _date,
                time: _time,
                onDate: (d) => setState(() => _date = d),
                onTime: (t) => setState(() => _time = t),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.laterZone(scheduled.value?.timeZone ?? ''),
                style: theme.textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 16),
            if (_later)
              FilledButton.icon(
                onPressed: canSend ? _schedule : null,
                icon: const Icon(AppIcons.scheduled),
                label: Text(l10n.schedule),
              )
            else
              FilledButton.icon(
                onPressed: canSend ? _send : null,
                icon: const DirectionalIcon(AppIcons.send),
                label: Text(l10n.sendNow),
              ),
            const SizedBox(height: 6),
            Text(
              l10n.sendLimit,
              style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            SectionTitle(l10n.scheduledTitle),
            AsyncBody(
              value: scheduled,
              onRetry: () => ref.invalidate(scheduledProvider),
              builder: (s) => s.items.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        l10n.nothingScheduled,
                        textAlign: TextAlign.center,
                      ),
                    )
                  : Column(
                      children: [
                        for (final n in s.items)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _ScheduledCard(item: n),
                          ),
                      ],
                    ),
            ),
            SectionTitle(l10n.sentBefore),
            AsyncBody(
              value: sent,
              onRetry: () => ref.invalidate(sentProvider),
              builder: (s) => s.items.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        l10n.nothingSent,
                        textAlign: TextAlign.center,
                      ),
                    )
                  : Column(
                      children: [
                        for (final n in s.items)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Panel(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    n.title,
                                    style: theme.textTheme.titleSmall,
                                  ),
                                  Text(n.body),
                                  const SizedBox(height: 4),
                                  Text(
                                    context.dateTime(n.sentAt),
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// How the notification looks on a phone's lock screen.
class _PhonePreview extends StatelessWidget {
  const _PhonePreview({
    required this.app,
    required this.title,
    required this.body,
  });

  final AppSummary app;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    // 61 A phone's lock screen: the same in the light and the dark theme.
    final small = theme.textTheme.labelSmall?.copyWith(color: Brand.ink2);
    return Semantics(
      label: l10n.previewOnPhone,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 28, 16, 28),
        decoration: BoxDecoration(
          color: Brand.midnight,
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: context.yb.line),
        ),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Brand.white.withValues(alpha: 0.94),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppAvatar(app: app, size: 36),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(app.name, style: small)),
                        Text(l10n.now, style: small),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title.isEmpty ? l10n.notificationTitle : title,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: Brand.midnight,
                      ),
                    ),
                    Text(
                      body.isEmpty ? l10n.notificationMessage : body,
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Brand.midnight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 61 The date and time a notification goes out.
class WhenPicker extends StatelessWidget {
  const WhenPicker({
    super.key,
    required this.date,
    required this.time,
    required this.onDate,
    required this.onTime,
  });

  final DateTime date;
  final TimeOfDay time;
  final ValueChanged<DateTime> onDate;
  final ValueChanged<TimeOfDay> onTime;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final today = DateTime.now();
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: date,
                firstDate: DateTime(today.year, today.month, today.day),
                lastDate: today.add(const Duration(days: 90)),
                helpText: l10n.sendOn,
              );
              if (picked != null) onDate(picked);
            },
            icon: const Icon(AppIcons.appointments, size: 20),
            label: Text(
              context.day(isoDay(date)),
              semanticsLabel: '${l10n.sendOn}: ${context.day(isoDay(date))}',
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () async {
              final picked = await showTimePicker(
                context: context,
                initialTime: time,
                helpText: l10n.sendAt,
              );
              if (picked != null) onTime(picked);
            },
            icon: const Icon(AppIcons.schedule, size: 20),
            label: Text(
              hhmm(time),
              semanticsLabel: '${l10n.sendAt}: ${hhmm(time)}',
            ),
          ),
        ),
      ],
    );
  }
}

/// 61 One waiting: when it goes out, change it or cancel it.
class _ScheduledCard extends ConsumerWidget {
  const _ScheduledCard({required this.item});

  final ScheduledNotification item;

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final ok = await confirm(
      context,
      title: l10n.cancelScheduledTitle,
      text: item.title,
      action: l10n.cancelScheduled,
      destructive: true,
    );
    if (!ok || !context.mounted) return;
    try {
      await ref
          .read(apiProvider)
          .cancelScheduledNotification(ref.read(appIdProvider), item.id);
      ref.invalidate(scheduledProvider);
      if (context.mounted) showMessage(context, l10n.scheduledCancelled);
    } on Object catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final waiting = item.status == 'scheduled';
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(item.title, style: theme.textTheme.titleSmall),
              ),
              if (!waiting)
                StatusChip(
                  item.status == 'failed' ? l10n.notSent : l10n.sending,
                  tone: item.status == 'failed' ? Tone.bad : Tone.warn,
                ),
            ],
          ),
          Text(item.body),
          const SizedBox(height: 4),
          Text(
            l10n.goesOut(context.day(item.localDate), item.localTime),
            style: theme.textTheme.bodySmall,
          ),
          if (item.status == 'failed' && item.result != null)
            Text(
              item.result!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: context.yb.danger,
              ),
            ),
          if (waiting) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () => showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => _ScheduledEditor(item: item),
                  ),
                  icon: const Icon(AppIcons.edit, size: 20),
                  label: Text(l10n.edit),
                ),
                OutlinedButton(
                  onPressed: () => _cancel(context, ref),
                  child: Text(l10n.cancelScheduled),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// 61 Changing one that waits: its words, date and time.
class _ScheduledEditor extends ConsumerStatefulWidget {
  const _ScheduledEditor({required this.item});

  final ScheduledNotification item;

  @override
  ConsumerState<_ScheduledEditor> createState() => _ScheduledEditorState();
}

class _ScheduledEditorState extends ConsumerState<_ScheduledEditor> {
  late final _title = TextEditingController(text: widget.item.title);
  late final _body = TextEditingController(text: widget.item.body);
  late DateTime _date = DateTime.parse(widget.item.localDate);
  late TimeOfDay _time = TimeOfDay(
    hour: int.parse(widget.item.localTime.split(':').first),
    minute: int.parse(widget.item.localTime.split(':').last),
  );
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      final saved = await ref
          .read(apiProvider)
          .editScheduledNotification(
            ref.read(appIdProvider),
            widget.item.id,
            title: _title.text.trim(),
            body: _body.text.trim(),
            date: isoDay(_date),
            time: hhmm(_time),
          );
      ref.invalidate(scheduledProvider);
      if (!mounted) return;
      Navigator.pop(context);
      showMessage(
        context,
        l10n.scheduledFor(context.day(saved.localDate), saved.localTime),
      );
    } on Object catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showError(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          children: [
            Text(
              l10n.editScheduled,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _title,
              maxLength: _NotifyScreenState.titleMax,
              decoration: InputDecoration(labelText: l10n.notificationTitle),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _body,
              maxLength: _NotifyScreenState.bodyMax,
              minLines: 2,
              maxLines: 5,
              decoration: InputDecoration(
                labelText: l10n.notificationMessage,
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 8),
            WhenPicker(
              date: _date,
              time: _time,
              onDate: (d) => setState(() => _date = d),
              onTime: (t) => setState(() => _time = t),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(l10n.saveChanges),
            ),
          ],
        ),
      ),
    );
  }
}
