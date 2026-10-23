import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/gate/switches.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/own_icon.dart';
import 'page_actions.dart';

/// 82.5 The side menu built in the dashboard: the entries this app can open.
/// Empty: no menu and no menu button.
List<NavTab> sideMenuEntries(WidgetRef ref) {
  final gate = ref.watch(appGateProvider);
  // 83.3 Unless the team switched the side menu off for this app.
  if (!switchOn(ref, 'side_menu')) return const [];
  final menu = gate is GateReady ? gate.navigation?.menu : null;
  return [
    for (final entry in menu ?? const <NavTab>[])
      if (canOpenAction(ref, entry.target)) entry,
  ];
}

/// The bottom tabs' screen that holds the side menu, above [context].
ScaffoldState? _menuHolder(BuildContext context) {
  ScaffoldState? holder;
  context.visitAncestorElements((element) {
    final state = element is StatefulElement ? element.state : null;
    if (state is ScaffoldState && state.hasDrawer) {
      holder = state;
      return false;
    }
    return true;
  });
  return holder;
}

/// The side menu, opened from [SideMenuButton] or from the screen's edge.
class SideMenu extends ConsumerWidget {
  const SideMenu({super.key, required this.onOpen});

  /// Opens an entry's target (from the screen that holds the menu).
  final ValueChanged<PageAction> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final entries = sideMenuEntries(ref);
    return Drawer(
      backgroundColor: p.surface,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 12),
              child: Semantics(
                header: true,
                child: Text(
                  ref.watch(appEnvironmentProvider).build.appName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
            ),
            for (final entry in entries)
              ListTile(
                key: ValueKey('side-menu-${entry.id}'),
                leading: OwnIcon(
                  symbolByName(entry.icon),
                  url: switchOn(ref, 'own_icons') ? entry.iconUrl : null,
                  size: 24,
                  color: p.link,
                ),
                title: Text(
                  entry.label,
                  style: TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  onOpen(entry.target);
                },
              ),
          ],
        ),
      ),
    );
  }
}

/// Opens the side menu; nothing when the app has none.
class SideMenuButton extends ConsumerWidget {
  const SideMenuButton({super.key, this.onDark = false});

  /// On the main colour (the Bold template's header).
  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (sideMenuEntries(ref).isEmpty) return const SizedBox.shrink();
    final p = context.palette;
    return SquareIconButton(
      icon: AppIcons.sideMenu,
      label: context.l10n.sideMenuOpen,
      background: onDark ? p.primarySoft : null,
      foreground: onDark ? p.onPrimarySoft : null,
      bordered: !onDark,
      onPressed: () => _menuHolder(context)?.openDrawer(),
    );
  }
}
