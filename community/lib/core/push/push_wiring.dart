import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/messages/links.dart';
import '../../features/notifications/data/notifications_api.dart';
import '../auth/session.dart';
import '../l10n.dart';
import '../providers.dart';
import '../routing/app_router.dart';
import 'push.dart';
import 'routes.dart';

/// The app's messenger: a push that arrives while the app is open shows
/// here, with Open.
final appMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// `PUT /me/push-tokens` (a test's recorder instead).
final pushTokenSenderProvider = Provider<Future<void> Function(String)>(
  (ref) =>
      (token) async => ref
          .read(apiClientProvider)
          .put(
            '/me/push-tokens',
            body: {
              'token': token,
              'platform': Platform.isIOS ? 'ios' : 'android',
            },
          ),
);

/// Sends the device's token to the server once signed in and whenever it
/// changes (`PUT /me/push-tokens`; signing out forgets it on the server),
/// opens a tapped push's screen, and shows one that arrives in the app.
final pushWiringProvider = Provider<void>((ref) {
  final push = ref.watch(pushServiceProvider);
  final subs = <StreamSubscription<Object?>>[];
  ref.onDispose(() {
    for (final s in subs) {
      s.cancel();
    }
  });
  var started = false;

  Future<void> send(String token) async {
    try {
      await ref.read(pushTokenSenderProvider)(token);
    } on Object {
      // Tried again at the next start or token change.
    }
  }

  void open(Map<String, dynamic> data) {
    ref.read(routerProvider).push(routeForPush(data));
    // The notice it came from is read now.
    final id = data['notification_id'];
    if (id is String && id.isNotEmpty) {
      unawaited(
        ref.read(notificationsApiProvider).markRead([id]).catchError((_) {}),
      );
    }
  }

  Future<void> start() async {
    if (started) return;
    started = true;
    await push.init();
    if (!push.available) return;
    final token = await push.token();
    if (token != null) await send(token);
    subs
      ..add(push.tokenRefreshes.listen(send))
      ..add(push.opened.listen(open))
      ..add(
        push.foreground.listen((n) {
          ref.invalidate(unreadMessagesProvider);
          final messenger = appMessengerKey.currentState;
          messenger?.showSnackBar(
            SnackBar(
              // Above the floating tab bar.
              behavior: SnackBarBehavior.floating,
              margin: const EdgeInsets.fromLTRB(14, 0, 14, 104),
              content: Text(n.body.isEmpty ? n.title : '${n.title}: ${n.body}'),
              action: SnackBarAction(
                label: lookupAppLocalizations(
                  Locale(ref.read(languageProvider)),
                ).pushOpen,
                onPressed: () => open(n.data),
              ),
            ),
          );
        }),
      );
    final first = await push.initial();
    if (first != null) open(first);
  }

  void check(AuthState s) {
    if (s is SignedInState) unawaited(start());
  }

  check(ref.read(sessionProvider));
  ref.listen(sessionProvider, (_, s) => check(s));
});
