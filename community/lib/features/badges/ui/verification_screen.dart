import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models.dart';
import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/badge_mark.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../../profile/profile_page.dart' show linkYallapp;
import '../data/verification_api.dart';

/// Picks the ID proof (a photo from the gallery, kept sharp enough to read);
/// null when closed. Tests override it.
typedef PickIdProof = Future<String?> Function();

final pickIdProofProvider = Provider<PickIdProof>(
  (ref) =>
      () async => (await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 2400,
        imageQuality: 92,
      ))?.path,
);

final verificationProvider = FutureProvider.autoDispose<VerificationState>(
  (ref) => ref.watch(verificationApiProvider).state(),
);

/// The Gold badge ("Pro Developer") and its form. The form shows only to a
/// member whose linked Yallapp account has 5 or more apps; the apps are that
/// account's, listed and never typed. A waiting request, an approval, or a
/// rejection with the admin's reason show in its place.
class VerificationScreen extends ConsumerWidget {
  const VerificationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final state = ref.watch(verificationProvider);
    return Scaffold(
      backgroundColor: p.screen,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 8),
              child: Row(
                children: [
                  IconBtn(
                    icon: Directionality.of(context) == TextDirection.rtl
                        ? Symbols.arrow_forward_rounded
                        : Symbols.arrow_back_rounded,
                    label: l.commonBack,
                    onTap: () => context.pop(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: switch (state) {
                AsyncData(:final value) => _Body(state: value),
                AsyncError() => Center(
                  child: TextButton(
                    onPressed: () => ref.invalidate(verificationProvider),
                    child: Text(l.commonRetry),
                  ),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.state});

  final VerificationState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final request = state.request;
    final pending = request?.status == RequestStatus.pending;
    final rejected = request?.status == RequestStatus.rejected;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 0, 18, 32),
      children: [
        const _GoldHero(),
        const SizedBox(height: 14),
        Text(
          l.verifyIntro,
          style: TextStyle(fontSize: 14, height: 1.5, color: p.muted),
        ),
        const SizedBox(height: 18),
        if (state.hasGold)
          _Note(
            key: const ValueKey('verify-has-gold'),
            icon: Symbols.verified_rounded,
            color: BadgeMark.colorOf(BadgeKind.gold),
            text: l.verifyHasGold,
          )
        else if (!state.yallappLinked) ...[
          _Note(
            key: const ValueKey('verify-not-linked'),
            icon: Symbols.link_rounded,
            color: Brand.violet,
            text: l.verifyNotLinked,
          ),
          const SizedBox(height: 12),
          _Primary(
            label: l.verifyLink,
            onTap: () async {
              await linkYallapp(context, ref);
              ref.invalidate(verificationProvider);
            },
          ),
        ] else if (pending)
          _Note(
            key: const ValueKey('verify-pending'),
            icon: Symbols.hourglass_top_rounded,
            color: Brand.amber,
            text: l.verifyPending,
            line: l.verifySentOn(
              MaterialLocalizations.of(context)
                  .formatMediumDate(request!.createdAt),
            ),
          )
        else ...[
          if (rejected) ...[
            _Note(
              key: const ValueKey('verify-rejected'),
              icon: Symbols.info_rounded,
              color: const Color(0xFFE23F72),
              text: l.verifyRejected,
              line: request!.reason == null
                  ? null
                  : l.verifyReason(request.reason!),
            ),
            const SizedBox(height: 14),
          ],
          _Progress(state: state),
          const SizedBox(height: 18),
          // The Apply form shows only with 5 or more apps.
          if (state.canApply)
            _Form(apps: state.apps)
          else
            _AppsList(apps: state.apps),
        ],
      ],
    );
  }
}

/// The gold mark, large, on a soft gold glow, and the badge's name.
class _GoldHero extends StatelessWidget {
  const _GoldHero();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Color(0xFFFFE08A),
          ),
          child: const Center(
            child: Sym(
              Symbols.verified_rounded,
              size: 36,
              fill: true,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Text(
            context.l10n.verifyTitle,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -.5,
              color: p.ink,
            ),
          ),
        ),
      ],
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({
    super.key,
    required this.icon,
    required this.color,
    required this.text,
    this.line,
  });

  final IconData icon;
  final Color color;
  final String text;
  final String? line;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: p.dark ? .14 : .1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: .35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Sym(icon, size: 24, fill: true, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 14.5,
                    height: 1.45,
                    fontWeight: FontWeight.w600,
                    color: p.ink,
                  ),
                ),
                if (line != null) ...[
                  const SizedBox(height: 4),
                  Text(line!, style: TextStyle(fontSize: 13, color: p.muted)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// "3 of 5 apps" and its bar (the menu's points bar: amber to orange).
class _Progress extends StatelessWidget {
  const _Progress({required this.state});

  final VerificationState state;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final share = (state.appCount / state.requiredApps).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l.verifyProgress(state.appCount, state.requiredApps),
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: p.ink,
          ),
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(5),
          child: SizedBox(
            height: 6,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(
                  color: p.dark
                      ? const Color(0x1FFFFFFF)
                      : const Color(0x14141327),
                ),
                FractionallySizedBox(
                  alignment: AlignmentDirectional.centerStart,
                  widthFactor: share,
                  child: const DecoratedBox(
                    decoration: BoxDecoration(color: Brand.orange),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (state.appCount < state.requiredApps) ...[
          const SizedBox(height: 8),
          Text(
            l.verifyNeedMore(state.requiredApps),
            style: TextStyle(fontSize: 13, color: p.muted),
          ),
        ],
      ],
    );
  }
}

class _AppsList extends StatelessWidget {
  const _AppsList({required this.apps});

  final List<LinkedApp> apps;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    if (apps.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Label(l.verifyApps),
        Text(l.verifyAppsFrom, style: TextStyle(fontSize: 12, color: p.muted)),
        const SizedBox(height: 8),
        for (final a in apps)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                _AppIcon(app: a),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    a.name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: p.ink,
                    ),
                  ),
                ),
                if (a.fromTemplate)
                  Text(
                    l.verifyTemplate,
                    style: TextStyle(fontSize: 12, color: p.muted),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(2, 16, 2, 6),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: context.palette.ink,
      ),
    ),
  );
}

