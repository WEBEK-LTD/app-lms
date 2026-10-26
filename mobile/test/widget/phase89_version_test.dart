import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/core/services/version_check.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 89.1 The owner's minimum and recommended versions, asked of Yallapp on
/// every start (docs/api/platform.yaml, getAppVersionPolicy).
TestApp appWith(VersionPolicy? policy, {Map<String, Object>? preferences}) =>
    TestApp(
      signedIn: true,
      api: FakeApi(config: configJson()),
      preferences: preferences ?? const {},
      overrides: [versionCheckProvider.overrideWithValue(() async => policy)],
    );

void main() {
  test('the version address sits next to the events one', () {
    expect(
      versionUri(
        'https://yallapp.com.tr/api/v1/apps/a1/events',
        platform: 'android',
        version: '1.2.0',
        store: 'galaxy_store',
      ).toString(),
      'https://yallapp.com.tr/api/v1/apps/a1/version?platform=android&version=1.2.0&store=galaxy_store',
    );
    expect(
      versionUri(
        'https://yallapp.com.tr/api/v1/apps/a1/events',
        platform: 'ios',
        version: '2.0.0',
      ).toString(),
      'https://yallapp.com.tr/api/v1/apps/a1/version?platform=ios&version=2.0.0',
    );
    expect(versionUri(null, platform: 'ios', version: '1.0.0'), isNull);
  });

  test('reads the policy as the contract has it', () {
    final policy = VersionPolicy.fromJson({
      'update_required': false,
      'update_recommended': true,
      'minimum_version': null,
      'recommended_version': '1.5.0',
      'store_url': 'https://apps.apple.com/app/id6450000001',
    });
    expect(policy.updateRecommended, isTrue);
    expect(policy.updateRequired, isFalse);
    expect(policy.recommendedVersion, '1.5.0');
    expect(policy.storeUrl, 'https://apps.apple.com/app/id6450000001');
  });

  testWidgets(
    'below the minimum: the update screen, with the store it came from',
    (tester) async {
      final app = appWith(
        const VersionPolicy(
          updateRequired: true,
          updateRecommended: false,
          storeUrl: 'https://galaxystore.samsung.com/detail/com.ada.app',
        ),
      );
      await app.pump(tester);
      final gate = app.container.read(appGateProvider);
      expect(gate, isA<GateUpdateRequired>());
      expect(
        (gate as GateUpdateRequired).storeUrl,
        'https://galaxystore.samsung.com/detail/com.ada.app',
      );
      expect(find.text('Update required'), findsOneWidget);
      expect(find.text('Update now'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('below the recommended version: asked once, "Not now" goes on', (
    tester,
  ) async {
    const policy = VersionPolicy(
      updateRequired: false,
      updateRecommended: true,
      recommendedVersion: '1.5.0',
    );
    final app = appWith(policy);
    await app.pump(tester);
    expect(app.container.read(appGateProvider), isA<GateReady>());
    expect(find.text('A new version is ready'), findsOneWidget);
    await tester.tap(find.text('Not now'));
    await TestApp.settle(tester);
    expect(find.text('A new version is ready'), findsNothing);
    expect(
      app.container
          .read(sharedPreferencesProvider)
          .getString(updateDismissedKey),
      '1.5.0',
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('not asked again for the same recommended version', (
    tester,
  ) async {
    final app = appWith(
      const VersionPolicy(
        updateRequired: false,
        updateRecommended: true,
        recommendedVersion: '1.5.0',
      ),
      preferences: {updateDismissedKey: '1.5.0'},
    );
    await app.pump(tester);
    expect(find.text('A new version is ready'), findsNothing);
  });

  testWidgets('without an answer from Yallapp the app opens as before', (
    tester,
  ) async {
    final app = appWith(null);
    await app.pump(tester);
    expect(app.container.read(appGateProvider), isA<GateReady>());
    expect(find.text('A new version is ready'), findsNothing);
  });
}
