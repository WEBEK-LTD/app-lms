import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../auth/auth_controller.dart';
import '../providers.dart';
import '../services/external_links.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/common.dart';
import 'app_gate.dart';
import 'owner_contact.dart';
import '../l10n/l10n.dart';

/// Shows the app only when `/config` says it may run; otherwise a
/// full-screen state (start-up, maintenance, update required, a paused app,
/// or a connection problem).
class GateView extends ConsumerWidget {
  const GateView({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gate = ref.watch(appGateProvider);
    final auth = ref.watch(authControllerProvider);
    final retry = ref.read(appGateProvider.notifier).load;
    final env = ref.watch(appEnvironmentProvider);
    final name = env.build.appName;

    final l10n = context.l10n;
    final Widget screen = switch (gate) {
      GateReady() when auth is AuthChecking => const SplashView(),
      GateReady() => child,
      GateLoading() => const SplashView(),
      GateMaintenance(:final message) => _StateScreen(
        icon: AppIcons.maintenance,
        title: l10n.maintenanceTitle,
        message: (message == null || message.trim().isEmpty)
            ? l10n.maintenanceMessage(name)
            : message,
        actionLabel: l10n.tryAgain,
        onAction: retry,
      ),
      GateUpdateRequired() => _StateScreen(
        icon: AppIcons.update,
        title: l10n.updateRequiredTitle,
        message: l10n.updateRequiredMessage(name),
        actionLabel: l10n.updateNow,
        onAction: () => openExternal(storeUrl(env)),
      ),
      GatePaused(:final contact) => _PausedScreen(
        contact: resolveOwnerContact(ref, contact),
        onRetry: retry,
      ),
      GateFailed(:final error) => _StateScreen(
        icon: AppIcons.offline,
        title: l10n.connectionTitle,
        message: friendlyError(error),
        actionLabel: l10n.tryAgain,
        onAction: retry,
      ),
    };
    return screen;
  }
}

class _StateScreen extends StatelessWidget {
  const _StateScreen({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: MessageView(
        icon: icon,
        title: title,
        message: message,
        actionLabel: actionLabel,
        onAction: onAction,
      ),
    ),
  );
}

/// Step 13.5: the app is paused. Its owner can bring it back: "Contact {App}"
/// (WhatsApp first, else email) and "Try again".
class _PausedScreen extends StatelessWidget {
  const _PausedScreen({required this.contact, required this.onRetry});

  final OwnerContact contact;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: OwnerMessageView(
        icon: AppIcons.paused,
        title: context.l10n.appPausedTitle(contact.name),
        message: context.l10n.appPausedMessage(contact.name),
        contact: contact,
        secondaryLabel: context.l10n.tryAgain,
        onSecondary: onRetry,
      ),
    ),
  );
}

/// The start-up screen: the app's name on its splash color.
class SplashView extends ConsumerWidget {
  const SplashView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final build = ref.watch(appEnvironmentProvider).build;
    final background = Color(build.splashColor);
    final dark = background.computeLuminance() < 0.4;
    final foreground = dark ? BrandColors.ivory : BrandColors.midnight;
    return Scaffold(
      backgroundColor: background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (build.logoUrl != null)
              AppNetworkImage(
                url: build.logoUrl,
                width: 72,
                height: 72,
                radius: 18,
              )
            else
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Color(build.primaryColor),
                  borderRadius: BorderRadius.circular(18),
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials(build.shortName),
                  style: const TextStyle(
                    color: BrandColors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Text(
              build.appName,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: foreground,
              ),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: foreground,
                semanticsLabel: context.l10n.loading,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _initials(String name) {
  final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  final letters = words.take(2).map((w) => w.characters.first.toUpperCase());
  return letters.join();
}
