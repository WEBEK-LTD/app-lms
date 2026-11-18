/// 188 Stripe's PaymentSheet for the payment page in the app.
///
/// Yallapp's payment page (`<platform>/pay/<token>`) stays in the app's own
/// web view: the buyer's details, delivery, the coupon and the other
/// gateways are there. A web view can't show Apple Pay or Google Pay, so
/// when the buyer pays with Stripe the page asks the app, through the
/// `YallappPay` JavaScript channel (`{"type":"stripe_sheet"}`), to take the
/// payment in Stripe's native bottom sheet (flutter_stripe's PaymentSheet):
/// the card, Apple Pay on iPhone (when the build has the owner's merchant
/// ID) and Google Pay on Android.
///
/// The app asks `<platform>/pay/<token>/sheet` for the PaymentIntent with
/// the payment's own token (never what the page says), presents the sheet,
/// then reads `<platform>/pay/<token>/status`: the sheet's own result
/// proves nothing. Paid: the screen ends as when the web view reached the
/// order received page. Anything else goes back to the page
/// (`window.yallappReceive`), which offers the payment again; nothing is
/// charged twice (one PaymentIntent per order, see the platform's
/// lib/catalog/sheet-payment.ts).
library;

import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

import '../config/build_config_data.dart';
import '../providers.dart';
import 'pay_sheet.dart';

/// The JavaScript channel the payment page posts to.
const payChannelName = 'YallappPay';

/// The message's `type`, both ways.
const sheetMessageType = 'stripe_sheet';

final _payToken = RegExp(r'^[A-Za-z0-9_-]{16,128}$');

/// The payment page itself (`https://<platform>/pay/<token>`) when [url] is
/// it or the link the apps are handed (`…/pay/<token>/in-app`, 186), on
/// this build's platform hosts; else null.
Uri? payPageOf(Uri url, BuildConfigData build) {
  if (url.scheme != 'https') return null;
  final hosts = {
    for (final u in [build.linkBaseUrl, build.apiBaseUrl, build.authBaseUrl])
      if (u != null) ?Uri.tryParse(u)?.host,
  }..remove('');
  if (!hosts.contains(url.host)) return null;
  final segments = url.pathSegments.where((s) => s.isNotEmpty).toList();
  final inApp = segments.length == 3 && segments[2] == 'in-app';
  if (!(segments.length == 2 || inApp) || segments[0] != 'pay') return null;
  if (!_payToken.hasMatch(segments[1])) return null;
  return Uri(
    scheme: url.scheme,
    host: url.host,
    port: url.hasPort ? url.port : null,
    path: '/pay/${segments[1]}',
  );
}

/// Whether the page's message asks the app to take the payment.
bool isSheetRequest(String message) {
  try {
    final decoded = jsonDecode(message);
    return decoded is Map && decoded['type'] == sheetMessageType;
  } on FormatException {
    return false;
  }
}

/// What the app tells the page (`result`): it offers the payment again
/// (`canceled`, `failed`), shows Stripe's own form (`unavailable`), or its
/// pending note (`pending`).
String sheetResultMessage(String result) =>
    jsonEncode({'type': sheetMessageType, 'result': result});

/// What the sheet needs, from `/pay/<token>/sheet`.
@immutable
class StripeSheetSetup {
  const StripeSheetSetup({
    required this.publishableKey,
    required this.clientSecret,
    required this.currency,
    required this.amountCents,
    required this.merchantName,
    required this.testMode,
    this.merchantCountry,
  });

  final String publishableKey;
  final String clientSecret;

  /// The Stripe account's country (ISO 3166, `AE`); Google Pay and Apple Pay
  /// need it, so without it the sheet shows the card only.
  final String? merchantCountry;
  final String currency;
  final int amountCents;
  final String merchantName;

  /// Test keys: Google Pay's test environment.
  final bool testMode;
}

