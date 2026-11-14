import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/premium_chrome.dart';

/// 130.24 Sign-in and the code screen in the project's premium look: a
/// hero at the top (the photo under a shade in the photo look, the brand's
/// gradient in the brand and glass looks, a soft tint of the main colour in
/// the large look) with the round glass buttons, the logo, the welcome
/// large and the line under it, and the form on a rounded sheet over the
/// hero's foot (frosted in the glass look). Light and dark, right to left.
class PremiumAuthFrame extends StatelessWidget {
  const PremiumAuthFrame({
    super.key,
    required this.look,
    required this.title,
    required this.child,
    this.subtitle,
    this.imageUrl,
    this.logo,
    this.leading = const [],
    this.trailing = const [],
    this.compact = false,
    this.footer,
  });

  final SystemLook look;
  final String title;
  final String? subtitle;
  final String? imageUrl;
  final Widget? logo;
  final List<Widget> leading;
  final List<Widget> trailing;

  /// The code screen's smaller hero.
  final bool compact;

  /// The form.
  final Widget child;

  /// Under the sheet (the code screen's button).
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final photo = look == SystemLook.photo ? imageUrl : null;
    final tinted = look == SystemLook.large;
    final ink = tinted ? p.text : Colors.white;
    final top = MediaQuery.paddingOf(context).top;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: tinted && !p.isDark
          ? SystemUiOverlayStyle.dark
          : SystemUiOverlayStyle.light,
      child: Scaffold(
        key: ValueKey('chrome-auth-${look.name}'),
        backgroundColor: p.background,
        bottomNavigationBar: footer,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final hero = (constraints.maxHeight * (compact ? 0.30 : 0.42))
                .clamp(compact ? 200.0 : 260.0, compact ? 280.0 : 380.0);
            return Stack(
              children: [
                PositionedDirectional(
                  top: 0,
                  start: 0,
                  end: 0,
                  height: hero + 40,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (photo != null)
                        AppNetworkImage(url: photo, fit: BoxFit.cover)
                      else if (tinted)
                        ColoredBox(
                          color: Color.alphaBlend(
                            p.primary.withValues(alpha: p.isDark ? 0.24 : 0.12),
                            p.background,
                          ),
                        )
                      else
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: ChromeTones.brand(p),
                          ),
                        ),
                      if (photo != null)
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Color(0x52000000),
                                Color(0x14000000),
                                Color(0xA6000000),
                              ],
                              stops: [0, 0.4, 1],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                PositionedDirectional(
                  top: top + 8,
                  start: 12,
                  end: 12,
                  child: Row(
                    children: [...leading, const Spacer(), ...trailing],
                  ),
                ),
                SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: hero,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(24, 0, 24, 26),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (logo != null) ...[
                                logo!,
                                const SizedBox(height: 14),
                              ],
                              Semantics(
                                header: true,
                                child: Text(
                                  title,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: compact ? 28 : 34,
                                    height: 1.12,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.7,
                                    color: ink,
                                  ),
                                ),
                              ),
                              if (subtitle != null && subtitle!.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(
                                  subtitle!,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 15.5,
                                    height: 1.45,
                                    color: ink.withValues(alpha: 0.82),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                      ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight - hero,
                        ),
                        child: DecoratedBox(
                          key: const ValueKey('chrome-auth-sheet'),
                          decoration: BoxDecoration(
                            color: look == SystemLook.glass
                                ? (p.isDark
                                          ? const Color(0xFF17162E)
                                          : Colors.white)
                                      .withValues(alpha: 0.94)
                                : p.background,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(28),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.12),
                                blurRadius: 30,
                                offset: const Offset(0, -6),
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(
                              24,
                              8,
                              24,
                              24 +
                                  (footer == null
                                      ? MediaQuery.paddingOf(context).bottom
                                      : 0),
                            ),
                            child: child,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// 130.24 The logo on a frosted tile in the hero.
class PremiumAuthLogo extends StatelessWidget {
  const PremiumAuthLogo({super.key, required this.url, required this.name});

  final String? url;
  final String name;

  @override
  Widget build(BuildContext context) => Container(
    width: 56,
    height: 56,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.22),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
    ),
    clipBehavior: Clip.antiAlias,
    alignment: Alignment.center,
    child: url != null
        ? Padding(
            padding: const EdgeInsets.all(8),
            child: AppNetworkImage(
              url: url!,
              fit: BoxFit.contain,
              semanticLabel: name,
              clearPlaceholder: true,
            ),
          )
        : Text(
            nameInitial(name),
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
  );
}
