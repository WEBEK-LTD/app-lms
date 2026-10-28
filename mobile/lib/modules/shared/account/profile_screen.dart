import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/country_codes.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/l10n/l10n.dart';
import '../../chat/data/chat_providers.dart';
import '../../delivery/data/delivery_providers.dart';
import '../../lms/downloads/download_manager.dart';
import '../../lms/downloads/download_widgets.dart';

/// The Account tab (design: Profile).
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final ok = await confirmAction(
      context,
      title: context.l10n.logOutTitle,
      message: context.l10n.logOutMessage,
      confirmLabel: context.l10n.logOut,
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
    final env = ref.watch(appEnvironmentProvider);
    final store = env.build.appType == AppType.store;
    final lms = env.build.appType == AppType.lms;
    // The iOS Academy app doesn't sell courses, so it doesn't show orders
    // either. Store apps sell physical goods on both platforms. Bookings
    // apps have appointments instead.
    final showOrders =
        config.features.orders &&
        (store || (lms && env.platform == DevicePlatform.android));
    // 96.3 Tickets and a gym's memberships are orders too, with receipts.
    final purchases =
        config.features.orders &&
        (env.build.appType == AppType.events ||
            env.build.appType == AppType.booking);
    // 104 Delivery apps: the customer's shipments, and the courier's screens
    // for the company's couriers.
    final delivery = env.build.appType == AppType.delivery;
    final courier = ref.watch(isCourierProvider);
    // 45 Academy apps whose students can save lessons on this phone.
    final downloads = lms && downloadsOffered(ref);
    final savedBytes = downloads
        ? ref.watch(downloadManagerProvider.select((s) => s.index.bytes))
        : 0;
    // 77 Chat when it isn't one of the bottom tabs.
    final chatHere =
        config.chat != null &&
        !ref.watch(shellTabsProvider).any((t) => t.path == Paths.chat);
    final chatUnread = chatHere ? ref.watch(chatUnreadProvider) : 0;
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
                        ltrIsolate(formatPhone(user?.phone ?? '')),
                        style: TextStyle(fontSize: 14, color: p.textSecondary),
                      ),
                    ],
                  ),
                ),
                OutlinedButton(
                  onPressed: user == null
                      ? null
                      : () => context.push(Paths.editProfile),
                  child: Text(context.l10n.edit),
                ),
              ],
            ),
            const SizedBox(height: 18),
            if (store && showOrders) ...[
              SettingsGroup(
                title: context.l10n.shopping,
                children: [
                  SettingsTile(
                    icon: AppIcons.orders,
                    title: context.l10n.myOrders,
                    onTap: () => context.push(Paths.orders),
                  ),
                  // 91.4 The customer's loyalty points.
                  if (config.store?.loyalty != null && user != null)
                    SettingsTile(
                      key: const ValueKey('account-points'),
                      icon: AppIcons.loyalty,
                      title: context.l10n.myPoints,
                      onTap: () => context.push(Paths.points),
                    ),
                ],
              ),
              const SizedBox(height: 18),
            ],
            if (lms) ...[
              SettingsGroup(
                title: context.l10n.learning,
                children: [
                  if (config.features.certificates)
                    SettingsTile(
                      icon: AppIcons.certificate,
                      title: context.l10n.myCertificates,
                      onTap: () => context.push(Paths.certificates),
                    ),
                  // 90.3 Memberships, subscriptions and groups on the website.
                  if (config.features.memberships)
                    SettingsTile(
                      key: const ValueKey('account-memberships'),
                      icon: AppIcons.membership,
                      title: context.l10n.siteMemberships,
                      onTap: () => context.push(Paths.subscriptions),
                    ),
                  if (config.features.quizzes)
                    SettingsTile(
                      icon: AppIcons.quizResults,
                      title: context.l10n.quizResults,
                      onTap: () => context.push(Paths.quizResults),
                    ),
                  if (config.features.wishlist)
                    SettingsTile(
                      icon: AppIcons.favorite,
                      title: context.l10n.wishlist,
                      onTap: () => context.go(Paths.myCoursesTab('wishlist')),
                    ),
                  if (showOrders)
                    SettingsTile(
                      icon: AppIcons.orders,
                      title: context.l10n.myOrders,
                      onTap: () => context.push(Paths.orders),
                    ),
                  // 45 Lessons saved for offline viewing.
                  if (downloads)
                    SettingsTile(
                      key: const ValueKey('account-downloads'),
                      icon: AppIcons.downloads,
                      title: context.l10n.downloads,
                      value: savedBytes > 0 ? formatBytes(savedBytes) : null,
                      onTap: () => context.push(Paths.downloads),
                    ),
                  if (!config.features.certificates &&
                      !config.features.memberships &&
                      !config.features.quizzes &&
                      !config.features.wishlist &&
                      !showOrders &&
                      !downloads)
                    SettingsTile(
                      icon: AppIcons.myCourses,
                      title: context.l10n.tabMyCourses,
                      onTap: () => context.go(Paths.myCourses),
                    ),
                ],
              ),
              const SizedBox(height: 18),
            ],
            SettingsGroup(
              title: context.l10n.accountAndApp,
              children: [
                if (purchases)
                  SettingsTile(
                    key: const ValueKey('account-orders'),
                    icon: AppIcons.orders,
                    title: context.l10n.myOrders,
                    onTap: () => context.push(Paths.orders),
                  ),
                if (courier)
                  SettingsTile(
                    key: const ValueKey('account-courier'),
                    icon: AppIcons.courier,
                    title: context.l10n.courierMode,
                    onTap: () => context.go(Paths.courier),
                  ),
                if (delivery && user != null)
                  SettingsTile(
                    key: const ValueKey('account-shipments'),
                    icon: AppIcons.parcel,
                    title: context.l10n.tabShipments,
                    onTap: () => context.go(Paths.shipments),
                  ),
                if (chatHere)
                  SettingsTile(
                    key: const ValueKey('account-chat'),
                    icon: AppIcons.chat,
                    title: context.l10n.chatTitle,
                    value: chatUnread > 0 ? '$chatUnread' : null,
                    onTap: () => context.push(Paths.chat),
                  ),
                SettingsTile(
                  icon: AppIcons.notifications,
                  title: context.l10n.notifications,
                  onTap: () => context.push(Paths.notifications),
                ),
                SettingsTile(
                  icon: AppIcons.settings,
                  title: context.l10n.settings,
                  onTap: () => context.push(Paths.settings),
                ),
                if (support != null && support.trim().isNotEmpty)
                  SettingsTile(
                    icon: AppIcons.help,
                    title: context.l10n.helpAndSupport,
                    onTap: () => openExternal(whatsappLink(support)),
                  ),
                if (config.site.privacyUrl != null)
                  SettingsTile(
                    icon: AppIcons.article,
                    title: context.l10n.privacyPolicy,
                    onTap: () => openExternal(config.site.privacyUrl!),
                  ),
                if (config.site.termsUrl != null)
                  SettingsTile(
                    icon: AppIcons.article,
                    title: context.l10n.termsAndConditions,
                    onTap: () => openExternal(config.site.termsUrl!),
                  ),
              ],
            ),
            const SizedBox(height: 18),
            AppCard(
              child: SettingsTile(
                icon: AppIcons.logout,
                title: context.l10n.logOut,
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
