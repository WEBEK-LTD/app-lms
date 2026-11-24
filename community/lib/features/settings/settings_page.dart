import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/badge_mark.dart';
import '../../core/widgets/sym.dart';
import '../profile/profile_page.dart' show linkYallapp;
import '../social/data/social.dart';
import '../social/member_list_page.dart';
import 'language_sheet.dart';

/// The app's version, shown in About.
const appVersion = '1.0.0';

/// Settings: the account (profile, the Yallapp link), language, light or
/// dark, blocked members, how paid things work, about, and Log out.
class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final me = ref.watch(meProvider);
    final mode = ref.watch(themeModeProvider);
    final language = switch (ref.watch(languageProvider)) {
      'ar' => l.langArabic,
      'tr' => l.langTurkish,
      _ => l.langEnglish,
    };
    final linked = me?.yallappLinked ?? false;
    final account = me?.account;
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(
          l.settingsTitle,
          style: TextStyle(fontWeight: FontWeight.w800, color: p.ink),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 40),
        children: [
          _Group(
            title: l.settingsAccount,
            children: [
              _Row(
                key: const ValueKey('settings-profile'),
                icon: Symbols.person_rounded,
                title: l.profileEdit,
                onTap: () => context.push(Paths.editProfile),
              ),
              if (account?.email case final email?)
                _Row(
                  key: const ValueKey('settings-email'),
                  icon: Symbols.mail_rounded,
                  title: email,
                  value: account!.emailVerified
                      ? null
                      : l.settingsEmailUnconfirmed,
                  onTap: account.emailVerified
                      ? null
                      : () async {
                          final messenger = ScaffoldMessenger.of(context);
                          try {
                            await ref
                                .read(communityApiProvider)
                                .resendVerification();
                            messenger.showSnackBar(
                              SnackBar(content: Text(l.settingsResent)),
                            );
                          } on ApiException catch (e) {
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(
                                  e.message.isEmpty ? l.commonError : e.message,
                                ),
                              ),
                            );
                          }
                        },
                ),
              _Row(
                key: const ValueKey('settings-yallapp'),
                icon: Symbols.link_rounded,
                title: l.settingsYallapp,
                value: linked ? l.settingsLinked : l.settingsNotLinked,
                onTap: () async {
                  if (!linked) return linkYallapp(context, ref);
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (d) => AlertDialog(
                      content: Text(l.settingsUnlinkConfirm),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(d, false),
                          child: Text(l.commonCancel),
                        ),
                        TextButton(
                          key: const ValueKey('unlink-confirm'),
                          onPressed: () => Navigator.pop(d, true),
                          child: Text(l.settingsUnlink),
                        ),
                      ],
                    ),
                  );
                  if (ok != true) return;
                  try {
                    await ref.read(communityApiProvider).unlinkYallapp();
                    await ref.read(sessionProvider.notifier).refresh();
                  } on ApiException {
                    // Shown as before; the member can try again.
                  }
                },
              ),
              _Row(
                key: const ValueKey('settings-blocked'),
                icon: Symbols.block_rounded,
                title: l.settingsBlocked,
                onTap: () => context.push(Paths.blocked),
              ),
            ],
          ),
          _Group(
            title: l.langTitle,
            children: [
              _Row(
                key: const ValueKey('settings-language'),
                icon: Symbols.language_rounded,
                title: l.langTitle,
                value: language,
                onTap: () => showLanguageSheet(context),
              ),
            ],
          ),
          _Group(
            title: l.settingsAppearance,
            children: [
              Padding(
                padding: const EdgeInsets.all(8),
                child: SegmentedButton<ThemeMode>(
                  key: const ValueKey('settings-theme'),
                  showSelectedIcon: false,
                  segments: [
                    ButtonSegment(
                      value: ThemeMode.system,
                      label: Text(l.settingsSystem),
                      icon: const Sym(Symbols.smartphone_rounded, size: 18),
                    ),
                    ButtonSegment(
                      value: ThemeMode.light,
                      label: Text(l.settingsLight),
                      icon: const Sym(Symbols.light_mode_rounded, size: 18),
                    ),
                    ButtonSegment(
                      value: ThemeMode.dark,
                      label: Text(l.settingsDark),
                      icon: const Sym(Symbols.dark_mode_rounded, size: 18),
                    ),
                  ],
                  selected: {mode},
                  onSelectionChanged: (s) {
                    ref.read(themeModeProvider.notifier).set(s.first);
                    // Kept with the account too (the website follows it).
                    if (me != null) {
                      ref
                          .read(communityApiProvider)
                          .updateMe(theme: s.first.name)
                          .then((_) {}, onError: (Object _) {});
                    }
                  },
                  style: SegmentedButton.styleFrom(
                    selectedBackgroundColor: p.dark ? Brand.orange : Brand.navy,
                    selectedForegroundColor: Colors.white,
                    foregroundColor: p.ink,
                    side: BorderSide(
                      color: p.dark ? const Color(0x1AFFFFFF) : Brand.line,
                    ),
                  ),
                ),
              ),
            ],
          ),
          // Paid things are bought on the website only: no price, no link.
          // Not on iOS: phase 1 has no paid content, and the App Store
          // allows no hint of buying elsewhere.
          if (!isIos(context))
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 18, 4, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LockedMark(label: l.commonLocked, dark: p.dark),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsetsDirectional.only(start: 2),
                    child: Text(
                      l.settingsPaidNote,
                      key: const ValueKey('settings-paid-note'),
                      style: TextStyle(
                        fontSize: 12.5,
                        color: p.muted,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          _Group(
            title: l.settingsAbout,
            children: [
              _Row(
                icon: Symbols.info_rounded,
                title: l.appName,
                value: l.settingsVersion(appVersion),
              ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 50,
            child: OutlinedButton.icon(
              key: const ValueKey('settings-logout'),
              onPressed: () async {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (d) => AlertDialog(
                    content: Text(l.settingsLogOutConfirm),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(d, false),
                        child: Text(l.commonCancel),
                      ),
                      TextButton(
                        key: const ValueKey('logout-confirm'),
                        onPressed: () => Navigator.pop(d, true),
                        child: Text(l.menuLogOut),
                      ),
                    ],
                  ),
                );
                if (ok == true) {
                  await ref.read(sessionProvider.notifier).signOut();
                }
              },
              icon: const Sym(
                Symbols.logout_rounded,
                size: 20,
                color: Color(0xFFE5484D),
              ),
              label: Text(
                l.menuLogOut,
                style: const TextStyle(
                  color: Color(0xFFE5484D),
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(
                  color: p.dark ? const Color(0x1AFFFFFF) : Brand.line,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              key: const ValueKey('settings-delete'),
              onPressed: () => _deleteAccount(context, ref),
              style: TextButton.styleFrom(foregroundColor: p.muted),
              child: Text(l.settingsDeleteAccount),
            ),
          ),
        ],
      ),
    );
  }
}

