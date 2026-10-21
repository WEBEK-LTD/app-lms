import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../../core/api/models.dart';
import '../account/apps_screen.dart';
import '../team/team_screen.dart';
import '../shell/home_shell.dart';

/// 59 More: the app's other tools, the account, settings, help and legal.
/// Nothing here buys anything: the plan and storage are read-only, managed
/// on yallapp.com.tr.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final me = ref.watch(meProvider);
    final app = ref.watch(currentAppProvider);
    // Signing out: the screen goes as the router moves on.
    if (me == null || app == null) return const SizedBox.shrink();
    final config = ref.watch(configProvider);
    final version = ref.watch(appVersionProvider).value;
    final f = app.features;
    final inTabs = tabsFor(context, app).map((t) => t.path).toSet();
    final lang = context.lang;

    Widget tile(
      IconData icon,
      String title,
      VoidCallback onTap, {
      String? subtitle,
      bool external = false,
    }) => ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: subtitle == null ? null : Text(subtitle),
      trailing: DirectionalIcon(
        external ? AppIcons.web : AppIcons.forward,
        size: 20,
      ),
      onTap: onTap,
    );

    Widget group(List<Widget> tiles) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Panel(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(children: tiles),
      ),
    );

    final tools = [
      if (f.kitchen)
        tile(
          AppIcons.kitchen,
          l10n.kitchenMode,
          () => context.push(Paths.kitchen),
        ),
      if (f.orders && !inTabs.contains(Paths.orders))
        tile(AppIcons.orders, l10n.orders, () => context.go(Paths.orders)),
      if (f.appointments && !inTabs.contains(Paths.appointments))
        tile(
          AppIcons.appointments,
          l10n.appointments,
          () => context.go(Paths.appointments),
        ),
      if (f.events && !inTabs.contains(Paths.events))
        tile(AppIcons.events, l10n.events, () => context.go(Paths.events)),
      if (f.checkIn)
        tile(AppIcons.scan, l10n.scanTickets, () => context.push(Paths.scan())),
      // 63 A gym's door and its members.
      if (f.memberCheckIn) ...[
        tile(
          AppIcons.scan,
          l10n.scanMembers,
          () => context.push(Paths.memberScan),
        ),
        tile(AppIcons.members, l10n.members, () => context.push(Paths.members)),
      ],
      if (f.donations && !inTabs.contains(Paths.donations))
        tile(
          AppIcons.donations,
          l10n.donations,
          () => context.go(Paths.donations),
        ),
      if (f.catalog && !inTabs.contains(Paths.catalog))
        tile(
          catalogIcon(app),
          catalogLabel(context, app),
          () => context.go(Paths.catalog),
        ),
      if (f.media)
        tile(AppIcons.media, l10n.media, () => context.push(Paths.media)),
      if (f.appUsers)
        tile(AppIcons.users, l10n.appUsers, () => context.push(Paths.users)),
      if (f.notifications)
        tile(
          AppIcons.notify,
          l10n.sendNotification,
          () => context.push(Paths.notify),
        ),
      if (f.preview)
        tile(
          AppIcons.preview,
          l10n.previewApp,
          () => context.push(Paths.preview),
        ),
      if (f.builds)
        tile(
          AppIcons.builds,
          l10n.buildsTitle,
          () => context.push(Paths.builds),
        ),
      if (f.analytics && !inTabs.contains(Paths.stats))
        tile(AppIcons.stats, l10n.stats, () => context.go(Paths.stats)),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.more)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            child: Panel(
              onTap: me.apps.length > 1
                  ? () => showAppSwitcher(context, ref)
                  : null,
              child: Row(
                children: [
                  AppAvatar(app: app),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(app.name, style: theme.textTheme.titleSmall),
                        Text(
                          '${app.typeName} · ${appStateLabel(context, app.state)}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  if (me.apps.length > 1) ...[
                    const Icon(AppIcons.swap),
                    const SizedBox(width: 4),
                    Text(l10n.switchApp),
                  ],
                ],
              ),
            ),
          ),
          if (tools.isNotEmpty) ...[
            SectionTitle(l10n.yourAppTools),
            group(tools),
          ],
          SectionTitle(l10n.account),
          group([
            ListTile(
              leading: const Icon(AppIcons.person),
              title: Text(me.user.name),
              subtitle: Text(
                // 60 Someone on the team sees their role on the business.
                me.role == TeamRole.owner || me.business == null
                    ? me.user.email
                    : '${me.user.email}\n${l10n.roleOn(roleName(context, me.role), me.business!.name)}',
              ),
            ),
            // 60 Someone on several businesses works on another one.
            if (me.businesses.length > 1)
              tile(
                AppIcons.business,
                l10n.switchBusiness,
                () => showBusinessSwitcher(context, ref),
                subtitle: me.business?.name,
              ),
            if (app.access.team)
              tile(AppIcons.team, l10n.team, () => context.push(Paths.team)),
            // 60 The plan, storage and payments are the owner's: the team asks them.
            if (app.access.license)
              tile(
                AppIcons.plan,
                l10n.planAndStorage,
                () => context.push(Paths.plan),
              )
            else
              ListTile(
                leading: const Icon(AppIcons.lock),
                title: Text(l10n.planAndStorage),
                subtitle: Text('${l10n.askOwner}. ${l10n.planOwnerOnly}'),
              ),
            tile(
              AppIcons.bell,
              l10n.updatesTitle,
              () => context.push(Paths.updates),
            ),
          ]),
          SectionTitle(l10n.settings),
          group([
            tile(
              AppIcons.language,
              l10n.language,
              () => context.push(Paths.language),
              subtitle: switch (ref.watch(languageCodeProvider)) {
                'ar' => 'العربية',
                'tr' => 'Türkçe',
                _ => 'English',
              },
            ),
            tile(
              AppIcons.appearance,
              l10n.appearance,
              () => context.push(Paths.appearance),
              subtitle: switch (ref.watch(themeModeProvider)) {
                ThemeMode.light => l10n.themeLight,
                ThemeMode.dark => l10n.themeDark,
                ThemeMode.system => l10n.themeSystem,
              },
            ),
            tile(
              AppIcons.notificationsSettings,
              l10n.notificationSettings,
              () => context.push(Paths.notifications),
            ),
            const _BiometricTile(),
            tile(
              AppIcons.devices,
              l10n.signedInDevices,
              () => context.push(Paths.devices),
            ),
          ]),
          SectionTitle(l10n.help),
          group([
            // 72 Yallapp's two numbers, each with where it's for.
            if (me.links.bothWhatsapp) ...[
              tile(
                AppIcons.whatsapp,
                l10n.helpWhatsapp,
                () => openLink(context, ref, me.links.supportWhatsappEgypt),
                subtitle: l10n.whatsappInEgypt,
                external: true,
              ),
              tile(
                AppIcons.whatsapp,
                l10n.helpWhatsapp,
                () => openLink(
                  context,
                  ref,
                  me.links.supportWhatsappInternational,
                ),
                subtitle: l10n.whatsappOutsideEgypt,
                external: true,
              ),
            ] else if (me.links.supportWhatsapp != null)
              tile(
                AppIcons.whatsapp,
                l10n.helpWhatsapp,
                () => openLink(context, ref, me.links.supportWhatsapp),
                external: true,
              ),
            if (me.links.supportEmail != null)
              tile(
                AppIcons.email,
                l10n.helpEmail,
                () => openLink(context, ref, 'mailto:${me.links.supportEmail}'),
                subtitle: me.links.supportEmail,
                external: true,
              ),
            tile(
              AppIcons.web,
              l10n.openDashboard,
              () => openLink(context, ref, me.links.dashboard),
              external: true,
            ),
            tile(
              AppIcons.help,
              l10n.helpCenter,
              () => openLink(context, ref, config.websitePage('/docs', lang)),
              external: true,
            ),
          ]),
          SectionTitle(l10n.legal),
          group([
            tile(
              AppIcons.legal,
              l10n.terms,
              () => openLink(context, ref, config.websitePage('/terms', lang)),
              external: true,
            ),
            tile(
              AppIcons.privacy,
              l10n.privacy,
              () =>
                  openLink(context, ref, config.websitePage('/privacy', lang)),
              external: true,
            ),
            // 66 What deleting the account means and how to ask, on the website.
            tile(
              AppIcons.deleteAccount,
              l10n.deleteAccount,
              () => openLink(
                context,
                ref,
                config.websitePage('/delete-account', lang),
              ),
              external: true,
            ),
          ]),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: context.yb.danger,
                side: BorderSide(color: context.yb.danger),
              ),
              onPressed: () async {
                final ok = await confirm(
                  context,
                  title: l10n.signOutTitle,
                  text: l10n.signOutText,
                  action: l10n.signOut,
                );
                if (ok) await ref.read(sessionProvider.notifier).signOut();
              },
              icon: const DirectionalIcon(AppIcons.signOut),
              label: Text(l10n.signOut),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.appVersion(version ?? '…'),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _BiometricTile extends ConsumerStatefulWidget {
  const _BiometricTile();

  @override
  ConsumerState<_BiometricTile> createState() => _BiometricTileState();
}

