import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/l10n.dart';
import 'core/providers.dart';
import 'core/routing/app_router.dart';
import 'core/theme/theme.dart';

class CommunityApp extends ConsumerWidget {
  const CommunityApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final language = ref.watch(languageProvider);
    return MaterialApp.router(
      title: 'Yallapp Community',
      debugShowCheckedModeBanner: false,
      routerConfig: ref.watch(routerProvider),
      theme: communityTheme(dark: false),
      darkTheme: communityTheme(dark: true),
      themeMode: ref.watch(themeModeProvider),
      locale: Locale(language),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
