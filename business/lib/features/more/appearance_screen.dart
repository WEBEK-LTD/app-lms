import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/widgets/l10n.dart';

/// 61 Light or dark: the phone's setting, or always light or dark (kept on
/// this phone).
class AppearanceScreen extends ConsumerWidget {
  const AppearanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final options = [
      (ThemeMode.system, l10n.themeSystem, l10n.themeSystemHelp),
      (ThemeMode.light, l10n.themeLight, null),
      (ThemeMode.dark, l10n.themeDark, null),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l10n.appearance)),
      body: RadioGroup<ThemeMode>(
        groupValue: ref.watch(themeModeProvider),
        onChanged: (mode) {
          if (mode != null) ref.read(themeModeProvider.notifier).set(mode);
        },
        child: ListView(
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
    );
  }
}
