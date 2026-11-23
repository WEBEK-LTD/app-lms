import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/api/models.dart' show Me;
import 'core/providers.dart';
import 'core/routing/paths.dart';
import 'core/routing/router.dart';
import 'core/services/push.dart';
import 'core/services/ringtones.dart';
import 'core/session.dart';
import 'core/theme/icons.dart';
import 'core/theme/theme.dart';
import 'features/auth/lock_screen.dart' show AppMark;
import 'features/more/ringtones_screen.dart' show ringWords;
import 'features/prime/prime_state.dart';
import 'features/prime/prime_today.dart';
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

  /// 132 The app isn't in front (the app switcher, a call): its content is
  /// covered while the lock is on.
  bool _away = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final push = ref.read(pushServiceProvider);
    _subscriptions
      ..add(push.opened.listen(_open))
      ..add(push.foreground.listen(_foreground));
    unawaited(push.initial().then((data) => data == null ? null : _open(data)));
    // 207 Android's own notifications (the ringing ones) open their screen too.
    final native = ref.read(ringNativeProvider);
    _subscriptions.add(native.opened.listen(_open));
    unawaited(
      native.initial().then((data) => data == null ? null : _open(data)),
    );
    unawaited(native.stopRinging());
    // 132 Hidden in the app switcher while the lock is on.
    unawaited(
      ref
          .read(privacyProvider)
          .setSecure(ref.read(settingsProvider).biometricLock == true),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    for (final s in _subscriptions) {
      s.cancel();
    }
    super.dispose();
  }

  /// 132 Locks again after the time the owner chose in Settings
  /// (immediately, 1, 5 or 15 minutes) away; the system's own unlock prompt
  /// taking the screen isn't being away.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final session = ref.read(sessionProvider.notifier);
    final lockOn = ref.read(settingsProvider).biometricLock == true;
    final away = state != AppLifecycleState.resumed;
    if (lockOn && away != _away && !session.authenticating) {
      setState(() => _away = away);
    } else if (!away && _away) {
      setState(() => _away = false);
    }
    if (state == AppLifecycleState.hidden ||
        state == AppLifecycleState.paused) {
      if (!session.authenticating) _backgroundAt ??= DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      session.settled();
      // 207 The app is open: a notification ringing in the background stops.
      unawaited(ref.read(ringNativeProvider).stopRinging());
      final since = _backgroundAt;
      _backgroundAt = null;
      final after = Duration(
        minutes: ref.read(settingsProvider).lockAfterMinutes,
      );
      if (since != null && DateTime.now().difference(since) >= after) {
        session.lockIfOn();
      }
    }
  }

  /// A tapped push: switch to its app and open its screen (after the lock
  /// or the sign-in when needed).
  Future<void> _open(Map<String, dynamic> data) async {
    // 207 Opened: whatever was ringing for it stops.
    _stopRing();
    // 214 The home-screen widget opens its app's orders.
    final target = data['widget'] == 'orders'
        ? widgetTarget(ref.read(meProvider), '${data['app_id'] ?? ''}')
        : pushTarget(data);
    final switched = await openTarget(ref, target);
    // 64 Said when it moved to the push's business.
    if (!mounted || !switched || target.businessName == null) return;
    final messenger = _messenger.currentState;
    if (messenger == null || !messenger.mounted) return;
    final l10n = AppLocalizations.of(messenger.context);
    messenger.showSnackBar(
      SnackBar(content: Text(l10n.switchedTo(target.businessName!))),
    );
  }

  void _foreground(RemoteNotice notice) {
    // Screens that show what the push is about load it again.
    ref.read(pushEventsProvider.notifier).add(notice);
    // 214 And the home-screen widget (Android's receiver does it in the
    // background).
    if (widgetKinds.contains(notice.data['kind'])) {
      unawaited(ref.read(homeWidgetProvider).refresh());
    }
    // 125 The morning brief also shows on Today.
    final appId = '${notice.data['app_id'] ?? ''}';
    if (notice.data['kind'] == 'morning_brief' &&
        appId.isNotEmpty &&
        notice.body.isNotEmpty) {
      ref.read(lastBriefProvider.notifier).put(appId, notice.body);
    }
    final l10n = _messenger.currentContext == null
        ? null
        : AppLocalizations.of(_messenger.currentContext!);
    // 207 It sounds as chosen in Settings › Ringtones; a new order (or
    // booking) rings on until opened or silenced.
    if (_ring(notice, l10n)) return;
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

  /// 207 The push ringing in the app now, shown over every screen.
  RemoteNotice? _ringing;

  /// 207 Plays a push's sound; true when it rings on, with its card.
  bool _ring(RemoteNotice notice, AppLocalizations? l10n) {
    if (notice.data['kind'] == 'test') return false;
    final settings = ref.read(ringSettingsProvider);
    final group = soundGroupOf(notice.data);
    // 214 A new order's value picks its band's sound.
    final sound = settings.soundAt(
      group,
      DateTime.now(),
      value: double.tryParse('${notice.data['order_value'] ?? ''}'),
    );
    final ringer = ref.read(ringerProvider);
    if (!settings.rings(group) || sound == soundSilent) {
      unawaited(ringer.play(sound, volume: settings.volume));
      return false;
    }
    unawaited(
      ringer.ring(
        sound,
        max: Duration(minutes: settings.ringMinutes),
        volume: settings.volume,
      ),
    );
    setState(() => _ringing = notice);
    void ended() {
      if (ringer.ringing.value) return;
      ringer.ringing.removeListener(ended);
      if (mounted && _ringing != null) setState(() => _ringing = null);
    }

    ringer.ringing.addListener(ended);
    return true;
  }

  void _stopRing() {
    unawaited(ref.read(ringerProvider).stop());
    if (_ringing != null) setState(() => _ringing = null);
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);
    final arabic = locale.languageCode == 'ar';
    // 125 A Prime app's look (Classic otherwise).
    final look = ref.watch(activeLookProvider);
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
      theme: buildTheme(arabic: arabic, look: look),
      // 61 The dark theme, following the phone unless chosen in Settings.
      darkTheme: buildTheme(
        arabic: arabic,
        brightness: Brightness.dark,
        look: look,
      ),
      themeMode: ref.watch(themeModeProvider),
      // 132 The cover over everything while the app isn't in front.
      builder: (context, child) {
        // 207 Android's channels and Silence in the app's language.
        final words = ringWords(AppLocalizations.of(context));
        WidgetsBinding.instance.addPostFrameCallback(
          (_) => ref.read(ringSettingsProvider.notifier).setWords(words),
        );
        final ringing = _ringing;
        return Stack(
          fit: StackFit.expand,
          children: [
            ?child,
            if (ringing != null)
              RingCard(
                notice: ringing,
                onSilence: _stopRing,
                onOpen: () => _open(ringing.data),
              ),
            if (_away) const PrivacyCover(),
          ],
        );
      },
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
  // 125 Studio apps' tabs.
  Paths.foodOrders,
  Paths.shipments,
  Paths.rides,
  Paths.market,
  Paths.school,
  Paths.notifyTab,
};

