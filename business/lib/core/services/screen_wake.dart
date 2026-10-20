import 'package:flutter/widgets.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

/// 61 Keeping the phone's screen on (Kitchen mode).
abstract class ScreenWake {
  Future<void> keepOn();
  Future<void> release();
}

class WakelockScreenWake implements ScreenWake {
  @override
  Future<void> keepOn() => WakelockPlus.enable();

  @override
  Future<void> release() => WakelockPlus.disable();
}

/// 61 Kitchen mode's screen: on while the screen is open and the app in
/// front (the system lets go in the background, so it is asked again on
/// return), released when leaving. A phone that refuses never stops the
/// kitchen: it just dims as the system says.
class KitchenWake {
  KitchenWake(this._wake);

  final ScreenWake _wake;
  bool _open = false;
  bool _held = false;

  /// Whether the screen is being kept on now.
  bool get held => _held;

  Future<void> open() async {
    _open = true;
    await _hold();
  }

  Future<void> close() async {
    _open = false;
    await _let();
  }

  Future<void> lifecycle(AppLifecycleState state) async {
    if (!_open) return;
    if (state == AppLifecycleState.resumed) {
      await _hold();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      await _let();
    }
  }

  Future<void> _hold() async {
    if (_held) return;
    try {
      await _wake.keepOn();
      _held = true;
    } on Object {
      _held = false;
    }
  }

  Future<void> _let() async {
    if (!_held) return;
    _held = false;
    try {
      await _wake.release();
    } on Object {
      // Nothing to undo.
    }
  }
}
