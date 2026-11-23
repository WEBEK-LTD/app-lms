import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/providers.dart';
import '../../core/theme/pharaonic.dart';
import '../../core/theme/pharaonic_widgets.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 61 Light or dark: the phone's setting, or always light or dark (kept on
/// this phone). 215 Above it, the theme: the default look first, the
/// Pharaonic one beside it; each has its own light and dark.
class AppearanceScreen extends ConsumerWidget {
  const AppearanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = ref.watch(appThemeProvider);
    final options = [
      (ThemeMode.system, l10n.themeSystem, l10n.themeSystemHelp),
      (ThemeMode.light, l10n.themeLight, null),
      (ThemeMode.dark, l10n.themeDark, null),
    ];
    void choose(AppTheme t) => ref.read(appThemeProvider.notifier).set(t);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.appearance)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          SectionTitle(l10n.themeTitle),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _ThemeCard(
                      key: const ValueKey('theme-standard'),
                      name: 'Yallapp',
                      badge: l10n.themeDefaultBadge,
                      help: l10n.themeDefaultHelp,
                      preview: const _Preview(pharaonic: false),
                      chosen: theme == AppTheme.standard,
                      onTap: () => choose(AppTheme.standard),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _ThemeCard(
                      key: const ValueKey('theme-pharaonic'),
                      name: l10n.themePharaonic,
                      help: l10n.themePharaonicHelp,
                      preview: const _Preview(pharaonic: true),
                      chosen: theme == AppTheme.pharaonic,
                      onTap: () => choose(AppTheme.pharaonic),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SectionTitle(l10n.themeModeTitle),
          RadioGroup<ThemeMode>(
            groupValue: ref.watch(themeModeProvider),
            onChanged: (mode) {
              if (mode != null) ref.read(themeModeProvider.notifier).set(mode);
            },
            child: Column(
              children: [
                for (final (mode, name, help) in options)
                  RadioListTile<ThemeMode>(
                    value: mode,
                    title: Text(name),
                    subtitle: help == null ? null : Text(help),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Text(
              '${l10n.themeModeHelp}\n${l10n.lookFooter}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

class _ThemeCard extends StatelessWidget {
  const _ThemeCard({
    super.key,
    required this.name,
    required this.help,
    required this.preview,
    required this.chosen,
    required this.onTap,
    this.badge,
  });

  final String name;
  final String? badge;
  final String help;
  final Widget preview;
  final bool chosen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final theme = Theme.of(context);
    final l10n = context.l10n;
    return Semantics(
      button: true,
      selected: chosen,
      label: chosen ? l10n.lookChosen(name) : name,
      excludeSemantics: true,
      child: Material(
        color: c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: chosen ? c.gold : c.line,
            width: chosen ? 2 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AspectRatio(aspectRatio: 0.62, child: preview),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: theme.textTheme.titleMedium,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(
                      chosen
                          ? Symbols.radio_button_checked_rounded
                          : Symbols.radio_button_unchecked_rounded,
                      fill: chosen ? 1 : 0,
                      color: chosen ? c.gold : c.ink2,
                    ),
                  ],
                ),
                if (badge != null) ...[
                  const SizedBox(height: 4),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: c.muted,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: c.line),
                      ),
                      child: Text(badge!, style: theme.textTheme.labelSmall),
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Text(help, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A miniature Today in each theme's own colors (dark for Pharaonic, its
/// hero look; the default as it opens).
class _Preview extends StatelessWidget {
  const _Preview({required this.pharaonic});

  final bool pharaonic;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    if (!pharaonic) {
      final c = dark ? YbColors.dark : YbColors.light;
      return _Mini(
        background: c.background,
        tile: c.surface,
        line: c.line,
        bar: c.ink,
        soft: c.muted,
        accent: c.accent,
        button: c.ink,
        outline: c.ink,
      );
    }
    final c = PharaonicColors.dark;
    const o = YbOrnaments.darkSet;
    return Theme(
      data: Theme.of(context).copyWith(extensions: [c, o]),
      child: Builder(
        builder: (context) => ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: PharaonicBackdrop(
            child: _Mini(
              background: Colors.transparent,
              tile: c.surface,
              line: o.goldLine,
              bar: c.gold,
              soft: c.line,
              accent: o.faience,
              button: o.metal[2],
              outline: c.danger,
              top: const Column(
                children: [
                  Cornice(),
                  SizedBox(height: 4),
                  WingedSun(width: 88),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Mini extends StatelessWidget {
  const _Mini({
    required this.background,
    required this.tile,
    required this.line,
    required this.bar,
    required this.soft,
    required this.accent,
    required this.button,
    required this.outline,
    this.top,
  });

  final Color background, tile, line, bar, soft, accent, button, outline;
  final Widget? top;

  @override
  Widget build(BuildContext context) {
    Widget strip(double widthFactor, Color color, [double h = 5]) =>
        FractionallySizedBox(
          alignment: AlignmentDirectional.centerStart,
          widthFactor: widthFactor,
          child: Container(
            height: h,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        );
    Widget box(List<Widget> children) => Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: tile,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
    return ExcludeSemantics(
      child: Container(
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: line),
        ),
        padding: EdgeInsets.fromLTRB(8, top == null ? 10 : 0, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (top != null) ...[top!, const SizedBox(height: 6)],
            strip(0.6, bar, 7),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: box([
                    strip(0.7, soft),
                    const SizedBox(height: 4),
                    strip(0.5, bar, 6),
                  ]),
                ),
                const SizedBox(width: 5),
                Expanded(
                  child: box([
                    strip(0.7, soft),
                    const SizedBox(height: 4),
                    strip(0.4, bar, 6),
                  ]),
                ),
              ],
            ),
            const SizedBox(height: 6),
            box([
              strip(0.25, accent, 4),
              const SizedBox(height: 4),
              strip(0.5, bar, 6),
              const SizedBox(height: 4),
              strip(0.9, soft),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: Container(
                      height: 14,
                      decoration: BoxDecoration(
                        color: button,
                        borderRadius: BorderRadius.circular(5),
                      ),
                    ),
                  ),
                  const SizedBox(width: 5),
                  Expanded(
                    flex: 2,
                    child: Container(
                      height: 14,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(color: outline, width: 1.2),
                      ),
                    ),
                  ),
                ],
              ),
            ]),
            const Spacer(),
            Container(
              height: 18,
              decoration: BoxDecoration(
                color: tile,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