/// 214 The pushes that change the home-screen widget's figures.
const widgetKinds = {
  'new_order',
  'new_food_order',
  'new_market_order',
  'shipment_waiting',
  'order_cancelled',
};

/// 214 The home-screen widget tapped: the orders of its app, wherever that
/// app keeps them.
PushTarget widgetTarget(Me? me, String appId) {
  final app = me?.apps.where((a) => a.id == appId).firstOrNull;
  final f = app?.features;
  final location = f == null
      ? Paths.today
      : f.restaurants
      ? Paths.foodOrders
      : f.market
      ? Paths.marketTab('orders')
      : f.orders
      ? Paths.orders
      : f.shipments
      ? Paths.shipments
      : f.rides
      ? Paths.rides
      : Paths.today;
  return PushTarget(location: location, appId: app?.id);
}

/// Opens a push's screen on its app; 64 first switches to the push's
/// business when the phone works on another one the person is on. True when
/// it switched.
Future<bool> openTarget(WidgetRef ref, PushTarget target) async {
  var switched = false;
  final businessId = target.businessId;
  final before = ref.read(meProvider);
  if (businessId != null &&
      before != null &&
      before.business?.id != businessId &&
      before.businesses.any((b) => b.id == businessId)) {
    try {
      await ref.read(sessionProvider.notifier).setBusiness(businessId);
      switched = true;
    } on Object {
      // Stays on this business; the screen opens if the app is here.
    }
  }
  final me = ref.read(meProvider);
  final appId = target.appId;
  if (appId != null && (me == null || me.apps.any((a) => a.id == appId))) {
    ref.read(selectedAppProvider.notifier).select(appId);
  }
  if (me == null) {
    ref.read(pendingLocationProvider.notifier).set(target.location);
    return switched;
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
  return switched;
}

/// 207 A new order (or booking) ringing while the app is open: over every
/// screen at the top, with Silence and Open.
class RingCard extends StatelessWidget {
  const RingCard({
    super.key,
    required this.notice,
    required this.onSilence,
    required this.onOpen,
  });

  final RemoteNotice notice;
  final VoidCallback onSilence;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final c = context.yb;
    final booking = soundGroupOf(notice.data) == SoundGroup.bookings;
    final title = notice.title.isNotEmpty
        ? notice.title
        : (booking ? l10n.ringBannerBooking : l10n.ringBannerOrder);
    return Align(
      alignment: Alignment.topCenter,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Material(
            key: const ValueKey('ring-banner'),
            elevation: 8,
            color: c.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: c.accent, width: 2),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(AppIcons.ringing, color: c.accent),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          [
                            title,
                            notice.body,
                          ].where((t) => t.isNotEmpty).join('\n'),
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        onPressed: onSilence,
                        icon: const Icon(AppIcons.silent),
                        label: Text(l10n.ringSilence),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(onPressed: onOpen, child: Text(l10n.open)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 132 What the app switcher shows of the app while the lock is on: the
/// app's mark on its background, nothing of the business's data.
class PrivacyCover extends StatelessWidget {
  const PrivacyCover({super.key});

  @override
  Widget build(BuildContext context) => ColoredBox(
    key: const ValueKey('privacy-cover'),
    color: context.yb.background,
    child: const Center(child: AppMark(size: 88)),
  );
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
