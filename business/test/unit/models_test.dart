import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/auth/token_manager.dart';
import 'package:yallapp_business/core/auth/token_store.dart';
import 'package:yallapp_business/core/config.dart';
import 'package:yallapp_business/features/media/media_screen.dart';
import 'package:yallapp_business/features/today/updates_screen.dart';

void main() {
  test('money in major units', () {
    Money m(int c) => Money(amountCents: c, currency: 'TRY', formatted: '');
    expect(m(15050).major, '150.50');
    expect(m(5).major, '0.05');
    expect(m(-1999).major, '-19.99');
  });

  test('website pages in the person\'s language', () {
    const config = AppConfig(
      apiBaseUrl: 'x',
      websiteUrl: 'https://yallapp.com.tr',
    );
    expect(config.websitePage('/terms', 'en'), 'https://yallapp.com.tr/terms');
    expect(
      config.websitePage('/terms', 'ar'),
      'https://yallapp.com.tr/ar/terms',
    );
    expect(config.websitePage('/', 'tr'), 'https://yallapp.com.tr/tr');
    expect(config.websitePage('/', 'en'), 'https://yallapp.com.tr');
  });

  test('push preferences: all on unless turned off', () {
    final p = PushPreferences.fromJson({'new_order': false});
    expect(p.isOn(PushKind.newOrder), isFalse);
    expect(p.isOn(PushKind.buildFinished), isTrue);
    expect(p.withValue(PushKind.newOrder, true).toJson()['new_order'], isTrue);
  });

  test(
    'an unknown account state reads as active; pending and suspended block',
    () {
      expect(AccountState.parse('weird'), AccountState.active);
      expect(AccountState.pending.blocked, isTrue);
      expect(AccountState.expired.blocked, isFalse);
    },
  );

  test('announcements\' Markdown as plain text', () {
    expect(
      plainText('## New\n- **Faster** builds\n- See [the guide](https://x)'),
      'New\n• Faster builds\n• See the guide',
    );
  });

  test('sizes', () {
    expect(formatBytes(820000), '820 KB');
    expect(formatBytes(1200000000), '1.2 GB');
    expect(formatBytes(12), '12 B');
  });

  test('offline at refresh time: the old token is still sent', () async {
    final store = MemoryTokenStore(
      Session(
        accessToken: 'old',
        accessExpiresAt: DateTime.now().toUtc(),
        refreshToken: 'r',
        refreshExpiresAt: DateTime.now().toUtc().add(const Duration(days: 1)),
        deviceId: 'd',
        accountState: AccountState.active,
      ),
    );
    final tokens = TokenManager(
      store: store,
      refresh: (_) async =>
          throw const ApiException(code: ApiException.network),
    );
    expect(await tokens.validAccessToken(), 'old');
    expect(await store.read(), isNotNull);
  });
}
