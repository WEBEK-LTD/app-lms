import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import 'analytics_providers.dart';
import '../gate/app_gate.dart';
import '../l10n/l10n.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/common.dart';

/// Screen capture protection (53: as the owner chose, course content or the
/// whole app).
///
/// Android: `FLAG_SECURE` on the activity window (MainActivity.kt) blocks
/// screenshots and recordings (they come out black) and hides the app in the
/// recent apps; Flutter's dialogs, sheets and the video's full screen are
/// drawn in that window, so they're covered too. iOS can't block screenshots:
/// `setSecure` draws the app inside a secure text field's layer, which iOS
/// leaves out of screenshots and recordings where it allows it, and blurs the
/// app switcher's picture; it reports capture changes (recording, mirroring)
/// so protected screens are covered, and screenshots so the app can say so
/// (AppDelegate.swift).
class ScreenSecurity {
  const ScreenSecurity();

  static const _methods = MethodChannel('yallapp/screen_security');
  static const _events = EventChannel('yallapp/screen_capture');
  static const _shots = EventChannel('yallapp/screenshots');

  Future<void> setSecure(bool enabled) async {
    try {
      await _methods.invokeMethod<void>('setSecure', {'enabled': enabled});
    } on MissingPluginException {
      // Tests and unsupported platforms.
    } on PlatformException {
      // Never block the lesson because protection failed to toggle.
    }
  }

  /// True while the screen is being recorded or mirrored (iOS).
  Stream<bool> captureChanges() {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return Stream<bool>.value(false);
    }
    return _events
        .receiveBroadcastStream()
        .map((event) => event == true)
        .handleError((Object _) {});
  }

  /// 53 One event each time someone takes a screenshot (iOS; Android blocks
  /// them instead).
  Stream<void> screenshots() {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return const Stream<void>.empty();
    }
    return _shots
        .receiveBroadcastStream()
        .map((_) {})
        .handleError((Object _) {});
  }
}

final screenSecurityProvider = Provider<ScreenSecurity>(
  (ref) => const ScreenSecurity(),
);

/// 53 The owner's choice from `/config`; nothing is protected before it's
/// loaded.
final screenProtectionModeProvider = Provider<ScreenProtection>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady
      ? gate.config.screenProtection
      : ScreenProtection.off;
});

/// 62 What a protected screen shows, for the screenshot count on the
/// owner's Analytics page: a lesson's ID and, once it has loaded, its title.
class ProtectedItem {
  const ProtectedItem.lesson(this.id, {this.title});

  final int id;

  /// The title when the screenshot is taken (read from the screen's data).
  final String? Function(WidgetRef ref)? title;
}

/// 62 The protected items open now, the newest last.
class ProtectedItems extends Notifier<List<ProtectedItem>> {
  @override
  List<ProtectedItem> build() => const [];

  void add(ProtectedItem item) {
    if (ref.mounted) state = [...state, item];
  }

  void remove(ProtectedItem item) {
    if (ref.mounted) state = [...state]..remove(item);
  }
}

final protectedItemsProvider =
    NotifierProvider<ProtectedItems, List<ProtectedItem>>(ProtectedItems.new);

/// 53 How many protected screens (lessons, quizzes, attachments, the video's
/// full screen) are open, under [ProtectedContent].
class ProtectedScreens extends Notifier<int> {
  @override
  int build() => 0;

  void enter() {
    if (ref.mounted) state = state + 1;
  }

  void leave() {
    if (ref.mounted && state > 0) state = state - 1;
  }
}

final protectedScreensProvider = NotifierProvider<ProtectedScreens, int>(
  ProtectedScreens.new,
);

/// 53 Whether protection applies now: the whole app, or a protected screen
/// is open (anywhere in the navigation stack).
final screenProtectedProvider = Provider<bool>((ref) {
  return switch (ref.watch(screenProtectionModeProvider)) {
    ScreenProtection.off => false,
    ScreenProtection.app => true,
    ScreenProtection.content => ref.watch(protectedScreensProvider) > 0,
  };
});

/// 53 Course attachments open only in the app's own viewer while protection
/// is on (not on the web preview, which can't protect anything).
final attachmentsInAppProvider = Provider<bool>(
  (ref) =>
      !kIsWeb &&
      ref.watch(screenProtectionModeProvider) != ScreenProtection.off,
);

