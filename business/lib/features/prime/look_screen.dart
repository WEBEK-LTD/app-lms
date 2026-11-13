import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../studio/studio_widgets.dart';
import 'prime_state.dart';
import 'prime_widgets.dart';

/// A look's swatch as the PrimeLook board draws it: its page, its header,
/// its cards and its accent.
({Color bg, Color head, Color card, Color accent}) lookSwatch(PrimeLook look) =>
    switch (look) {
      PrimeLook.classic => (
        bg: Brand.ivory,
        head: Brand.midnight,
        card: Brand.white,
        accent: Brand.ember,
      ),
      PrimeLook.midnightGold => (
        bg: Brand.midnight,
        head: const Color(0xFF1B1A38),
        card: const Color(0xFF26254A),
        accent: Brand.goldLight,
      ),
      PrimeLook.ember => (
        bg: const Color(0xFFFFF1EA),
        head: Brand.emberText,
        card: Brand.white,
        accent: Brand.midnight,
      ),
      PrimeLook.sage => (
        bg: const Color(0xFFEEF2EC),
        head: const Color(0xFF1F3B2D),
        card: Brand.white,
        accent: const Color(0xFFB7791F),
      ),
    };

String lookName(BuildContext context, PrimeLook look) {
  final l10n = context.l10n;
  return switch (look) {
    PrimeLook.classic => l10n.lookClassic,
    PrimeLook.midnightGold => l10n.lookMidnightGold,
    PrimeLook.ember => l10n.lookEmber,
    PrimeLook.sage => l10n.lookSage,
  };
}

/// 125 Prime looks (the PrimeLook board): Classic, Midnight gold, Ember and
/// Sage, each light and dark as the phone or Appearance says; the Prime
/// header on Today. Kept on this phone.
class LookScreen extends ConsumerWidget {
  const LookScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final chosen = ref.watch(primeLookProvider);
    final header = ref.watch(primeHeaderProvider);
    final mode = switch (ref.watch(themeModeProvider)) {
      ThemeMode.light => l10n.themeLight,
      ThemeMode.dark => l10n.themeDark,
      ThemeMode.system => l10n.themeSystem,
    };
    return Scaffold(
      appBar: AppBar(title: Text(l10n.lookTitle), actions: const [PrimeChip()]),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.92,
            children: [
              for (final look in PrimeLook.values)
                _LookCard(
                  look: look,
                  chosen: look == chosen,
                  onTap: () => ref.read(primeLookProvider.notifier).set(look),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Box(
            radius: 18,
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsetsDirectional.fromSTEB(14, 4, 14, 4),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: c.line)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.primeHeaderOnToday,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              l10n.primeHeaderHelp,
                              style: TextStyle(fontSize: 13, color: c.ink2),
                            ),
                          ],
                        ),
                      ),
                      PrimeSwitch(
                        value: header,
                        label: l10n.primeHeaderOnToday,
                        onChanged: (on) =>
                            ref.read(primeHeaderProvider.notifier).set(on),
                      ),
                    ],
                  ),
                ),
                InkWell(
                  onTap: () => context.push(Paths.appearance),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.lightOrDark,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                l10n.lightOrDarkHelp(mode),
                                style: TextStyle(fontSize: 13, color: c.ink2),
                              ),
                            ],
                          ),
                        ),
                        DirectionalIcon(AppIcons.forward, color: c.ink2),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              l10n.lookFooter,
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
          ),
        ],
      ),
    );
  }
}

class _LookCard extends StatelessWidget {
  const _LookCard({
    required this.look,
    required this.chosen,
    required this.onTap,
  });

  final PrimeLook look;
  final bool chosen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final s = lookSwatch(look);
    final name = lookName(context, look);
    return Semantics(
      button: true,
      selected: chosen,
      label: chosen ? context.l10n.lookChosen(name) : name,
      excludeSemantics: true,
      child: Material(
        color: c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: chosen
              ? const BorderSide(color: Brand.goldLight, width: 2)
              : BorderSide(color: c.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: s.bg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Flexible(
                          flex: 30,
                          child: Container(
                            decoration: BoxDecoration(
                              color: s.head,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                        const Spacer(flex: 6),
                        Flexible(
                          flex: 34,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (var i = 0; i < 2; i++) ...[
                                if (i > 0) const SizedBox(width: 6),
                                Expanded(
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: s.card,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const Spacer(flex: 6),
                        Container(
                          width: 54,
                          height: 18,
                          decoration: BoxDecoration(
                            color: s.accent,
                            borderRadius: BorderRadius.circular(9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (chosen)
                      Icon(
                        AppIcons.checkCircle,
                        fill: 1,
                        size: 20,
                        color: c.success,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
