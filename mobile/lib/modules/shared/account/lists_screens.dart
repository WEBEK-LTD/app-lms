import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart';
import '../../lms/quiz/quiz_screen.dart';
import 'account_scaffold.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';

String _date(DateTime d) => shortDate(d);

/// Devices signed in to the account, with sign-out for the others.
class DevicesScreen extends ConsumerWidget {
  const DevicesScreen({super.key});

  Future<void> _remove(
    BuildContext context,
    WidgetRef ref,
    Device device,
  ) async {
    final ok = await confirmAction(
      context,
      title: context.l10n.signOutDeviceTitle(device.name),
      message: context.l10n.signOutDeviceMessage,
      confirmLabel: context.l10n.signOut,
      destructive: true,
    );
    if (!ok) return;
    try {
      await ref.read(yallappApiProvider).removeDevice(device.id);
      ref.invalidate(devicesProvider);
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return AccountScaffold(
      title: context.l10n.registeredDevices,
      child: switch (ref.watch(devicesProvider)) {
        AsyncData(:final value) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              context.l10n.deviceLimit(value.limit),
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
            const SizedBox(height: 12),
            AppCard(
              child: Column(
                children: [
                  for (final (i, d) in value.items.indexed) ...[
                    if (i > 0) Divider(height: 1, color: p.divider),
                    SettingsTile(
                      icon: d.platform == DevicePlatform.ios
                          ? AppIcons.phoneIphone
                          : AppIcons.phoneAndroid,
                      title: d.current
                          ? context.l10n.thisDevice(d.name)
                          : d.name,
                      subtitle: context.l10n.lastUsed(_date(d.lastSeenAt)),
                      chevron: false,
                      trailing: d.current
                          ? null
                          : IconButton(
                              tooltip: context.l10n.signOutDevice(d.name),
                              icon: AppIcon(AppIcons.logout, color: p.danger),
                              onPressed: () => _remove(context, ref, d),
                            ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(devicesProvider),
        ),
        _ => const LoadingView(),
      },
    );
  }
}

class CertificatesScreen extends ConsumerWidget {
  const CertificatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => AccountScaffold(
    title: context.l10n.myCertificates,
    child: switch (ref.watch(certificatesProvider)) {
      AsyncData(:final value) when value.isEmpty => MessageView(
        icon: AppIcons.certificate,
        title: context.l10n.noCertificatesTitle,
        message: context.l10n.noCertificatesMessage,
      ),
      AsyncData(:final value) => AppCard(
        child: Column(
          children: [
            for (final (i, c) in value.indexed) ...[
              if (i > 0) Divider(height: 1, color: context.palette.divider),
              SettingsTile(
                icon: AppIcons.certificate,
                title: c.courseTitle,
                value: c.issuedAt == null ? null : _date(c.issuedAt!),
                trailing: AppIcon(
                  AppIcons.openInNew,
                  size: 18,
                  color: context.palette.textSecondary,
                ),
                onTap: () => openExternal(c.url),
              ),
            ],
          ],
        ),
      ),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(certificatesProvider),
      ),
      _ => const LoadingView(),
    },
  );
}

class QuizResultsScreen extends ConsumerWidget {
  const QuizResultsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(quizAttemptsProvider);
    final notifier = ref.read(quizAttemptsProvider.notifier);
    final Widget body;
    if (state.isInitialLoading) {
      body = const LoadingView();
    } else if (state.error != null && state.items.isEmpty) {
      body = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      body = MessageView(
        icon: AppIcons.quizResults,
        title: context.l10n.noQuizResultsTitle,
        message: context.l10n.noQuizResultsMessage,
      );
    } else {
      body = NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 400) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (_, i) => AttemptResultTile(result: state.items[i]),
        ),
      );
    }
    return AccountScaffold(
      title: context.l10n.quizResults,
      scrollable: false,
      child: body,
    );
  }
}
