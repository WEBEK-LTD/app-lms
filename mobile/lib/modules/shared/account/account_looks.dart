import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../store/screens/points_screen.dart' show myPointsProvider;
import '../auth/country_codes.dart';

/// 118.3 One entry of a Studio app's account menu, as the owner named it.
class AccountLookEntry {
  const AccountLookEntry({
    required this.key,
    required this.icon,
    required this.title,
    this.onTap,
    this.value,
    this.tileKey,
    this.required = false,
  });

  /// The app's key for it (`orders`, `points`, …), or `link`.
  final String key;
  final IconData icon;
  final String title;
  final VoidCallback? onTap;
  final String? value;
  final String? tileKey;

  /// Settings, the privacy policy and the terms: always in the list.
  final bool required;

  bool get isLink => key == 'link';

  Key? get widgetKey {
    final key = tileKey;
    return key == null ? null : ValueKey<String>(key);
  }

  Widget tile() => SettingsTile(
    key: widgetKey,
    icon: icon,
    title: title,
    value: value,
    onTap: onTap,
  );
}

/// 118.3 The account page in the cover, tiles or night look: the owner's
/// entries, the person's points where the shop has them, and Sign out last.
class AccountLook extends ConsumerWidget {
  const AccountLook({
    super.key,
    required this.design,
    required this.entries,
    required this.user,
    required this.onSignOut,
    this.onEdit,
    this.points = false,
  });

  final AccountMenuDesign design;
  final List<AccountLookEntry> entries;
  final User? user;
  final VoidCallback onSignOut;
  final VoidCallback? onEdit;

  /// The shop has loyalty points and someone is signed in.
  final bool points;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = points ? ref.watch(myPointsProvider).value : null;
    final minPoints = ref.watch(appConfigProvider).store?.loyalty?.minPoints;
    final appName = ref.watch(appConfigProvider).site.name;
    return switch (design.header) {
      AccountMenuHeader.tiles => _Tiles(look: this, account: account),
      AccountMenuHeader.night => _Night(
        look: this,
        account: account,
        minPoints: minPoints ?? 0,
        appName: appName,
      ),
      _ => _Cover(look: this, account: account),
    };
  }

  String get name => user?.name ?? '';
  String get phone => ltrIsolate(formatPhone(user?.phone ?? ''));

  AccountLookEntry? get pointsEntry {
    for (final e in entries) {
      if (e.key == 'points') return e;
    }
    return null;
  }
}

/// The colours the entries' icon boxes take in turn.
List<Color> _tints(AppPalette p) => [
  for (final c in [
    p.primary,
    const Color(0xFFB26A00),
    const Color(0xFF2F4FB5),
    const Color(0xFF7A2E8E),
  ])
    // 119 In dark mode lighter, so they stay easy to see on a dark card.
    p.isDark && c.computeLuminance() < 0.25
        ? Color.lerp(c, const Color(0xFFFFFFFF), 0.45)!
        : c,
];

/// 119 How strong an icon's box is: a little stronger on a dark card.
double _boxAlpha(AppPalette p) => p.isDark ? 0.22 : 0.12;

class _Avatar extends StatelessWidget {
  const _Avatar({
    required this.user,
    required this.size,
    required this.background,
    required this.foreground,
    this.border,
  });

  final User? user;
  final double size;
  final Color background;
  final Color foreground;
  final BoxBorder? border;

  @override
  Widget build(BuildContext context) {
    final url = user?.avatarUrl;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: background,
        border: border,
      ),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: url != null
          ? AppNetworkImage(url: url, width: size, height: size)
          : AppIcon(AppIcons.account, size: size * 0.45, color: foreground),
    );
  }
}

/// A row of the menu in the new looks: an icon (in a box, or plain), the
/// name, its value, and the arrow.
class _Row extends StatelessWidget {
  const _Row({
    super.key,
    required this.icon,
    required this.title,
    required this.text,
    required this.muted,
    this.onTap,
    this.value,
    this.box,
    this.weight = FontWeight.w400,
    this.arrow = true,
  });

