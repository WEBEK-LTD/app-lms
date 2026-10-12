import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// The Account tab (design: Profile).
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final ok = await confirmAction(
      context,
      title: 'Log out?',
      message: "You'll need a verification code to sign in again.",
      confirmLabel: 'Log out',
      destructive: true,
    );
    if (ok) await ref.read(authControllerProvider.notifier).signOut();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final config = ref.watch(appConfigProvider);
    final user = ref.watch(authControllerProvider).user;
    final support = config.site.supportWhatsapp;
    // The iOS app doesn't sell courses, so it doesn't show orders either.
    final showOrders =
        config.features.orders &&
        ref.watch(appEnvironmentProvider).platform == DevicePlatform.android;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          children: [
            Row(
              children: [
                ClipOval(
                  child: user?.avatarUrl != null
                      ? AppNetworkImage(
                          url: user!.avatarUrl,
                          width: 64,
                          height: 64,
                        )
                      : Container(
                          width: 64,
                          height: 64,
                          color: p.placeholderFor(2),
                          alignment: Alignment.center,
                          child: AppIcon(
                            AppIcons.account,
                            size: 30,
                            color: p.text,
                          ),
                        ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          user?.name ?? '',
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user?.phone ?? '',
                        style: TextStyle(fontSize: 14, color: p.textSecondary),
                      ),
                    ],
                  ),
                ),
                OutlinedButton(
                  onPressed: user == null
                      ? null
                      : () => context.push(Paths.editProfile),
                  child: const Text('Edit'),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SettingsGroup(
              title: 'Learning',
              children: [
                if (config.features.certificates)
                  SettingsTile(
                    icon: AppIcons.certificate,
                    title: 'My certificates',
                    onTap: () => context.push(Paths.certificates),
                  ),
                if (config.features.quizzes)
                  SettingsTile(
                    icon: AppIcons.quizResults,
                    title: 'Quiz results',
                    onTap: () => context.push(Paths.quizResults),
                  ),
                if (config.features.wishlist)
                  SettingsTile(
                    icon: AppIcons.favorite,
                    title: 'Wishlist',
                    onTap: () => context.go(Paths.myCoursesTab('wishlist')),
                  ),
                if (showOrders)
                  SettingsTile(
                    icon: AppIcons.orders,
                    title: 'My orders',
                    onTap: () => context.push(Paths.orders),
                  ),
                if (!config.features.certificates &&
                    !config.features.quizzes &&
                    !config.features.wishlist &&
                    !showOrders)
                  SettingsTile(
                    icon: AppIcons.myCourses,
                    title: 'My Courses',
                    onTap: () => context.go(Paths.myCourses),
                  ),
              ],
            ),
            const SizedBox(height: 18),
            SettingsGroup(
              title: 'Account & app',
              children: [
                SettingsTile(
                  icon: AppIcons.notifications,
                  title: 'Notifications',
                  onTap: () => context.push(Paths.notifications),
                ),
                SettingsTile(
                  icon: AppIcons.settings,
                  title: 'Settings',
                  onTap: () => context.push(Paths.settings),
                ),
                if (support != null && support.trim().isNotEmpty)
                  SettingsTile(
                    icon: AppIcons.help,
                    title: 'Help & support',
                    onTap: () => openExternal(whatsappLink(support)),
                  ),
                if (config.site.privacyUrl != null)
                  SettingsTile(
                    icon: AppIcons.article,
                    title: 'Privacy Policy',
                    onTap: () => openExternal(config.site.privacyUrl!),
                  ),
                if (config.site.termsUrl != null)
                  SettingsTile(
                    icon: AppIcons.article,
                    title: 'Terms & Conditions',
                    onTap: () => openExternal(config.site.termsUrl!),
                  ),
              ],
            ),
            const SizedBox(height: 18),
            AppCard(
              child: SettingsTile(
                icon: AppIcons.logout,
                title: 'Log out',
                destructive: true,
                onTap: () => _signOut(context, ref),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