/// Deleting the account (the stores require it in the app): email members
/// type their password, Apple and Google members confirm.
Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
  final l = context.l10n;
  final needsPassword = ref.read(meProvider)?.account?.hasPassword ?? true;
  // The password typed (empty without one), or null: cancelled.
  final typed = await showDialog<String>(
    context: context,
    builder: (d) => _DeleteDialog(needsPassword: needsPassword),
  );
  if (typed == null || !context.mounted) return;
  final messenger = ScaffoldMessenger.of(context);
  try {
    await ref
        .read(communityApiProvider)
        .deleteAccount(password: needsPassword ? typed : null);
    await ref.read(sessionProvider.notifier).forget();
  } on ApiException catch (e) {
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          e.offline
              ? l.commonOffline
              : (e.message.isEmpty ? l.commonError : e.message),
        ),
      ),
    );
  }
}

class _DeleteDialog extends StatefulWidget {
  const _DeleteDialog({required this.needsPassword});

  final bool needsPassword;

  @override
  State<_DeleteDialog> createState() => _DeleteDialogState();
}

class _DeleteDialogState extends State<_DeleteDialog> {
  final _password = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AlertDialog(
      title: Text(l.settingsDeleteAccount),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.settingsDeleteLine),
          if (widget.needsPassword) ...[
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('delete-password'),
              controller: _password,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              decoration: InputDecoration(hintText: l.settingsDeletePassword),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l.commonCancel),
        ),
        TextButton(
          key: const ValueKey('delete-confirm'),
          onPressed: () => Navigator.pop(context, _password.text),
          child: Text(
            l.settingsDeleteConfirm,
            style: const TextStyle(color: Color(0xFFE5484D)),
          ),
        ),
      ],
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 0, 6, 8),
            child: Text(
              title.toUpperCase(),
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                letterSpacing: .6,
                color: p.muted,
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: p.dark ? const Color(0x0BFFFFFF) : Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: p.dark
                  ? Border.all(color: const Color(0x12FFFFFF))
                  : null,
              boxShadow: [
                BoxShadow(
                  color: p.cardShadow,
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            // Ink of the rows above the card's colour.
            child: Material(
              type: MaterialType.transparency,
              child: Column(children: children),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    super.key,
    required this.icon,
    required this.title,
    this.value,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return ListTile(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      onTap: onTap,
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: p.dark ? const Color(0x14FFFFFF) : Brand.paper,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Sym(icon, size: 20, color: p.ink),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: p.ink,
          fontSize: 14.5,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value != null)
            Text(value!, style: TextStyle(color: p.muted, fontSize: 13)),
          if (onTap != null)
            Sym(
              rtl
                  ? Symbols.chevron_left_rounded
                  : Symbols.chevron_right_rounded,
              size: 22,
              color: p.muted,
            ),
        ],
      ),
    );
  }
}

/// The members the member blocked, each with Unblock.
class BlockedPage extends ConsumerWidget {
  const BlockedPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final blocked = ref.watch(blockedProvider);
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(
          l.settingsBlocked,
          style: TextStyle(fontWeight: FontWeight.w800, color: p.ink),
        ),
      ),
      body: switch (blocked) {
        AsyncData(:final value) when value.items.isEmpty => Center(
          child: Text(l.settingsNoBlocked, style: TextStyle(color: p.muted)),
        ),
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.fromLTRB(14, 4, 14, 40),
          children: [
            for (final m in value.items)
              MemberRow(
                member: m,
                trailing: TextButton(
                  key: ValueKey('unblock-${m.id}'),
                  onPressed: () async {
                    try {
                      await ref.read(communityApiProvider).unblock(m.id);
                    } on ApiException {
                      // Stays in the list.
                    }
                    ref.invalidate(blockedProvider);
                  },
                  child: Text(
                    l.socialUnblock,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
          ],
        ),
        AsyncError() => Center(
          child: TextButton(
            onPressed: () => ref.invalidate(blockedProvider),
            child: Text(l.commonRetry),
          ),
        ),
        _ => const Center(
          child: CircularProgressIndicator(color: Brand.orange),
        ),
      },
    );
  }
}
