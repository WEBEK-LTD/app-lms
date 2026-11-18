import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/l10n.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/buttons.dart';
import 'pay_sheet.dart';

/// Why the payment is being checked.
enum _Why { link, resume, tap, poll }

/// What the screen under the sheet says.
enum PaySheetPanel {
  opening,
  waiting,
  checking,
  pending,
  notPaid,
  failed,
  closed,
  error,
}

/// 170 Yallapp's payment page in the phone's browser sheet, and what the
/// app shows under it: waiting while the customer pays there, then the
/// payment's state read from the platform (never from the return link):
/// through ([onDone] with the order received page's address, as the web
/// view reported it), not confirmed yet, not paid, or the order closed.
/// [onUnavailable] when the phone can't open the sheet: the web view then
/// opens the page as before.
class PaySheetFlow extends ConsumerStatefulWidget {
  const PaySheetFlow({
    super.key,
    required this.page,
    required this.onDone,
    required this.onUnavailable,
  });

  /// The payment page (`<platform>/pay/<token>`).
  final Uri page;
  final ValueChanged<Uri> onDone;
  final VoidCallback onUnavailable;

  /// How often the payment is read while the sheet is open (an iPhone's
  /// sheet closes without telling the app), and for how long.
  static const pollEvery = Duration(seconds: 4);
  static const pollFor = Duration(minutes: 45);

  @override
  ConsumerState<PaySheetFlow> createState() => _PaySheetFlowState();
}

