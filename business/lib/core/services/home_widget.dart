import 'package:flutter/services.dart';

/// 214 The home-screen widget (Android's `ShopWidget.kt`, iOS's WidgetKit
/// extension) through `tr.com.yallapp.business/widget`: the app hands it
/// the Owner API's address, the widget's own read-only token and the app's
/// language after signing in (a null token on signing out: the widget
/// forgets the shop's figures), and asks it to read again when a new order
/// comes. Builds without the channel: every call does nothing.
abstract class HomeWidget {
  Future<void> configure({
    required String api,
    required String? token,
    required String lang,
  });

  /// Reads the figures again now (a new order, an order accepted).
  Future<void> refresh();
}

class PlatformHomeWidget implements HomeWidget {
  const PlatformHomeWidget();

  static const _channel = MethodChannel('tr.com.yallapp.business/widget');

  Future<void> _call(String method, [Object? args]) async {
    try {
      await _channel.invokeMethod<void>(method, args);
    } on Object {
      // No widget on this build or phone.
    }
  }

  @override
  Future<void> configure({
    required String api,
    required String? token,
    required String lang,
  }) => _call('configure', {'api': api, 'token': token, 'lang': lang});

  @override
  Future<void> refresh() => _call('refresh');
}

class NoHomeWidget implements HomeWidget {
  const NoHomeWidget();

  @override
  Future<void> configure({
    required String api,
    required String? token,
    required String lang,
  }) => Future.value();

  @override
  Future<void> refresh() => Future.value();
}