class _BiometricTileState extends ConsumerState<_BiometricTile> {
  bool? _available;

  @override
  void initState() {
    super.initState();
    ref.read(biometricsProvider).available().then((v) {
      if (mounted) setState(() => _available = v);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final settings = ref.watch(settingsProvider);
    final on = settings.biometricLock ?? false;
    final available = _available ?? false;
    return SwitchListTile(
      secondary: const Icon(AppIcons.fingerprint),
      title: Text(l10n.biometricLock),
      subtitle: Text(
        available ? l10n.biometricLockHelp : l10n.biometricUnavailable,
      ),
      value: available && on,
      onChanged: !available
          ? null
          : (v) async {
              if (v) {
                final ok = await ref
                    .read(biometricsProvider)
                    .authenticate(l10n.unlockReason);
                if (!ok) return;
              }
              await settings.setBiometricLock(v);
              if (mounted) setState(() {});
            },
    );
  }
}

/// 60 The businesses the person works on; choosing one reloads the app on it.
Future<void> showBusinessSwitcher(BuildContext context, WidgetRef ref) async {
  final me = ref.read(meProvider);
  if (me == null) return;
  final chosen = await showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (sheet) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              sheet.l10n.businessesTitle,
              style: Theme.of(sheet).textTheme.titleLarge,
            ),
          ),
          for (final b in me.businesses)
            ListTile(
              leading: const Icon(AppIcons.business),
              title: Text(b.name),
              subtitle: Text(roleName(sheet, b.role)),
              trailing: b.id == me.business?.id
                  ? const Icon(AppIcons.check)
                  : null,
              onTap: () => Navigator.of(sheet).pop(b.id),
            ),
        ],
      ),
    ),
  );
  if (chosen == null || chosen == me.business?.id) return;
  try {
    await ref.read(sessionProvider.notifier).setBusiness(chosen);
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
  }
}