  final IconData icon;
  final String title;
  final Color text;
  final Color muted;
  final VoidCallback? onTap;
  final String? value;

  /// The icon's box colour; null: a plain icon.
  final Color? box;
  final FontWeight weight;
  final bool arrow;

  @override
  Widget build(BuildContext context) {
    final iconColor = box ?? text;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              if (box != null)
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: box!.withValues(alpha: _boxAlpha(context.palette)),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  alignment: Alignment.center,
                  child: AppIcon(icon, size: 20, color: iconColor),
                )
              else
                AppIcon(icon, size: 21, color: iconColor),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    color: text,
                    fontWeight: weight,
                  ),
                ),
              ),
              if (value != null)
                Padding(
                  padding: const EdgeInsetsDirectional.only(start: 8),
                  child: Text(
                    value!,
                    style: TextStyle(fontSize: 13, color: muted),
                  ),
                ),
              if (arrow && onTap != null)
                Padding(
                  padding: const EdgeInsetsDirectional.only(start: 4),
                  child: AppIcon(AppIcons.forward, size: 18, color: muted),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Rows in one card, with lines between them.
class _Group extends StatelessWidget {
  const _Group({
    required this.children,
    required this.color,
    required this.line,
    this.border,
  });

  final List<Widget> children;
  final Color color;
  final Color line;
  final Color? border;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(18),
        border: border == null ? null : Border.all(color: border!),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) Divider(height: 1, thickness: 1, color: line),
            children[i],
          ],
        ],
      ),
    );
  }
}

/// 118.3 A cover in the app's colour, the photo on a card over it, the
/// points and the first entries as shortcuts, then the menu.
class _Cover extends StatelessWidget {
  const _Cover({required this.look, required this.account});

