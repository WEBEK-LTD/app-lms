import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/widgets/l10n.dart';

/// 59 The app's language: the same choice as the dashboard's language
/// switcher (saved to the account), or the phone's.
class LanguageScreen extends ConsumerWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final chosen = ref.watch(languageProvider);
    final options = <(String?, String)>[
      (null, l10n.phoneLanguage),
      ('en', 'English'),
      ('ar', 'العربية'),
      ('tr', 'Türkçe'),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l10n.language)),
      body: RadioGroup<String?>(
        groupValue: chosen,
        onChanged: (code) =>
            ref.read(sessionProvider.notifier).setLanguage(code),
        child: ListView(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: Text(l10n.languageHelp),
            ),
            for (final (code, name) in options)
              RadioListTile<String?>(value: code, title: Text(name)),
          ],
        ),
      ),
    );
  }
}
