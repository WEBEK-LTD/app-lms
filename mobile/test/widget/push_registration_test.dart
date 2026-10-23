import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../support/test_app.dart';

/// A push service with a token ready.
class _Push implements PushService {
  _Push(this.provider, this._token);

  @override
  final PushProvider provider;
  final String _token;

  @override
  bool get isAvailable => true;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() async => _token;

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get openedMessages => const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initialMessage() async => null;
}

void main() {
  // 36 The signed-in app registers its token with where it is from.
  testWidgets('a Huawei phone registers its Push Kit token as hms', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      overrides: [
        pushServiceProvider.overrideWithValue(_Push(PushProvider.hms, 'hms-1')),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [(token: 'hms-1', provider: PushProvider.hms)]);
  });

  testWidgets('other phones register their Firebase token as fcm', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      overrides: [
        pushServiceProvider.overrideWithValue(_Push(PushProvider.fcm, 'fcm-1')),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [(token: 'fcm-1', provider: PushProvider.fcm)]);
    // 85.1 With the language the app shows.
    expect(app.api.pushLanguages, ['en']);
  });
}
