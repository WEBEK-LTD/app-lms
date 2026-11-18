/// 170 Paying in the app in the phone's browser sheet.
///
/// Yallapp's payment page (`<platform>/pay/<token>`: hosted stores, food,
/// bookings, courses, events, 134 connected stores paying in the app) opens
/// in the system browser sheet over the app (SFSafariViewController on
/// iPhone, Chrome Custom Tabs on Android, url_launcher's
/// [LaunchMode.inAppBrowserView]) instead of the app's web view: Apple Pay
/// and Google Pay show there (Apple allows Apple Pay only in Safari's own
/// views, Android's WebView keeps the Payment Request API off), and the card
/// form, iyzico's and Kashier's forms, Fawaterk's and PayPal's pages work as
/// in any browser.
///
/// The app opens `<platform>/pay/<token>/app`, which marks the payment as
/// the app's; its done, failed and pending pages lead back with the app's
/// own address, `yallapp-<app id>://app/pay-return?order=<id>&result=<…>`
/// (registered by the Android manifest and the iOS Info.plist from the
/// build config). The link is never trusted: the app asks
/// `<platform>/pay/<token>/status` how the payment stands, on the link, when
/// the app comes back on screen, and every few seconds while the sheet is
/// open (an iPhone's sheet closes without telling the app).
library;

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app_environment.dart';
import '../config/build_config_data.dart';
import '../providers.dart';

/// The app's own address scheme: `yallapp-` and the platform's app ID
/// without dashes (lib/payments/app-return.ts makes the same). Null without
/// an app ID (development builds and builds before Phase 46): those keep the
/// web view.
String? payReturnScheme(BuildConfigData build) {
  final id = build.appId;
  if (id == null || id.isEmpty) return null;
  return 'yallapp-${id.replaceAll('-', '').toLowerCase()}';
}

final _payToken = RegExp(r'^[A-Za-z0-9_-]{16,128}$');

/// The hosts Yallapp's platform answers on for this build: its link domain,
/// and the hosted API's and sign-in's.
Set<String> _platformHosts(BuildConfigData build) => {
  for (final url in [build.linkBaseUrl, build.apiBaseUrl, build.authBaseUrl])
    if (url != null) ?Uri.tryParse(url)?.host,
}..remove('');

/// The payment's token when [url] is Yallapp's payment page itself
/// (`https://<platform>/pay/<token>`), else null: a shop's own website
/// checkout, a donation's page (`/give/…`) and every other page keep the web
/// view.
String? payPageToken(Uri url, BuildConfigData build) {
  if (url.scheme != 'https') return null;
  if (!_platformHosts(build).contains(url.host)) return null;
  final segments = url.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.length != 2 || segments[0] != 'pay') return null;
  return _payToken.hasMatch(segments[1]) ? segments[1] : null;
}

/// Whether [url] opens in the browser sheet: Yallapp's payment page, in an
/// installed app on Android or iPhone whose build has its return address.
/// The app preview (a browser) and builds without an app ID keep the web
/// view.
bool opensInPaySheet(Uri url, AppEnvironment env) {
  if (kIsWeb || env.isPreview) return false;
  if (payReturnScheme(env.build) == null) return false;
  return payPageToken(url, env.build) != null;
}

/// [page]'s origin with [path] under its own, and only [query].
Uri _under(Uri page, String path, [Map<String, String>? query]) {
  final base = page.path.replaceAll(RegExp(r'/+$'), '');
  return Uri(
    scheme: page.scheme,
    host: page.host,
    port: page.hasPort ? page.port : null,
    path: '$base/$path',
    queryParameters: query == null || query.isEmpty ? null : query,
  );
}

/// Where the app opens the sheet: the payment page's `/app`, which marks the
/// payment as the app's and goes on to the page.
Uri paySheetEntry(Uri page) => _under(page, 'app');

/// Whether [location] is the payment's return link: `/pay-return` as Android
/// hands it (a path), or the whole address as iOS does
/// (`yallapp-<id>://app/pay-return?…`).
bool isPayReturnLink(Uri location) {
  final segments = location.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.length != 1 || segments.single != 'pay-return') return false;
  return !location.hasScheme ||
      (location.scheme.startsWith('yallapp-') && location.host == 'app');
}

/// What the return link says (a hint for the words only; the status decides).
String? payReturnResult(Uri link) => link.queryParameters['result'];

/// How the payment stands, from `/pay/<token>/status`.
enum PayState { paid, awaitingPayment, started, open, closed, notFound }

