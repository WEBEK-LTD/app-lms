import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'country_codes.dart';
import 'otp_screen.dart';
import '../../../core/l10n/l10n.dart';

/// Sign in with a mobile number (design: Main).
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key, this.from});

  /// Where to go after signing in.
  final String? from;

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _phone = TextEditingController();
  late String _dialCode;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final config = ref.read(appConfigProvider);
    _dialCode = normalizeDialCode(config.auth.defaultCountryCode) ?? '+1';
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  bool get _valid => nationalNumber(_phone.text, _dialCode).length >= 6;

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
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CountrySheet(selected: _dialCode),
    );
    if (picked != null) setState(() => _dialCode = picked);
  }

  void _browse() {
    ref.read(localSettingsProvider.notifier).setGuestMode(true);
    context.go(Paths.home);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final config = ref.watch(appConfigProvider);
    final env = ref.watch(appEnvironmentProvider);
    final logo = config.branding.logoUrl ?? env.build.logoUrl;
    final canGoBack = context.canPop();

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
                        if (canGoBack) ...[
                          const AppBackButton(),
                          const SizedBox(width: 12),
                        ],
                        _Logo(url: logo, name: config.site.name),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            config.site.name,
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
                            style: TextButton.styleFrom(
                              foregroundColor: p.text,
                            ),
                            child: Text(context.l10n.notNow),
                          ),
                      ],
                    ),
                    const SizedBox(height: 56),
                    Semantics(
                      header: true,
                      child: Text(
                        context.l10n.welcome,
                        style: Theme.of(context).textTheme.displaySmall,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.l10n.signInIntro,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 32),
                    Text(
                      context.l10n.mobileNumber,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Semantics(
                          button: true,
                          label: context.l10n.chooseCountryCode(_dialCode),
                          excludeSemantics: true,
                          child: Material(
                            color: p.surface,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                              side: BorderSide(color: p.inputBorder),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: _pickCountry,
                              child: SizedBox(
                                height: 56,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                  ),
                                  child: Row(
                                    children: [
                                      Text(
                                        _dialCode,
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: p.text,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      AppIcon(
                                        AppIcons.expand,
                                        size: 18,
                                        color: p.text,
                                      ),
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
                            controller: _phone,
                            keyboardType: TextInputType.phone,
                            textInputAction: TextInputAction.send,
                            autofillHints: const [
                              AutofillHints.telephoneNumberNational,
                            ],
                            inputFormatters: [
                              FilteringTextInputFormatter.allow(
                                RegExp(r'[0-9 ]'),
                              ),
                              LengthLimitingTextInputFormatter(18),
                            ],
                            style: TextStyle(
                              fontSize: 18,
                              letterSpacing: 1,
                              color: p.text,
                            ),
                            decoration: InputDecoration(
                              hintText: context.l10n.mobileNumber,
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: BorderSide(
                                  color: p.text,
                                  width: 1.5,
                                ),
                              ),
                            ),
                            onChanged: (_) => setState(() => _error = null),
                            onSubmitted: (_) => _send(),
                          ),
                        ),
                      ],
                    ),
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
                    const SizedBox(height: 32),
                    Text(
                      config.auth.signupAllowed
                          ? context.l10n.signInNewHere
                          : context.l10n.signInRegisteredOnly(config.site.name),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.6,
                        color: p.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    const SizedBox(height: 24),
                    _LegalLine(site: config.site),
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

class _Logo extends StatelessWidget {
  const _Logo({required this.url, required this.name});
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

class _LegalLine extends StatefulWidget {
  const _LegalLine({required this.site});
  final SiteInfo site;

  @override
  State<_LegalLine> createState() => _LegalLineState();
}

class _LegalLineState extends State<_LegalLine> {
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
      style: TextStyle(color: color, decoration: TextDecoration.underline),
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
    final terms = widget.site.termsUrl;
    final privacy = widget.site.privacyUrl;
    if (terms == null && privacy == null) return const SizedBox.shrink();
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
    return Text.rich(
      TextSpan(
        style: TextStyle(fontSize: 13, height: 1.6, color: p.textSecondary),
        children: _legalSpans(context.l10n, terms, privacy, p.link),
      ),
      textAlign: TextAlign.center,
    );
  }
}

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
                      title: Text(context.l10n.useCode(typed)),
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