class _PaySheetFlowState extends ConsumerState<PaySheetFlow>
    with WidgetsBindingObserver {
  PaySheetPanel _panel = PaySheetPanel.opening;
  StreamSubscription<Uri>? _returns;
  Timer? _poll;
  DateTime? _pollUntil;
  bool _finished = false;
  Future<void>? _running;
  ({_Why why, String? hint})? _queued;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _returns = ref.read(payReturnsProvider).listen(_onReturn);
    unawaited(_open());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_returns?.cancel());
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _open() async {
    final opened = await ref
        .read(paySheetLauncherProvider)
        .open(paySheetEntry(widget.page));
    if (!mounted || _finished) return;
    if (!opened) {
      widget.onUnavailable();
      return;
    }
    setState(() => _panel = PaySheetPanel.waiting);
    _startPolling();
  }

  void _startPolling() {
    _poll?.cancel();
    _pollUntil = DateTime.now().add(PaySheetFlow.pollFor);
    _poll = Timer.periodic(PaySheetFlow.pollEvery, (_) {
      final until = _pollUntil;
      if (until != null && DateTime.now().isAfter(until)) {
        _poll?.cancel();
        return;
      }
      _check(_Why.poll);
    });
  }

  void _onReturn(Uri link) {
    if (_finished) return;
    // The iPhone's sheet stays over the app until it's closed; Android's
    // return already brought the app over it.
    unawaited(ref.read(paySheetLauncherProvider).close());
    _check(_Why.link, hint: payReturnResult(link));
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_finished) {
      // Android's sheet is its own screen: back here, it was closed.
      if (_panel != PaySheetPanel.opening) _check(_Why.resume);
    }
  }

  /// One check at a time; a stronger reason asked meanwhile runs after it.
  void _check(_Why why, {String? hint}) {
    if (_finished) return;
    if (_running != null) {
      final queued = _queued;
      if (queued == null || why.index < queued.why.index) {
        _queued = (why: why, hint: hint);
      }
      return;
    }
    _running = _read(why, hint).whenComplete(() {
      _running = null;
      final next = _queued;
      _queued = null;
      if (next != null && mounted) _check(next.why, hint: next.hint);
    });
  }

  Future<void> _read(_Why why, String? hint) async {
    final quiet = why == _Why.poll;
    if (!quiet && mounted) setState(() => _panel = PaySheetPanel.checking);
    PayStatus status;
    try {
      status = await ref.read(payStatusReaderProvider)(widget.page);
    } on Object {
      if (!quiet && mounted && !_finished) {
        setState(() => _panel = PaySheetPanel.error);
      }
      return;
    }
    if (!mounted || _finished) return;
    if (status.done) {
      _finish(status);
      return;
    }
    switch (status.state) {
      case PayState.closed:
        _poll?.cancel();
        unawaited(ref.read(paySheetLauncherProvider).close());
        setState(() => _panel = PaySheetPanel.closed);
      case PayState.started when !quiet:
        // Started with the gateway, not confirmed yet: it may still be
        // (its webhook, the pending-payments check). Never "failed" unless
        // the payment page said so.
        setState(
          () => _panel = hint == 'failed'
              ? PaySheetPanel.failed
              : PaySheetPanel.pending,
        );
      case PayState.open when !quiet:
        setState(
          () => _panel = hint == 'failed'
              ? PaySheetPanel.failed
              : PaySheetPanel.notPaid,
        );
      case PayState.notFound when !quiet:
        setState(() => _panel = PaySheetPanel.error);
      default:
        // A poll that finds it still open says nothing new.
        if (_panel == PaySheetPanel.checking) {
          setState(() => _panel = PaySheetPanel.waiting);
        }
    }
  }

  void _finish(PayStatus status) {
    _finished = true;
    _poll?.cancel();
    unawaited(ref.read(paySheetLauncherProvider).close());
    widget.onDone(payCompletedUrl(widget.page, status));
  }

  Future<void> _openAgain() async {
    setState(() => _panel = PaySheetPanel.opening);
    await _open();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final busy =
        _panel == PaySheetPanel.opening || _panel == PaySheetPanel.checking;
    final (icon, title, body) = switch (_panel) {
      PaySheetPanel.opening || PaySheetPanel.waiting => (
        AppIcons.info,
        l10n.paySheetWaitingTitle,
        l10n.paySheetWaitingBody,
      ),
      PaySheetPanel.checking => (AppIcons.schedule, l10n.paySheetChecking, ''),
      PaySheetPanel.pending => (
        AppIcons.schedule,
        l10n.paySheetPendingTitle,
        l10n.paySheetPendingBody,
      ),
      PaySheetPanel.notPaid => (
        AppIcons.info,
        l10n.paySheetNotPaidTitle,
        l10n.paySheetNotPaidBody,
      ),
      PaySheetPanel.failed => (
        AppIcons.info,
        l10n.paySheetNotPaidTitle,
        l10n.paySheetFailedBody,
      ),
      PaySheetPanel.closed => (
        AppIcons.info,
        l10n.paySheetClosedTitle,
        l10n.paySheetClosedBody,
      ),
      PaySheetPanel.error => (
        AppIcons.info,
        l10n.paySheetCheckFailedTitle,
        l10n.paySheetCheckFailedBody,
      ),
    };
    final canPay =
        _panel == PaySheetPanel.waiting ||
        _panel == PaySheetPanel.pending ||
        _panel == PaySheetPanel.notPaid ||
        _panel == PaySheetPanel.failed ||
        _panel == PaySheetPanel.error;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        child: Column(
          key: ValueKey('pay-sheet-${_panel.name}'),
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (busy)
              Center(
                child: CircularProgressIndicator(
                  color: p.primary,
                  semanticsLabel: l10n.loading,
                ),
              )
            else
              Center(child: AppIcon(icon, size: 48, color: p.primary)),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            if (body.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                body,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, height: 1.4, color: p.textBody),
              ),
            ],
            const SizedBox(height: 24),
            if (_panel != PaySheetPanel.closed && !busy) ...[
              PrimaryButton(
                key: const ValueKey('pay-sheet-check'),
                label: l10n.paySheetCheckAgain,
                icon: AppIcons.refresh,
                onPressed: () => _check(_Why.tap),
              ),
              const SizedBox(height: 12),
            ],
            if (canPay)
              SecondaryButton(
                key: const ValueKey('pay-sheet-open'),
                label: l10n.paySheetOpenAgain,
                onPressed: _openAgain,
              ),
          ],
        ),
      ),
    );
  }
}
