import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/models.dart';
import '../../core/auth/session.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/routing/feature_routes.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/avatar.dart';
import '../../core/widgets/coming_soon.dart';
import '../../core/widgets/logo.dart';
import '../../core/widgets/sym.dart';

/// The menu's sections, in the design's order (two by two).
enum MenuSection {
  home,
  qa,
  tutorials,
  academy,
  showcase,
  challenges,
  groups,
  friends,
  pros,
  events,
}

/// Opens the side menu over the page (dimmed at 45% under a 3px blur).
Future<void> openSideMenu(BuildContext context, {MenuSection? current}) =>
    Navigator.of(context, rootNavigator: true).push(
      PageRouteBuilder<void>(
        opaque: false,
        barrierDismissible: true,
        barrierLabel: MaterialLocalizations.of(context)
            .modalBarrierDismissLabel,
        transitionDuration: const Duration(milliseconds: 280),
        reverseTransitionDuration: const Duration(milliseconds: 220),
        pageBuilder: (context, animation, _) =>
            SideMenu(current: current, animation: animation),
      ),
    );

/// The side menu (mobile.html `.drawer`): the logo and Community, the
/// member's card with their level's bar, every section, their groups, and
/// at the foot light or dark, saved, settings and log out.
class SideMenu extends ConsumerWidget {
  const SideMenu({super.key, this.current, required this.animation});

  final MenuSection? current;
  final Animation<double> animation;

  static const width = 318.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final me = ref.watch(meProvider);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final curve = CurvedAnimation(
      parent: animation,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    );
    void close() => Navigator.of(context).pop();
    void go(String location) {
      close();
      GoRouter.of(context).go(location);
    }

    void push(String location) {
      close();
      GoRouter.of(context).push(location);
    }

    void soon(String title) {
      close();
      showComingSoon(context, title);
    }

    final questions = ref.watch(newQuestionsProvider);
    final config = ref.watch(sectionsProvider).value ?? const CommunityConfig();
    // A section opens when the server says it is live and the app has its
    // screen; otherwise "Coming soon", never a dead tap.
    VoidCallback open(MenuSection s, String label, VoidCallback? screen) =>
        screen == null || config.comingSoon(s.name)
        ? () => soon(label)
        : screen;
    int countOf(MenuSection s, [int own = 0]) => config.count(s.name) ?? own;
    final items = <(MenuSection, IconData, String, VoidCallback, int)>[
      (
        MenuSection.home,
        Symbols.home_rounded,
        l.menuHome,
        open(MenuSection.home, l.menuHome, () => go(Paths.home)),
        0,
      ),
      (
        MenuSection.qa,
        Symbols.forum_rounded,
        l.menuQa,
        open(MenuSection.qa, l.menuQa, () => go(FeatureLinks.qa)),
        countOf(MenuSection.qa, questions),
      ),
      (
        MenuSection.tutorials,
        Symbols.menu_book_rounded,
        l.menuTutorials,
        open(
          MenuSection.tutorials,
          l.menuTutorials,
          () => go(FeatureLinks.learn),
        ),
        countOf(MenuSection.tutorials),
      ),
      (
        MenuSection.academy,
        Symbols.school_rounded,
        l.menuAcademy,
        open(MenuSection.academy, l.menuAcademy, null),
        0,
      ),
      (
        MenuSection.showcase,
        Symbols.apps_rounded,
        l.menuShowcase,
        open(MenuSection.showcase, l.menuShowcase, null),
        0,
      ),
      (
        MenuSection.challenges,
        Symbols.emoji_events_rounded,
        l.menuChallenges,
        open(MenuSection.challenges, l.menuChallenges, null),
        0,
      ),
      (
        MenuSection.groups,
        Symbols.groups_rounded,
        l.menuGroups,
        open(MenuSection.groups, l.menuGroups, null),
        0,
      ),
      (
        MenuSection.friends,
        Symbols.diversity_3_rounded,
        l.menuFriends,
        open(
          MenuSection.friends,
          l.menuFriends,
          () => push(me == null ? Paths.me : Paths.friends(me.member.id)),
        ),
        countOf(MenuSection.friends),
      ),
      (
        MenuSection.pros,
        Symbols.work_rounded,
        l.menuPros,
        open(MenuSection.pros, l.menuPros, null),
        0,
      ),
      (
        MenuSection.events,
        Symbols.event_rounded,
        l.menuEvents,
        open(MenuSection.events, l.menuEvents, null),
        0,
      ),
    ];

