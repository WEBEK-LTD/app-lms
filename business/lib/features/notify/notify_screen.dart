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

/// 59 Send a notification to everyone who uses the app: it lands in the
/// app's inbox, and as a push on phones that allow it when the plan has
/// push. 10 an hour, with the dashboard's. It goes out now (the dashboard
/// has no scheduling either).
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
    final push = sent.value?.push;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.sendNotification)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Panel(
            color: Brand.infoBg,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(AppIcons.users, color: Brand.info),
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
          FilledButton.icon(
            onPressed: _valid && !_busy ? _send : null,
            icon: const DirectionalIcon(AppIcons.send),
            label: Text(l10n.sendNow),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.sendLimit,
            style: theme.textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          SectionTitle(l10n.sentBefore),
          AsyncBody(
            value: sent,
            onRetry: () => ref.invalidate(sentProvider),
            builder: (s) => s.items.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(l10n.nothingSent, textAlign: TextAlign.center),
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
    return Semantics(
      label: l10n.previewOnPhone,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 28, 16, 28),
        decoration: BoxDecoration(
          color: Brand.midnight,
          borderRadius: BorderRadius.circular(32),
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
                        Expanded(
                          child: Text(
                            app.name,
                            style: theme.textTheme.labelSmall,
                          ),
                        ),
                        Text(l10n.now, style: theme.textTheme.labelSmall),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title.isEmpty ? l10n.notificationTitle : title,
                      style: theme.textTheme.titleSmall,
                    ),
                    Text(
                      body.isEmpty ? l10n.notificationMessage : body,
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium,
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
