import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/purchase/purchase_rules.dart';
import 'package:yallapp/core/purchase/store_billing_api.dart';
import 'package:yallapp/core/purchase/store_billing_widgets.dart';
import 'package:yallapp/modules/chat/data/chat_api.dart';

import '../support/fake_api.dart';
import '../support/fake_store.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart' show testBuild;

/// 100 Store billing: the contract's shapes, the course page's rule and the
/// Store billing endpoints as the app calls them.

/// Answers like the hosted API's Store billing routes.
class BillingServer implements HttpClientAdapter {
  final seen = <RequestOptions>[];
  String validToken = 'billing-token-1';
  int purchaseStatus = 200;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    seen.add(options);
    ResponseBody json(int status, Object body) => ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
    final path = options.uri.path.replaceFirst('/api/app/app-1', '');
    if (path == '/billing/products') {
      return json(200, {
        'items': [storeProductJson()],
      });
    }
    if (options.headers['Authorization'] != 'Bearer $validToken') {
      return json(401, {'code': 'invalid_token', 'message': 'Sign in again.'});
    }
    return switch (path) {
      '/billing/purchases' when purchaseStatus == 503 => json(503, {
        'code': 'store_unavailable',
        'message': 'Try again later.',
      }),
      '/billing/purchases' => json(200, grantJson()),
      '/billing/purchases/restore' => json(200, {
        'items': [grantJson()],
      }),
      _ => json(404, {'code': 'not_found', 'message': 'No.'}),
    };
  }

  @override
  void close({bool force = false}) {}
}

Dio _dio(BillingServer server) =>
    Dio(BaseOptions(baseUrl: 'https://yallapp.example/api/app/app-1'))
      ..httpClientAdapter = server;

PurchaseRules rules({bool enrollButton = false}) =>
    PurchaseRules(enrollButton: enrollButton, freeEnrollment: true);