@immutable
class PayStatus {
  const PayStatus(this.state, {this.shopOrder});

  final PayState state;

  /// 134 A connected store's payment: `placed` or `confirming`.
  final String? shopOrder;

  /// The order is through: paid, or 96.2 placed to pay by bank transfer or
  /// the owner's own method (as the order received page was before).
  bool get done => state == PayState.paid || state == PayState.awaitingPayment;

  static PayStatus fromJson(Object? json) {
    final map = json is Map ? json : const {};
    final state = switch (map['state']) {
      'paid' => PayState.paid,
      'awaiting_payment' => PayState.awaitingPayment,
      'started' => PayState.started,
      'open' => PayState.open,
      'closed' => PayState.closed,
      _ => PayState.notFound,
    };
    final shop = map['shop_order'];
    return PayStatus(
      state,
      shopOrder: shop == 'placed' || shop == 'confirming'
          ? shop as String
          : null,
    );
  }
}

/// The order received page's address the screen reports as before
/// (`onCompleted`): 134's outcome reads `shop_order` from it.
Uri payCompletedUrl(Uri page, PayStatus status) => _under(
  page,
  'order-received',
  status.shopOrder == null ? null : {'shop_order': status.shopOrder!},
);

/// Reads a payment's status. Throws when the platform can't be reached.
typedef PayStatusReader = Future<PayStatus> Function(Uri page);

final payStatusReaderProvider = Provider<PayStatusReader>((ref) {
  final dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      validateStatus: (code) => code != null && code < 500,
      responseType: ResponseType.json,
    ),
  );
  ref.onDispose(dio.close);
  return (page) async {
    final response = await dio.getUri<Object?>(_under(page, 'status'));
    return PayStatus.fromJson(response.data);
  };
});

/// Opens and closes the browser sheet. Replaced in tests.
abstract interface class PaySheetLauncher {
  /// Opens [url] in the sheet; false when the phone has no browser for it.
  Future<bool> open(Uri url);

  /// Closes the sheet where the phone lets the app (iPhone); on Android the
  /// return link already brought the app over it.
  Future<void> close();
}

/// url_launcher's [launchUrl], as the sheet calls it (tests record it).
typedef LaunchUrl = Future<bool> Function(Uri url, {LaunchMode mode});

Future<bool> _launch(Uri url, {LaunchMode mode = LaunchMode.platformDefault}) =>
    launchUrl(url, mode: mode);

class UrlLauncherPaySheet implements PaySheetLauncher {
  const UrlLauncherPaySheet({
    this.launch = _launch,
    this.canClose = supportsCloseForLaunchMode,
    this.closeSheet = closeInAppWebView,
  });

  /// SFSafariViewController on iPhone, Chrome Custom Tabs on Android.
  static const mode = LaunchMode.inAppBrowserView;

  final LaunchUrl launch;
  final Future<bool> Function(LaunchMode mode) canClose;
  final Future<void> Function() closeSheet;

  @override
  Future<bool> open(Uri url) async {
    try {
      return await launch(url, mode: mode);
    } on Object {
      return false;
    }
  }

  @override
  Future<void> close() async {
    try {
      // iPhone: closes the SFSafariViewController. Android can't close a
      // Custom Tab from the app; its return link brought the app over it.
      if (await canClose(mode)) await closeSheet();
    } on Object {
      // Nothing to close.
    }
  }
}

final paySheetLauncherProvider = Provider<PaySheetLauncher>(
  (ref) => const UrlLauncherPaySheet(),
);

/// The return links the phone hands the running app (Android's
/// PayReturnActivity and iOS's SceneDelegate, `yallapp/pay_return`). A cold
/// start from the link goes through the router instead (to Orders).
final payReturnsProvider = Provider<Stream<Uri>>((ref) {
  final controller = StreamController<Uri>.broadcast();
  if (!kIsWeb) {
    const channel = MethodChannel('yallapp/pay_return');
    channel.setMethodCallHandler((call) async {
      if (call.method != 'returned') return;
      final link = Uri.tryParse('${call.arguments}');
      if (link != null && isPayReturnLink(link)) controller.add(link);
    });
    ref.onDispose(() => channel.setMethodCallHandler(null));
  }
  ref.onDispose(controller.close);
  return controller.stream;
});

/// Whether the screen should open [url] in the sheet (read once).
final opensInPaySheetProvider = Provider<bool Function(Uri url)>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  return (url) => opensInPaySheet(url, env);
});
