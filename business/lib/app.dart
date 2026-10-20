import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers.dart';
import 'core/routing/paths.dart';
import 'core/routing/router.dart';
import 'core/services/push.dart';
import 'core/session.dart';
import 'core/theme/theme.dart';
import 'l10n/app_localizations.dart';

/// 59 Yallapp Business.
class BusinessApp extends ConsumerStatefulWidget {
  const BusinessApp({super.key});

  @override
  ConsumerState<BusinessApp> createState() => _BusinessAppState();
}

class _BusinessAppState extends ConsumerState<BusinessApp>
    with WidgetsBindingObserver {
  final _subscriptions = <StreamSubscription<Object?>>[];
  final _messenger = GlobalKey<ScaffoldMessengerState>();
  DateTime? _backgroundAt;

  /// After this long in the background the lock asks again.
  static const _relock = Duration(minutes: 5);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final push = ref.read(pushServiceProvider);
    _subscriptions
      ..add(push.opened.listen(_open))
      ..add(push.foreground.listen(_foreground));
    unawaited(push.initial().then((data) => data == null ? null : _open(data)));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    for (final s in _subscriptions) {
      s.cancel();
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _backgroundAt = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final since = _backgroundAt;
      _backgroundAt = null;
      if (since != null && DateTime.now().difference(since) > _relock) {
        ref.read(sessionProvider.notifier).lockIfOn();
      }
    }
  }

  /// A tapped push: switch to its app and open its screen (after the lock
  /// or the sign-in when needed).
  void _open(Map<String, dynamic> data) {
    final target = pushTarget(data);
    openTarget(ref, target);
  }

  void _foreground(RemoteNotice notice) {
    // Screens that show what the push is about load it again.
    ref.read(pushEventsProvider.notifier).add(notice);
    final l10n = _messenger.currentContext == null
        ? null
        : AppLocalizations.of(_messenger.currentContext!);
    final text = [
      notice.title,
      notice.body,
    ].where((t) => t.isNotEmpty).join(': ');
    if (text.isEmpty) return;
    _messenger.currentState?.showSnackBar(
      SnackBar(
        content: Text(text),
        action: SnackBarAction(
          label: l10n?.open ?? 'Open',
          onPressed: () => _open(notice.data),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);
    final arabic = locale.languageCode == 'ar';
    return MaterialApp.router(
      title: 'Yallapp Business',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      scaffoldMessengerKey: _messenger,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: buildTheme(arabic: arabic),
      // 61 The dark theme, following the phone unless chosen in Settings.
      darkTheme: buildTheme(arabic: arabic, brightness: Brightness.dark),
      themeMode: ref.watch(themeModeProvider),
    );
  }
}

/// Pushes that arrived while the app is open (Kitchen mode listens).
class PushEvents extends Notifier<RemoteNotice?> {
  @override
  RemoteNotice? build() => null;

  void add(RemoteNotice notice) => state = notice;
}

final pushEventsProvider = NotifierProvider<PushEvents, RemoteNotice?>(
  PushEvents.new,
);

const _tabs = {
  Paths.today,
  Paths.orders,
  Paths.appointments,
  Paths.events,
  Paths.donations,
  Paths.catalog,
  Paths.inbox,
  Paths.stats,
  Paths.more,
};

/// Opens a push's screen on its app.
void openTarget(WidgetRef ref, PushTarget target) {
  final me = ref.read(meProvider);
  final appId = target.appId;
  if (appId != null && (me == null || me.apps.any((a) => a.id == appId))) {
    ref.read(selectedAppProvider.notifier).select(appId);
  }
  if (me == null) {
    ref.read(pendingLocationProvider.notifier).set(target.location);
    return;
  }
  final router = ref.read(routerProvider);
  final path = Uri.parse(target.location).path;
  final first =
      '/${path.split('/').where((p) => p.isNotEmpty).firstOrNull ?? ''}';
  if (_tabs.contains(first)) {
    router.go(target.location);
  } else {
    router.go(Paths.today);
    router.push(target.location);
  }
}

/// While the session loads.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: context.yb.background,
    body: Center(child: CircularProgressIndicator()),
  );
}
