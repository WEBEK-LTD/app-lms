import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/widgets/common.dart';
import '../../../../core/widgets/premium_chrome.dart';
import '../../../../core/widgets/studio_screen_scope.dart';
import '../../../store/screens/points_screen.dart' show myPointsProvider;
import '../../auth/country_codes.dart';
import '../account_looks.dart' show AccountLookEntry;
import 'system_screen_frame.dart';

/// 130.21 The Account tab in the project's premium look: the person on a
/// hero (a card in the brand's gradient; a photo or the brand across the
/// top), their quick numbers and shortcuts on a card (the shop's points
/// where it has them, the first entries a tap away), and the owner's
/// entries grouped in inset cards with tinted icon tiles: what is theirs,
/// the app's own, then help and the legal pages, and Sign out last.
class PremiumAccountLook extends ConsumerWidget {
  const PremiumAccountLook({
    super.key,
    required this.look,
    required this.entries,
    required this.user,
    required this.onSignOut,
    this.onEdit,
    this.points = false,
  });

  final SystemLook look;
  final List<AccountLookEntry> entries;
  final User? user;
  final VoidCallback onSignOut;
  final VoidCallback? onEdit;

  /// The shop has loyalty points and someone is signed in.
  final bool points;

  static const _support = {'help', 'privacy', 'terms'};
  static const _app = {'notifications', 'settings', 'chat'};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final top = MediaQuery.paddingOf(context).top;
    final balance = points ? ref.watch(myPointsProvider).value : null;
    final hidden = StudioScreenScope.hidesTitleOf(context);
    final banner = look == SystemLook.photo || look == SystemLook.brand;
    final photo = look == SystemLook.photo ? systemPhotoOf(ref) : null;

    final mine = [
      for (final e in entries)
        if (!_support.contains(e.key) && !_app.contains(e.key)) e,
    ];
    final app = [
      for (final e in entries)
        if (_app.contains(e.key)) e,
    ];
    final support = [
      for (final e in entries)
        if (_support.contains(e.key)) e,
    ];
    // The quick numbers and shortcuts: the points first where the shop has
    // them, then the first entries (each with its value, if it has one).
    final quick = <(IconData, String, String?, VoidCallback?)>[
      if (balance != null)
        (
          AppIcons.loyalty,
          l10n.myPoints,
          '${balance.balance}',
          entries.where((e) => e.key == 'points').firstOrNull?.onTap,
        ),
      for (final e in [...mine, ...app])
        if (e.key != 'points') (e.icon, e.title, e.value, e.onTap),
    ].take(3).toList();

    Widget group(String? title, List<AccountLookEntry> list) => list.isEmpty
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SettingsGroup(
              title: title ?? '',
              children: [for (final e in list) e.tile()],
            ),
          );

    final person = _Person(user: user, onColour: true, onEdit: onEdit);
    final stats = quick.isEmpty
        ? null
        : DecoratedBox(
            key: const ValueKey('chrome-account-quick'),
            decoration: ChromeTones.card(p, look),
            child: IntrinsicHeight(
              child: Row(
                children: [
                  for (final (i, q) in quick.indexed) ...[
                    if (i > 0) VerticalDivider(width: 1, color: p.divider),
                    Expanded(
                      child: _Quick(
                        icon: q.$1,
                        label: q.$2,
                        value: q.$3,
                        onTap: q.$4,
                        color: ChromeTones.tint(p, i),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );

    final Widget hero = banner
        ? Stack(
            clipBehavior: Clip.none,
            children: [
              ClipRRect(
                key: ValueKey('chrome-account-hero-${look.name}'),
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(28),
                ),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: photo != null
                          ? AppNetworkImage(url: photo, fit: BoxFit.cover)
                          : DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: ChromeTones.brand(p),
                              ),
                            ),
                    ),
                    if (photo != null)
                      const Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Color(0x40000000), Color(0x99000000)],
                            ),
                          ),
                        ),
                      ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        20,
                        (hidden ? 16 : top) + 24,
                        20,
                        stats == null ? 28 : 64,
                      ),
                      child: person,
                    ),
                  ],
                ),
              ),
            ],
          )
        : Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            child: Container(
              key: ValueKey('chrome-account-hero-${look.name}'),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: ChromeTones.brand(p),
                borderRadius: BorderRadius.circular(26),
                boxShadow: [
                  BoxShadow(
                    color: p.primary.withValues(alpha: 0.30),
                    blurRadius: 30,
                    offset: const Offset(0, 14),
                  ),
                ],
              ),
              child: person,
            ),
          );

    final list = ListView(
      key: const ValueKey('chrome-account'),
      padding: EdgeInsets.zero,
      children: [
        if (!banner && !hidden)
          Padding(
            padding: EdgeInsets.fromLTRB(20, top + 18, 20, 14),
            child: Semantics(
              header: true,
              child: Text(
                l10n.tabAccount,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.6,
                  color: p.text,
                ),
              ),
            ),
          ),
        if (!banner && hidden) const SizedBox(height: 12),
        hero,
        if (stats != null)
          Transform.translate(
            offset: Offset(0, banner ? -40 : 0),
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, banner ? 0 : 12, 16, 0),
              child: stats,
            ),
          ),
        Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            banner && stats != null ? 0 : 18,
            16,
            28,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              group(l10n.accountAndApp, mine),
              group(null, app),
              group(l10n.helpAndSupport, support),
              SettingsGroup(
                title: '',
                children: [
                  SettingsTile(
                    key: const ValueKey('account-sign-out'),
                    icon: AppIcons.logout,
                    title: l10n.logOut,
                    destructive: true,
                    onTap: onSignOut,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
    return SystemScreenArea(
      screen: SystemScreen.account,
      child: Scaffold(
        key: ValueKey('system-screen-account-${look.name}'),
        backgroundColor: p.background,
        body: DecoratedBox(
          decoration: ChromeTones.backdrop(p, look),
          child: list,
        ),
      ),
    );
  }
}

class _Person extends StatelessWidget {
  const _Person({required this.user, required this.onColour, this.onEdit});

  final User? user;
  final bool onColour;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final url = user?.avatarUrl;
    return Row(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.22),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.7),
              width: 2,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          alignment: Alignment.center,
          child: url != null
              ? AppNetworkImage(url: url, width: 64, height: 64)
              : const AppIcon(
                  AppIcons.account,
                  size: 32,
                  color: Colors.white,
                  filled: true,
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
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                ltrIsolate(formatPhone(user?.phone ?? '')),
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withValues(alpha: 0.82),
                ),
              ),
            ],
          ),
        ),
        if (onEdit != null)
          TextButton(
            key: const ValueKey('chrome-account-edit'),
            onPressed: onEdit,
            style: TextButton.styleFrom(
              foregroundColor: Colors.white,
              backgroundColor: Colors.white.withValues(alpha: 0.20),
              shape: StadiumBorder(
                side: BorderSide(color: Colors.white.withValues(alpha: 0.35)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            child: Text(
              l10n.edit,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
      ],
    );
  }
}

class _Quick extends StatelessWidget {
  const _Quick({
    required this.icon,
    required this.label,
    required this.color,
    this.value,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback? onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (value != null)
              Text(
                value!,
                style: TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              )
            else
              ChromeIconTile(icon: icon, color: color, size: 36),
            const SizedBox(height: 6),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: p.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
