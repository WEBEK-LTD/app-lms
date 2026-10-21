import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 59 Sign in with the email and password of the Yallapp dashboard. 70 An
/// account with two-step sign-in then gives the code from its authenticator
/// app (or a recovery code), sent with the email and password again.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _hidden = true;
  bool _busy = false;

  /// 70 The password was right; the authenticator code comes next.
  bool _needsCode = false;
  ApiException? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  /// 70 Back to the email and password, for another account.
  void _otherAccount() {
    _password.clear();
    _code.clear();
    setState(() {
      _needsCode = false;
      _error = null;
    });
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .signIn(
            _email.text.trim(),
            _password.text,
            otp: _needsCode ? _code.text.trim() : null,
          );
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == ApiException.twoFactorRequired && !_needsCode) {
        setState(() => _needsCode = true);
      } else {
        setState(() => _error = e);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgot() async {
    final config = ref.read(configProvider);
    var url = config.websitePage('/forgot-password', context.lang);
    try {
      url = await ref.read(apiProvider).passwordResetLink();
    } on ApiException {
      // The website's page in the app's language.
    }
    if (mounted) await openLink(context, ref, url);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final session = ref.watch(sessionProvider);
    final expired = session is SignedOut && session.expired;
    final error = _error;
    final website = ref.watch(configProvider).websiteUrl;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: AutofillGroup(
                child: Form(
                  key: _form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Align(
                        alignment: AlignmentDirectional.centerEnd,
                        child: LanguageMenu(),
                      ),
                      const SizedBox(height: 24),
                      const Wordmark(),
                      const SizedBox(height: 32),
                      Semantics(
                        header: true,
                        child: Text(
                          _needsCode ? l10n.twoStepTitle : l10n.signInTitle,
                          style: theme.textTheme.headlineMedium,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _needsCode ? l10n.twoStepText : l10n.signInText,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: context.yb.ink2,
                        ),
                      ),
                      const SizedBox(height: 24),
                      if (expired && error == null && !_needsCode)
                        _Notice(text: l10n.signedOutNotice, tone: Tone.info),
                      if (error != null)
                        _Notice(
                          text: switch (error.code) {
                            ApiException.invalidCredentials =>
                              l10n.invalidCredentials,
                            ApiException.invalidTwoFactorCode =>
                              l10n.twoStepWrong,
                            _ => errorMessage(context, error),
                          },
                          tone: Tone.bad,
                          action: error.code == ApiException.useWebsite
                              ? TextButton(
                                  onPressed: () =>
                                      openLink(context, ref, website),
                                  child: Text(l10n.useWebsiteButton),
                                )
                              : null,
                        ),
                      if (_needsCode) ...[
                        TextFormField(
                          controller: _code,
                          autofocus: true,
                          keyboardType: TextInputType.visiblePassword,
                          autofillHints: const [AutofillHints.oneTimeCode],
                          textInputAction: TextInputAction.done,
                          autocorrect: false,
                          enableSuggestions: false,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: l10n.twoStepCode,
                            helperText: l10n.twoStepHint,
                            helperMaxLines: 3,
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? l10n.twoStepEnter
                              : null,
                        ),
                        const SizedBox(height: 24),
                        FilledButton(
                          onPressed: _busy ? null : _submit,
                          child: _busy
                              ? SizedBox.square(
                                  dimension: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: context.yb.onInk,
                                    semanticsLabel: l10n.signingIn,
                                  ),
                                )
                              : Text(l10n.twoStepVerify),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: _busy ? null : _otherAccount,
                          child: Text(l10n.twoStepOther),
                        ),
                      ] else ...[
                        TextFormField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          textInputAction: TextInputAction.next,
                          autocorrect: false,
                          decoration: InputDecoration(labelText: l10n.email),
                          validator: (v) => (v == null || !v.contains('@'))
                              ? l10n.emailInvalid
                              : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _password,
                          obscureText: _hidden,
                          autofillHints: const [AutofillHints.password],
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: l10n.password,
                            suffixIcon: IconButton(
                              tooltip: _hidden
                                  ? l10n.showPassword
                                  : l10n.hidePassword,
                              icon: Icon(
                                _hidden ? AppIcons.visible : AppIcons.hidden,
                              ),
                              onPressed: () =>
                                  setState(() => _hidden = !_hidden),
                            ),
                          ),
                          validator: (v) => (v == null || v.isEmpty)
                              ? l10n.passwordEmpty
                              : null,
                        ),
                        Align(
                          alignment: AlignmentDirectional.centerEnd,
                          child: TextButton(
                            onPressed: _forgot,
                            child: Text(l10n.forgotPassword),
                          ),
                        ),
                        const SizedBox(height: 8),
                        FilledButton(
                          onPressed: _busy ? null : _submit,
                          child: _busy
                              ? SizedBox.square(
                                  dimension: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: context.yb.onInk,
                                    semanticsLabel: l10n.signingIn,
                                  ),
                                )
                              : Text(l10n.signIn),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          l10n.newToYallapp,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall,
                        ),
                        TextButton(
                          onPressed: () => openLink(
                            context,
                            ref,
                            ref
                                .read(configProvider)
                                .websitePage('/', context.lang),
                          ),
                          child: Text(l10n.openWebsite),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text, required this.tone, this.action});

  final String text;
  final Tone tone;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon) = switch (tone) {
      Tone.bad => (context.yb.dangerBg, context.yb.danger, AppIcons.error),
      _ => (context.yb.infoBg, context.yb.info, AppIcons.info),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: fg, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      text,
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: fg),
                    ),
                  ),
                ],
              ),
              ?action,
            ],
          ),
        ),
      ),
    );
  }
}

/// "yallapp." with the Ember dot, and "Business".
class Wordmark extends StatelessWidget {
  const Wordmark({super.key, this.color});

  /// The theme's text color when null (61: Ivory on the dark theme).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final color = this.color ?? context.yb.ink;
    final style = Theme.of(context).textTheme.displaySmall?.copyWith(
      color: color,
      fontWeight: FontWeight.w800,
      letterSpacing: -1.2,
    );
    return Semantics(
      label: 'Yallapp Business',
      excludeSemantics: true,
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: AlignmentDirectional.centerStart,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('yallapp', style: style),
              Text('.', style: style?.copyWith(color: context.yb.accent)),
              const SizedBox(width: 10),
              Text(
                'Business',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(color: color, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// English, العربية, Türkçe, before signing in (after, in Settings).
class LanguageMenu extends ConsumerWidget {
  const LanguageMenu({super.key});

  static const names = {'en': 'English', 'ar': 'العربية', 'tr': 'Türkçe'};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(languageCodeProvider);
    return PopupMenuButton<String>(
      tooltip: context.l10n.language,
      onSelected: (code) =>
          ref.read(sessionProvider.notifier).setLanguage(code),
      itemBuilder: (_) => [
        for (final e in names.entries)
          CheckedPopupMenuItem(
            value: e.key,
            checked: e.key == current,
            child: Text(e.value),
          ),
      ],
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(AppIcons.language, size: 20),
            const SizedBox(width: 6),
            Text(names[current] ?? 'English'),
          ],
        ),
      ),
    );
  }
}
