import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import 'country_codes.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/gate/owner_contact.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'password_screens.dart';
import 'sign_in_screen.dart';
import 'signup_screen.dart';
import '../../../core/l10n/l10n.dart';

class OtpArgs {
  const OtpArgs({
    this.countryCode = '',
    this.phone = '',
    this.email,
    required this.request,
    this.reset = false,
  });

  final String countryCode;
  final String phone;

  /// 118 The code is for a forgotten password (`purpose: reset`).
  final bool reset;

  /// 18 Set when the code went to this email address instead of a phone.
  final String? email;
  final OtpRequestResult request;
}

/// Enter the verification code (design: Otp).
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.args, this.from});

  final OtpArgs args;
  final String? from;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _code = TextEditingController();
  final _focus = FocusNode();
  late OtpRequestResult _request;
  late DateTime _resendAt;
  late DateTime _expiresAt;
  Timer? _ticker;
  bool _verifying = false;
  bool _resending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _start(widget.args.request);
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  void _start(OtpRequestResult request) {
    _request = request;
    final now = DateTime.now();
    _resendAt = now.add(Duration(seconds: request.resendAfterSeconds));
    _expiresAt = now.add(Duration(seconds: request.expiresInSeconds));
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _code.dispose();
    _focus.dispose();
    super.dispose();
  }

  int get _length => _request.codeLength.clamp(3, 10);

  Duration get _resendIn {
    final left = _resendAt.difference(DateTime.now());
    return left.isNegative ? Duration.zero : left;
  }

  bool get _expired => !DateTime.now().isBefore(_expiresAt);

  Future<void> _verify() async {
    if (_verifying || _code.text.length != _length) return;
    if (_expired) {
      setState(() => _error = context.l10n.codeExpired);
      return;
    }
    setState(() {
      _verifying = true;
      _error = null;
    });
    try {
      final outcome = await ref
          .read(authControllerProvider.notifier)
          .verifyCode(
            requestId: _request.requestId,
            code: _code.text,
            reset: widget.args.reset,
          );
      if (!mounted) return;
      // 118 A forgotten password: the new one next.
      if (outcome is VerifyNeedsNewPassword) {
        await context.push(
          widget.from == null
              ? Paths.signInNewPassword
              : Uri(
                  path: Paths.signInNewPassword,
                  queryParameters: {'from': widget.from},
                ).toString(),
          extra: NewPasswordArgs(resetToken: outcome.resetToken),
        );
        return;
      }
      if (outcome is VerifyNeedsSignup) {
        await context.push(
          widget.from == null
              ? Paths.signInDetails
              : Uri(
                  path: Paths.signInDetails,
                  queryParameters: {'from': widget.from},
                ).toString(),
          extra: SignupArgs(signup: outcome.signup),
        );
      }
      // Signed in: the router leaves the sign-in screens by itself.
    } on ApiException catch (e) {
      if (!mounted) return;
      // 13.2 A new number while the app takes no new members: a screen with the owner's contact.
      if (e.code == ApiException.appUserLimit) {
        _code.clear();
        await showMembersClosed(context, ref, e.contact);
        return;
      }
      setState(() {
        _error = e.code == 'signup_disabled'
            ? (widget.args.email != null
                  ? context.l10n.noAccountForEmail
                  : context.l10n.noAccountForNumber)
            : e.message;
        _code.clear();
      });
      _focus.requestFocus();
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _resend() async {
    if (_resending || _resendIn > Duration.zero) return;
    setState(() {
      _resending = true;
      _error = null;
    });
    try {
      final auth = ref.read(authControllerProvider.notifier);
      final email = widget.args.email;
      final result = email != null
          ? await auth.requestEmailCode(email: email)
          : await auth.requestCode(
              countryCode: widget.args.countryCode,
              phone: widget.args.phone,
            );
      if (!mounted) return;
      setState(() {
        _start(result);
        _code.clear();
      });
      showMessage(context, context.l10n.newCodeSent);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = otpRequestError(e));
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final email = widget.args.email;
    final number = ltrIsolate(
      email ??
          formatPhone(widget.args.phone, dialCode: widget.args.countryCode),
    );
    final resendIn = _resendIn;
    // 123 The premium academy's code screen.
    final gate = ref.watch(appGateProvider);
    if (gate is GateReady &&
        (gate.config.screens?.has(ScreenLookKey.code) ?? false)) {
      return _premium(context, number, resendIn);
    }
    final sentTo = parts(context.l10n.codeSentTo);
    final resendParts = parts(context.l10n.resendCodeIn);
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppBackButton(),
                    const SizedBox(height: 28),
                    Semantics(
                      header: true,
                      child: Text(
                        context.l10n.enterCode,
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text.rich(
                      TextSpan(
                        style: TextStyle(
                          fontSize: 16,
                          height: 1.6,
                          color: p.textSecondary,
                        ),
                        children: [
                          TextSpan(text: sentTo.first),
                          TextSpan(
                            text: number,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: p.text,
                            ),
                          ),
                          if (sentTo.length > 1) TextSpan(text: sentTo.last),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.pop(),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        alignment: AlignmentDirectional.centerStart,
                      ),
                      child: Text(
                        email != null
                            ? context.l10n.changeEmail
                            : context.l10n.changeNumber,
                      ),
                    ),
                    const SizedBox(height: 20),
                    CodeBoxes(
                      controller: _code,
                      focusNode: _focus,
                      length: _length,
                      onChanged: (value) {
                        setState(() => _error = null);
                        if (value.length == _length) _verify();
                      },
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      InlineError(_error!),
                    ],
                    const SizedBox(height: 28),
                    Center(
                      child: resendIn > Duration.zero
                          ? Semantics(
                              liveRegion: false,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  AppIcon(
                                    AppIcons.schedule,
                                    size: 18,
                                    color: p.textSecondary,
                                  ),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text.rich(
                                      TextSpan(
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: p.textSecondary,
                                        ),
                                        children: [
                                          TextSpan(text: resendParts.first),
                                          TextSpan(
                                            text: formatClock(
                                              resendIn +
                                                  const Duration(
                                                    milliseconds: 999,
                                                  ),
                                            ),
                                            style: TextStyle(
                                              fontWeight: FontWeight.w600,
                                              color: p.text,
                                            ),
                                          ),
                                          if (resendParts.length > 1)
                                            TextSpan(text: resendParts.last),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : TextButton(
                              onPressed: _resending ? null : _resend,
                              child: Text(
                                _resending
                                    ? context.l10n.sending
                                    : context.l10n.sendNewCode,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: PrimaryButton(
                label: context.l10n.verifyAndSignIn,
                loading: _verifying,
                onPressed: _code.text.length == _length ? _verify : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 123 The premium academy's code screen: the time left as a gold ring
  /// round the message icon, the title large, where the code went, a box
  /// per digit with the next one in gold, sending again in gold, and the
  /// button in ink.
  Widget _premium(BuildContext context, String number, Duration resendIn) {
    final p = context.palette;
    final l10n = context.l10n;
    final gold = Theme.of(context).colorScheme.secondary;
    final sentTo = parts((m) => l10n.codeSentDigits(_length, m));
    final wait = _request.resendAfterSeconds;
    final left = wait <= 0
        ? 0.0
        : (resendIn.inMilliseconds / (wait * 1000)).clamp(0.0, 1.0);
    final ready = _code.text.length == _length;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: Material(
                        color: p.surface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(color: p.divider),
                        ),
                        child: InkWell(
                          key: const ValueKey('code-back'),
                          borderRadius: BorderRadius.circular(14),
                          onTap: () => context.pop(),
                          child: Semantics(
                            button: true,
                            label: l10n.back,
                            excludeSemantics: true,
                            child: SizedBox(
                              width: 44,
                              height: 44,
                              child: Icon(
                                Symbols.arrow_back_rounded,
                                size: 22,
                                color: p.text,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      key: const ValueKey('code-ring'),
                      width: 86,
                      height: 86,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CircularProgressIndicator(
                            value: resendIn > Duration.zero ? left : 1,
                            strokeWidth: 5,
                            strokeCap: StrokeCap.round,
                            color: gold,
                            backgroundColor: p.divider,
                          ),
                          Padding(
                            padding: const EdgeInsets.all(9),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: p.surface,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Symbols.sms_rounded,
                                fill: 1,
                                size: 32,
                                color: gold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    Semantics(
                      header: true,
                      child: Text(
                        l10n.verificationCodeTitle,
                        style: TextStyle(
                          fontSize: 25,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text.rich(
                      TextSpan(
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.6,
                          color: p.textSecondary,
                        ),
                        children: [
                          TextSpan(text: sentTo.first),
                          TextSpan(
                            text: number,
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: p.text,
                            ),
                          ),
                          if (sentTo.length > 1) TextSpan(text: sentTo.last),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    CodeBoxes(
                      controller: _code,
                      focusNode: _focus,
                      length: _length,
                      gold: gold,
                      onChanged: (value) {
                        setState(() => _error = null);
                        if (value.length == _length) _verify();
                      },
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      InlineError(_error!),
                    ],
                    const SizedBox(height: 24),
                    Center(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            l10n.didntGetCode,
                            style: TextStyle(
                              fontSize: 11.5,
                              color: p.textSecondary,
                            ),
                          ),
                          TextButton(
                            key: const ValueKey('code-resend'),
                            onPressed: resendIn > Duration.zero || _resending
                                ? null
                                : _resend,
                            style: TextButton.styleFrom(
                              foregroundColor: gold,
                              disabledForegroundColor: gold,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                              ),
                            ),
                            child: Text(
                              [
                                _resending ? l10n.sending : l10n.resendCode,
                                if (resendIn > Duration.zero)
                                  formatClock(
                                    resendIn +
                                        const Duration(milliseconds: 999),
                                  ),
                              ].join(' '),
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: SizedBox(
                height: 56,
                width: double.infinity,
                child: FilledButton(
                  key: const ValueKey('code-confirm'),
                  onPressed: ready && !_verifying ? _verify : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: p.text,
                    foregroundColor: p.isDark ? p.background : p.surface,
                    disabledBackgroundColor: p.text.withValues(alpha: 0.85),
                    disabledForegroundColor:
                        (p.isDark ? p.background : p.surface).withValues(
                          alpha: 0.9,
                        ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: _verifying
                      ? SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: p.isDark ? p.background : p.surface,
                            semanticsLabel: l10n.loading,
                          ),
                        )
                      : Text(
                          l10n.confirmAndSignIn,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One box per digit over a single text field, so paste and SMS autofill
/// work and screen readers see one "Verification code" field.
class CodeBoxes extends StatelessWidget {
  const CodeBoxes({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.length,
    required this.onChanged,
    this.gold,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final int length;
  final ValueChanged<String> onChanged;

  /// 123 The premium code screen's boxes: rounder, the next one in [gold]
  /// with a glow.
  final Color? gold;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Stack(
      children: [
        ListenableBuilder(
          listenable: Listenable.merge([controller, focusNode]),
          builder: (context, _) {
            final text = controller.text;
            return ExcludeSemantics(
              child: Row(
                children: [
                  for (var i = 0; i < length; i++) ...[
                    if (i > 0) SizedBox(width: gold != null ? 10 : 8),
                    Expanded(
                      child: Container(
                        height: gold != null ? 62 : 60,
                        alignment: Alignment.center,
                        decoration: gold != null
                            ? BoxDecoration(
                                color: p.surface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: focusNode.hasFocus && i == text.length
                                      ? gold!
                                      : p.divider,
                                  width: focusNode.hasFocus && i == text.length
                                      ? 2
                                      : 1,
                                ),
                                boxShadow:
                                    focusNode.hasFocus && i == text.length
                                    ? [
                                        BoxShadow(
                                          color: gold!.withValues(alpha: 0.22),
                                          spreadRadius: 4,
                                        ),
                                      ]
                                    : null,
                              )
                            : BoxDecoration(
                                color: p.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: focusNode.hasFocus && i == text.length
                                      ? p.text
                                      : p.inputBorder,
                                  width: focusNode.hasFocus && i == text.length
                                      ? 2
                                      : 1.5,
                                ),
                              ),
                        child: Text(
                          i < text.length ? text[i] : '',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
        Positioned.fill(
          child: Semantics(
            label: context.l10n.codeFieldLabel(length),
            textField: true,
            child: TextField(
              controller: controller,
              focusNode: focusNode,
              autofocus: true,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              maxLength: length,
              showCursor: false,
              enableInteractiveSelection: false,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: const TextStyle(color: Colors.transparent, fontSize: 1),
              decoration: const InputDecoration(
                counterText: '',
                filled: false,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: EdgeInsets.zero,
              ),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }
}
