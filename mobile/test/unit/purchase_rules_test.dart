import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/purchase/purchase_rules.dart';

PurchaseRules rules({bool enrollButton = true, bool freeEnrollment = true}) =>
    PurchaseRules(enrollButton: enrollButton, freeEnrollment: freeEnrollment);

void main() {
  test('iOS never gets a checkout, whatever the server and settings say', () {
    for (final action in PurchaseAction.values) {
      for (final enrollButton in [true, false]) {
        final cta = resolveCourseCta(
          serverAction: action,
          platform: DevicePlatform.ios,
          rules: rules(enrollButton: enrollButton),
          enrolled: false,
        );
        expect(
          cta,
          isNot(CourseCta.checkout),
          reason: '$action, $enrollButton',
        );
      }
    }
    expect(canOpenCheckout(DevicePlatform.ios), isFalse);
  });

  test('iOS: checkout and none become the neutral line', () {
    for (final action in [PurchaseAction.checkout, PurchaseAction.none]) {
      expect(
        resolveCourseCta(
          serverAction: action,
          platform: DevicePlatform.ios,
          rules: rules(),
          enrolled: false,
        ),
        CourseCta.unavailable,
      );
    }
  });

  test('Android: checkout only when the site allows the enroll button', () {
    expect(
      resolveCourseCta(
        serverAction: PurchaseAction.checkout,
        platform: DevicePlatform.android,
        rules: rules(),
        enrolled: false,
      ),
      CourseCta.checkout,
    );
    expect(
      resolveCourseCta(
        serverAction: PurchaseAction.checkout,
        platform: DevicePlatform.android,
        rules: rules(enrollButton: false),
        enrolled: false,
      ),
      CourseCta.unavailable,
    );
    expect(canOpenCheckout(DevicePlatform.android), isTrue);
  });

  test('free enrollment works on both platforms when enabled', () {
    for (final platform in DevicePlatform.values) {
      expect(
        resolveCourseCta(
          serverAction: PurchaseAction.enrollFree,
          platform: platform,
          rules: rules(),
          enrolled: false,
        ),
        CourseCta.enrollFree,
      );
      expect(
        resolveCourseCta(
          serverAction: PurchaseAction.enrollFree,
          platform: platform,
          rules: rules(freeEnrollment: false),
          enrolled: false,
        ),
        CourseCta.unavailable,
      );
    }
  });

  test('enrolled students always continue', () {
    for (final platform in DevicePlatform.values) {
      for (final action in PurchaseAction.values) {
        expect(
          resolveCourseCta(
            serverAction: action,
            platform: platform,
            rules: rules(),
            enrolled: true,
          ),
          CourseCta.continueLearning,
        );
      }
      expect(
        resolveCourseCta(
          serverAction: PurchaseAction.continueLearning,
          platform: platform,
          rules: rules(),
          enrolled: false,
        ),
        CourseCta.continueLearning,
      );
    }
  });
}
