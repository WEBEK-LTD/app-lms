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
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
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
import 'account_looks.dart';
// 130.21 The account in the project's premium look.
import '../../../core/widgets/premium_chrome.dart';
import 'premium/premium_account.dart';
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
    final instructors = staffApp ? null : ref.watch(instructorsConfigProvider);
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
    // 118.3 A Studio app's own account menu: its order, names and icons.
    final design = hub == null ? config.screens?.accountMenu : null;
    final onCard = design?.header == AccountMenuHeader.card;
    final headText = onCard ? p.onPrimary : p.text;
    final headSub = onCard
        ? p.onPrimary.withValues(alpha: 0.8)
        : p.textSecondary;
    final learningShown =
        config.features.certificates ||
        config.features.liveClasses ||
        config.features.learningPaths ||
        config.features.gamification ||
        config.features.memberships ||
        config.features.quizzes ||
        config.features.wishlist ||
        showOrders ||
        downloads;
    // Each entry the app has here, by its key in `Config.screens.account_menu`.
    final available = <String, _MenuEntry>{
      if ((store && showOrders) || showOrders || purchases)
        'orders': _MenuEntry(
          AppIcons.orders,
          context.l10n.myOrders,
          () => context.push(Paths.orders),
          tileKey: 'account-orders',
        ),
      if (store && showOrders && config.store?.loyalty != null && user != null)
        'points': _MenuEntry(
          AppIcons.loyalty,
          context.l10n.myPoints,
          () => context.push(Paths.points),
          tileKey: 'account-points',
        ),
      if (lms && config.features.certificates)
        'certificates': _MenuEntry(
          AppIcons.certificate,
          context.l10n.myCertificates,
          () => context.push(Paths.certificates),
        ),
      if (lms && config.features.memberships)
        'memberships': _MenuEntry(
          AppIcons.membership,
          context.l10n.siteMemberships,
          () => context.push(Paths.subscriptions),
        ),
      if (lms && config.features.quizzes)
        'quiz_results': _MenuEntry(
          AppIcons.quizResults,
          context.l10n.quizResults,
          () => context.push(Paths.quizResults),
        ),
      if (lms && config.features.liveClasses)
        'live_classes': _MenuEntry(
          AppIcons.live,
          context.l10n.liveClasses,
          () => context.push(Paths.liveClasses),
        ),
      if (lms && config.features.learningPaths)
        'learning_paths': _MenuEntry(
          AppIcons.route,
          context.l10n.learningPaths,
          () => context.push(Paths.learningPaths),
        ),
      if (lms && config.features.gamification)
        'achievements': _MenuEntry(
          AppIcons.leaderboard,
          context.l10n.achievementsTitle,
          () => context.push(Paths.achievements),
        ),
      if (lms && config.features.wishlist)
        'wishlist': _MenuEntry(
          AppIcons.favorite,
          context.l10n.wishlist,
          () => context.go(Paths.myCoursesTab('wishlist')),
        ),
      if (downloads)
        'downloads': _MenuEntry(
          AppIcons.downloads,
          context.l10n.downloads,
          () => context.push(Paths.downloads),
          value: savedBytes > 0 ? formatBytes(savedBytes) : null,
        ),
      if (lms && !learningShown)
        'my_courses': _MenuEntry(
          AppIcons.myCourses,
          context.l10n.tabMyCourses,
          () => context.go(Paths.myCourses),
        ),
      if (restaurant)
        'restaurant': _MenuEntry(
          AppIcons.restaurant,
          context.l10n.restaurantMode,
          () => context.go(Paths.restaurantDesk),
        ),
      if (instructors != null)
        'teachers': _MenuEntry(
          AppIcons.people,
          context.l10n.teachersTitle,
          () => context.push(Paths.teachers),
        ),
      if (teacher)
        'teacher': _MenuEntry(
          AppIcons.teacher,
          context.l10n.tabTeacher,
          () => context.go(Paths.teacherDesk),
        )
      else if (instructors != null && instructors.applications && user != null)
        'teach': _MenuEntry(
          AppIcons.teacher,
          context.l10n.teachHere,
          () => context.push(Paths.teachApply),
        ),
      if (delivery && user != null)
        'shipments': _MenuEntry(
          AppIcons.parcel,
          context.l10n.tabShipments,
          () => context.go(Paths.shipments),
        ),
      if (food && user != null)
        'food_orders': _MenuEntry(
          AppIcons.orders,
          context.l10n.tabFoodOrders,
          () => context.go(Paths.foodOrders),
        ),
      if (rides && user != null)
        'rides': _MenuEntry(
          AppIcons.receipt,
          context.l10n.tabMyRides,
          () => context.go(Paths.myRides),
        ),
      if (chatHere)
        'chat': _MenuEntry(
          AppIcons.chat,
          context.l10n.chatTitle,
          () => context.push(Paths.chat),
          value: chatUnread > 0 ? '$chatUnread' : null,
        ),
      'notifications': _MenuEntry(
        AppIcons.notifications,
        context.l10n.notifications,
        () => context.push(Paths.notifications),
      ),
      'settings': _MenuEntry(
        AppIcons.settings,
        context.l10n.settings,
        () => context.push(Paths.settings),
      ),
      if (support != null && support.trim().isNotEmpty)
        'help': _MenuEntry(
          AppIcons.help,
          context.l10n.helpAndSupport,
          () => openExternal(whatsappLink(support)),
        ),
      if (config.site.privacyUrl != null)
        'privacy': _MenuEntry(
          AppIcons.article,
          context.l10n.privacyPolicy,
          () => openExternal(config.site.privacyUrl!),
        ),
      if (config.site.termsUrl != null)
        'terms': _MenuEntry(
          AppIcons.article,
          context.l10n.termsAndConditions,
          () => openExternal(config.site.termsUrl!),
        ),
    };
    final language = Localizations.localeOf(context).languageCode;
    // The owner's entries, in the owner's order, with the owner's names.
    List<AccountLookEntry> designedEntries(AccountMenuDesign design) {
      const required = {'settings', 'privacy', 'terms'};
      final shown = <AccountLookEntry>[];
      final placed = <String>{};
      for (final (i, item) in design.items.indexed) {
        final label = textFor(item.label, language);
        if (item.isLink) {
          if (item.hidden || label == null) continue;
          final slug = item.pageSlug;
          final url = item.url;
          shown.add(
            AccountLookEntry(
              key: 'link',
              tileKey: 'account-link-$i',
              icon: symbolByName(item.icon ?? 'link'),
              title: label,
              onTap: slug != null
                  ? () => context.push(Paths.page(slug))
                  : url != null
                  ? () => openExternal(url)
                  : null,
            ),
          );
          continue;
        }
        final entry = available[item.key];
        if (entry == null || !placed.add(item.key)) continue;
        if (item.hidden && !required.contains(item.key)) continue;
        shown.add(
          entry.shown(
            item.key,
            title: label,
            icon: item.icon == null ? null : symbolByName(item.icon),
            required: required.contains(item.key),
          ),
        );
      }
      // The app's entries the design doesn't list, in the app's order.
      for (final MapEntry(:key, :value) in available.entries) {
        if (!placed.contains(key) && !design.items.any((i) => i.key == key)) {
          shown.add(value.shown(key, required: required.contains(key)));
        }
      }
      return shown;
    }

    List<Widget> designedTiles(AccountMenuDesign design) => [
      for (final e in designedEntries(design)) e.tile(),
    ];

    // ——— 130.21 The system screens' premium look: the person on a hero,
    // the quick numbers and the owner's entries in inset cards. ———
    final chrome = hub == null
        ? SystemLookScope.lookOf(context, SystemScreen.account)
        : null;
    if (chrome != null) {
      return PremiumAccountLook(
        look: chrome,
        entries: designedEntries(design ?? const AccountMenuDesign()),
        user: user,
        onEdit: user == null ? null : () => context.push(Paths.editProfile),
        onSignOut: () => _signOut(context, ref),
        points: config.store?.loyalty != null && user != null,
      );
    }
    // ——— end 130.21 ———

    // 118.3 The cover, tiles and night looks draw the whole page.
    if (design != null &&
        design.header != AccountMenuHeader.plain &&
        design.header != AccountMenuHeader.card) {
      return AccountLook(
        design: design,
        entries: designedEntries(design),
        user: user,
        onEdit: user == null ? null : () => context.push(Paths.editProfile),
        onSignOut: () => _signOut(context, ref),
        points: config.store?.loyalty != null && user != null,
      );
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          children: [
            Container(
              key: onCard ? const ValueKey('account-card') : null,
              padding: onCard ? const EdgeInsets.all(16) : EdgeInsets.zero,
              decoration: onCard
                  ? BoxDecoration(
                      color: p.primary,
                      borderRadius: BorderRadius.circular(context.shapes.r(20)),
                    )
                  : null,
              child: Row(
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
                              color: headText,
                            ),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          ltrIsolate(formatPhone(user?.phone ?? '')),
                          style: TextStyle(fontSize: 14, color: headSub),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    style: onCard
                        ? OutlinedButton.styleFrom(
                            foregroundColor: p.onPrimary,
                            side: BorderSide(color: p.onPrimary),
                          )
                        : null,
                    onPressed: user == null
                        ? null
                        : () => context.push(Paths.editProfile),
                    child: Text(context.l10n.edit),
                  ),
                ],
              ),
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
            if (design != null) ...[
              SettingsGroup(
                title: context.l10n.accountAndApp,
                children: designedTiles(design),
              ),
              const SizedBox(height: 18),
            ],
            if (design == null && store && showOrders) ...[
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
            if (design == null && lms) ...[
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
            if (design == null)
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
            if (design == null) const SizedBox(height: 18),
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

/// 118.3 One of the account menu's entries, before the owner's name and icon.
class _MenuEntry {
  const _MenuEntry(
    this.icon,
    this.title,
    this.onTap, {
    this.value,
    this.tileKey,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final String? value;
  final String? tileKey;

  AccountLookEntry shown(
    String key, {
    String? title,
    IconData? icon,
    bool required = false,
  }) => AccountLookEntry(
    key: key,
    tileKey: tileKey,
    icon: icon ?? this.icon,
    title: title ?? this.title,
    value: value,
    onTap: onTap,
    required: required,
  );
}