enum SheetAnswerState { ready, paid, unavailable, closed, failed }

@immutable
class SheetAnswer {
  const SheetAnswer(this.state, {this.setup});

  final SheetAnswerState state;
  final StripeSheetSetup? setup;

  static final _key = RegExp(r'^pk_(test|live)_[A-Za-z0-9]+$');
  static final _country = RegExp(r'^[A-Z]{2}$');

  static SheetAnswer fromJson(Object? json) {
    final map = json is Map ? json : const {};
    switch (map['state']) {
      case 'ready':
        final key = map['publishable_key'];
        final secret = map['client_secret'];
        final currency = map['currency'];
        final amount = map['amount_cents'];
        if (key is! String ||
            !_key.hasMatch(key) ||
            secret is! String ||
            !secret.startsWith('pi_') ||
            currency is! String ||
            amount is! int) {
          return const SheetAnswer(SheetAnswerState.failed);
        }
        final country = map['merchant_country'];
        final name = map['merchant_name'];
        return SheetAnswer(
          SheetAnswerState.ready,
          setup: StripeSheetSetup(
            publishableKey: key,
            clientSecret: secret,
            merchantCountry: country is String && _country.hasMatch(country)
                ? country
                : null,
            currency: currency.toUpperCase(),
            amountCents: amount,
            merchantName: name is String && name.isNotEmpty ? name : 'Stripe',
            testMode: map['test_mode'] == true,
          ),
        );
      case 'paid':
        return const SheetAnswer(SheetAnswerState.paid);
      case 'unavailable':
        return const SheetAnswer(SheetAnswerState.unavailable);
      case 'closed' || 'expired' || 'not_found':
        return const SheetAnswer(SheetAnswerState.closed);
      default:
        return const SheetAnswer(SheetAnswerState.failed);
    }
  }
}

/// Asks the platform for the sheet's PaymentIntent. Throws when it can't be
/// reached.
typedef SheetSetupReader = Future<SheetAnswer> Function(Uri page);

final sheetSetupReaderProvider = Provider<SheetSetupReader>((ref) {
  final dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      validateStatus: (code) => code != null && code < 600,
      responseType: ResponseType.json,
    ),
  );
  ref.onDispose(dio.close);
  return (page) async {
    final response = await dio.postUri<Object?>(
      page.replace(path: '${page.path}/sheet'),
    );
    return SheetAnswer.fromJson(response.data);
  };
});

/// How the sheet ended, as the phone tells it (not proof of a payment).
enum SheetOutcome { completed, canceled, failed }

/// Shows Stripe's PaymentSheet. Replaced in tests.
abstract interface class StripeSheetPresenter {
  Future<SheetOutcome> present(
    StripeSheetSetup setup, {
    String? applePayMerchantId,
    required bool dark,
  });
}

/// flutter_stripe's PaymentSheet: the card, Google Pay (Android) and Apple
/// Pay (iPhone, with the build's merchant ID).
class FlutterStripeSheet implements StripeSheetPresenter {
  const FlutterStripeSheet();

  @override
  Future<SheetOutcome> present(
    StripeSheetSetup setup, {
    String? applePayMerchantId,
    required bool dark,
  }) async {
    final country = setup.merchantCountry;
    try {
      Stripe.publishableKey = setup.publishableKey;
      Stripe.merchantIdentifier = applePayMerchantId;
      await Stripe.instance.applySettings();
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: setup.clientSecret,
          merchantDisplayName: setup.merchantName,
          style: dark ? ThemeMode.dark : ThemeMode.light,
          applePay: applePayMerchantId != null && country != null
              ? PaymentSheetApplePay(merchantCountryCode: country)
              : null,
          googlePay: country != null
              ? PaymentSheetGooglePay(
                  merchantCountryCode: country,
                  currencyCode: setup.currency,
                  testEnv: setup.testMode,
                )
              : null,
        ),
      );
      await Stripe.instance.presentPaymentSheet();
      return SheetOutcome.completed;
    } on StripeException catch (e) {
      return e.error.code == FailureCode.Canceled
          ? SheetOutcome.canceled
          : SheetOutcome.failed;
    } on Object {
      return SheetOutcome.failed;
    }
  }
}

