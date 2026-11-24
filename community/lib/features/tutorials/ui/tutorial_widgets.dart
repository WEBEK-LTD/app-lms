import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/badge_mark.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../../qa/ui/content_direction.dart';
import '../data/tutorial_models.dart';

/// "08:24", "1:05:10": a video's length.
String clock(int seconds) {
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  final s = seconds % 60;
  String two(int v) => v.toString().padLeft(2, '0');
  return h > 0 ? '$h:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
}

String levelLabel(BuildContext context, TutorialLevel level) {
  final l = context.l10n;
  return switch (level) {
    TutorialLevel.beginner => l.tutLevelBeginner,
    TutorialLevel.intermediate => l.tutLevelIntermediate,
    TutorialLevel.advanced => l.tutLevelAdvanced,
  };
}

/// A language as its own name.
String languageName(String code) => switch (code) {
  'ar' => 'العربية',
  'tr' => 'Türkçe',
  _ => 'English',
};

/// "▶ Video · 08:24" or "Article · 9 min read".
String kindLine(BuildContext context, TutorialSummary t) {
  final l = context.l10n;
  if (t.kind == TutorialKind.video) {
    final s = t.durationSeconds;
    return s == null ? l.tutVideo : '${l.tutVideo} · ${clock(s)}';
  }
  final m = t.durationMinutes;
  return m == null ? l.tutArticle : '${l.tutArticle} · ${l.tutMinRead(m)}';
}

/// The level's colours (the rank chips' palette: green, amber, pink).
({Color wash, Color ink}) levelColors(TutorialLevel level) => switch (level) {
  TutorialLevel.beginner => (wash: const Color(0x3322C483), ink: Colors.white),
  TutorialLevel.intermediate => (
    wash: const Color(0x40F2B544),
    ink: Colors.white,
  ),
  TutorialLevel.advanced => (wash: const Color(0x40FF6E9A), ink: Colors.white),
};

/// Glass over a photo (mobile.html `.glass`: white at 16% over a 14px blur,
/// a white edge at 24%).
class PhotoGlass extends StatelessWidget {
  const PhotoGlass({super.key, required this.child, this.radius = 20});

  final Widget child;
  final double radius;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(radius),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 7, sigmaY: 7),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0x29FFFFFF),
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: const Color(0x3DFFFFFF)),
        ),
        child: child,
      ),
    ),
  );
}

/// A tutorial in a list: the design's featured card (`.feat`): its cover,
/// corners 28, darkened towards the foot, with its kind and length in glass,
/// its level, its title and its section; a lock when it is locked.
class TutorialCard extends StatelessWidget {
  const TutorialCard({super.key, required this.tutorial});

  final TutorialSummary tutorial;

  @override
  Widget build(BuildContext context) {
    final t = tutorial;
    final level = levelColors(t.level);
    return Semantics(
      button: true,
      label: t.title,
      child: GestureDetector(
        onTap: () => context.push(FeatureLinks.tutorial(t.id)),
        child: Container(
          height: 196,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            color: Brand.indigo,
            image: t.coverUrl == null
                ? null
                : DecorationImage(
                    image: imageOf(t.coverUrl!),
                    fit: BoxFit.cover,
                    alignment: const Alignment(0, -.4),
                  ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x2E141327),
                blurRadius: 36,
                offset: Offset(0, 18),
              ),
            ],
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x0D0E0D24), Color(0xD90E0D24)],
                  ),
                ),
              ),
              // A video's Play, in the top corner, clear of the words.
              if (t.kind == TutorialKind.video && !t.locked)
                const PositionedDirectional(
                  top: 14,
                  end: 14,
                  child: PhotoGlass(
                    radius: 22,
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: Sym(
                        Symbols.play_arrow_rounded,
                        size: 28,
                        fill: true,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              PositionedDirectional(
                start: 16,
                end: 16,
                bottom: 14,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        PhotoGlass(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Sym(
                                  t.kind == TutorialKind.video
                                      ? Symbols.play_circle_rounded
                                      : Symbols.menu_book_rounded,
                                  size: 14,
                                  fill: true,
                                  color: Brand.gold,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  kindLine(context, t),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: level.wash,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            levelLabel(context, t.level),
                            style: TextStyle(
                              color: level.ink,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (t.locked)
                          LockedMark(label: lockedLabel(context), dark: true),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textDirection: contentDirection(t.title),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        height: 1.25,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${t.section.name} · ${languageName(t.language)}',
                      style: const TextStyle(
                        color: Color(0xCCFFFFFF),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
