import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/l10n/language.dart';
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
import '../../../core/l10n/l10n.dart';

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
      title: context.l10n.deleteAccountTitle,
      message: context.l10n.deleteAccountMessage,
      confirmLabel: context.l10n.deleteAccount,
      destructive: true,
    );
    if (!ok || !context.mounted) return;
    try {
      await ref.read(authControllerProvider.notifier).deleteAccount();
      if (context.mounted) showMessage(context, context.l10n.accountDeleted);
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
    final l10n = context.l10n;

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
    final languages = ref.watch(availableLanguagesProvider);
    final language = ref.watch(appLanguageProvider);

    return AccountScaffold(
      title: l10n.settings,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (look.userCanChangeMode || languages.length > 1) ...[
            SettingsGroup(
              title: l10n.display,
              children: [
                if (languages.length > 1)
                  SettingsTile(
                    key: const ValueKey('language-tile'),
                    icon: AppIcons.web,
                    title: l10n.language,
                    value: languageName(language),
                    onTap: () => _pick<String>(
                      context,
                      title: l10n.language,
                      values: languages,
                      current: language,
                      label: languageName,
                      onPicked: (code) => changeLanguage(ref, code),
                    ),
                  ),
                if (look.userCanChangeMode)
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
                              l10n.appearance,
                              style: TextStyle(fontSize: 15, color: p.text),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        SegmentedTabs(
                          radio: true,
                          height: 40,
                          labels: [
                            l10n.themeSystem,
                            l10n.themeLight,
                            l10n.themeDark,
                          ],
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
            if (look.userCanChangeMode || languages.length > 1)
              const SizedBox(height: 16),
            SettingsGroup(
              title: l10n.video,
              children: [
                SettingsTile(
                  icon: AppIcons.quality,
                  title: l10n.defaultQuality,
                  value: settings.videoQuality.label,
                  onTap: () => _pick<VideoQuality>(
                    context,
                    title: l10n.defaultQuality,
                    values: VideoQuality.values,
                    current: settings.videoQuality,
                    label: (q) => q.label,
                    onPicked: controller.setVideoQuality,
                  ),
                ),
                SettingsTile(
                  icon: AppIcons.speed,
                  title: l10n.playbackSpeed,
                  value: speedLabel(settings.playbackSpeed),
                  onTap: () => _pick<double>(
                    context,
                    title: l10n.playbackSpeed,
                    values: playbackSpeeds,
                    current: settings.playbackSpeed,
                    label: speedLabel,
                    onPicked: controller.setPlaybackSpeed,
                  ),
                ),
                toggle(
                  l10n.autoplayNext,
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
              title: l10n.notifications,
              children: [
                toggle(
                  l10n.newsAndOffers,
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
              title: l10n.notifications,
              children: [
                toggle(
                  l10n.notifyNewLessons,
                  n.newLessons,
                  (v) => controller.setNotifications(n.copyWith(newLessons: v)),
                ),
                toggle(
                  l10n.notifyAnnouncements,
                  n.announcements,
                  (v) =>
                      controller.setNotifications(n.copyWith(announcements: v)),
                ),
                toggle(
                  l10n.notifyDailyReminder,
                  n.dailyReminder,
                  (v) =>
                      controller.setNotifications(n.copyWith(dailyReminder: v)),
                ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          SettingsGroup(
            title: l10n.security,
            children: [
              SettingsTile(
                icon: AppIcons.devices,
                title: l10n.registeredDevices,
                value: devices == null
                    ? null
                    : l10n.devicesUsed(devices.items.length, devices.limit),
                onTap: () => context.push(Paths.devices),
              ),
              SettingsTile(
                icon: AppIcons.delete,
                title: l10n.deleteAccount,
                destructive: true,
                onTap: () => _deleteAccount(context, ref),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            l10n.version(env.appVersion),
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}
