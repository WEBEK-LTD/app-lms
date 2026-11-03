import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/language.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../shared/auth/country_codes.dart';
import '../../shared/auth/otp_screen.dart' show CodeBoxes;
import '../../shared/auth/sign_in_screen.dart';
import '../data/courier_hub.dart';

/// 104.8.4 A page of Yallapp's website in the language in use.
String hubWebsitePage(String siteUrl, String path, String language) =>
    '$siteUrl${language == 'en' ? '' : '/$language'}$path';

/// 104.8.4 Signing in to Yallapp Courier with a code to the mobile number or
/// email the company added, with the app's own sign-in look.
class HubSignInScreen extends ConsumerStatefulWidget {
  const HubSignInScreen({super.key});

  @override
  ConsumerState<HubSignInScreen> createState() => _HubSignInScreenState();
}

class _HubSignInScreenState extends ConsumerState<HubSignInScreen> {
  final _phone = TextEditingController();
  final _email = TextEditingController();
  late String _dialCode;
  var _method = SignInMethod.phone;
  bool _sending = false;
  String? _error;

  static final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  @override
  void initState() {
    super.initState();
    // The phone's country, else Türkiye.
    final country = ref
        .read(deviceLocalesProvider)
        .map((l) => l.countryCode?.toUpperCase())
        .whereType<String>()
        .firstOrNull;
    _dialCode =
        countryCodes.where((c) => c.iso == country).firstOrNull?.dialCode ??
        '+90';
  }

  @override
  void dispose() {
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  bool get _byEmail => _method == SignInMethod.email;

  bool get _valid => _byEmail
      ? _emailPattern.hasMatch(_email.text.trim())
      : nationalNumber(_phone.text, _dialCode).length >= 6;

  Future<void> _send() async {
    if (!_valid || _sending) return;
    FocusScope.of(context).unfocus();
    final email = _byEmail ? _email.text.trim() : null;
    final phone = _byEmail
        ? null
        : '$_dialCode${nationalNumber(_phone.text, _dialCode)}';
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final request = await ref
          .read(courierHubProvider.notifier)
          .requestCode(phone: phone, email: email);
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => HubCodeScreen(
            request: request,
            phone: phone,
            email: email,
            dialCode: _dialCode,
          ),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = otpRequestError(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickCountry() async {
    final picked = await pickCountryCode(context, _dialCode);
    if (picked != null) setState(() => _dialCode = picked);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final build = ref.watch(appEnvironmentProvider).build;
    final language = ref.watch(appLanguageProvider);
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - 56,
              ),
              child: IntrinsicHeight(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        SignInLogo(url: build.logoUrl, name: build.appName),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            build.appName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 56),
                    Semantics(
                      header: true,
                      child: Text(
                        l10n.welcome,
                        style: Theme.of(context).textTheme.displaySmall,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.hubSignInIntro,
                      style: Theme.of(context).textTheme.bodyLarge
                          ?.copyWith(color: p.textSecondary),
                    ),
                    const SizedBox(height: 32),
                    Semantics(
                      label: l10n.signInMethodLabel,
                      container: true,
                      child: SegmentedButton<SignInMethod>(
                        showSelectedIcon: false,
                        segments: [
                          ButtonSegment(
                            value: SignInMethod.phone,
                            label: Text(l10n.signInWithPhone),
                          ),
                          ButtonSegment(
                            value: SignInMethod.email,
                            label: Text(l10n.signInWithEmail),
                          ),
                        ],
                        selected: {_method},
                        onSelectionChanged: (selected) => setState(() {
                          _method = selected.first;
                          _error = null;
                        }),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      _byEmail ? l10n.emailAddress : l10n.mobileNumber,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (_byEmail)
                      TextField(
                        key: const ValueKey('hub-email'),
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.send,
                        autocorrect: false,
                        textDirection: TextDirection.ltr,
                        autofillHints: const [AutofillHints.email],
                        inputFormatters: [
                          LengthLimitingTextInputFormatter(191),
                        ],
                        style: TextStyle(fontSize: 17, color: p.text),
                        decoration: InputDecoration(
                          hintText: l10n.emailAddress,
                        ),
                        onChanged: (_) => setState(() => _error = null),
                        onSubmitted: (_) => _send(),
                      )
                    else
                      PhoneNumberField(
                        controller: _phone,
                        dialCode: _dialCode,
                        onPickCountry: _pickCountry,
                        onChanged: (_) => setState(() => _error = null),
                        onSubmitted: (_) => _send(),
                      ),
                    if (_error != null) ...[
                      const SizedBox(height: 10),
                      InlineError(_error!),
                    ],
                    const SizedBox(height: 32),
                    PrimaryButton(
                      label: l10n.sendCode,
                      loading: _sending,
                      onPressed: _valid ? _send : null,
                    ),
                    const Spacer(),
                    const SizedBox(height: 24),
                    LegalLine(
                      terms: hubWebsitePage(build.siteUrl, '/terms', language),
                      privacy: hubWebsitePage(
                        build.siteUrl,
                        '/privacy',
                        language,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 104.8.4 The code Yallapp Courier sent, as the app's code screen.
class HubCodeScreen extends ConsumerStatefulWidget {
  const HubCodeScreen({
    super.key,
    required this.request,
    required this.dialCode,
    this.phone,
    this.email,
  });

  final OtpRequestResult request;

  /// The number with its country code (`+201…`), or the [email].
  final String? phone;
  final String? email;
  final String dialCode;

  @override
  ConsumerState<HubCodeScreen> createState() => _HubCodeScreenState();
}

class _HubCodeScreenState extends ConsumerState<HubCodeScreen> {
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
    _start(widget.request);
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

  Future<void> _verify() async {
    if (_verifying || _code.text.length != _length) return;
    if (!DateTime.now().isBefore(_expiresAt)) {
      setState(() => _error = context.l10n.codeExpired);
      return;
    }
    setState(() {
      _verifying = true;
      _error = null;
    });
    final navigator = Navigator.of(context);
    try {
      await ref
          .read(courierHubProvider.notifier)
          .verifyCode(requestId: _request.requestId, code: _code.text);
      // Signed in: the companies take the place of the sign-in screens.
      navigator.popUntil((route) => route.isFirst);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
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
      final result = await ref
          .read(courierHubProvider.notifier)
          .requestCode(phone: widget.phone, email: widget.email);
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
    final l10n = context.l10n;
    final email = widget.email;
    final sentTo = parts(l10n.codeSentTo);
    final resendIn = _resendIn;
    final resendParts = parts(l10n.resendCodeIn);
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
                        l10n.enterCode,
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
                            text: ltrIsolate(
                              email ?? formatPhone(widget.phone ?? ''),
                            ),
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
                      onPressed: () => Navigator.of(context).pop(),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        alignment: AlignmentDirectional.centerStart,
                      ),
                      child: Text(
                        email != null ? l10n.changeEmail : l10n.changeNumber,
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
                          ? Row(
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
                            )
                          : TextButton(
                              onPressed: _resending ? null : _resend,
                              child: Text(
                                _resending ? l10n.sending : l10n.sendNewCode,
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
                label: l10n.verifyAndSignIn,
                loading: _verifying,
                onPressed: _code.text.length == _length ? _verify : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
