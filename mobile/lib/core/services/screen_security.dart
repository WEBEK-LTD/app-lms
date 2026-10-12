import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Screen capture protection for lesson content.
///
/// Android: `FLAG_SECURE` on the activity window (MainActivity.kt) blocks
/// screenshots and recordings. iOS can't block recording, so it reports
/// capture changes (AppDelegate.swift) and the player blanks the video.
class ScreenSecurity {
  const ScreenSecurity();

  static const _methods = MethodChannel('yallapp/screen_security');
  static const _events = EventChannel('yallapp/screen_capture');

  Future<void> setSecure(bool enabled) async {
    try {
      await _methods.invokeMethod<void>('setSecure', {'enabled': enabled});
    } on MissingPluginException {
      // Tests and unsupported platforms.
    } on PlatformException {
      // Never block the lesson because protection failed to toggle.
    }
  }

  /// True while the screen is being recorded or mirrored (iOS).
  Stream<bool> captureChanges() {
    if (defaultTargetPlatform != TargetPlatform.iOS) {
      return Stream<bool>.value(false);
    }
    return _events
        .receiveBroadcastStream()
        .map((event) => event == true)
        .handleError((Object _) {});
  }
}

final screenSecurityProvider = Provider<ScreenSecurity>(
  (ref) => const ScreenSecurity(),
);
