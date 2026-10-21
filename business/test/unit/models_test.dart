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

  test('60 a team member\'s role, areas and businesses from `me`', () {
    final me = Me.fromJson({
      'user': {'id': 'u1', 'name': 'Kerem', 'email': 'k@cafe.test'},
      'account': {'state': 'active'},
      'business': {
        'id': 'b1',
        'name': 'Layla Café',
        'role': 'staff',
        'state': 'active',
      },
      'businesses': [
        {'id': 'b1', 'name': 'Layla Café', 'role': 'staff', 'state': 'active'},
        {
          'id': 'b2',
          'name': 'Kerem Bakery',
          'role': 'owner',
          'state': 'pending',
        },
      ],
      'apps': [
        {
          'id': 'a1',
          'name': 'Layla Café',
          'type': 'store',
          'type_name': 'Restaurant',
          'state': 'active',
          'features': {'orders': true},
          'access': {
            'role': 'staff',
            'areas': ['orders'],
            'license': false,
            'team': false,
            'settings': false,
          },
        },
      ],
      'links': {'dashboard': 'https://yallapp.com.tr/dashboard'},
    });
    expect(me.role, TeamRole.staff);
    expect(me.businesses.map((b) => b.role), [TeamRole.staff, TeamRole.owner]);
    expect(me.businesses.last.state, AccountState.pending);
    final access = me.apps.single.access;
    expect(access.areas, ['orders']);
    expect(access.license, isFalse);
    expect(access.settings, isFalse);
  });

  test('60 a server without teams means the owner', () {
    final app = AppSummary.fromJson({
      'id': 'a1',
      'name': 'Shop',
      'type': 'store',
      'type_name': 'Store',
      'state': 'active',
    });
    expect(app.access.role, TeamRole.owner);
    expect(app.access.license, isTrue);
    expect(app.access.areas, teamAreas);
    expect(
      Me.fromJson({
        'user': {'id': 'u', 'name': 'L', 'email': 'l@x.test'},
      }).role,
      TeamRole.owner,
    );
  });

  test('72 the help links: both WhatsApp numbers, or the one an older server sends', () {
    final both = MeLinks.fromJson({
      'dashboard': 'https://yallapp.com.tr/dashboard',
      'support_whatsapp': 'https://wa.me/201042560010',
      'support_whatsapp_egypt': 'https://wa.me/201042560010',
      'support_whatsapp_international': 'https://wa.me/905446731942',
      'support_email': 'info@yallapp.com.tr',
    });
    expect(both.bothWhatsapp, isTrue);
    expect(both.supportWhatsappEgypt, 'https://wa.me/201042560010');
    expect(both.supportWhatsappInternational, 'https://wa.me/905446731942');
    final older = MeLinks.fromJson({
      'dashboard': 'https://yallapp.com.tr/dashboard',
      'support_whatsapp': 'https://wa.me/905446731942',
    });
    expect(older.bothWhatsapp, isFalse);
    expect(older.supportWhatsapp, 'https://wa.me/905446731942');
  });
}