/// The sheet in this app; null where it can't show (the app preview, a
/// browser, desktop), which keeps Stripe's own form in the page.
final stripeSheetPresenterProvider = Provider<StripeSheetPresenter?>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  if (kIsWeb || env.isPreview) return null;
  if (defaultTargetPlatform != TargetPlatform.android &&
      defaultTargetPlatform != TargetPlatform.iOS) {
    return null;
  }
  return const FlutterStripeSheet();
});

/// How long the app waits for the platform to see the payment after the
/// sheet said it was done (the status reads the PaymentIntent back from
/// Stripe, so it's normally at once).
const sheetStatusWaits = [
  Duration.zero,
  Duration(seconds: 1),
  Duration(seconds: 2),
  Duration(seconds: 3),
];

/// One payment page's hand-off to the sheet: [run] for each request from
/// the page (one at a time).
class StripePagePayment {
  StripePagePayment({
    required this.page,
    required this.readSetup,
    required this.presenter,
    required this.readStatus,
    required this.toPage,
    required this.onPaid,
    this.applePayMerchantId,
    this.dark = false,
    this.waits = sheetStatusWaits,
  });

  /// The payment page (`https://<platform>/pay/<token>`).
  final Uri page;
  final SheetSetupReader readSetup;
  final StripeSheetPresenter presenter;
  final PayStatusReader readStatus;

  /// Sends a message to the page (`window.yallappReceive`).
  final Future<void> Function(String message) toPage;

  /// The order is through: the order received page's address, as the web
  /// view reported it before.
  final void Function(Uri received) onPaid;
  final String? applePayMerchantId;
  final bool dark;
  final List<Duration> waits;

  bool _busy = false;
  bool get busy => _busy;

  Future<void> run() async {
    if (_busy) return;
    _busy = true;
    try {
      await _run();
    } finally {
      _busy = false;
    }
  }

  Future<void> _tell(String result) async {
    try {
      await toPage(sheetResultMessage(result));
    } on Object {
      // The page was closed meanwhile.
    }
  }

  /// The status, once it says the order is through; null otherwise.
  Future<PayStatus?> _paid({required bool wait}) async {
    for (final delay in wait ? waits : const [Duration.zero]) {
      if (delay > Duration.zero) await Future<void>.delayed(delay);
      try {
        final status = await readStatus(page);
        if (status.done) return status;
        if (status.state == PayState.closed) return null;
      } on Object {
        // The platform out of reach for a moment: try again.
      }
    }
    return null;
  }

  Future<void> _run() async {
    SheetAnswer answer;
    try {
      answer = await readSetup(page);
    } on Object {
      await _tell('failed');
      return;
    }
    switch (answer.state) {
      case SheetAnswerState.paid:
        final status = await _paid(wait: true);
        if (status != null) return onPaid(payCompletedUrl(page, status));
        return _tell('pending');
      case SheetAnswerState.unavailable:
        return _tell('unavailable');
      case SheetAnswerState.closed || SheetAnswerState.failed:
        return _tell('failed');
      case SheetAnswerState.ready:
        break;
    }
    final outcome = await presenter.present(
      answer.setup!,
      applePayMerchantId: applePayMerchantId,
      dark: dark,
    );
    // Whatever the sheet said, the platform decides.
    final status = await _paid(wait: outcome == SheetOutcome.completed);
    if (status != null) return onPaid(payCompletedUrl(page, status));
    await _tell(switch (outcome) {
      SheetOutcome.completed => 'pending',
      SheetOutcome.canceled => 'canceled',
      SheetOutcome.failed => 'failed',
    });
  }
}
