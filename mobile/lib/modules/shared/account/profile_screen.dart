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
import '../../courier_hub/data/courier_hub.dart';
import '../../courier_hub/screens/companies_screen.dart' show deleteHubAccount;
import '../../delivery/data/delivery_providers.dart';
import '../../food/data/food_providers.dart';
import '../../lms/teachers/teachers_providers.dart';
import '../../rides/data/rides_providers.dart';
import '../../vendor/data/vendor_providers.dart';
import '../staff_app.dart';
import '../../lms/downloads/download_manager.dart';
import '../../lms/downloads/download_widgets.dart';

/// The Account tab (design: Profile).
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    // 104.8.4 In Yallapp Courier, signing out ends every company's session.
    final hub = ref.read(courierHubLinkProvider);
    final ok = await confirmAction(
      context,
      title: context.l10n.logOutTitle,
      message: hub != null
          ? context.l10n.hubSignOutMessage
          : context.l10n.logOutMessage,
      confirmLabel: context.l10n.logOut,
      destructive: true,
    );
    if (!ok) return;
    if (hub != null) return hub.signOut();
    await ref.read(authControllerProvider.notifier).signOut();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final config = ref.watch(appConfigProvider);
    final user = ref.watch(authControllerProvider).user;
    final support = config.site.supportWhatsapp;
    final env = ref.watch(appEnvironmentProvider);
    final store = env.build.appType == AppType.store;
    // 116 A school's or academy's staff app: the staff's tabs and this
    // account, none of the students' lists.
    final staffApp = ref.watch(staffAppProvider);
    final lms = env.build.appType == AppType.lms && !staffApp;
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
    // 112.3 The couriers' or drivers' own app: its Courier or Driver tab and
    // this account, none of the customer's lists.
    final secondApp =
        ref.watch(courierAppProvider) ||
        ref.watch(driverAppProvider) ||
        ref.watch(vendorAppProvider);
    // 104 Delivery apps: the customer's shipments (112.3 the courier's
    // screens are in the courier app only).
    final delivery = env.build.appType == AppType.delivery && !secondApp;
    // 105.1 Food delivery apps: the customer's orders, and the restaurant's
    // screens for its staff.
    final food = env.build.appType == AppType.food && !secondApp;
    final restaurant = ref.watch(isRestaurantProvider) && !secondApp;
    // 105.2 Ride apps: the rider's rides (112.3 the driver's screens are in
    // the drivers' app only).
    final rides = env.build.appType == AppType.rides && !secondApp;
    // 105.3 Academies with many teachers: their teachers' pages, applying
    // to teach, and the teacher's screens for the teachers.
    final instructors = staffApp
        ? null
        : ref.watch(instructorsConfigProvider);
    final teacher = ref.watch(isTeacherProvider) && !staffApp;
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
    // 104.8.4 Yallapp Courier: the company these screens are on.
    final hub = ref.watch(courierHubLinkProvider);
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
            if (hub != null) ...[
              SettingsGroup(
                title: context.l10n.hubCompanyGroup,
                children: [
                  SettingsTile(
                    key: const ValueKey('account-hub-company'),
                    icon: AppIcons.courier,
                    title: hub.company.name,
                    chevron: false,
                  ),
                  SettingsTile(
                    key: const ValueKey('account-hub-switch'),
                    icon: AppIcons.swap,
                    title: context.l10n.hubSwitchCompany,
                    onTap: hub.switchCompany,
                  ),
                ],
              ),
              const SizedBox(height: 18),
            ],
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
                  // 112.5 Live classes of courses managed in Yallapp.
                  if (config.features.liveClasses)
                    SettingsTile(
                      key: const ValueKey('account-live-classes'),
                      icon: AppIcons.live,
                      title: context.l10n.liveClasses,
                      onTap: () => context.push(Paths.liveClasses),
                    ),
                  // 113.7 Learning paths, and points and badges.
                  if (config.features.learningPaths)
                    SettingsTile(
                      key: const ValueKey('account-learning-paths'),
                      icon: AppIcons.route,
                      title: context.l10n.learningPaths,
                      onTap: () => context.push(Paths.learningPaths),
                    ),
                  if (config.features.gamification)
                    SettingsTile(
                      key: const ValueKey('account-achievements'),
                      icon: AppIcons.leaderboard,
                      title: context.l10n.achievementsTitle,
                      onTap: () => context.push(Paths.achievements),
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
                      !config.features.liveClasses &&
                      !config.features.learningPaths &&
                      !config.features.gamification &&
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
                if (restaurant)
                  SettingsTile(
                    key: const ValueKey('account-restaurant'),
                    icon: AppIcons.restaurant,
                    title: context.l10n.restaurantMode,
                    onTap: () => context.go(Paths.restaurantDesk),
                  ),
                if (instructors != null)
                  SettingsTile(
                    key: const ValueKey('account-teachers'),
                    icon: AppIcons.people,
                    title: context.l10n.teachersTitle,
                    onTap: () => context.push(Paths.teachers),
                  ),
                if (teacher)
                  SettingsTile(
                    key: const ValueKey('account-teacher'),
                    icon: AppIcons.teacher,
                    title: context.l10n.tabTeacher,
                    onTap: () => context.go(Paths.teacherDesk),
                  )
                else if (instructors != null &&
                    instructors.applications &&
                    user != null)
                  SettingsTile(
                    key: const ValueKey('account-teach'),
                    icon: AppIcons.teacher,
                    title: context.l10n.teachHere,
                    onTap: () => context.push(Paths.teachApply),
                  ),
                if (delivery && user != null)
                  SettingsTile(
                    key: const ValueKey('account-shipments'),
                    icon: AppIcons.parcel,
                    title: context.l10n.tabShipments,
                    onTap: () => context.go(Paths.shipments),
                  ),
                if (food && user != null)
                  SettingsTile(
                    key: const ValueKey('account-food-orders'),
                    icon: AppIcons.orders,
                    title: context.l10n.tabFoodOrders,
                    onTap: () => context.go(Paths.foodOrders),
                  ),
                if (rides && user != null)
                  SettingsTile(
                    key: const ValueKey('account-rides'),
                    icon: AppIcons.receipt,
                    title: context.l10n.tabMyRides,
                    onTap: () => context.go(Paths.myRides),
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
              child: Column(
                children: [
                  SettingsTile(
                    icon: AppIcons.logout,
                    title: context.l10n.logOut,
                    destructive: true,
                    onTap: () => _signOut(context, ref),
                  ),
                  // 104.8.4 Yallapp Courier's own account (the stores ask for it).
                  if (hub != null)
                    SettingsTile(
                      key: const ValueKey('account-hub-delete'),
                      icon: AppIcons.delete,
                      title: context.l10n.hubDeleteAccount,
                      destructive: true,
                      onTap: () => deleteHubAccount(context, hub.deleteAccount),
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
