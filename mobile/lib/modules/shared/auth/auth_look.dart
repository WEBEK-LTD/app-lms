import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/premium_chrome.dart';
import 'premium_auth_frame.dart';

/// 132.6 The look the screens after sign-in take (the code screen, a new
/// account): the system screens' look where the project has one for them,
/// else sign-in's own style from Studio › Screens, so the three screens
/// read as one. Null where they keep their own (classic) layout.
sealed class AuthLook {
  const AuthLook();

  /// [screen]: [SystemScreen.code] for the code screen, else
  /// [SystemScreen.signIn].
  static AuthLook? of(
    BuildContext context,
    StudioScreens? screens,
    SystemScreen screen,
  ) {
    final chrome = SystemLookScope.lookOf(context, screen);
    final signIn = screens?.signIn;
    if (chrome != null) {
      return AuthChromeLook(
        chrome,
        imageUrl: screens?.system?.imageUrl ?? signIn?.imageUrl,
      );
    }
    if (signIn == null || signIn.style == SignInLookStyle.classic) return null;
    return AuthOwnLook(signIn.style, imageUrl: signIn.imageUrl);
  }
}

/// The system screens' look (130.24): [PremiumAuthFrame].
class AuthChromeLook extends AuthLook {
  const AuthChromeLook(this.look, {this.imageUrl});
  final SystemLook look;
  final String? imageUrl;
}

/// Sign-in's own style (118.3, 123): photo, card, minimal or premium.
class AuthOwnLook extends AuthLook {
  const AuthOwnLook(this.style, {this.imageUrl});
  final SignInLookStyle style;
  final String? imageUrl;
}

/// 132.6 A screen after sign-in in [look]: its title and the line under
/// it, its form, and [footer] (its button) at the foot, with a way back.
class AuthLookFrame extends StatelessWidget {
  const AuthLookFrame({
    super.key,
    required this.look,
    required this.title,
    required this.child,
    this.subtitle,
    this.footer,
    this.onBack,
  });

  final AuthLook look;
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? footer;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) => switch (look) {
    AuthChromeLook(:final look, :final imageUrl) => PremiumAuthFrame(
      look: look,
      compact: true,
      title: title,
      subtitle: subtitle,
      imageUrl: imageUrl,
      leading: [
        ChromeBackButton(onColour: look != SystemLook.large, onPressed: onBack),
      ],
      footer: footer == null ? null : _foot(footer!),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [const SizedBox(height: 16), child],
      ),
    ),
    AuthOwnLook(:final style, :final imageUrl) => _OwnFrame(
      style: style,
      imageUrl: imageUrl,
      title: title,
      subtitle: subtitle,
      footer: footer == null ? null : _foot(footer!),
      onBack: onBack,
      child: child,
    ),
  };

  static Widget _foot(Widget button) => SafeArea(
    top: false,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
      child: button,
    ),
  );
}

class _OwnFrame extends StatelessWidget {
  const _OwnFrame({
    required this.style,
    required this.imageUrl,
    required this.title,
    required this.subtitle,
    required this.child,
    required this.footer,
    required this.onBack,
  });