  final AccountLook look;
  final PointsAccount? account;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final top = MediaQuery.paddingOf(context).top;
    final tints = _tints(p);
    final pointsEntry = look.pointsEntry;
    final showPoints = account != null && pointsEntry != null;
    final shortcuts = [
      for (final e in look.entries)
        if (!e.required && !e.isLink && e.key != 'points') e,
    ].take(showPoints ? 2 : 3).toList();
    final listed = [
      for (final e in look.entries)
        if (!shortcuts.contains(e) && !(showPoints && e == pointsEntry)) e,
    ];
    final own = [
      for (final e in listed)
        if (!e.required) e,
    ];
    final fixed = [
      for (final e in listed)
        if (e.required) e,
    ];
    Widget row(AccountLookEntry e, int i) => _Row(
      key: e.widgetKey,
      icon: e.icon,
      title: e.title,
      value: e.value,
      onTap: e.onTap,
      text: p.text,
      muted: p.textSecondary,
      box: tints[i % tints.length],
    );
    final cardTop = top + 112;
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                key: const ValueKey('account-cover'),
                height: top + 176,
                color: p.primary,
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(20, cardTop, 20, 0),
                child: Container(
                  padding: const EdgeInsets.only(top: 52),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: BorderRadius.circular(22),
                    // 119 A shadow on a light page; a line on a dark one.
                    border: p.isDark ? Border.all(color: p.border) : null,
                    boxShadow: p.isDark
                        ? null
                        : const [
                            BoxShadow(
                              color: Color(0x14101814),
                              blurRadius: 30,
                              offset: Offset(0, 10),
                            ),
                          ],
                  ),
                  child: Column(
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          look.name,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        look.phone,
                        style: TextStyle(
                          fontSize: 13.5,
                          color: p.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton(
                        onPressed: look.onEdit,
                        style: OutlinedButton.styleFrom(
                          shape: const StadiumBorder(),
                          visualDensity: VisualDensity.compact,
                        ),
                        child: Text(context.l10n.editProfile),
                      ),
                      if (showPoints || shortcuts.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Divider(height: 1, thickness: 1, color: p.divider),
                        IntrinsicHeight(
                          child: Row(
                            children: [
                              if (showPoints)
                                Expanded(
                                  child: _Shortcut(
                                    key: const ValueKey('account-points-count'),
                                    onTap: pointsEntry.onTap,
                                    top: Text(
                                      '${account!.balance}',
                                      style: TextStyle(
                                        fontSize: 19,
                                        fontWeight: FontWeight.w700,
                                        color: p.primary,
                                      ),
                                    ),
                                    label: pointsEntry.title,
                                    muted: p.textSecondary,
                                  ),
                                ),
                              for (final (i, e) in shortcuts.indexed) ...[
                                if (showPoints || i > 0)
                                  VerticalDivider(
                                    width: 1,
                                    thickness: 1,
                                    color: p.divider,
                                  ),
                                Expanded(
                                  child: _Shortcut(
                                    key: ValueKey('account-shortcut-${e.key}'),
                                    onTap: e.onTap,
                                    top: AppIcon(
                                      e.icon,
                                      size: 22,
                                      color: tints[i % tints.length],
                                    ),
                                    label: e.title,
                                    muted: p.textSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ] else
                        const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
              Positioned(
                top: cardTop - 42,
                left: 0,
                right: 0,
                child: Center(
                  child: _Avatar(
                    user: look.user,
                    size: 84,
                    background: p.placeholderFor(2),
                    foreground: p.text,
                    border: Border.all(color: p.surface, width: 4),
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              children: [
                _Group(
                  color: p.surface,
                  line: p.divider,
                  children: [for (final (i, e) in own.indexed) row(e, i)],
                ),
                if (own.isNotEmpty) const SizedBox(height: 14),
                _Group(
                  color: p.surface,
                  line: p.divider,
                  children: [
                    for (final e in fixed)
                      _Row(
                        key: e.widgetKey,
                        icon: e.icon,
                        title: e.title,
                        value: e.value,
                        onTap: e.onTap,
                        text: p.text,
                        muted: p.textSecondary,
                        box: p.textSecondary,
                      ),
                    _Row(
                      key: const ValueKey('account-sign-out'),
                      icon: AppIcons.logout,
                      title: context.l10n.logOut,
                      onTap: look.onSignOut,
                      text: p.danger,
                      muted: p.textSecondary,
                      box: p.danger,
                      weight: FontWeight.w600,
                      arrow: false,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Shortcut extends StatelessWidget {
  const _Shortcut({
    super.key,
    required this.top,
    required this.label,
    required this.muted,
    this.onTap,
  });

  final Widget top;
  final String label;
  final Color muted;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          top,
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: muted),
          ),
        ],
      ),
    ),
  );
}

/// 118.3 The first entries as tiles, the owner's first own entry as a
/// banner in the app's colour, then the rest of the menu.
class _Tiles extends StatelessWidget {
  const _Tiles({required this.look, required this.account});

  final AccountLook look;
  final PointsAccount? account;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final tints = _tints(p);
    final tiles = [
      for (final e in look.entries)
        if (!e.required && !e.isLink) e,
    ].take(4).toList();
    AccountLookEntry? banner;
    for (final e in look.entries) {
      if (e.isLink) {
        banner = e;
        break;
      }
    }
    final rest = [
      for (final e in look.entries)
        if (!tiles.contains(e) && e != banner) e,
    ];
    final initial = look.name.trim().isEmpty
        ? null
        : look.name.trim().characters.first;
    String? valueOf(AccountLookEntry e) => e.key == 'points' && account != null
        ? context.l10n.pointsBalance(account!.balance)
        : e.value;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          children: [
            Row(
              children: [
                Container(
                  key: const ValueKey('account-tiles-avatar'),
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: p.primary,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  clipBehavior: Clip.antiAlias,
                  alignment: Alignment.center,
                  child: look.user?.avatarUrl != null
                      ? AppNetworkImage(
                          url: look.user!.avatarUrl,
                          width: 52,
                          height: 52,
                        )
                      : initial != null
                      ? Text(
                          initial,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: p.onPrimary,
                          ),
                        )
                      : AppIcon(AppIcons.account, color: p.onPrimary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.l10n.welcome,
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                      Semantics(
                        header: true,
                        child: Text(
                          look.name,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton.filledTonal(
                  tooltip: context.l10n.editProfile,
                  onPressed: look.onEdit,
                  icon: AppIcon(AppIcons.edit, color: p.text),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (tiles.isNotEmpty)
              GridView(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  mainAxisExtent: 120,
                ),
                children: [
                  for (final (i, e) in tiles.indexed)
                    AppCard(
                      key: ValueKey('account-tile-${e.key}'),
                      radius: 18,
                      onTap: e.onTap,
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: tints[i % tints.length].withValues(
                                alpha: _boxAlpha(p),
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: AppIcon(
                              e.icon,
                              color: tints[i % tints.length],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                e.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: p.text,
                                ),
                              ),
                              if (valueOf(e) != null)
                                Text(
                                  valueOf(e)!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: p.textSecondary,
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            if (banner != null) ...[
              const SizedBox(height: 16),
              Material(
                key: banner.widgetKey,
                color: p.primary,
                borderRadius: BorderRadius.circular(18),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: banner.onTap,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    child: Row(
                      children: [
                        AppIcon(banner.icon, color: p.onPrimary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            banner.title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: p.onPrimary,
                            ),
                          ),
                        ),
                        AppIcon(AppIcons.forward, size: 18, color: p.onPrimary),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            _Group(
              color: p.surface,
              line: p.divider,
              children: [
                for (final e in rest)
                  _Row(
                    key: e.widgetKey,
                    icon: e.icon,
                    title: e.title,
                    value: e.value,
                    onTap: e.onTap,
                    text: p.text,
                    muted: p.textSecondary,
                  ),
              ],
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              key: const ValueKey('account-sign-out'),
              onPressed: look.onSignOut,
              style: OutlinedButton.styleFrom(
                foregroundColor: p.danger,
                side: BorderSide(color: p.danger.withValues(alpha: 0.35)),
                minimumSize: const Size.fromHeight(48),
              ),
              child: Text(context.l10n.logOut),
            ),
          ],
        ),
      ),
    );
  }
}

/// 118.3 A dark page: a membership card with the points, the first entries
/// as shortcuts, then the menu.
class _Night extends StatelessWidget {
  const _Night({
    required this.look,
    required this.account,
    required this.minPoints,
    required this.appName,
  });

  final AccountLook look;
  final PointsAccount? account;
  final int minPoints;
  final String appName;

  /// The membership card stays dark in light and dark mode.
  static const _cardMuted = Color(0xFFA3ADA8);

  @override
  Widget build(BuildContext context) {
    final accent = look.design.accent ?? const Color(0xFFD9B36C);
    // 119 A dark page in dark mode, a warm light one in light mode.
    final c = _NightColors.of(context);
    // On a light page the accent deepens so icons stay easy to see.
    final iconAccent = c.dark
        ? accent
        : Color.lerp(accent, const Color(0xFF000000), 0.38)!;
    final onAccent = accent.computeLuminance() > 0.4
        ? const Color(0xFF0D1210)
        : const Color(0xFFFFFFFF);
    final l10n = context.l10n;
    final pointsEntry = look.pointsEntry;
    final quick = [
      for (final e in look.entries)
        if (!e.required && !e.isLink && e.key != 'points') e,
    ].take(3).toList();
    final rest = [
      for (final e in look.entries)
        if (!quick.contains(e)) e,
    ];
    final balance = account?.balance;
    return Scaffold(
      backgroundColor: c.page,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          children: [
            Row(
              children: [
                _Avatar(
                  user: look.user,
                  size: 48,
                  background: c.avatar,
                  foreground: iconAccent,
                  border: Border.all(color: iconAccent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          look.name,
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                            color: c.text,
                          ),
                        ),
                      ),
                      Text(
                        look.phone,
                        style: TextStyle(fontSize: 13, color: c.muted),
                      ),
                    ],
                  ),
                ),
                OutlinedButton(
                  onPressed: look.onEdit,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: c.text,
                    backgroundColor: c.card,
                    side: BorderSide(color: c.buttonLine),
                  ),
                  child: Text(l10n.edit),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Material(
              key: const ValueKey('account-member-card'),
              color: const Color(0xFF18211D),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(22),
                side: const BorderSide(color: Color(0xFF2A3530)),
              ),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: balance != null ? pointsEntry?.onTap : null,
                child: SizedBox(
                  height: 188,
                  child: Stack(
                    children: [
                      PositionedDirectional(
                        top: -110,
                        end: -80,
                        child: _Ring(240, accent.withValues(alpha: 0.22)),
                      ),
                      PositionedDirectional(
                        bottom: -70,
                        end: 40,
                        child: _Ring(150, accent.withValues(alpha: 0.14)),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    l10n.accountMemberCard,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: _cardMuted,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: accent,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    appName,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: onAccent,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (balance != null)
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    l10n.pointsBalance(balance),
                                    style: TextStyle(
                                      fontSize: 30,
                                      fontWeight: FontWeight.w700,
                                      color: accent,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  if (minPoints > 0 && balance < minPoints) ...[
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(999),
                                      child: LinearProgressIndicator(
                                        value: balance / minPoints,
                                        minHeight: 6,
                                        color: accent,
                                        backgroundColor: const Color(
                                          0xFF2A3530,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      l10n.accountPointsToUse(
                                        minPoints - balance,
                                      ),
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        color: _cardMuted,
                                      ),
                                    ),
                                  ] else
                                    Text(
                                      l10n.accountPointsWorth(account!.value),
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        color: _cardMuted,
                                      ),
                                    ),
                                ],
                              )
                            else
                              Text(
                                look.name,
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: accent,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (quick.isNotEmpty) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  for (final (i, e) in quick.indexed) ...[
                    if (i > 0) const SizedBox(width: 10),
                    Expanded(
                      child: Material(
                        key: ValueKey('account-shortcut-${e.key}'),
                        color: c.card,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: c.line),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: e.onTap,
                          child: SizedBox(
                            height: 76,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                AppIcon(e.icon, size: 21, color: iconAccent),
                                const SizedBox(height: 6),
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                  ),
                                  child: Text(
                                    e.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: c.text,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
            const SizedBox(height: 14),
            _Group(
              color: c.card,
              line: c.line,
              border: c.line,
              children: [
                for (final e in rest)
                  _Row(
                    key: e.widgetKey,
                    icon: e.icon,
                    title: e.title,
                    value: e.value,
                    onTap: e.onTap,
                    text: c.text,
                    muted: c.muted,
                  ),
                _Row(
                  key: const ValueKey('account-sign-out'),
                  icon: AppIcons.logout,
                  title: l10n.logOut,
                  onTap: look.onSignOut,
                  text: c.signOut,
                  muted: c.muted,
                  weight: FontWeight.w600,
                  arrow: false,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 119 The premium look's page colours in each mode.
class _NightColors {
  const _NightColors({
    required this.dark,
    required this.page,
    required this.card,
    required this.line,
    required this.buttonLine,
    required this.text,
    required this.muted,
    required this.avatar,
    required this.signOut,
  });

  factory _NightColors.of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark
      ? const _NightColors(
          dark: true,
          page: Color(0xFF0D1210),
          card: Color(0xFF141B18),
          line: Color(0xFF222B27),
          buttonLine: Color(0xFF2E3833),
          text: Color(0xFFF2F4F3),
          muted: Color(0xFFA3ADA8),
          avatar: Color(0xFF1B2420),
          signOut: Color(0xFFF0907F),
        )
      : const _NightColors(
          dark: false,
          page: Color(0xFFF6F2EA),
          card: Color(0xFFFFFFFF),
          line: Color(0xFFE9E1D0),
          buttonLine: Color(0xFFDCD2BE),
          text: Color(0xFF1C1A16),
          muted: Color(0xFF6B6457),
          avatar: Color(0xFFEFE7D6),
          signOut: Color(0xFFB42318),
        );

  final bool dark;
  final Color page;
  final Color card;
  final Color line;
  final Color buttonLine;
  final Color text;
  final Color muted;
  final Color avatar;
  final Color signOut;
}

class _Ring extends StatelessWidget {
  const _Ring(this.size, this.color);

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: color),
      ),
    ),
  );
}
