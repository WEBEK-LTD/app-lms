import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/auth/session.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/sym.dart';

/// English (the default), العربية or Türkçe: the app follows at once, and a
/// signed-in member's choice is kept on their account too (their emails).
Future<void> showLanguageSheet(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _LanguageSheet(),
    );

class _LanguageSheet extends ConsumerWidget {
  const _LanguageSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final current = ref.watch(languageProvider);
    final options = [
      ('en', l.langEnglish),
      ('ar', l.langArabic),
      ('tr', l.langTurkish),
    ];
    return SafeArea(
      child: Container(
        key: const ValueKey('language-sheet'),
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        padding: const EdgeInsets.fromLTRB(14, 18, 14, 10),
        decoration: BoxDecoration(
          color: p.dark ? Brand.navy2 : Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                child: Text(
                  l.langTitle,
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: p.ink,
                  ),
                ),
              ),
              for (final (code, name) in options)
                ListTile(
                  key: ValueKey('language-$code'),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  title: Text(
                    name,
                    style: TextStyle(fontWeight: FontWeight.w600, color: p.ink),
                  ),
                  trailing: code == current
                      ? const Sym(
                          Symbols.check_circle_rounded,
                          size: 22,
                          fill: true,
                          color: Brand.orange,
                        )
                      : null,
                  onTap: () {
                    ref.read(languageProvider.notifier).set(code);
                    if (ref.read(meProvider) != null) {
                      ref
                          .read(communityApiProvider)
                          .updateMe(language: code)
                          .ignore();
                    }
                    Navigator.of(context).pop();
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
