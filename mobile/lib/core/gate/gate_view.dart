import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../app_environment.dart';
import '../auth/auth_controller.dart';
import '../preview/preview.dart';
import '../providers.dart';
import '../../modules/shared/shared_routes.dart' show rootNavigatorKey;
import '../services/external_links.dart';
import '../services/version_check.dart';
import '../storage/local_settings.dart';
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
      GateReady(:final recommended) when recommended != null =>
        UpdateRecommended(
          policy: recommended,
          onUpdate: () => openExternal(recommended.storeUrl ?? storeUrl(env)),
          child: child,
        ),
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
      GateUpdateRequired(storeUrl: final link) => _StateScreen(
        icon: AppIcons.update,
        title: l10n.updateRequiredTitle,
        message: l10n.updateRequiredMessage(name),
        actionLabel: l10n.updateNow,
        onAction: () => openExternal(link ?? storeUrl(env)),
      ),
      GatePaused(:final contact) => _PausedScreen(
        contact: resolveOwnerContact(ref, contact),
        onRetry: retry,
      ),
      GateFailed(:final error) => _StateScreen(
        icon: AppIcons.offline,
        title: l10n.connectionTitle,
        message: _previewBlocked(env, error)
            ? l10n.previewApiBlocked(env.preview!.platformUrl)
            : friendlyError(error),
        actionLabel: l10n.tryAgain,
        onAction: retry,
      ),
    };
    return screen;
  }
}

/// 17 In the app preview, a site or API that answers the installed app but
/// not the browser most likely doesn't allow requests from the platform's
/// address (browsers then report no connection at all).
bool _previewBlocked(AppEnvironment env, Object error) {
  final preview = env.preview;
  if (preview == null || preview.contentSource == PreviewContentSource.hosted) {
    return false;
  }
  final e = unwrapError(error);
  return e is ApiException && e.code == ApiException.networkError;
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
/// (WhatsApp first, else email) and "Try again". 68 Someone signed in can
/// still delete their account here: the API answers `DELETE /me` (and the
/// session's renewal) while the app is paused. The screen sits above the
/// app's navigator, so it asks and answers in place rather than in a dialog.
class _PausedScreen extends ConsumerStatefulWidget {
  const _PausedScreen({required this.contact, required this.onRetry});

  final OwnerContact contact;
  final VoidCallback onRetry;

  @override
  ConsumerState<_PausedScreen> createState() => _PausedScreenState();
}

class _PausedScreenState extends ConsumerState<_PausedScreen> {
  bool _confirming = false;
  bool _busy = false;
  String? _result;

  Future<void> _delete() async {
    setState(() => _busy = true);
    String result;
    try {
      await ref.read(authControllerProvider.notifier).deleteAccount();
      result = mounted ? context.l10n.accountDeleted : '';
    } on ApiException catch (e) {
      result = e.message;
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _confirming = false;
      _result = result;
    });
  }

  Widget? _footer(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final note = _result == null
        ? null
        : Text(
            _result!,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          );
    if (!signedIn) return note;
    if (!_confirming) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ?note,
          TextButton(
            onPressed: () => setState(() {
              _confirming = true;
              _result = null;
            }),
            style: TextButton.styleFrom(foregroundColor: p.danger),
            child: Text(l10n.deleteAccount),
          ),
        ],
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Semantics(
          header: true,
          child: Text(
            l10n.deleteAccountTitle,
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w700, color: p.text),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          l10n.deleteAccountMessage,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: p.textSecondary),
        ),
        const SizedBox(height: 8),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          children: [
            TextButton(
              onPressed: _busy
                  ? null
                  : () => setState(() => _confirming = false),
              child: Text(l10n.cancel),
            ),
            TextButton(
              onPressed: _busy ? null : _delete,
              style: TextButton.styleFrom(foregroundColor: p.danger),
              child: Text(l10n.deleteAccount),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: OwnerMessageView(
        icon: AppIcons.paused,
        title: context.l10n.appPausedTitle(widget.contact.name),
        message: context.l10n.appPausedMessage(widget.contact.name),
        contact: widget.contact,
        secondaryLabel: context.l10n.tryAgain,
        onSecondary: widget.onRetry,
        footer: _footer(context),
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

/// 89.1 Asks once per recommended version to update; "Not now" goes on and
/// isn't asked again until the owner recommends a newer one.
class UpdateRecommended extends ConsumerStatefulWidget {
  const UpdateRecommended({
    super.key,
    required this.policy,
    required this.onUpdate,
    required this.child,
  });

  final VersionPolicy policy;
  final VoidCallback onUpdate;
  final Widget child;

  @override
  ConsumerState<UpdateRecommended> createState() => _UpdateRecommendedState();
}

class _UpdateRecommendedState extends ConsumerState<UpdateRecommended> {
  bool _asked = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_asked) return;
    _asked = true;
    final prefs = ref.read(sharedPreferencesProvider);
    final version = widget.policy.recommendedVersion ?? '';
    if (prefs.getString(updateDismissedKey) == version) return;
    WidgetsBinding.instance.addPostFrameCallback((_) => _ask(version));
  }

  Future<void> _ask(String version) async {
    // The gate sits above the app's navigator: the dialog opens on it.
    final navigator = rootNavigatorKey.currentContext;
    if (!mounted || navigator == null) return;
    final name = ref.read(appEnvironmentProvider).build.appName;
    final l10n = navigator.l10n;
    final update = await showDialog<bool>(
      context: navigator,
      builder: (context) => AlertDialog(
        title: Text(l10n.updateRecommendedTitle),
        content: Text(l10n.updateRecommendedMessage(name)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.notNow),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.updateNow),
          ),
        ],
      ),
    );
    if (update == true) {
      widget.onUpdate();
    } else {
      await ref
          .read(sharedPreferencesProvider)
          .setString(updateDismissedKey, version);
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
