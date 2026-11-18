import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';

import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/buttons.dart';
import 'media_permission.dart';
import 'pay_sheet.dart';
import 'pay_sheet_view.dart';
import 'web_files.dart';
import 'site_sign_in.dart';
import 'stripe_pay_sheet.dart';
import 'web_view.dart';
import '../providers.dart';
import '../l10n/l10n.dart';

class WebPageArgs {
  const WebPageArgs({
    required this.url,
    required this.title,
    this.headers = const {},
    this.completesOn,
    this.look,
    this.ownerPage = false,
    this.onCompleted,
  });

  final String url;
  final String title;

  /// 122 The owner's choices for a web page in the app: the site's header
  /// and footer hidden, its links kept in the app.
  final WebPageLook? look;

  /// 124.9 A page the owner put in the app (a tab's, a button's or a
  /// banner's link): on the app's WordPress site it opens with the student
  /// signed in there, and it may have the camera and microphone when it
  /// asks and the student allows them.
  final bool ownerPage;
  final Map<String, String> headers;

  /// When a page the web view reaches matches, the screen closes with
  /// `true` (for example the shop's order received page).
  final bool Function(Uri url)? completesOn;

  /// 134 Told the page that matched [completesOn] (a payment inside the
  /// app reads how it ended from its address).
  final void Function(Uri url)? onCompleted;
}

/// A page of the website shown in the app (for example the checkout).
///
/// Pops with `true` when closed after reaching a page that matches
/// [WebPageArgs.completesOn], and `false` otherwise.
///
/// 170 Yallapp's payment page (`<platform>/pay/<token>`) opens in the
/// phone's browser sheet instead ([PaySheetFlow], where Apple Pay and Google
/// Pay show): the screen pops with `true` once the platform says the order
/// is through, telling [WebPageArgs.onCompleted] the order received page's
/// address as the web view did. Every other page, the app preview and
/// builds without their return address keep the web view.
///
/// 188 That browser sheet is now dormant ([opensInPaySheetProvider]): the
/// payment page stays in the web view, and a Stripe payment there is taken
/// by Stripe's native PaymentSheet ([StripePagePayment], card, Apple Pay,
/// Google Pay), which the page asks for through the `YallappPay` channel.
class WebPageScreen extends ConsumerStatefulWidget {
  const WebPageScreen({super.key, required this.args});

  final WebPageArgs args;

  @override
  ConsumerState<WebPageScreen> createState() => _WebPageScreenState();
}

class _WebPageScreenState extends ConsumerState<WebPageScreen> {
  bool _completed = false;
  late final Uri _page = Uri.parse(widget.args.url);
  WebViewRequest? _request;

  /// 188 The payment page and its hand-off to Stripe's PaymentSheet; null
  /// for every other page, and where the sheet can't show.
  StripePagePayment? _stripe;
  WebViewHandle? _handle;

  /// 170 Paying in the browser sheet (until the phone can't open it).
  late bool _sheet =
      !widget.args.ownerPage && ref.read(opensInPaySheetProvider)(_page);

  @override
  void initState() {
    super.initState();
    _stripe = _stripeFor(_page);
    if (!widget.args.ownerPage) {
      _request = _requestFor(_page);
      return;
    }
    // 124.9 The site's own page opens signed in, by a one-time link.
    final look = widget.args.look;
    unawaited(
      siteSignedInPage(
        ref.read,
        _page,
        appView: look != null && look.hideHeader && look.hideFooter,
      ).then((url) {
        if (mounted) setState(() => _request = _requestFor(url));
      }),
    );
  }

  StripePagePayment? _stripeFor(Uri url) {
    if (widget.args.ownerPage) return null;
    final presenter = ref.read(stripeSheetPresenterProvider);
    final page = payPageOf(url, ref.read(appEnvironmentProvider).build);
    if (presenter == null || page == null) return null;
    return StripePagePayment(
      page: page,
      readSetup: ref.read(sheetSetupReaderProvider),
      presenter: presenter,
      readStatus: ref.read(payStatusReaderProvider),
      toPage: (message) async => _handle?.postToPage(message),
      onPaid: _paidInSheet,
      applePayMerchantId: ref
          .read(appEnvironmentProvider)
          .build
          .applePayMerchantId,
      dark:
          WidgetsBinding.instance.platformDispatcher.platformBrightness ==
          Brightness.dark,
    );
  }

  /// 188 The page asks the app to take its Stripe payment.
  void _onPayMessage(String message) {
    final stripe = _stripe;
    if (stripe == null || !isSheetRequest(message) || _completed) return;
    unawaited(stripe.run());
  }

  WebViewRequest _requestFor(Uri url) => WebViewRequest(
    url: url,
    headers: widget.args.headers,
    channels: _stripe == null ? const {} : {payChannelName: _onPayMessage},
    onCreated: _stripe == null ? null : (handle) => _handle = handle,
    onUrlChange: _onUrl,
    debugLabel: 'page',
    injectCss: widget.args.look?.css,
    openLinksOutside:
        widget.args.look != null && !widget.args.look!.linksInside,
    pageHost: url == _page ? null : _page.host,
    onMediaRequest: widget.args.ownerPage
        ? pageMediaRequests(context, ref)
        : null,
    onFileSelect: widget.args.ownerPage ? pageFileChooser(context, ref) : null,
  );

  void _onUrl(Uri url) {
    final test = widget.args.completesOn;
    if (!_completed && test != null && test(url) && mounted) {
      setState(() => _completed = true);
      widget.args.onCompleted?.call(url);
    }
  }

  void _close() => Navigator.of(context).pop(_completed);

  /// 170 The platform says the order is through: as when the web view
  /// reached the order received page, then the screen closes. 188 Also
  /// after Stripe's PaymentSheet.
  void _paidInSheet(Uri received) {
    if (!mounted || _completed) return;
    _completed = true;
    widget.args.onCompleted?.call(received);
    _close();
  }

  /// 170 No browser for the sheet: the web view, as before.
  void _sheetUnavailable() {
    if (mounted) setState(() => _sheet = false);
  }

  @override
  Widget build(BuildContext context) {
    final args = widget.args;
    final p = context.palette;
    final builder = ref.watch(webViewBuilderProvider);
    return PopScope<bool>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _close();
      },
      child: Scaffold(
        backgroundColor: p.surface,
        body: SafeArea(
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: p.divider)),
                ),
                child: Row(
                  children: [
                    SquareIconButton(
                      icon: AppIcons.close,
                      label: _completed
                          ? context.l10n.done
                          : context.l10n.close,
                      onPressed: _close,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        args.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _sheet
                    ? PaySheetFlow(
                        page: _page,
                        onDone: _paidInSheet,
                        onUnavailable: _sheetUnavailable,
                      )
                    : _request == null
                    ? Center(
                        child: CircularProgressIndicator(
                          key: const ValueKey('web-page-signing-in'),
                          color: p.primary,
                        ),
                      )
                    : builder(_request!),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