    return Stack(
      children: [
        // The page behind, dimmed (no blur).
        Positioned.fill(
          child: GestureDetector(
            key: const ValueKey('menu-dim'),
            onTap: close,
            child: FadeTransition(
              opacity: curve,
              child: const ColoredBox(color: Color(0x730A091E)),
            ),
          ),
        ),
        PositionedDirectional(
          top: 0,
          bottom: 0,
          start: 0,
          width: width,
          child: SlideTransition(
            position: Tween(
              begin: Offset(rtl ? 1 : -1, 0),
              end: Offset.zero,
            ).animate(curve),
            child: Material(
              key: const ValueKey('side-menu'),
              type: MaterialType.transparency,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadiusDirectional.horizontal(
                    end: const Radius.circular(34),
                  ).resolve(Directionality.of(context)),
                  color: Brand.darkPaper,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadiusDirectional.horizontal(
                    end: const Radius.circular(34),
                  ).resolve(Directionality.of(context)),
                  child: Stack(
                    children: [
                      // The orange glow at its top corner.
                      PositionedDirectional(
                        top: -100,
                        start: -120,
                        child: Container(
                          width: 480,
                          height: 400,
                          decoration: const BoxDecoration(),
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.fromLTRB(
                          18,
                          MediaQuery.paddingOf(context).top + 8,
                          18,
                          20,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(9),
                                  child: const CommunityLogo(
                                    size: 30,
                                    radius: 9,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  l.menuCommunity,
                                  style: const TextStyle(
                                    fontFamily: 'Readex Pro',
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                    color: Color(0xFFEDEAF5),
                                  ),
                                ),
                                const Spacer(),
                                _Square(
                                  key: const ValueKey('menu-close'),
                                  icon: Symbols.close_rounded,
                                  size: 36,
                                  radius: 12,
                                  iconSize: 20,
                                  label: l.commonClose,
                                  onTap: close,
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            if (me != null)
                              _ProfileCard(onTap: () => push(Paths.me)),
                            const SizedBox(height: 12),
                            _NavGrid(items: items, current: current),
                            _Heading(l.menuYourGroups),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                              ),
                              child: Text(
                                l.menuGroupsSoon,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  color: Color(0xFF8F8BAE),
                                  height: 1.45,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Row(
                              children: [
                                _ThemeToggle(
                                  dark: dark,
                                  onChange: (d) => ref
                                      .read(themeModeProvider.notifier)
                                      .set(
                                        d ? ThemeMode.dark : ThemeMode.light,
                                      ),
                                ),
                                const Spacer(),
                                _Square(
                                  key: const ValueKey('menu-saved'),
                                  icon: Symbols.bookmark_rounded,
                                  label: l.menuSaved,
                                  onTap: () => push(FeatureLinks.saved),
                                ),
                                const SizedBox(width: 8),
                                _Square(
                                  key: const ValueKey('menu-settings'),
                                  icon: Symbols.settings_rounded,
                                  label: l.menuSettings,
                                  onTap: () => push(Paths.settings),
                                ),
                                const SizedBox(width: 8),
                                _Square(
                                  key: const ValueKey('menu-logout'),
                                  icon: Symbols.logout_rounded,
                                  label: l.menuLogOut,
                                  onTap: () async {
                                    close();
                                    await ref
                                        .read(sessionProvider.notifier)
                                        .signOut();
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// The member's card (`.prof`): avatar in its ring, name, level and points,
/// the level's bar, a chevron to the profile.
class _ProfileCard extends ConsumerWidget {
  const _ProfileCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider)!;
    final m = me.member;
    final level = m.level;
    final points = context.l10n.menuPoints(me.points);
    return GestureDetector(
      key: const ValueKey('menu-profile'),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0x0FFFFFFF),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x17FFFFFF)),
        ),
        child: Row(
          children: [
            MeAvatar(
              id: m.id,
              name: m.name,
              url: m.avatarUrl,
              size: 46,
              edge: Brand.indigo,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    m.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFEDEAF5),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    level == null || level.isEmpty
                        ? points
                        : '$level · $points',
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xFFA9A5C2),
                    ),
                  ),
                  const SizedBox(height: 7),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(5),
                    // The whole track (`.pb`), the progress from its start.
                    child: SizedBox(
                      height: 5,
                      width: double.infinity,
                      child: Stack(
                        children: [
                          const Positioned.fill(
                            child: ColoredBox(color: Color(0x1FFFFFFF)),
                          ),
                          FractionallySizedBox(
                            alignment: AlignmentDirectional.centerStart,
                            heightFactor: 1,
                            widthFactor: me.progress,
                            child: Container(
                              decoration: const BoxDecoration(
                                color: Brand.orange,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Sym(
              Directionality.of(context) == TextDirection.rtl
                  ? Symbols.chevron_left_rounded
                  : Symbols.chevron_right_rounded,
              size: 24,
              color: const Color(0xFFA9A5C2),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavGrid extends StatelessWidget {
  const _NavGrid({required this.items, required this.current});

  final List<(MenuSection, IconData, String, VoidCallback, int)> items;
  final MenuSection? current;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < items.length; i += 2) {
      if (i > 0) rows.add(const SizedBox(height: 8));
      rows.add(
        Row(
          children: [
            Expanded(
              child: _NavItem(item: items[i], on: items[i].$1 == current),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: i + 1 < items.length
                  ? _NavItem(item: items[i + 1], on: items[i + 1].$1 == current)
                  : const SizedBox(),
            ),
          ],
        ),
      );
    }
    return Column(children: rows);
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.item, required this.on});

  final (MenuSection, IconData, String, VoidCallback, int) item;
  final bool on;

  @override
  Widget build(BuildContext context) {
    final (section, icon, label, onTap, count) = item;
    return Semantics(
      button: true,
      selected: on,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        key: ValueKey('menu-${section.name}'),
        onTap: onTap,
        child: Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: on ? null : const Color(0x0AFFFFFF),
            gradient: on ? Brand.sunrise : null,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Sym(
                icon,
                size: 21,
                fill: on,
                color: on ? Colors.white : const Color(0xFFA9A5C2),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: on ? FontWeight.w600 : FontWeight.w500,
                    color: on ? Colors.white : const Color(0xFFDAD6EA),
                  ),
                ),
              ),
              if (count > 0)
                Container(
                  key: ValueKey('menu-${section.name}-count'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: Brand.orange,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Text(
                    '$count',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 16, 4, 8),
    child: Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w600,
        letterSpacing: .6,
        color: Color(0xFF8F8BAE),
      ),
    ),
  );
}

/// Light or dark (`.tg`).
class _ThemeToggle extends StatelessWidget {
  const _ThemeToggle({required this.dark, required this.onChange});

  final bool dark;
  final ValueChanged<bool> onChange;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget half(bool forDark) {
      final on = dark == forDark;
      return Semantics(
        button: true,
        selected: on,
        label: forDark ? l.menuDark : l.menuLight,
        excludeSemantics: true,
        child: GestureDetector(
          key: ValueKey(forDark ? 'menu-dark' : 'menu-light'),
          onTap: () => onChange(forDark),
          child: Container(
            width: 38,
            height: 32,
            decoration: BoxDecoration(
              color: on ? Colors.white : null,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Sym(
              forDark ? Symbols.dark_mode_rounded : Symbols.light_mode_rounded,
              size: 19,
              fill: on,
              color: on ? Brand.navy : const Color(0xFFEDEAF5),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0x14FFFFFF),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [half(false), half(true)],
      ),
    );
  }
}

/// A square button of the menu (`.x`, `.fi span`).
class _Square extends StatelessWidget {
  const _Square({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.size = 40,
    this.radius = 13,
    this.iconSize = 20,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final double size;
  final double radius;
  final double iconSize;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    excludeSemantics: true,
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: const Color(0x14FFFFFF),
          borderRadius: BorderRadius.circular(radius),
        ),
        alignment: Alignment.center,
        child: Sym(icon, size: iconSize, color: const Color(0xFFEDEAF5)),
      ),
    ),
  );
}
