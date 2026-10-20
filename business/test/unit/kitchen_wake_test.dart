import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/services/screen_wake.dart';

import '../support/test_app.dart';

/// 61 Kitchen mode keeps the screen on while it's open and in front.
void main() {
  test('on when opened, off when closed', () async {
    final wake = FakeWake();
    final kitchen = KitchenWake(wake);
    expect(wake.on, isFalse);
    await kitchen.open();
    expect(wake.on, isTrue);
    expect(kitchen.held, isTrue);
    // Asked once, however many times it's opened.
    await kitchen.open();
    expect(wake.requests, 1);
    await kitchen.close();
    expect(wake.on, isFalse);
    expect(kitchen.held, isFalse);
  });

  test('lets go in the background and asks again on return', () async {
    final wake = FakeWake();
    final kitchen = KitchenWake(wake);
    await kitchen.open();
    await kitchen.lifecycle(AppLifecycleState.inactive);
    expect(wake.on, isTrue);
    await kitchen.lifecycle(AppLifecycleState.paused);
    expect(wake.on, isFalse);
    await kitchen.lifecycle(AppLifecycleState.resumed);
    expect(wake.on, isTrue);
    expect(wake.requests, 2);
    // After leaving, coming back to the app doesn't turn it on.
    await kitchen.close();
    await kitchen.lifecycle(AppLifecycleState.resumed);
    expect(wake.on, isFalse);
  });

  test('a phone that refuses never stops the kitchen', () async {
    final wake = FakeWake()..fail = true;
    final kitchen = KitchenWake(wake);
    await kitchen.open();
    expect(kitchen.held, isFalse);
    await kitchen.close();
    wake.fail = false;
    await kitchen.open();
    expect(kitchen.held, isTrue);
  });
}