/// The screen is being recorded or mirrored (iOS). One native subscription
/// for the whole app: screens read this instead of listening themselves.
final screenCaptureProvider = StreamProvider<bool>(
  (ref) => ref.watch(screenSecurityProvider).captureChanges(),
);

/// 53 Screenshots taken while the app runs (iOS), counted.
final screenshotCountProvider = StreamProvider<int>((ref) {
  var count = 0;
  return ref.watch(screenSecurityProvider).screenshots().map((_) => ++count);
});

/// 53 Sends [screenProtectedProvider] to the platform when it changes (the
/// window starts unprotected). Watched by the app root.
final screenProtectionSyncProvider = Provider<void>((ref) {
  final security = ref.watch(screenSecurityProvider);
  var sent = false;
  ref.listen<bool>(screenProtectedProvider, (_, next) {
    if (next == sent) return;
    sent = next;
    unawaited(security.setSecure(next));
  }, fireImmediately: true);
  ref.onDispose(() {
    if (sent) unawaited(security.setSecure(false));
  });
});

/// 53 Marks a screen as course content: protected while it's open when the
/// owner protects course content.
class ProtectedContent extends ConsumerStatefulWidget {
  const ProtectedContent({super.key, required this.child, this.item});

  final Widget child;

  /// 62 The lesson on screen, for the screenshot count.
  final ProtectedItem? item;

  @override
  ConsumerState<ProtectedContent> createState() => _ProtectedContentState();
}

class _ProtectedContentState extends ConsumerState<ProtectedContent> {
  late final ProtectedScreens _screens = ref.read(
    protectedScreensProvider.notifier,
  );
  late final ProtectedItems _items = ref.read(protectedItemsProvider.notifier);

  /// The item as it was when the screen opened (the route may rebuild the widget).
  late final ProtectedItem? _item = widget.item;

  @override
  void initState() {
    super.initState();
    // Providers can't change while the tree builds: right after.
    final item = _item;
    scheduleMicrotask(() {
      _screens.enter();
      if (item != null) _items.add(item);
    });
  }

  @override
  void dispose() {
    final item = _item;
    scheduleMicrotask(() {
      _screens.leave();
      if (item != null) _items.remove(item);
    });
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// 53 Over the whole app (MaterialApp's builder, so routes, dialogs and the
/// video's full screen are under it): a blank cover while protected content
/// is on screen and the screen is recorded or mirrored (iOS), and a short
/// notice after a screenshot of protected content. 62 That screenshot is
/// counted for the owner's Analytics ("Screenshots taken", per lesson), as
/// a `screenshot` event with the open lesson when there is one. Only iOS
/// tells the app about screenshots; Android blocks them with FLAG_SECURE
/// and can't say someone tried, so Android never counts any.
class ScreenProtectionShield extends ConsumerWidget {
  const ScreenProtectionShield({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<AsyncValue<int>>(screenshotCountProvider, (_, next) {
      if (next.hasValue && ref.read(screenProtectedProvider)) {
        showMessage(context, context.l10n.screenshotProtected);
        recordScreenshot(ref);
      }
    });
    // Both watched always: the capture state is known before it's needed.
    final protected = ref.watch(screenProtectedProvider);
    final captured = ref.watch(screenCaptureProvider).value ?? false;
    final covered = protected && captured;
    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        if (covered) const Positioned.fill(child: CaptureShield()),
      ],
    );
  }
}

/// 62 Counts a screenshot of protected content, with the lesson open on top.
void recordScreenshot(WidgetRef ref) {
  final analytics = ref.read(analyticsProvider);
  final items = ref.read(protectedItemsProvider);
  if (items.isEmpty) {
    analytics.record('screenshot');
    return;
  }
  final item = items.last;
  String? title;
  try {
    title = item.title?.call(ref);
  } on Object {
    title = null;
  }
  analytics.item('screenshot', kind: 'lesson', id: item.id, title: title);
}

/// What a recording or a mirrored screen shows instead of protected content.
class CaptureShield extends StatelessWidget {
  const CaptureShield({super.key});

  @override
  Widget build(BuildContext context) => Material(
    key: const ValueKey('capture-shield'),
    color: context.palette.background,
    child: SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(
                AppIcons.visibilityOff,
                size: 40,
                color: context.palette.textSecondary,
              ),
              const SizedBox(height: 16),
              Text(
                context.l10n.screenProtected,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
