import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'country_codes.dart';
import 'otp_screen.dart';
import 'sign_in_screen.dart';

/// 118 A password field with a show / hide button, shared by the sign-in,
/// sign-up and password screens.
class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    required this.label,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.newPassword = false,
    this.action = TextInputAction.done,
  });

  final TextEditingController controller;
  final String label;
  final FormFieldValidator<String>? validator;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  /// A password being chosen (autofill offers a strong one) rather than typed.
  final bool newPassword;
  final TextInputAction action;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _shown = false;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return TextFormField(
      controller: widget.controller,
      obscureText: !_shown,
      autocorrect: false,
      enableSuggestions: false,
      textInputAction: widget.action,
      autofillHints: [
        widget.newPassword ? AutofillHints.newPassword : AutofillHints.password,
      ],
      inputFormatters: [LengthLimitingTextInputFormatter(128)],
      style: TextStyle(fontSize: 17, color: p.text),
      validator: widget.validator,
      onChanged: widget.onChanged,
      onFieldSubmitted: widget.onSubmitted,
      decoration: InputDecoration(
        hintText: widget.label,
        suffixIcon: IconButton(
          tooltip: _shown
              ? context.l10n.hidePassword
              : context.l10n.showPassword,
          onPressed: () => setState(() => _shown = !_shown),
          icon: AppIcon(
            _shown ? AppIcons.visibilityOff : AppIcons.preview,
            size: 22,
            color: p.textSecondary,
          ),
        ),
      ),
    );
  }
}

/// 118 The new password's rules, as the server says them.
String? newPasswordProblem(BuildContext context, String? value, int min) {
  final text = value ?? '';
  if (text.characters.length < min) return context.l10n.passwordTooShort(min);
  return null;
}

/// 118 The heading, the intro and the back button of the password screens.
class _PasswordHeader extends StatelessWidget {
  const _PasswordHeader({required this.title, required this.intro});

  final String title;
  final String intro;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Align(
        alignment: AlignmentDirectional.centerStart,
        child: AppBackButton(),
      ),
      const SizedBox(height: 28),
      Semantics(
        header: true,
        child: Text(title, style: Theme.of(context).textTheme.headlineMedium),
      ),
      const SizedBox(height: 8),
      Text(
        intro,
        style: Theme.of(context).textTheme.bodyLarge
            ?.copyWith(color: context.palette.textSecondary),
      ),
      const SizedBox(height: 28),
    ],
  );
}

/// 118 "Forgot password": the email address or phone number of the
/// account, then a code (`purpose: reset`) and a new password.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.from});

  final String? from;

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _phone = TextEditingController();
  final _email = TextEditingController();
  late String _dialCode;
  late SignInMethod _channel;
  bool _sending = false;
  String? _error;

  static final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  List<SignInMethod> get _channels {
    final auth = ref.read(appConfigProvider).auth;
    final channels = auth.passwordSignIn?.resetChannels ?? auth.methods;
    final offered = [
      for (final c in channels)
        if (auth.methods.contains(c)) c,
    ];
    return offered.isEmpty ? auth.methods : offered;
  }

  @override
  void initState() {
    super.initState();
    final config = ref.read(appConfigProvider);
    _dialCode = normalizeDialCode(config.auth.defaultCountryCode) ?? '+1';
    _channel = _channels.first;
  }

  @override
  void dispose() {
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  bool get _valid => _channel == SignInMethod.email
      ? _emailPattern.hasMatch(_email.text.trim())
      : nationalNumber(_phone.text, _dialCode).length >= 6;

  Future<void> _send() async {
    if (!_valid || _sending) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final auth = ref.read(authControllerProvider.notifier);
      final email = _channel == SignInMethod.email ? _email.text.trim() : null;
      final phone = nationalNumber(_phone.text, _dialCode);
      final result = email != null
          ? await auth.requestEmailCode(email: email)
          : await auth.requestCode(countryCode: _dialCode, phone: phone);
      if (!mounted) return;
      final from = widget.from;
      await context.push(
        from == null
            ? Paths.signInCode
            : Uri(
                path: Paths.signInCode,
                queryParameters: {'from': from},
              ).toString(),
        extra: OtpArgs(
          countryCode: _dialCode,
          phone: email == null ? phone : '',
          email: email,
          request: result,
          reset: true,
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = otpRequestError(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final channels = _channels;
    final label = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: p.text,
    );
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
          children: [
            _PasswordHeader(
              title: context.l10n.forgotPasswordTitle,
              intro: context.l10n.forgotPasswordIntro,
            ),
            if (channels.length > 1) ...[
              SegmentedButton<SignInMethod>(
                showSelectedIcon: false,
                segments: [
                  for (final c in channels)
                    ButtonSegment(
                      value: c,
                      label: Text(
                        c == SignInMethod.email
                            ? context.l10n.signInWithEmail
                            : context.l10n.signInWithPhone,
                      ),
                    ),
                ],
                selected: {_channel},
                onSelectionChanged: (s) => setState(() {
                  _channel = s.first;
                  _error = null;
                }),
              ),
              const SizedBox(height: 24),
            ],
            if (_channel == SignInMethod.email) ...[
              Text(context.l10n.emailAddress, style: label),
              const SizedBox(height: 10),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.send,
                autocorrect: false,
                textDirection: TextDirection.ltr,
                autofillHints: const [AutofillHints.email],
                style: TextStyle(fontSize: 17, color: p.text),
                decoration: InputDecoration(
                  hintText: context.l10n.emailAddress,
                ),
                onChanged: (_) => setState(() => _error = null),
                onSubmitted: (_) => _send(),
              ),
            ] else ...[
              Text(context.l10n.mobileNumber, style: label),
              const SizedBox(height: 10),
              PhoneNumberField(
                controller: _phone,
                dialCode: _dialCode,
                onPickCountry: () async {
                  final picked = await pickCountryCode(context, _dialCode);
                  if (picked != null) setState(() => _dialCode = picked);
                },
                onChanged: (_) => setState(() => _error = null),
                onSubmitted: (_) => _send(),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 10),
              InlineError(_error!),
            ],
            const SizedBox(height: 32),
            PrimaryButton(
              label: context.l10n.sendCode,
              loading: _sending,
              onPressed: _valid ? _send : null,
            ),
          ],
        ),
      ),
    );
  }
}