  final SignInLookStyle style;
  final String? imageUrl;
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? footer;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final photo = imageUrl != null && imageUrl!.isNotEmpty ? imageUrl : null;
    // A photo look without its photo is the classic one (SignInLook), but a
    // premium one keeps its gradient.
    final onPhoto =
        (style == SignInLookStyle.photo && photo != null) ||
        style == SignInLookStyle.premium;
    final minimal = style == SignInLookStyle.minimal;
    final ink = onPhoto ? Colors.white : p.text;
    final heading = Column(
      crossAxisAlignment: minimal
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        Semantics(
          header: true,
          child: Text(
            title,
            textAlign: minimal ? TextAlign.center : null,
            style: TextStyle(
              fontSize: style == SignInLookStyle.premium ? 30 : 27,
              height: 1.15,
              fontWeight: style == SignInLookStyle.premium
                  ? FontWeight.w900
                  : FontWeight.w800,
              color: style == SignInLookStyle.photo ? p.text : ink,
            ),
          ),
        ),
        if (subtitle != null && subtitle!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            subtitle!,
            textAlign: minimal ? TextAlign.center : null,
            style: TextStyle(
              fontSize: 15,
              height: 1.5,
              color: style == SignInLookStyle.premium
                  ? Colors.white.withValues(alpha: 0.82)
                  : p.textSecondary,
            ),
          ),
        ],
      ],
    );
    final back = Align(
      alignment: AlignmentDirectional.centerStart,
      child: AppBackButton(onDark: onPhoto, onPressed: onBack),
    );
    final form = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [const SizedBox(height: 24), child],
    );

    switch (style) {
      case SignInLookStyle.photo when photo != null:
        // The photo across the screen, the screen on a panel at its foot.
        return Scaffold(
          key: const ValueKey('auth-look-photo'),
          bottomNavigationBar: footer == null
              ? null
              : ColoredBox(color: p.surface, child: footer),
          body: Stack(
            fit: StackFit.expand,
            children: [
              AppNetworkImage(url: photo, fit: BoxFit.cover),
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
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight - 32,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          back,
                          const SizedBox(height: 120),
                          Container(
                            key: const ValueKey('auth-look-photo-panel'),
                            padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                            decoration: BoxDecoration(
                              color: p.surface.withValues(alpha: 0.96),
                              borderRadius: BorderRadius.circular(
                                context.shapes.r(28),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [heading, form],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      case SignInLookStyle.card when photo != null:
        // The photo on top, the screen on a card under it.
        return Scaffold(
          key: const ValueKey('auth-look-card'),
          bottomNavigationBar: footer == null
              ? null
              : ColoredBox(color: p.background, child: footer),
          body: LayoutBuilder(
            builder: (context, constraints) {
              final height = (constraints.maxHeight * 0.3).clamp(150.0, 260.0);
              final top = MediaQuery.paddingOf(context).top;
              return Stack(
                children: [
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: height + 40,
                    child: AppNetworkImage(url: photo, fit: BoxFit.cover),
                  ),
                  SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(
                          height: height,
                          child: Padding(
                            padding: EdgeInsetsDirectional.only(
                              start: 20,
                              top: top + 12,
                            ),
                            child: Align(
                              alignment: AlignmentDirectional.topStart,
                              child: AppBackButton(
                                onDark: true,
                                onPressed: onBack,
                              ),
                            ),
                          ),
                        ),
                        Container(
                          key: const ValueKey('auth-look-card-sheet'),
                          constraints: BoxConstraints(
                            minHeight: constraints.maxHeight - height,
                          ),
                          padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                          decoration: BoxDecoration(
                            color: p.background,
                            borderRadius: BorderRadius.vertical(
                              top: Radius.circular(context.shapes.r(28)),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [heading, form],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        );
      case SignInLookStyle.premium:
        // 123 The premium sign-in's: the words large in white over the
        // photo (or the gold to the main colour), the form on a card. 141
        // Its buttons in the app's main colour, as every other screen's.
        final gold = Theme.of(context).colorScheme.secondary;
        return Scaffold(
          key: const ValueKey('auth-look-premium'),
          bottomNavigationBar: footer == null
              ? null
              : ColoredBox(color: p.background, child: footer!),
          body: Stack(
            fit: StackFit.expand,
            children: [
              if (photo != null)
                AppNetworkImage(url: photo, fit: BoxFit.cover)
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
                    stops: const [0, 0.3, 0.62],
                  ),
                ),
              ),
              SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      back,
                      Padding(
                        padding: const EdgeInsets.fromLTRB(4, 28, 4, 28),
                        child: heading,
                      ),
                      Container(
                        key: const ValueKey('auth-look-premium-card'),
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                        decoration: BoxDecoration(
                          color: p.surface,
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(color: p.divider),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(
                                alpha: p.isDark ? 0.3 : 0.08,
                              ),
                              blurRadius: 30,
                              offset: const Offset(0, 12),
                            ),
                          ],
                        ),
                        child: form,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      case SignInLookStyle.minimal:
      case SignInLookStyle.photo:
      case SignInLookStyle.card:
      case SignInLookStyle.classic:
        // Minimal (and a photo look without its photo): the words in the
        // middle of a calm page.
        return Scaffold(
          key: ValueKey(
            minimal ? 'auth-look-minimal' : 'auth-look-${style.name}-plain',
          ),
          bottomNavigationBar: footer,
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  back,
                  SizedBox(height: minimal ? 48 : 28),
                  heading,
                  form,
                ],
              ),
            ),
          ),
        );
    }
  }
}
