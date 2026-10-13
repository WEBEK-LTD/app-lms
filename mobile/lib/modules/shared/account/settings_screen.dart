import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/push_registration.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart';
import 'account_scaffold.dart';

/// Appearance, video defaults, notifications and security (design:
/// Settings). Notification choices are sent with `PUT /me/push-token`.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _pick<T>(
    BuildContext context, {
    required String title,
    required List<T> values,
    required T current,
    required String Function(T) label,
    required ValueChanged<T> onPicked,
  }) async {
    final picked = await showModalBottomSheet<T>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            for (final v in values)
              ListTile(
                minTileHeight: 52,
                title: Text(label(v)),
                trailing: v == current
                    ? AppIcon(AppIcons.check, color: context.palette.text)
                    : null,
                selected: v == current,
                onTap: () => Navigator.of(context).pop(v),
              ),
          ],
        ),
      ),
    );
    if (picked != null) onPicked(picked);
  }

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
    final ok = await confirmAction(
      context,
      title: 'Delete your account?',
      message:
          'Your account, progress and enrollments will be deleted and every device '
          'signed out. This can’t be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
    );
    if (!ok || !context.mounted) return;
    try {
      await ref.read(authControllerProvider.notifier).deleteAccount();
      if (context.mounted) showMessage(context, 'Your account was deleted.');
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final settings = ref.watch(localSettingsProvider);
    final controller = ref.read(localSettingsProvider.notifier);
    final pushEnabled = ref.watch(pushEnabledProvider);
    final devices = ref.watch(devicesProvider).value;
    final env = ref.watch(appEnvironmentProvider);
    final look = ref.watch(appLookProvider);
    final n = settings.notifications;

    Widget toggle(
      String title,
      bool value,
      ValueChanged<bool> onChanged, {
      IconData? icon,
    }) => MergeSemantics(
      child: SettingsTile(
        icon: icon,
        title: title,
        chevron: false,
        onTap: () => onChanged(!value),
        trailing: Switch(value: value, onChanged: onChanged),
      ),
    );

    final lms = env.build.appType == AppType.lms;

    return AccountScaffold(
      title: 'Settings',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (look.userCanChangeMode) ...[
            SettingsGroup(
              title: 'Display',
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          AppIcon(AppIcons.appearance, color: p.text),
                          const SizedBox(width: 12),
                          Text(
                            'Appearance',
                            style: TextStyle(fontSize: 15, color: p.text),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SegmentedTabs(
                        radio: true,
                        height: 40,
                        labels: const ['System', 'Light', 'Dark'],
                        selected: switch (look.themeModeFor(settings)) {
                          ThemeMode.system => 0,
                          ThemeMode.light => 1,
                          ThemeMode.dark => 2,
                        },
                        onChanged: (i) => controller.setThemeMode(
                          [
                            ThemeMode.system,
                            ThemeMode.light,
                            ThemeMode.dark,
                          ][i],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
          if (lms) ...[
            if (look.userCanChangeMode) const SizedBox(height: 16),
            SettingsGroup(
              title: 'Video',
              children: [
                SettingsTile(
                  icon: AppIcons.quality,
                  title: 'Default quality',
                  value: settings.videoQuality.label,
                  onTap: () => _pick<VideoQuality>(
                    context,
                    title: 'Default quality',
                    values: VideoQuality.values,
                    current: settings.videoQuality,
                    label: (q) => q.label,
                    onPicked: controller.setVideoQuality,
                  ),
                ),
                SettingsTile(
                  icon: AppIcons.speed,
                  title: 'Playback speed',
                  value: speedLabel(settings.playbackSpeed),
                  onTap: () => _pick<double>(
                    context,
                    title: 'Playback speed',
                    values: playbackSpeeds,
                    current: settings.playbackSpeed,
                    label: speedLabel,
                    onPicked: controller.setPlaybackSpeed,
                  ),
                ),
                toggle(
                  'Autoplay next lesson',
                  settings.autoplayNext,
                  controller.setAutoplayNext,
                  icon: AppIcons.autoplay,
                ),
              ],
            ),
          ],
          if (pushEnabled && !lms) ...[
            const SizedBox(height: 16),
            SettingsGroup(
              title: 'Notifications',
              children: [
                toggle(
                  'News and offers',
                  n.announcements,
                  (v) =>
                      controller.setNotifications(n.copyWith(announcements: v)),
                ),
              ],
            ),
          ],
          if (pushEnabled && lms) ...[
            const SizedBox(height: 16),
            SettingsGroup(
              title: 'Notifications',
              children: [
                toggle(
                  'New lessons in my courses',
                  n.newLessons,
                  (v) => controller.setNotifications(n.copyWith(newLessons: v)),
                ),
                toggle(
                  'Instructor announcements',
                  n.announcements,
                  (v) =>
                      controller.setNotifications(n.copyWith(announcements: v)),
                ),
                toggle(
                  'Daily study reminder',
                  n.dailyReminder,
                  (v) =>
                      controller.setNotifications(n.copyWith(dailyReminder: v)),
                ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          SettingsGroup(
            title: 'Security',
            children: [
              SettingsTile(
                icon: AppIcons.devices,
                title: 'Registered devices',
                value: devices == null
                    ? null
                    : '${devices.items.length} of ${devices.limit}',
                onTap: () => context.push(Paths.devices),
              ),
              SettingsTile(
                icon: AppIcons.delete,
                title: 'Delete account',
                destructive: true,
                onTap: () => _deleteAccount(context, ref),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Version ${env.appVersion}',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}
