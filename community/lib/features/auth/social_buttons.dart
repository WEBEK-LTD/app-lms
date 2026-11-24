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
import '../../core/widgets/brand_marks.dart';
import '../../core/widgets/sym.dart';

/// The welcome screen's ways in (`.btns`): Continue with Apple, Continue
/// with Google (white, Apple's size), Sign up with email (orange).
class SocialButtons extends ConsumerStatefulWidget {
  const SocialButtons({super.key});

  @override
  ConsumerState<SocialButtons> createState() => _SocialButtonsState();
}

class _SocialButtonsState extends ConsumerState<SocialButtons> {
  String? _busy;

  Future<void> _with(String which) async {
    if (_busy != null) return;
    final l = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = which);
    try {
      final provider = ref.read(
        which == 'apple' ? appleSignInProvider : googleSignInProvider,
      );
      final credential = await provider.signIn();
      if (credential == null) return; // closed
      final api = ref.read(communityApiProvider);
      final language = ref.read(languageProvider);
      final result = which == 'apple'
          ? await api.signInWithApple(
              identityToken: credential.token,
              authorizationCode: credential.code,
              name: credential.name,
              language: language,
            )
          : await api.signInWithGoogle(
              idToken: credential.token,
              language: language,
            );
      await ref.read(sessionProvider.notifier).signedIn(result);
    } on ApiException catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            e.offline
                ? l.commonOffline
                : (e.code == ApiException.notConfigured
                      ? l.authProviderNotReady
                      : (e.message.isEmpty ? l.commonError : e.message)),
          ),
        ),
      );
    } on Object {
      messenger.showSnackBar(SnackBar(content: Text(l.authProviderNotReady)));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Column(
      children: [
        _WelcomeButton(
          key: const ValueKey('auth-apple'),
          label: l.authContinueApple,
          lead: const AppleMark(size: 20),
          busy: _busy == 'apple',
          onTap: () => _with('apple'),
        ),
        const SizedBox(height: 10),
        _WelcomeButton(
          key: const ValueKey('auth-google'),
          label: l.authContinueGoogle,
          lead: const GoogleMark(size: 19),
          busy: _busy == 'google',
          onTap: () => _with('google'),
        ),
        const SizedBox(height: 10),
        _WelcomeButton(
          key: const ValueKey('auth-email'),
          label: l.authSignUpEmail,
          lead: const Sym(Symbols.mail, size: 22, color: Colors.white),
          orange: true,
          onTap: () => context.push(Paths.signUp),
        ),
      ],
    );
  }
}

/// A welcome button (`.btn`: 54px, 18px corners, bold 15.5): white
/// (`.btn.w`) or the orange gradient with its glow (`.btn.o`).
class _WelcomeButton extends StatelessWidget {
  const _WelcomeButton({
    super.key,
    required this.label,
    required this.lead,
    required this.onTap,
    this.orange = false,
    this.busy = false,
  });

  final String label;
  final Widget lead;
  final VoidCallback onTap;
  final bool orange;
  final bool busy;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    excludeSemantics: true,
    child: GestureDetector(
      onTap: busy ? null : onTap,
      child: Container(
        height: 54,
        decoration: BoxDecoration(
          color: orange ? null : Colors.white,
          gradient: orange ? Brand.signUp : null,
          borderRadius: BorderRadius.circular(18),
          boxShadow: orange
              ? const [
                  BoxShadow(
                    color: Color(0x73FF5A1F),
                    blurRadius: 26,
                    offset: Offset(0, 12),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (busy)
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: orange ? Colors.white : Brand.navy,
                ),
              )
            else
              lead,
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                fontSize: 15.5,
                fontWeight: FontWeight.w700,
                color: orange ? Colors.white : Brand.navy,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