class NewPasswordArgs {
  const NewPasswordArgs({required this.resetToken});
  final String resetToken;
}

/// 118 After a forgotten password's code: the new password, twice, then
/// `POST /auth/password/reset` signs this phone in.
class NewPasswordScreen extends ConsumerStatefulWidget {
  const NewPasswordScreen({super.key, required this.args});

  final NewPasswordArgs args;

  @override
  ConsumerState<NewPasswordScreen> createState() => _NewPasswordScreenState();
}

class _NewPasswordScreenState extends ConsumerState<NewPasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .resetPassword(
            resetToken: widget.args.resetToken,
            password: _password.text,
          );
      // Signed in: the router leaves the sign-in screens by itself.
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final min =
        ref.watch(appConfigProvider).auth.passwordSignIn?.minLength ?? 8;
    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
            children: [
              _PasswordHeader(
                title: context.l10n.newPasswordTitle,
                intro: context.l10n.newPasswordIntro(min),
              ),
              PasswordField(
                controller: _password,
                label: context.l10n.newPassword,
                newPassword: true,
                action: TextInputAction.next,
                validator: (v) => newPasswordProblem(context, v, min),
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _confirm,
                label: context.l10n.confirmPassword,
                newPassword: true,
                validator: (v) => v == _password.text
                    ? null
                    : context.l10n.passwordsDontMatch,
                onSubmitted: (_) => _save(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                InlineError(_error!),
              ],
              const SizedBox(height: 32),
              PrimaryButton(
                label: context.l10n.saveAndSignIn,
                loading: _saving,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 118 Account › Settings › Change password: the current one, the new one
/// twice (`PUT /me/password`); the account's other phones are signed out.
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .changePassword(
            currentPassword: _current.text,
            password: _password.text,
          );
      if (!mounted) return;
      showMessage(context, context.l10n.passwordChanged);
      context.pop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final min =
        ref.watch(appConfigProvider).auth.passwordSignIn?.minLength ?? 8;
    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
            children: [
              _PasswordHeader(
                title: context.l10n.changePassword,
                intro: context.l10n.newPasswordIntro(min),
              ),
              PasswordField(
                controller: _current,
                label: context.l10n.currentPassword,
                action: TextInputAction.next,
                validator: (v) => (v == null || v.isEmpty)
                    ? context.l10n.enterCurrentPassword
                    : null,
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _password,
                label: context.l10n.newPassword,
                newPassword: true,
                action: TextInputAction.next,
                validator: (v) => newPasswordProblem(context, v, min),
              ),
              const SizedBox(height: 14),
              PasswordField(
                controller: _confirm,
                label: context.l10n.confirmPassword,
                newPassword: true,
                validator: (v) => v == _password.text
                    ? null
                    : context.l10n.passwordsDontMatch,
                onSubmitted: (_) => _save(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                InlineError(_error!),
              ],
              const SizedBox(height: 32),
              PrimaryButton(
                label: context.l10n.changePassword,
                loading: _saving,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
