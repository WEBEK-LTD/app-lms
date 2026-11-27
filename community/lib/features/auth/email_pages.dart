import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/logo.dart';
import '../../core/widgets/sym.dart';

enum EmailMode { signUp, logIn, forgot }

/// Sign up with email, Log in, and Forgot password: the welcome screen's
/// night sky, glass fields, the orange button.
class EmailAuthPage extends ConsumerStatefulWidget {
  const EmailAuthPage({super.key, required this.mode});

  final EmailMode mode;

  @override
  ConsumerState<EmailAuthPage> createState() => _EmailAuthPageState();
}

class _EmailAuthPageState extends ConsumerState<EmailAuthPage> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _hide = true;
  String? _error;
  bool _sent = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  static final _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  Future<void> _submit() async {
    if (_busy || !(_form.currentState?.validate() ?? false)) return;
    final l = context.l10n;
    setState(() {
      _busy = true;
      _error = null;
    });
    final api = ref.read(communityApiProvider);
    try {
      switch (widget.mode) {
        case EmailMode.signUp:
          final r = await api.signUpWithEmail(
            name: _name.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
            language: ref.read(languageProvider),
            device: ref.read(deviceProvider),
          );
          await ref.read(sessionProvider.notifier).signedIn(r);
        case EmailMode.logIn:
          final r = await api.logInWithEmail(
            email: _email.text.trim(),
            password: _password.text,
            device: ref.read(deviceProvider),
          );
          await ref.read(sessionProvider.notifier).signedIn(r);
        case EmailMode.forgot:
          await api.requestPasswordReset(_email.text.trim());
          setState(() => _sent = true);
      }
    } on ApiException catch (e) {
      setState(
        () => _error = e.offline
            ? l.commonOffline
            : (e.message.isEmpty ? l.commonError : e.message),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final mode = widget.mode;
    final (title, line, action) = switch (mode) {
      EmailMode.signUp => (
        l.authSignUpTitle,
        l.authSignUpLine,
        l.authCreateAccount,
      ),
      EmailMode.logIn => (l.authLogInTitle, l.authLogInLine, l.authLogIn),
      EmailMode.forgot => (l.authResetTitle, l.authResetSent, l.authSendLink),
    };
    return Scaffold(
      backgroundColor: Brand.darkPaper,
      body: Stack(
        children: [
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(color: Brand.darkPaper),
            ),
          ),
          SafeArea(
            child: Form(
              key: _form,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(22, 8, 22, 24),
                children: [
                  Row(
                    children: [
                      GestureDetector(
                        key: const ValueKey('auth-back'),
                        onTap: () => context.canPop()
                            ? context.pop()
                            : context.go(Paths.welcome),
                        child: Glass(
                          radius: 10,
                          child: SizedBox(
                            width: 42,
                            height: 42,
                            child: Sym(
                              Directionality.of(context) == TextDirection.rtl
                                  ? Symbols.arrow_forward_rounded
                                  : Symbols.arrow_back_rounded,
                              size: 22,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  const Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: CommunityLogo(size: 56, radius: 16),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.8,
                      height: 1.15,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (mode != EmailMode.forgot || _sent)
                    Text(
                      line,
                      style: const TextStyle(
                        color: Color(0xB8FFFFFF),
                        fontSize: 14.5,
                        height: 1.5,
                      ),
                    ),
                  const SizedBox(height: 26),
                  if (mode == EmailMode.signUp) ...[
                    _Field(
                      key: const ValueKey('auth-name'),
                      controller: _name,
                      label: l.authName,
                      icon: Symbols.person_rounded,
                      autofill: const [AutofillHints.name],
                      validator: (v) =>
                          (v ?? '').trim().isEmpty ? l.authNameNeeded : null,
                    ),
                    const SizedBox(height: 12),
                  ],
                  _Field(
                    key: const ValueKey('auth-email-field'),
                    controller: _email,
                    label: l.authEmail,
                    icon: Symbols.mail_rounded,
                    keyboard: TextInputType.emailAddress,
                    autofill: const [AutofillHints.email],
                    validator: (v) => _emailPattern.hasMatch((v ?? '').trim())
                        ? null
                        : l.authEmailInvalid,
                  ),
                  if (mode != EmailMode.forgot) ...[
                    const SizedBox(height: 12),
                    _Field(
                      key: const ValueKey('auth-password'),
                      controller: _password,
                      label: l.authPassword,
                      icon: Symbols.lock_rounded,
                      obscure: _hide,
                      autofill: [
                        mode == EmailMode.signUp
                            ? AutofillHints.newPassword
                            : AutofillHints.password,
                      ],
                      trailing: IconButton(
                        onPressed: () => setState(() => _hide = !_hide),
                        icon: Sym(
                          _hide
                              ? Symbols.visibility_rounded
                              : Symbols.visibility_off_rounded,
                          size: 20,
                          color: const Color(0xB3FFFFFF),
                        ),
                      ),
                      validator: (v) =>
                          (v ?? '').length < 8 ? l.authPasswordShort : null,
                    ),
                  ],
                  if (mode == EmailMode.logIn)
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: TextButton(
                        key: const ValueKey('auth-forgot'),
                        onPressed: () => context.push(Paths.forgot),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white,
                        ),
                        child: Text(
                          l.authForgot,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        _error!,
                        key: const ValueKey('auth-error'),
                        style: const TextStyle(
                          color: Color(0xFFFF9C80),
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  const SizedBox(height: 22),
                  if (!_sent)
                    GestureDetector(
                      key: const ValueKey('auth-submit'),
                      onTap: _submit,
                      child: Container(
                        height: 54,
                        decoration: BoxDecoration(
                          gradient: Brand.signUp,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: _busy
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                action,
                                style: const TextStyle(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  const SizedBox(height: 18),
                  if (mode == EmailMode.signUp)
                    _Switch(
                      question: l.authAlreadyMember,
                      action: l.authLogIn,
                      onTap: () => context.pushReplacement(Paths.logIn),
                    )
                  else if (mode == EmailMode.logIn)
                    _Switch(
                      question: l.authNoAccount,
                      action: l.authSignUpEmail,
                      onTap: () => context.pushReplacement(Paths.signUp),
                    ),
                  if (mode == EmailMode.signUp)
                    Padding(
                      padding: const EdgeInsets.only(top: 18),
                      child: Text(
                        l.authTerms,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0x8CFFFFFF),
                          fontSize: 12,
                          height: 1.5,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Switch extends StatelessWidget {
  const _Switch({
    required this.question,
    required this.action,
    required this.onTap,
  });

  final String question;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Center(
    child: GestureDetector(
      key: const ValueKey('auth-switch'),
      onTap: onTap,
      child: Text.rich(
        TextSpan(
          style: const TextStyle(color: Color(0xB3FFFFFF), fontSize: 13.5),
          children: [
            TextSpan(text: '$question '),
            TextSpan(
              text: action,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// A field on the night sky: white at 7% behind a white edge at 12%.
class _Field extends StatelessWidget {
  const _Field({
    super.key,
    required this.controller,
    required this.label,
    required this.icon,
    this.validator,
    this.keyboard,
    this.obscure = false,
    this.trailing,
    this.autofill = const [],
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String? Function(String?)? validator;
  final TextInputType? keyboard;
  final bool obscure;
  final Widget? trailing;
  final List<String> autofill;

  @override
  Widget build(BuildContext context) {
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: c, width: w),
    );
    return TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: keyboard,
      obscureText: obscure,
      autofillHints: autofill,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 15.5,
        fontWeight: FontWeight.w500,
      ),
      cursorColor: Brand.orange2,
      decoration: InputDecoration(
        filled: true,
        fillColor: const Color(0x12FFFFFF),
        labelText: label,
        labelStyle: const TextStyle(color: Color(0x99FFFFFF)),
        floatingLabelStyle: const TextStyle(color: Brand.orange2),
        prefixIcon: Sym(icon, size: 21, color: const Color(0xB3FFFFFF)),
        suffixIcon: trailing,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 17,
        ),
        border: border(const Color(0x1FFFFFFF)),
        enabledBorder: border(const Color(0x1FFFFFFF)),
        focusedBorder: border(Brand.orange2, 1.5),
        errorBorder: border(const Color(0xFFFF9C80)),
        focusedErrorBorder: border(const Color(0xFFFF9C80), 1.5),
        errorStyle: const TextStyle(color: Color(0xFFFF9C80)),
      ),
    );
  }
}
