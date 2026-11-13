import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/yallapp_api.dart' show MyCoursesStatus;
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/language.dart';
import '../../../core/routing/paths.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart';
import '../../lms/learning/learning_providers.dart';
import 'account_looks.dart';

/// 123 The premium academy's account page (`account_menu` `header:
/// academy`), as approved: the student's card in gold on dark with their
/// photo, name and number, the academy's name and how many courses,
/// certificates and hours of learning they have; then the owner's entries
/// with what they count, and the dark mode, notifications and language at
/// hand; Sign out last.
class AcademyAccountLook extends ConsumerWidget {
  const AcademyAccountLook({
    super.key,
    required this.look,
    required this.appName,
  });

  final AccountLook look;
  final String appName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final gold = Theme.of(context).colorScheme.secondary;
    final courses =
        ref.watch(myCoursesProvider(MyCoursesStatus.inProgress)).total +
        ref.watch(myCoursesProvider(MyCoursesStatus.completed)).total;
    final certificates = ref.watch(certificatesProvider).value?.length ?? 0;
    final hours =
        (ref.watch(learningTimeProvider).value?.totalMinutes ?? 0) ~/ 60;
    final settings = ref.watch(localSettingsProvider);
    final controller = ref.read(localSettingsProvider.notifier);
    final appLook = ref.watch(appLookProvider);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final n = settings.notifications;
    final languages = ref.watch(availableLanguagesProvider);
    final language = ref.watch(appLanguageProvider);
    // Help goes with the settings and the policies, after the switches.
    bool last(AccountLookEntry e) => e.required || e.key == 'help';
    final main = [
      for (final e in look.entries)
        if (!last(e)) e,
    ];
    final rest = [
      for (final e in look.entries)
        if (last(e)) e,
    ];
    // The approved switches, in green.
    final on = dark ? const Color(0xFF4FD1B0) : const Color(0xFF0E7C66);
    String? count(String key) => switch (key) {
      'certificates' when certificates > 0 => '$certificates',
      _ => null,
    };
    return ListView(
      padding: EdgeInsets.fromLTRB(
        18,
        MediaQuery.paddingOf(context).top + 8,
        18,
        110,
      ),
      children: [
        // The student's card; a tap edits their details.
        GestureDetector(
          onTap: look.onEdit,
          child: Container(
            key: const ValueKey('account-academy-card'),
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              // 128.8 In the academy's main colour (navy in Ufuq Academy),
              // as the approved home's bar and hero: deeper at one corner.
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [
                  Color.lerp(p.primary, Colors.black, 0.45)!,
                  Color.lerp(p.primary, Colors.black, 0.15)!,
                  Color.lerp(p.primary, Colors.white, 0.1)!,
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 30,
                  offset: const Offset(0, 14),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        appName.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2,
                          color: gold.withValues(alpha: 0.9),
                        ),
                      ),
                    ),
                    Icon(Symbols.verified_rounded, fill: 1, color: gold),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: gold, width: 2),
                      ),
                      child: ClipOval(
                        child: AppNetworkImage(
                          url: look.user?.avatarUrl,
                          seed: look.user?.id ?? 0,
                          width: 56,
                          height: 56,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            look.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          if (look.phone.isNotEmpty)
                            Text(
                              look.phone,
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: Color(0xB3FFFFFF),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 16,
                  children: [
                    _Stat(value: courses, label: l10n.statCourses(courses)),
                    _Stat(
                      value: certificates,
                      label: l10n.statCertificates(certificates),
                    ),
                    _Stat(value: hours, label: l10n.statHours(hours)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        _Card(
          children: [
            for (final e in main)
              _Line(
                key: e.widgetKey,
                icon: e.icon,
                title: e.title,
                count: count(e.key) ?? e.value,
                onTap: e.onTap,
              ),
          ],
        ),
        const SizedBox(height: 14),
        _Card(
          children: [
            if (appLook.userCanChangeMode)
              _Line(
                key: const ValueKey('account-dark-mode'),
                icon: Symbols.dark_mode_rounded,
                title: l10n.darkModeSwitch,
                trailing: Switch(
                  activeTrackColor: on,
                  value: dark,
                  onChanged: (v) => controller.setThemeMode(
                    v ? ThemeMode.dark : ThemeMode.light,
                  ),
                ),
                onTap: () => controller.setThemeMode(
                  dark ? ThemeMode.light : ThemeMode.dark,
                ),
              ),
            _Line(
              key: const ValueKey('account-notifications'),
              icon: AppIcons.notifications,
              title: l10n.notifications,
              trailing: Switch(
                activeTrackColor: on,
                value: n.newLessons || n.announcements,
                onChanged: (v) => controller.setNotifications(
                  n.copyWith(newLessons: v, announcements: v),
                ),
              ),
              onTap: () => controller.setNotifications(
                n.copyWith(
                  newLessons: !(n.newLessons || n.announcements),
                  announcements: !(n.newLessons || n.announcements),
                ),
              ),
            ),
            if (languages.length > 1)
              _Line(
                key: const ValueKey('account-language'),
                icon: Symbols.language_rounded,
                title: l10n.language,
                count: languageName(language),
                onTap: () => context.push(Paths.settings),
              ),
          ],
        ),
        const SizedBox(height: 14),
        _Card(
          children: [
            for (final e in rest)
              _Line(
                key: e.widgetKey,
                icon: e.icon,
                title: e.title,
                count: e.value,
                onTap: e.onTap,
              ),
            _Line(
              key: const ValueKey('account-sign-out'),
              icon: AppIcons.logout,
              title: l10n.logOut,
              onTap: look.onSignOut,
              color: p.danger,
              arrow: false,
            ),
          ],
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      children: [
        TextSpan(
          text: '$value ',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: Theme.of(context).colorScheme.secondary,
          ),
        ),
        TextSpan(
          text: label,
          style: const TextStyle(fontSize: 12, color: Color(0xCCFFFFFF)),
        ),
      ],
    ),
  );
}

class _Card extends StatelessWidget {
  const _Card({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: p.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (final (i, c) in children.indexed) ...[
            if (i > 0) Divider(height: 1, color: p.divider),
            c,
          ],
        ],
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({
    super.key,
    required this.icon,
    required this.title,
    this.count,
    this.onTap,
    this.trailing,
    this.color,
    this.arrow = true,
  });

  final IconData icon;
  final String title;
  final String? count;
  final VoidCallback? onTap;
  final Widget? trailing;
  final Color? color;
  final bool arrow;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final gold = Theme.of(context).colorScheme.secondary;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: p.text.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: color ?? gold),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w500,
                  color: color ?? p.text,
                ),
              ),
            ),
            if (count != null && count!.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: p.text.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  count!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ?trailing,
            if (trailing == null && arrow) ...[
              const SizedBox(width: 6),
              Icon(AppIcons.forward, size: 18, color: p.textTertiary),
            ],
          ],
        ),
      ),
    );
  }
}
