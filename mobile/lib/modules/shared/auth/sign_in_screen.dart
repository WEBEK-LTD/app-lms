import 'dart:ui' show ImageFilter;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/bidi.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/preview/preview_widgets.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'country_codes.dart';
import 'otp_screen.dart';
import 'password_screens.dart';
import '../../../core/l10n/l10n.dart';

/// Sign in with a mobile number (design: Main), or by email when the app
/// offers it (18: `Config.auth.methods`): a code by email, or the account's
/// email and password on a WordPress site.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key, this.from});

  /// Where to go after signing in.
  final String? from;

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  // 118 Studio apps with passwords: the username, what the password goes with,
  // whether the password form shows, and a code to create an account.
  final _username = TextEditingController();
  late PasswordWay _way;
  late bool _passwordMode;
  bool _creating = false;
  late String _dialCode;
  late SignInMethod _method;
  bool _sending = false;
  String? _error;

  static final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  @override
  void initState() {
    super.initState();
    final config = ref.read(appConfigProvider);
    _dialCode = normalizeDialCode(config.auth.defaultCountryCode) ?? '+1';
    final passwords = _passwords;
    _passwordMode = passwords != null;
    _way = passwords?.by.first ?? PasswordWay.email;
    _method = _methods.first;
  }

  /// 118 The app's password sign-in (never in the preview: the store review
  /// number signs in there with its code).
  PasswordSignIn? get _passwords => ref.read(appEnvironmentProvider).isPreview
      ? null
      : ref.read(appConfigProvider).auth.passwordSignIn;

  @override
  void dispose() {
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    _username.dispose();
    super.dispose();
  }

  /// The ways to sign in with a code. The preview signs in only the store
  /// review number. 118 With passwords: where a code still signs in, or
  /// every channel when creating an account.
  List<SignInMethod> get _methods {
    if (ref.read(appEnvironmentProvider).isPreview) {
      return const [SignInMethod.phone];
    }
    final auth = ref.read(appConfigProvider).auth;
    final passwords = auth.passwordSignIn;
    if (passwords != null && !_creating && passwords.codes.isNotEmpty) {
      return passwords.codes;
    }
    return auth.methods;
  }

  /// 118 Shows the password form, or codes (to sign in, or [creating] an account).
  void _switchTo({required bool password, bool creating = false}) =>
      setState(() {
        _passwordMode = password;
        _creating = creating;
        _method = _methods.first;
        _error = null;
      });

  static final _usernamePattern = RegExp(r'^[a-zA-Z][a-zA-Z0-9._]{2,29}$');

  bool get _identifierValid => switch (_way) {
    PasswordWay.email => _emailPattern.hasMatch(_email.text.trim()),
    PasswordWay.phone => nationalNumber(_phone.text, _dialCode).length >= 6,
    PasswordWay.username => _usernamePattern.hasMatch(_username.text.trim()),
  };

  bool get _byPassword =>
      _method == SignInMethod.email &&
      ref.read(appConfigProvider).auth.emailSignIn == EmailSignIn.password;

  bool get _valid => _passwordMode
      ? _identifierValid && _password.text.isNotEmpty
      : switch (_method) {
          SignInMethod.phone =>
            nationalNumber(_phone.text, _dialCode).length >= 6,
          SignInMethod.email =>
            _emailPattern.hasMatch(_email.text.trim()) &&
                (!_byPassword || _password.text.isNotEmpty),
        };

  Future<void> _submit() {
    if (_passwordMode) return _signInWithPasswordWay();
    if (_method == SignInMethod.phone) return _send();
    return _byPassword ? _signInWithPassword() : _sendEmailCode();
  }

  Future<void> _sendEmailCode() async {
    if (!_valid || _sending) return;
    FocusScope.of(context).unfocus();
    final email = _email.text.trim();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .requestEmailCode(email: email);
      if (!mounted) return;
      final from = widget.from;
      await context.push(
        from == null
            ? Paths.signInCode
            : Uri(
                path: Paths.signInCode,
                queryParameters: {'from': from},
              ).toString(),
        extra: OtpArgs(email: email, request: result),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = otpRequestError(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _signInWithPassword() async {
    if (!_valid || _sending) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .signInWithPassword(
            email: _email.text.trim(),
            password: _password.text,
          );
      // Signed in: the router leaves the sign-in screens by itself.
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = otpRequestError(e);
          _password.clear();
        });
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// 118 A Studio app: the email, the phone number or the username, and the password.
  Future<void> _signInWithPasswordWay() async {
    if (!_valid || _sending) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final auth = ref.read(authControllerProvider.notifier);
      await switch (_way) {
        PasswordWay.email => auth.signInWithPassword(
          email: _email.text.trim(),
          password: _password.text,
        ),
        PasswordWay.phone => auth.signInWithPassword(
          countryCode: _dialCode,
          phone: nationalNumber(_phone.text, _dialCode),
          password: _password.text,
        ),
        PasswordWay.username => auth.signInWithPassword(
          username: _username.text.trim(),
          password: _password.text,
        ),
      };
      // Signed in: the router leaves the sign-in screens by itself.
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = otpRequestError(e);
          _password.clear();
        });
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// 118 The password form: what the password goes with, and the password.
  List<Widget> _passwordFields(BuildContext context, PasswordSignIn passwords) {
    final p = context.palette;
    final label = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: p.text,
    );
    String wayLabel(PasswordWay way) => switch (way) {
      PasswordWay.email => context.l10n.signInWithEmail,
      PasswordWay.phone => context.l10n.signInWithPhone,
      PasswordWay.username => context.l10n.signInWithUsername,
    };
    return [
      if (passwords.by.length > 1) ...[
        Semantics(
          label: context.l10n.signInMethodLabel,
          container: true,
          child: SegmentedButton<PasswordWay>(
            showSelectedIcon: false,
            segments: [
              for (final way in passwords.by)
                ButtonSegment(value: way, label: Text(wayLabel(way))),
            ],
            selected: {_way},
            onSelectionChanged: (selected) => setState(() {
              _way = selected.first;
              _error = null;
            }),
          ),
        ),
        const SizedBox(height: 24),
      ],
      switch (_way) {
        PasswordWay.email => Text(context.l10n.emailAddress, style: label),
        PasswordWay.phone => Text(context.l10n.mobileNumber, style: label),
        PasswordWay.username => Text(context.l10n.username, style: label),
      },
      const SizedBox(height: 10),
      switch (_way) {
        PasswordWay.email => TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autocorrect: false,
          textDirection: TextDirection.ltr,
          autofillHints: const [AutofillHints.email],
          inputFormatters: [LengthLimitingTextInputFormatter(191)],
          style: TextStyle(fontSize: 17, color: p.text),
          decoration: InputDecoration(hintText: context.l10n.emailAddress),
          onChanged: (_) => setState(() => _error = null),
        ),
        PasswordWay.phone => PhoneNumberField(
          controller: _phone,
          dialCode: _dialCode,
          onPickCountry: _pickCountry,
          onChanged: (_) => setState(() => _error = null),
        ),
        PasswordWay.username => TextField(
          controller: _username,
          textInputAction: TextInputAction.next,
          autocorrect: false,
          enableSuggestions: false,
          textDirection: TextDirection.ltr,
          autofillHints: const [AutofillHints.username],
          inputFormatters: [LengthLimitingTextInputFormatter(30)],
          style: TextStyle(fontSize: 17, color: p.text),
          decoration: InputDecoration(hintText: context.l10n.username),
          onChanged: (_) => setState(() => _error = null),
        ),
      },
      const SizedBox(height: 20),
      Text(context.l10n.password, style: label),
      const SizedBox(height: 10),
      PasswordField(
        controller: _password,
        label: context.l10n.password,
        onChanged: (_) => setState(() => _error = null),
        onSubmitted: (_) => _submit(),
      ),
      Align(
        alignment: AlignmentDirectional.centerEnd,
        child: TextButton(
          onPressed: () {
            final from = widget.from;
            context.push(
              from == null
                  ? Paths.signInForgot
                  : Uri(
                      path: Paths.signInForgot,
                      queryParameters: {'from': from},
                    ).toString(),
            );
          },
          child: Text(context.l10n.forgotPassword),
        ),
      ),
    ];
  }

  Future<void> _send() async {
    if (!_valid || _sending) return;
    FocusScope.of(context).unfocus();
    final phone = nationalNumber(_phone.text, _dialCode);
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .requestCode(countryCode: _dialCode, phone: phone);
      if (!mounted) return;
      final from = widget.from;
      await context.push(
        from == null
            ? Paths.signInCode
            : Uri(
                path: Paths.signInCode,
                queryParameters: {'from': from},
              ).toString(),
        extra: OtpArgs(countryCode: _dialCode, phone: phone, request: result),
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

  void _browse() {
    ref.read(localSettingsProvider.notifier).setGuestMode(true);
    context.go(Paths.home);
  }

  /// The email address, and the password on a WordPress site.
  List<Widget> _emailFields(BuildContext context) {
    final p = context.palette;
    final config = ref.read(appConfigProvider);
    final resetUrl = config.auth.passwordResetUrl;
    final label = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: p.text,
    );
    return [
      Text(context.l10n.emailAddress, style: label),
      const SizedBox(height: 10),
      TextField(
        controller: _email,
        keyboardType: TextInputType.emailAddress,
        textInputAction: _byPassword
            ? TextInputAction.next
            : TextInputAction.send,
        autocorrect: false,
        textDirection: TextDirection.ltr,
        autofillHints: const [AutofillHints.email],
        inputFormatters: [LengthLimitingTextInputFormatter(191)],
        style: TextStyle(fontSize: 17, color: p.text),
        decoration: InputDecoration(hintText: context.l10n.emailAddress),
        onChanged: (_) => setState(() => _error = null),
        onSubmitted: (_) => _byPassword ? null : _submit(),
      ),
      if (_byPassword) ...[
        const SizedBox(height: 20),
        Text(context.l10n.password, style: label),
        const SizedBox(height: 10),
        TextField(
          controller: _password,
          obscureText: true,
          textInputAction: TextInputAction.done,
          autocorrect: false,
          enableSuggestions: false,
          autofillHints: const [AutofillHints.password],
          style: TextStyle(fontSize: 17, color: p.text),
          decoration: InputDecoration(hintText: context.l10n.password),
          onChanged: (_) => setState(() => _error = null),
          onSubmitted: (_) => _submit(),
        ),
        if (resetUrl != null && resetUrl.isNotEmpty)
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: TextButton(
              onPressed: () => openExternal(resetUrl),
              child: Text(context.l10n.forgotPassword),
            ),
          ),
      ],
    ];
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final config = ref.watch(appConfigProvider);
    final env = ref.watch(appEnvironmentProvider);
    // 97.3 The Figma look's logo first.
    final logo =
        config.appearance?.logoUrl ??
        config.branding.logoUrl ??
        env.build.logoUrl;
    final canGoBack = context.canPop();
    // 17 The app preview signs in only the store review number, and only
    // where the server says it can; it never sends a code.
    final previewBlocked = env.isPreview && !config.auth.previewSignIn;
    final methods = _methods;
    final byEmail = _method == SignInMethod.email;
    final passwords = _passwords;
    // 118.3 A Studio app's own sign-in look: its words, its logo, its photo.
    final look = config.screens?.signIn;
    final style = look?.style ?? SignInLookStyle.classic;
    final language = Localizations.localeOf(context).languageCode;
    final ownTitle = look == null ? null : textFor(look.title, language);
    final ownSubtitle = look == null || _creating
        ? null
        : textFor(look.subtitle, language);
    final showLogo = look?.showLogo ?? true;
    final minimal = style == SignInLookStyle.minimal;
    final panel =
        style == SignInLookStyle.photo || style == SignInLookStyle.card;

    if (style == SignInLookStyle.premium) {
      return Scaffold(
        body: _premium(
          context,
          logo: logo,
          imageUrl: look?.imageUrl,
          title: ownTitle ?? context.l10n.welcome,
          subtitle: ownSubtitle,
          showLogo: showLogo,
          previewBlocked: previewBlocked,
        ),
      );
    }

    final formChildren = <Widget>[
      Row(
        children: [
          if (canGoBack) ...[const AppBackButton(), const SizedBox(width: 12)],
          if (showLogo && !minimal) ...[
            SignInLogo(url: logo, name: config.site.name),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Text(
              minimal ? '' : config.site.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ),
          if (!canGoBack)
            TextButton(
              onPressed: _browse,
              style: TextButton.styleFrom(foregroundColor: p.text),
              child: Text(context.l10n.notNow),
            ),
        ],
      ),
      SizedBox(height: panel ? 24 : 56),
      if (minimal && showLogo) ...[
        Center(
          child: SignInLogo(url: logo, name: config.site.name),
        ),
        const SizedBox(height: 20),
      ],
      Semantics(
        header: true,
        child: Text(
          ownTitle ?? context.l10n.welcome,
          textAlign: minimal ? TextAlign.center : null,
          style: Theme.of(context).textTheme.displaySmall,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        ownSubtitle ??
            (_passwordMode
                ? context.l10n.signInIntroPasswordStudio
                : _creating
                ? context.l10n.createAccountIntroCode
                : !byEmail
                ? context.l10n.signInIntro
                : _byPassword
                ? context.l10n.signInIntroPassword
                : context.l10n.signInIntroEmail),
        textAlign: minimal ? TextAlign.center : null,
        style: Theme.of(context).textTheme.bodyLarge
            ?.copyWith(color: context.palette.textSecondary),
      ),
      if (env.isPreview) ...[
        const SizedBox(height: 16),
        PreviewNote(
          previewBlocked
              ? context.l10n.previewSignInUnavailable
              : context.l10n.previewSignInNote,
        ),
      ],
      const SizedBox(height: 32),
      if (_passwordMode && passwords != null)
        ..._passwordFields(context, passwords)
      else ...[
        if (methods.length > 1) ...[
          Semantics(
            label: context.l10n.signInMethodLabel,
            container: true,
            child: SegmentedButton<SignInMethod>(
              showSelectedIcon: false,
              segments: [
                ButtonSegment(
                  value: SignInMethod.phone,
                  label: Text(context.l10n.signInWithPhone),
                ),
                ButtonSegment(
                  value: SignInMethod.email,
                  label: Text(context.l10n.signInWithEmail),
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
        ],
        if (byEmail)
          ..._emailFields(context)
        else ...[
          Text(
            context.l10n.mobileNumber,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: p.text,
            ),
          ),
          const SizedBox(height: 10),
          PhoneNumberField(
            controller: _phone,
            dialCode: _dialCode,
            onPickCountry: _pickCountry,
            onChanged: (_) => setState(() => _error = null),
            onSubmitted: (_) => _send(),
          ),
        ],
      ],
      if (_error != null) ...[const SizedBox(height: 10), InlineError(_error!)],
      const SizedBox(height: 32),
      PrimaryButton(
        label: _byPassword || _passwordMode
            ? context.l10n.signIn
            : context.l10n.sendCode,
        loading: _sending,
        onPressed: _valid && !previewBlocked ? _submit : null,
      ),
      // 118 With passwords: a code instead, creating an account, or back to the password.
      if (passwords != null) ...[
        const SizedBox(height: 12),
        if (_passwordMode && passwords.codes.isNotEmpty)
          TextButton(
            onPressed: () => _switchTo(password: false),
            child: Text(context.l10n.signInWithCodeInstead),
          ),
        if (!_passwordMode)
          TextButton(
            onPressed: () => _switchTo(password: true),
            child: Text(context.l10n.signInWithPasswordInstead),
          ),
        if (_passwordMode && config.auth.signupAllowed)
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                context.l10n.newHereQuestion,
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
              TextButton(
                onPressed: () => _switchTo(password: false, creating: true),
                child: Text(context.l10n.createAnAccount),
              ),
            ],
          ),
      ],
      if (passwords == null || !config.auth.signupAllowed) ...[
        const SizedBox(height: 32),
        Text(
          _byPassword
              ? context.l10n.signInPasswordAccountsOnly(config.site.name)
              : !config.auth.signupAllowed
              ? context.l10n.signInRegisteredOnly(config.site.name)
              : byEmail
              ? context.l10n.signInNewHereEmail
              : context.l10n.signInNewHere,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, height: 1.6, color: p.textSecondary),
        ),
      ],
      if (panel) const SizedBox(height: 8) else const Spacer(),
      const SizedBox(height: 24),
      LegalLine(terms: config.site.termsUrl, privacy: config.site.privacyUrl),
    ];
    return Scaffold(
      body: _framed(context, style, look?.imageUrl, formChildren),
    );
  }

  /// 123 The premium academy's sign-in: the owner's words large over the
  /// photo (or the app's colours) with the logo and name, and the form on
  /// a card at the foot: the way in, a gold button to go on, the other way
  /// and a new account side by side, and the terms with their links in gold.
  Widget _premium(
    BuildContext context, {
    required String? logo,
    required String? imageUrl,
    required String title,
    required String? subtitle,
    required bool showLogo,
    required bool previewBlocked,
  }) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(appConfigProvider);
    final env = ref.watch(appEnvironmentProvider);
    final gold = Theme.of(context).colorScheme.secondary;
    final passwords = _passwords;
    final methods = _methods;
    final byEmail = _method == SignInMethod.email;
    final canGoBack = context.canPop();
    const white = Colors.white;

    final heading = _creating
        ? l10n.createAnAccount
        : _passwordMode
        ? l10n.signIn
        : byEmail
        ? l10n.signInEmailTitle
        : l10n.signInPhoneTitle;
    final note = _creating
        ? (passwords != null ? l10n.createAccountIntroCode : l10n.signInNewHere)
        : _passwordMode
        ? l10n.signInIntroPasswordStudio
        : _byPassword
        ? l10n.signInIntroPassword
        : l10n.signInCodeNote;

    // The other way in, beside a new account.
    (String, IconData, VoidCallback)? other;
    if (_passwordMode) {
      if (passwords != null && passwords.codes.isNotEmpty) {
        other = (
          l10n.signInCodeShort,
          Symbols.sms_rounded,
          () => _switchTo(password: false),
        );
      }
    } else if (methods.length > 1) {
      other = byEmail
          ? (
              l10n.signInWithPhone,
              Symbols.smartphone_rounded,
              () => setState(() {
                _method = SignInMethod.phone;
                _error = null;
              }),
            )
          : (
              l10n.emailShort,
              Symbols.mail_rounded,
              () => setState(() {
                _method = SignInMethod.email;
                _error = null;
              }),
            );
    } else if (passwords != null) {
      other = (
        l10n.password,
        Symbols.password_rounded,
        () => _switchTo(password: true),
      );
    }
    (String, IconData, VoidCallback)? account;
    if (_creating) {
      account = (
        l10n.signIn,
        Symbols.login_rounded,
        () => passwords != null
            ? _switchTo(password: true)
            : setState(() => _creating = false),
      );
    } else if (config.auth.signupAllowed) {
      account = (
        l10n.newAccountShort,
        Symbols.person_add_rounded,
        () => passwords != null
            ? _switchTo(password: false, creating: true)
            : setState(() => _creating = true),
      );
    }
    Widget side((String, IconData, VoidCallback) b, String key) => SizedBox(
      height: 48,
      child: OutlinedButton.icon(
        key: ValueKey(key),
        onPressed: b.$3,
        icon: Icon(b.$2, size: 19, color: p.text),
        label: Text(
          b.$1,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
        style: OutlinedButton.styleFrom(
          backgroundColor: p.surface,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          side: BorderSide(color: p.divider),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );

    final card = Container(
      key: const ValueKey('sign-in-premium-card'),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: p.divider),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: p.isDark ? 0.3 : 0.08),
            blurRadius: 30,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              heading,
              style: TextStyle(
                fontSize: 16.5,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            note,
            style: TextStyle(
              fontSize: 11.5,
              height: 1.5,
              color: p.textSecondary,
            ),
          ),
          if (env.isPreview) ...[
            const SizedBox(height: 12),
            PreviewNote(
              previewBlocked
                  ? l10n.previewSignInUnavailable
                  : l10n.previewSignInNote,
            ),
          ],
          const SizedBox(height: 16),
          if (_passwordMode && passwords != null)
            ..._passwordFields(context, passwords)
          else if (byEmail)
            ..._emailFields(context)
          else
            _PremiumPhoneField(
              controller: _phone,
              dialCode: _dialCode,
              valid: nationalNumber(_phone.text, _dialCode).length >= 6,
              onPickCountry: _pickCountry,
              onChanged: (_) => setState(() => _error = null),
              onSubmitted: (_) => _send(),
            ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            InlineError(_error!),
          ],
          const SizedBox(height: 14),
          GoldButtons(
            color: gold,
            child: PrimaryButton(
              key: const ValueKey('sign-in-continue'),
              label: _byPassword || _passwordMode
                  ? l10n.signIn
                  : l10n.continueAction,
              trailingIcon: Symbols.arrow_forward_rounded,
              loading: _sending,
              onPressed: _valid && !previewBlocked ? _submit : null,
            ),
          ),
          if (other != null || account != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                if (other != null)
                  Expanded(child: side(other, 'sign-in-other')),
                if (other != null && account != null) const SizedBox(width: 10),
                if (account != null)
                  Expanded(child: side(account, 'sign-in-account')),
              ],
            ),
          ],
          if (!config.auth.signupAllowed) ...[
            const SizedBox(height: 12),
            Text(
              _byPassword
                  ? l10n.signInPasswordAccountsOnly(config.site.name)
                  : l10n.signInRegisteredOnly(config.site.name),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                height: 1.5,
                color: p.textSecondary,
              ),
            ),
          ],
          const SizedBox(height: 14),
          LegalLine(
            terms: config.site.termsUrl,
            privacy: config.site.privacyUrl,
            linkColor: gold,
            fontSize: 11.5,
          ),
        ],
      ),
    );

    return Stack(
      fit: StackFit.expand,
      children: [
        if (imageUrl != null && imageUrl.isNotEmpty)
          AppNetworkImage(url: imageUrl, fit: BoxFit.cover)
        else
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: AlignmentDirectional.topEnd,
                end: AlignmentDirectional.bottomStart,
                colors: [gold, p.primary, BrandColors.midnight],
                stops: const [0, 0.45, 1],
              ),
            ),
          ),
        // The page coming up from the foot, under the card.
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                p.background.withValues(alpha: 0),
                p.background.withValues(alpha: 0),
                p.background,
              ],
              stops: const [0, 0.35, 0.72],
            ),
          ),
        ),
        SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 16, 12, 0),
                        child: Row(
                          children: [
                            if (canGoBack) ...[
                              const AppBackButton(onDark: true),
                              const SizedBox(width: 10),
                            ],
                            if (showLogo) ...[
                              ClipRRect(
                                borderRadius: BorderRadius.circular(14),
                                child: BackdropFilter(
                                  filter: ImageFilter.blur(
                                    sigmaX: 12,
                                    sigmaY: 12,
                                  ),
                                  child: Container(
                                    width: 46,
                                    height: 46,
                                    color: white.withValues(alpha: 0.16),
                                    alignment: Alignment.center,
                                    child: logo != null && logo.isNotEmpty
                                        ? SignInLogo(
                                            url: logo,
                                            name: config.site.name,
                                          )
                                        : Icon(
                                            Symbols.school_rounded,
                                            fill: 1,
                                            size: 22,
                                            color: Color.lerp(gold, white, 0.5),
                                          ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                            ],
                            Expanded(
                              child: Text(
                                config.site.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: white,
                                ),
                              ),
                            ),
                            if (!canGoBack)
                              TextButton(
                                onPressed: _browse,
                                style: TextButton.styleFrom(
                                  foregroundColor: white,
                                ),
                                child: Text(l10n.notNow),
                              ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 32, 20, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Semantics(
                              header: true,
                              child: Text(
                                title,
                                style: const TextStyle(
                                  fontSize: 33,
                                  height: 1.15,
                                  fontWeight: FontWeight.w900,
                                  color: white,
                                ),
                              ),
                            ),
                            if (subtitle != null && subtitle.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(
                                subtitle,
                                style: TextStyle(
                                  fontSize: 12,
                                  height: 1.5,
                                  color: white.withValues(alpha: 0.82),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const Spacer(),
                      const SizedBox(height: 32),
                      card,
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// 118.3 The form as the look lays it out: on the page (classic,
  /// minimal), in a panel over a full-screen photo, or in a card under one.
  Widget _framed(
    BuildContext context,
    SignInLookStyle style,
    String? imageUrl,
    List<Widget> children,
  ) {
    final p = context.palette;
    final form = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );
    if (style == SignInLookStyle.photo && imageUrl != null) {
      return Stack(
        fit: StackFit.expand,
        children: [
          AppNetworkImage(url: imageUrl, fit: BoxFit.cover),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x330E1424), Color(0xB30E1424)],
              ),
            ),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 40,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        key: const ValueKey('sign-in-photo-panel'),
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                        decoration: BoxDecoration(
                          color: p.surface.withValues(alpha: 0.96),
                          borderRadius: BorderRadius.circular(
                            context.shapes.r(28),
                          ),
                        ),
                        child: form,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    }
    if (style == SignInLookStyle.card && imageUrl != null) {
      return LayoutBuilder(
        builder: (context, constraints) {
          final photo = (constraints.maxHeight * 0.38).clamp(180.0, 340.0);
          return Stack(
            children: [
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: photo + 40,
                child: AppNetworkImage(url: imageUrl, fit: BoxFit.cover),
              ),
              SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(height: photo),
                    Container(
                      key: const ValueKey('sign-in-card'),
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight - photo,
                      ),
                      padding: EdgeInsets.fromLTRB(
                        24,
                        8,
                        24,
                        24 + MediaQuery.paddingOf(context).bottom,
                      ),
                      decoration: BoxDecoration(
                        color: p.background,
                        borderRadius: BorderRadius.vertical(
                          top: Radius.circular(context.shapes.r(28)),
                        ),
                      ),
                      child: form,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      );
    }
    return SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight - 56),
            child: IntrinsicHeight(child: form),
          ),
        ),
      ),
    );
  }
}

String otpRequestError(ApiException e) {
  if (e.code == 'rate_limited' && e.retryAfterSeconds != null) {
    return currentL10n.tooManyAttemptsSeconds(e.retryAfterSeconds!);
  }
  return e.message;
}

/// Inline error under a form field, shared by the sign-in screens.
class InlineError extends StatelessWidget {
  const InlineError(this.message, {super.key});
  final String message;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      liveRegion: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppIcon(AppIcons.error, size: 18, color: p.danger),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              message,
              style: TextStyle(fontSize: 14, color: p.danger, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

/// The country code button and the mobile number, as tall as each other.
/// 104.8.4 Yallapp Courier's sign-in has them too.
/// 123 The premium sign-in's number: the country's flag and code, a line,
/// the number, and a tick once it is long enough.
class _PremiumPhoneField extends StatelessWidget {
  const _PremiumPhoneField({
    required this.controller,
    required this.dialCode,
    required this.valid,
    required this.onPickCountry,
    required this.onChanged,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final String dialCode;
  final bool valid;
  final VoidCallback onPickCountry;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final iso = countryCodes
        .where((c) => c.dialCode == dialCode)
        .firstOrNull
        ?.iso;
    final flag = iso == null
        ? ''
        : String.fromCharCodes([
            for (final c in iso.codeUnits) 0x1F1E6 + c - 65,
          ]);
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: p.isDark ? p.background : p.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: p.divider),
      ),
      // The number reads left to right in every language.
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          children: [
            Semantics(
              button: true,
              label: context.l10n.chooseCountryCode(dialCode),
              excludeSemantics: true,
              child: InkWell(
                key: const ValueKey('sign-in-country'),
                onTap: onPickCountry,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(18),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Row(
                    children: [
                      if (flag.isNotEmpty) ...[
                        Text(flag, style: const TextStyle(fontSize: 18)),
                        const SizedBox(width: 6),
                      ],
                      Text(
                        dialCode,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Container(width: 1, height: 28, color: p.divider),
            Expanded(
              child: TextField(
                key: const ValueKey('phone-field'),
                controller: controller,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.send,
                autofillHints: const [AutofillHints.telephoneNumberNational],
                inputFormatters: [LengthLimitingTextInputFormatter(20)],
                style: TextStyle(
                  fontSize: 16,
                  letterSpacing: 0.5,
                  color: p.text,
                ),
                decoration: InputDecoration(
                  hintText: context.l10n.mobileNumber,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                ),
                onChanged: onChanged,
                onSubmitted: onSubmitted,
              ),
            ),
            if (valid)
              Padding(
                padding: const EdgeInsets.only(right: 14),
                child: Icon(
                  Symbols.check_circle_rounded,
                  fill: 1,
                  size: 22,
                  color: p.success,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class PhoneNumberField extends StatelessWidget {
  const PhoneNumberField({
    super.key,
    required this.controller,
    required this.dialCode,
    required this.onPickCountry,
    this.onChanged,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String dialCode;
  final VoidCallback onPickCountry;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            label: context.l10n.chooseCountryCode(dialCode),
            excludeSemantics: true,
            child: Material(
              color: p.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(context.shapes.r(14)),
                side: BorderSide(color: p.inputBorder),
              ),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: onPickCountry,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 56),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Row(
                      textDirection: TextDirection.ltr,
                      children: [
                        Text(
                          dialCode,
                          // 110 "+90", not "90+", in
                          // right-to-left languages.
                          textDirection: TextDirection.ltr,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: p.text,
                          ),
                        ),
                        const SizedBox(width: 6),
                        AppIcon(AppIcons.expand, size: 18, color: p.text),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.send,
              // Numbers read left to right in every language.
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.telephoneNumberNational],
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9 ]')),
                LengthLimitingTextInputFormatter(18),
              ],
              style: TextStyle(fontSize: 18, letterSpacing: 1, color: p.text),
              decoration: InputDecoration(
                hintText: context.l10n.mobileNumber,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(context.shapes.r(14)),
                  borderSide: BorderSide(color: p.text, width: 1.5),
                ),
              ),
              onChanged: onChanged,
              onSubmitted: onSubmitted,
            ),
          ),
        ],
      ),
    );
  }
}

/// The app's logo, else its initials, at the top of the sign-in screen.
class SignInLogo extends StatelessWidget {
  const SignInLogo({super.key, required this.url, required this.name});
  final String? url;
  final String name;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (url != null && url!.isNotEmpty) {
      return AppNetworkImage(
        url: url,
        width: 52,
        height: 52,
        radius: 14,
        fit: BoxFit.contain,
        semanticLabel: context.l10n.logoOf(name),
      );
    }
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .take(2)
        .map((w) => w.characters.first.toUpperCase())
        .join();
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: p.primary,
        borderRadius: BorderRadius.circular(14),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: p.onPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// "By continuing, you agree to…" with the terms and the privacy policy.
class LegalLine extends StatefulWidget {
  const LegalLine({
    super.key,
    this.terms,
    this.privacy,
    this.linkColor,
    this.fontSize = 13,
  });
  final String? terms;
  final String? privacy;

  /// 123 The documents in this colour, bold and not underlined (the
  /// premium sign-in's gold).
  final Color? linkColor;
  final double fontSize;

  @override
  State<LegalLine> createState() => _LegalLineState();
}

class _LegalLineState extends State<LegalLine> {
  final _recognizers = <TapGestureRecognizer>[];

  @override
  void dispose() {
    for (final r in _recognizers) {
      r.dispose();
    }
    super.dispose();
  }

  TextSpan _link(String text, String url, Color color) {
    final recognizer = TapGestureRecognizer()..onTap = () => openExternal(url);
    _recognizers.add(recognizer);
    return TextSpan(
      text: text,
      style: widget.linkColor != null
          ? TextStyle(color: color, fontWeight: FontWeight.w800)
          : TextStyle(color: color, decoration: TextDecoration.underline),
      recognizer: recognizer,
    );
  }

  /// "By continuing, you agree to the Terms & Conditions and Privacy
  /// Policy", with the documents as links.
  List<InlineSpan> _legalSpans(
    AppLocalizations l10n,
    String? terms,
    String? privacy,
    Color color,
  ) {
    if (terms != null && privacy != null) {
      final t = parts2(l10n.legalAgreeBoth);
      return [
        TextSpan(text: t[0]),
        _link(l10n.termsAndConditions, terms, color),
        TextSpan(text: t[1]),
        _link(l10n.privacyPolicy, privacy, color),
        if (t.length > 2) TextSpan(text: t[2]),
      ];
    }
    final t = parts(l10n.legalAgreeOne);
    return [
      TextSpan(text: t.first),
      terms != null
          ? _link(l10n.termsAndConditions, terms, color)
          : _link(l10n.privacyPolicy, privacy!, color),
      if (t.length > 1) TextSpan(text: t.last),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final terms = widget.terms;
    final privacy = widget.privacy;
    if (terms == null && privacy == null) return const SizedBox.shrink();
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
    return Text.rich(
      TextSpan(
        style: TextStyle(
          fontSize: widget.fontSize,
          height: 1.6,
          color: p.textSecondary,
        ),
        children: _legalSpans(
          context.l10n,
          terms,
          privacy,
          widget.linkColor ?? p.link,
        ),
      ),
      textAlign: TextAlign.center,
    );
  }
}

/// The country code picker under the mobile number; null when closed.
Future<String?> pickCountryCode(BuildContext context, String selected) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CountrySheet(selected: selected),
    );

class _CountrySheet extends StatefulWidget {
  const _CountrySheet({required this.selected});
  final String selected;

  @override
  State<_CountrySheet> createState() => _CountrySheetState();
}

class _CountrySheetState extends State<_CountrySheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final q = _query.trim().toLowerCase();
    final typed = normalizeDialCode(q);
    final items = countryCodes
        .where(
          (c) =>
              q.isEmpty ||
              c.name(context.l10n).toLowerCase().contains(q) ||
              c.dialCode.contains(q.replaceAll('+', '')),
        )
        .toList();
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.75,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: TextField(
                autofocus: false,
                decoration: InputDecoration(
                  hintText: context.l10n.searchCountry,
                  prefixIcon: AppIcon(AppIcons.search, color: p.textSecondary),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            Expanded(
              child: ListView(
                children: [
                  if (typed != null && RegExp(r'^\+?[0-9]+$').hasMatch(q))
                    ListTile(
                      minTileHeight: 52,
                      title: Text(context.l10n.useCode(ltrRun(typed))),
                      onTap: () => Navigator.of(context).pop(typed),
                    ),
                  for (final c in items)
                    ListTile(
                      minTileHeight: 52,
                      title: Text(
                        c.name(context.l10n),
                        style: TextStyle(color: p.text),
                      ),
                      trailing: Text(
                        c.dialCode,
                        textDirection: TextDirection.ltr,
                        style: TextStyle(
                          color: p.textSecondary,
                          fontWeight: c.dialCode == widget.selected
                              ? FontWeight.w700
                              : FontWeight.w400,
                        ),
                      ),
                      selected: c.dialCode == widget.selected,
                      onTap: () => Navigator.of(context).pop(c.dialCode),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