class _Primary extends StatelessWidget {
  const _Primary({required this.label, required this.onTap, this.busy = false});

  final String label;
  final VoidCallback? onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 54,
    child: DecoratedBox(
      decoration: BoxDecoration(
        gradient: Brand.signUp,
        borderRadius: BorderRadius.circular(18),
      ),
      child: TextButton(
        onPressed: busy ? null : onTap,
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
        child: busy
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    ),
  );
}

/// The form: full name, ID proof, portfolio links; the apps listed from the
/// linked account; Send.
class _Form extends ConsumerStatefulWidget {
  const _Form({required this.apps});

  final List<LinkedApp> apps;

  @override
  ConsumerState<_Form> createState() => _FormState();
}

class _FormState extends ConsumerState<_Form> {
  final _name = TextEditingController();
  final _links = <TextEditingController>[TextEditingController()];
  String? _idProof;
  String? _nameError;
  String? _idError;
  final _linkErrors = <int, String>{};
  var _sending = false;

  @override
  void dispose() {
    _name.dispose();
    for (final c in _links) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pick() async {
    final path = await ref.read(pickIdProofProvider)();
    if (path != null && mounted) {
      setState(() {
        _idProof = path;
        _idError = null;
      });
    }
  }

  Future<void> _send() async {
    final l = context.l10n;
    final links = [
      for (final c in _links)
        if (c.text.trim().isNotEmpty) c.text.trim(),
    ];
    setState(() {
      _nameError = _name.text.trim().length < 3 ? l.verifyNameNeeded : null;
      _idError = _idProof == null ? l.verifyIdNeeded : null;
      _linkErrors.clear();
      for (final (i, c) in _links.indexed) {
        final t = c.text.trim();
        if (t.isNotEmpty && !t.startsWith('https://')) {
          _linkErrors[i] = l.verifyBadLink;
        }
      }
    });
    if (_nameError != null || _idError != null || _linkErrors.isNotEmpty) {
      return;
    }
    setState(() => _sending = true);
    try {
      await ref
          .read(verificationApiProvider)
          .apply(
            fullName: _name.text.trim(),
            idProofPath: _idProof!,
            portfolioLinks: links,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l.verifySent)));
      ref.invalidate(verificationProvider);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message.isNotEmpty ? e.message : l.commonError),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final file = _idProof?.split('/').last;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Label(l.verifyFullName),
        TextField(
          key: const ValueKey('verify-name'),
          controller: _name,
          textCapitalization: TextCapitalization.words,
          maxLength: 120,
          decoration: InputDecoration(errorText: _nameError, counterText: ''),
        ),
        _Label(l.verifyIdProof),
        Text(
          l.verifyIdProofHint,
          style: TextStyle(fontSize: 12.5, height: 1.45, color: p.muted),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          key: const ValueKey('verify-id'),
          onPressed: _pick,
          icon: Sym(
            file == null ? Symbols.badge_rounded : Symbols.check_circle_rounded,
            size: 20,
            fill: file != null,
            color: file == null ? p.ink : const Color(0xFF22C483),
          ),
          label: Text(
            file == null ? l.verifyPickId : '$file · ${l.verifyChangeId}',
            overflow: TextOverflow.ellipsis,
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: p.ink,
            minimumSize: const Size.fromHeight(50),
            side: BorderSide(
              color: _idError == null ? p.line : const Color(0xFFE23F72),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        if (_idError != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
            child: Text(
              _idError!,
              style: const TextStyle(fontSize: 12, color: Color(0xFFE23F72)),
            ),
          ),
        _Label(l.verifyPortfolio),
        for (final (i, c) in _links.indexed)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TextField(
              key: ValueKey('verify-link-$i'),
              controller: c,
              keyboardType: TextInputType.url,
              decoration: InputDecoration(
                hintText: 'https://',
                errorText: _linkErrors[i],
                suffixIcon: _links.length > 1
                    ? IconButton(
                        onPressed: () => setState(() {
                          _links.removeAt(i).dispose();
                        }),
                        icon: const Sym(Symbols.close_rounded, size: 20),
                      )
                    : null,
              ),
            ),
          ),
        if (_links.length < 5)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              onPressed: () =>
                  setState(() => _links.add(TextEditingController())),
              icon: const Sym(Symbols.add_rounded, size: 20),
              label: Text(l.verifyAddLink),
            ),
          ),
        _AppsList(apps: widget.apps),
        const SizedBox(height: 18),
        _Primary(label: l.verifySend, onTap: _send, busy: _sending),
      ],
    );
  }
}

/// An app's icon from the linked Yallapp account; its first letter on a
/// violet tile while it has none.
class _AppIcon extends StatelessWidget {
  const _AppIcon({required this.app});

  final LinkedApp app;

  @override
  Widget build(BuildContext context) {
    final tile = Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(11),
        color: Brand.lilac,
      ),
      alignment: Alignment.center,
      child: Text(
        app.name.isEmpty ? '?' : app.name.characters.first,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
    final url = app.iconUrl;
    if (url == null) return tile;
    return ClipRRect(
      key: ValueKey('app-icon-${app.id}'),
      borderRadius: BorderRadius.circular(11),
      child: Image(
        image: imageOf(url),
        width: 36,
        height: 36,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => tile,
      ),
    );
  }
}