void main() {
  group('the contract', () {
    test('Config.store_billing is read, and left out when unusable', () {
      final config = AppConfig.fromJson({
        ...configJson(),
        'store_billing': storeBillingJson(
          session: 'site',
          termsUrl: 'https://your-academy.com/app-terms',
        ),
      });
      expect(config.storeBilling?.session, ChatSessionKind.site);
      expect(
        config.storeBilling?.termsUrl,
        'https://your-academy.com/app-terms',
      );
      expect(AppConfig.fromJson(configJson()).storeBilling, isNull);
      expect(
        AppConfig.fromJson({
          ...configJson(),
          'store_billing': {'base_url': 'not a url', 'session': 'site'},
        }).storeBilling,
        isNull,
      );
    });

    test('a course bought through the store, and its membership plans', () {
      final course = CourseDetail.fromJson({
        ...storeCourseJson(courseDetailJson(), productId: 'course_9'),
        'membership': {
          'has_access': false,
          'plans': ['Gold'],
          'store_product_ids': ['plan_2_month', ''],
        },
      });
      expect(course.purchaseAction, PurchaseAction.store);
      expect(course.storeProductId, 'course_9');
      expect(course.membership?.storeProductIds, ['plan_2_month']);
      final older = CourseDetail.fromJson(courseDetailJson());
      expect(older.storeProductId, isNull);
      expect(older.membership, isNull);
    });

    test('products and grants', () {
      final product = StoreProduct.fromJson(
        storeProductJson(
          id: 'plan_2_year',
          type: 'subscription',
          kind: 'membership',
          courseId: null,
          planId: '2',
          period: 'year',
        ),
      );
      expect(product.isSubscription, isTrue);
      expect(product.kind, StoreProductKind.membership);
      expect(product.period, StorePeriod.year);
      final grant = StoreGrant.fromJson({
        ...grantJson(status: 'pending'),
        'expires_at': '2026-11-27T10:00:00Z',
      });
      expect(grant.status, StoreGrantStatus.pending);
      expect(grant.isActive, isFalse);
      expect(grant.expiresAt, DateTime.utc(2026, 11, 27, 10));
      expect(
        StoreGrant.fromJson(grantJson(status: 'something_new')).isActive,
        isFalse,
      );
    });
  });

  group('the course page', () {
    test('store: the store button on both platforms with store_billing, '
        'and none without', () {
      for (final platform in DevicePlatform.values) {
        expect(
          resolveCourseCta(
            serverAction: PurchaseAction.store,
            platform: platform,
            rules: rules(),
            enrolled: false,
            storeBilling: true,
            storeProductId: 'course_1',
          ),
          CourseCta.store,
        );
        expect(
          resolveCourseCta(
            serverAction: PurchaseAction.store,
            platform: platform,
            rules: rules(enrollButton: true),
            enrolled: false,
            storeProductId: 'course_1',
          ),
          CourseCta.unavailable,
        );
      }
    });

    test('iOS never gets the website checkout, even with store_billing', () {
      expect(
        resolveCourseCta(
          serverAction: PurchaseAction.checkout,
          platform: DevicePlatform.ios,
          rules: rules(enrollButton: true),
          enrolled: false,
          storeBilling: true,
        ),
        CourseCta.unavailable,
      );
    });

    test('the stores\' subscription pages and the terms', () {
      AppEnvironment env(DevicePlatform platform) => AppEnvironment(
        build: testBuild,
        platform: platform,
        appVersion: '1.0.0',
        deviceId: 'd',
        deviceName: 'phone',
      );
      expect(
        manageSubscriptionsUrl(
          env(DevicePlatform.android),
          productId: 'plan_2_month',
        ),
        'https://play.google.com/store/account/subscriptions'
        '?sku=plan_2_month&package=com.youracademy.app',
      );
      expect(
        manageSubscriptionsUrl(env(DevicePlatform.ios)),
        'https://apps.apple.com/account/subscriptions',
      );
      final config = AppConfig.fromJson({
        ...configJson(),
        'store_billing': storeBillingJson(),
      });
      expect(
        subscriptionTermsUrl(config, DevicePlatform.android),
        'https://your-academy.com/terms',
      );
      final noTerms = AppConfig.fromJson({
        ...configJson(),
        'site': {'name': 'A', 'url': 'https://a.example'},
        'store_billing': storeBillingJson(),
      });
      expect(subscriptionTermsUrl(noTerms, DevicePlatform.android), isNull);
      expect(
        subscriptionTermsUrl(noTerms, DevicePlatform.ios),
        appleStandardEula,
      );
    });
  });

  group('the Store billing endpoints', () {
    test('products need no token; a WordPress app signs purchases with its '
        "site's billing token, renewed on invalid_token", () async {
      final server = BillingServer();
      final site = FakeApi();
      final account = _dio(server);
      account.interceptors.add(
        SiteChatAuthInterceptor(
          account,
          SiteChatTokens(site.startBillingSession),
        ),
      );
      final api = HttpStoreBillingApi(
        public: _dio(server),
        signedIn: account,
        platform: DevicePlatform.android,
      );

      final products = await api.products();
      expect(products.single.productId, 'course_1');
      expect(server.seen.last.uri.queryParameters['platform'], 'android');
      expect(server.seen.last.headers['Authorization'], isNull);
      expect(site.count('startBillingSession'), 0);

      final grant = await api.sendPurchase(
        productId: 'course_1',
        purchaseToken: 'tok',
      );
      expect(grant.isActive, isTrue);
      expect(server.seen.last.data, {
        'product_id': 'course_1',
        'purchase_token': 'tok',
      });
      expect(site.count('startBillingSession'), 1);

      server.validToken = 'billing-token-2';
      await api.restore(purchaseTokens: ['a', 'b']);
      expect(site.count('startBillingSession'), 2);
      expect(server.seen.last.uri.path, endsWith('/billing/purchases/restore'));
      expect(server.seen.last.data, {
        'purchase_tokens': ['a', 'b'],
      });

      server.purchaseStatus = 503;
      await expectLater(
        api.sendPurchase(productId: 'course_1', signedTransaction: 'jws'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.code,
            'code',
            StoreBillingErrors.storeUnavailable,
          ),
        ),
      );
    });

    test('signed out: purchases are refused before anything is sent', () async {
      final server = BillingServer();
      final api = HttpStoreBillingApi(
        public: _dio(server),
        signedIn: null,
        platform: DevicePlatform.ios,
      );
      await expectLater(
        api.sendPurchase(productId: 'course_1', signedTransaction: 'jws'),
        throwsA(isA<ApiException>()),
      );
      expect(server.seen, isEmpty);
    });
  });
}
