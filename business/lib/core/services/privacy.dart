import 'package:flutter/services.dart';

/// 132 What the app shows in the phone's app switcher while the lock is on:
/// on Android, the recents screenshot is turned off (Android 13 and later,
/// screenshots still work) or the window made secure (older versions); on
/// iPhone, a blur covers the app as it leaves the screen
/// (`ios/Runner/AppDelegate.swift`). The app also draws its own cover while
/// it isn't in front (`PrivacyCover`).
abstract class PrivacyGuard {
  Future<void> setSecure(bool on);
}

class PlatformPrivacyGuard implements PrivacyGuard {
  const PlatformPrivacyGuard();

  static const _channel = MethodChannel('tr.com.yallapp.business/privacy');

  @override
  Future<void> setSecure(bool on) async {
    try {
      await _channel.invokeMethod<void>('setSecure', {'on': on});
    } on Object {
      // An older build without the channel: the app's own cover still hides it.
    }
  }
}
