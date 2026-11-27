import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/avatar.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/logo.dart';
import '../../core/widgets/sym.dart';
import '../auth/social_buttons.dart';
import '../settings/language_sheet.dart';

/// The welcome screen (mobile.html "Welcome · first launch"): the language
/// at the top, the collage of the members' apps with its bubbles and the
/// logo, "Build apps. Build together.", and the ways in: Continue with
/// Apple, Continue with Google (added, between Apple and email, styled as
/// Apple), Sign up with email, and Log in.
///
/// The design is drawn on a 390 × 844 phone; the three buttons are one row
/// taller than its two, so the words sit one row higher. A taller phone
/// leaves the extra room between the collage and the words.
class WelcomePage extends ConsumerWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final language = ref.watch(languageProvider);
    final languageName = switch (language) {
      'ar' => l.langArabic,
      'tr' => l.langTurkish,
      _ => l.langEnglish,
    };
    return Scaffold(
      backgroundColor: Brand.night,
      body: LayoutBuilder(
        builder: (context, box) {
          final h = box.maxHeight;
          final w = box.maxWidth;
          // The design's frame is 844 tall; what a phone has beyond it goes
          // under the collage.
          final extra = (h - 844).clamp(0, 400).toDouble();
          const buttonsBottom = 70.0;
          const buttonsHeight = 54.0 * 4 + 10 * 3;
          // The design's 476, up by the Google and Yallapp buttons and their
          // gaps (2 × (54 + 10)).
          // A phone shorter than the design keeps the words the same height
          // above the buttons, and the collage above shrinks to fit.
          final short = (844 - h).clamp(0, 400).toDouble();
          final wordsTop = 476.0 - 128 + extra - short;
          // The collage under the status bar (the design's 96 under its 50).
          final collageTop = 46 + MediaQuery.paddingOf(context).top;
          // It reaches 44 points into the words' space, as in the design.
          final scale = ((wordsTop + 44 - collageTop) / 360).clamp(.5, 1.0);
          return Stack(
            children: [
              const Positioned.fill(child: _Backdrop()),
              // The collage (`.collage`, top 96) and the logo (`.lgo`, 140
              // into it), scaled together from their top.
              Positioned(
                top: collageTop,
                left: 0,
                right: 0,
                height: 360,
                child: Transform.scale(
                  scale: scale,
                  alignment: Alignment.topCenter,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Positioned.fill(child: _Collage(width: w)),
                      Positioned(
                        top: 140,
                        left: (w - 92) / 2,
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(26),
                          ),
                          child: const CommunityLogo(size: 92, radius: 26),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // The words (`.lt`).
              Positioned(
                top: wordsTop,
                left: 24,
                right: 24,
                child: Column(
                  children: [
                    Text(
                      l.authHeadline1,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                        height: 1.1,
                      ),
                    ),
                    // The accent line in solid orange (#527: no gradient).
                    Text(
                      l.authHeadline2,
                      key: const ValueKey('welcome-headline'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Brand.orange,
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      l.authPitch,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xB8FFFFFF),
                        fontSize: 14.5,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const _Dots(),
                  ],
                ),
              ),
              // The ways in (`.btns`).
              Positioned(
                left: 22,
                right: 22,
                bottom: buttonsBottom,
                height: buttonsHeight,
                child: const SocialButtons(),
              ),
              // "Already a member? Log in" (`.small`).
              Positioned(
                left: 0,
                right: 0,
                bottom: 30,
                child: Center(
                  child: GestureDetector(
                    key: const ValueKey('welcome-login'),
                    onTap: () => context.push(Paths.logIn),
                    child: Text.rich(
                      TextSpan(
                        style: const TextStyle(
                          color: Color(0xB3FFFFFF),
                          fontSize: 13.5,
                        ),
                        children: [
                          TextSpan(text: '${l.authAlreadyMember} '),
                          TextSpan(
                            text: l.authLogIn,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              // The language (`.lang`, top 58 in the design's frame).
              PositionedDirectional(
                top: MediaQuery.paddingOf(context).top + 8,
                end: 18,
                child: GestureDetector(
                  key: const ValueKey('welcome-language'),
                  onTap: () => showLanguageSheet(context),
                  child: Glass(
                    radius: 10,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 11,
                      vertical: 7,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Sym(
                          Symbols.language_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          languageName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Sym(
                          Symbols.expand_more_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// The night sky behind it (`.land`): orange from the top corner, violet
/// from the side, indigo to night.
class _Backdrop extends StatelessWidget {
  const _Backdrop();

  // #527: Yallapp's own navy, flat.
  @override
  Widget build(BuildContext context) =>
      const ColoredBox(color: Brand.darkPaper);
}

/// The collage (`.collage`): two members' apps on tilted phones and three
/// glass bubbles of what happens here.
class _Collage extends StatelessWidget {
  const _Collage({required this.width});

  final double width;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    // The collage is laid out left to right in every language (a picture).
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          const Positioned(
            left: -18,
            top: 40,
            child: _Phone(image: 'assets/images/beauty-home.jpg', angle: -9),
          ),
          const Positioned(
            right: -16,
            top: 20,
            child: _Phone(image: 'assets/images/crochet-home.jpg', angle: 8),
          ),
          Positioned(
            left: 96,
            top: 4,
            child: _Bubble(
              lead: Avatar(
                id: 'nour',
                name: 'N',
                size: 30,
                colors: Brand.avatars[4],
              ),
              title: 'Nour',
              line: l.authBubbleNour,
            ),
          ),
          Positioned(
            right: 14,
            top: 222,
            child: _Bubble(
              lead: const Sym(
                Symbols.check_circle_rounded,
                size: 22,
                fill: true,
                color: Brand.mint,
              ),
              title: l.authBubbleAccepted,
              line: l.authBubblePoints,
            ),
          ),
          // The design's 300, up with the words (the Google button), so it
          // keeps the design's 31 points above "Build apps.".
          Positioned(
            left: 14,
            top: 237,
            child: _Bubble(
              lead: const Sym(
                Symbols.emoji_events_rounded,
                size: 22,
                fill: true,
                color: Brand.gold,
              ),
              title: l.authBubbleChallenge,
              line: l.authBubbleDays,
            ),
          ),
        ],
      ),
    );
  }
}

class _Phone extends StatelessWidget {
  const _Phone({required this.image, required this.angle});

  final String image;
  final double angle;

  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: angle * 3.14159265 / 180,
    child: Container(
      width: 118,
      height: 236,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xE6FFFFFF), width: 4),
        color: Colors.white,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.asset(
          image,
          fit: BoxFit.cover,
          alignment: Alignment.topCenter,
        ),
      ),
    ),
  );
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.lead, required this.title, required this.line});

  final Widget lead;
  final String title;
  final String line;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(borderRadius: BorderRadius.circular(12)),
    child: Glass(
      radius: 10,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 176),
        child: Directionality(
          textDirection: Directionality.of(context),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              lead,
              const SizedBox(width: 8),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        height: 1.35,
                      ),
                    ),
                    Text(
                      line,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// The three dots, the first one long (`.dots`).
class _Dots extends StatelessWidget {
  const _Dots();

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Container(
        width: 22,
        height: 6,
        decoration: BoxDecoration(
          color: Brand.orange2,
          borderRadius: BorderRadius.circular(4),
        ),
      ),
      for (var i = 0; i < 2; i++) ...[
        const SizedBox(width: 6),
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(
            color: const Color(0x4DFFFFFF),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ],
    ],
  );
}
