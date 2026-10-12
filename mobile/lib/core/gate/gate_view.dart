import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../auth/auth_controller.dart';
import '../providers.dart';
import '../services/external_links.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/common.dart';
import 'app_gate.dart';

/// Shows the app only when `/config` says it may run; otherwise a
/// full-screen state (start-up, maintenance, update required, license
/// inactive, or a connection problem).
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

    final Widget screen = switch (gate) {
      GateReady() when auth is AuthChecking => const SplashView(),
      GateReady() => child,
      GateLoading() => const SplashView(),
      GateMaintenance(:final message) => _StateScreen(
        icon: AppIcons.maintenance,
        title: "We'll be right back",
        message: (message == null || message.trim().isEmpty)
            ? '$name is being updated. Please try again in a little while.'
            : message,
        actionLabel: 'Try again',
        onAction: retry,
      ),
      GateUpdateRequired() => _StateScreen(
        icon: AppIcons.update,
        title: 'Update required',
        message:
            'A new version of $name is available. Update the app to keep learning.',
        actionLabel: 'Update now',
        onAction: () => openExternal(storeUrl(env)),
      ),
      GateLicenseInactive() => _StateScreen(
        icon: AppIcons.unavailable,
        title: 'The app is unavailable',
        message:
            "$name isn't available right now. Please contact the academy for help.",
        actionLabel: 'Try again',
        onAction: retry,
      ),
      GateFailed(:final error) => _StateScreen(
        icon: AppIcons.offline,
        title: "We couldn't connect",
        message: friendlyError(error),
        actionLabel: 'Try again',
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
                semanticsLabel: 'Loading',
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
