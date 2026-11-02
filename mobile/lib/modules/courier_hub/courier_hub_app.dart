import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app.dart';
import '../../core/l10n/l10n.dart';
import '../../core/l10n/language.dart';
import '../../core/providers.dart';
import '../../core/storage/local_settings.dart';
import '../../core/theme/app_look.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import 'data/courier_hub.dart';
import 'screens/companies_screen.dart';
import 'screens/hub_sign_in_screen.dart';

/// 104.8.4 Yallapp Courier's root (build config `courier_hub`): its own
/// sign-in and companies under Yallapp's name and colours, then the chosen
/// company's courier screens, the app's own ([YallappApp]) in a container
/// of their own, on the company's hosted API.
class YallappCourierApp extends ConsumerWidget {
  const YallappCourierApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(courierHubProvider);
    if (state is HubOpen) {
      return UncontrolledProviderScope(
        key: ValueKey('hub-open-${state.company.appId}'),
        container: state.container,
        child: const YallappApp(),
      );
    }
    return _HubApp(state: state);
  }
}

class _HubApp extends ConsumerStatefulWidget {
  const _HubApp({required this.state});

  final HubState state;

  @override
  ConsumerState<_HubApp> createState() => _HubAppState();
}

class _HubAppState extends ConsumerState<_HubApp> {
  final _navigator = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    // Signed in: the code screen goes with the sign-in.
    ref.listen(courierHubProvider, (previous, next) {
      if (previous is HubSignedOut && next is! HubSignedOut) {
        _navigator.currentState?.popUntil((route) => route.isFirst);
      }
    });
    final env = ref.watch(appEnvironmentProvider);
    final settings = ref.watch(localSettingsProvider);
    final language = ref.watch(appLanguageProvider);
    final direction = ref.watch(appTextDirectionProvider);
    final look = AppLook.resolve(env.build, null);
    setCurrentLanguage(language, null);
    final state = widget.state;
    final Widget home = switch (state) {
      HubChecking() => const Scaffold(body: LoadingView()),
      HubSignedOut() => const HubSignInScreen(),
      HubCompanies() => CompaniesScreen(state: state),
      HubOpening(:final company) => CompanyOpeningScreen(company: company),
      // Shown by [YallappCourierApp].
      HubOpen() => const Scaffold(body: LoadingView()),
    };
    return MaterialApp(
      navigatorKey: _navigator,
      title: env.build.appName,
      debugShowCheckedModeBanner: false,
      theme: look.theme(Brightness.light),
      darkTheme: look.theme(Brightness.dark),
      themeMode: look.themeModeFor(settings),
      locale: Locale(language),
      supportedLocales: ref.watch(appLocalesProvider),
      localizationsDelegates: appLocalizationsDelegates(),
      builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
        value: overlayStyleOn(Theme.of(context).scaffoldBackgroundColor),
        child: Directionality(
          textDirection: direction,
          child: child ?? const SizedBox(),
        ),
      ),
      home: home,
    );
  }
}
