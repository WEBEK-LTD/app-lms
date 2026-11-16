import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/services/biometrics.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../launch/opening_screen.dart' show yMark;

/// 59 Unlock with fingerprint or face (Settings turns it off). 132 A real
/// app lock: the app's mark and the business's name, "Unlock with Face ID"
/// (or fingerprint, or the phone's PIN when nothing else is set up) and
/// "Use phone PIN", what to do when the phone has no face or fingerprint set
/// up, is locked out after too many tries or has no screen lock any more.
/// Nothing behind it can be reached: back does nothing here, and links and
/// pushes wait for the unlock (the router keeps every path on the lock).
class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  bool _busy = false;
  UnlockResult? _last;
  LockSupport? _support;
  BiometricKind _kind = BiometricKind.other;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  Future<void> _start() async {
    final bio = ref.read(biometricsProvider);
    final support = await bio.support();
    final kind = await bio.kind();
    if (!mounted) return;
    setState(() {
      _support = support;
      _kind = kind;
    });
    // Asked as the screen opens, when the phone can.
    if (support.usable) await _unlock();
  }

  Future<void> _unlock({bool pinOnly = false}) async {
    if (_busy || !mounted) return;
    setState(() => _busy = true);
    final result = await ref
        .read(sessionProvider.notifier)
        .unlock(context.l10n.unlockReason, pinOnly: pinOnly);
    if (mounted) {
      setState(() {
        _busy = false;
        _last = result;
      });
    }
  }

  /// The main button's words: Face ID on an iPhone with it, else the face,
  /// the fingerprint, or the phone's PIN when nothing else is set up.
  String _unlockLabel(BuildContext context) {
    final l10n = context.l10n;
    final ios =
        Theme.of(context).platform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.iOS;
    if (_support == LockSupport.deviceCredential) return l10n.unlockWithPin;
    return switch (_kind) {
      BiometricKind.face => ios ? l10n.unlockWithFaceId : l10n.unlockWithFace,
      BiometricKind.fingerprint => l10n.unlockWithFingerprint,
      BiometricKind.other => l10n.unlock,
    };
  }

  /// What the screen says under its title, for where the lock is now.
  String _message(BuildContext context) {
    final l10n = context.l10n;
    switch (_support) {
      case LockSupport.noCredentials:
        return l10n.lockNoScreenLock;
      case LockSupport.unavailable:
        return l10n.lockUnavailable;
      case _:
    }
    return switch (_last) {
      UnlockResult.failed => l10n.lockFailed,
      UnlockResult.lockedOut => l10n.lockLockedOut,
      UnlockResult.lockedOutUntilPin => l10n.lockUsePin,
      UnlockResult.notEnrolled => l10n.lockNotEnrolled,
      UnlockResult.noCredentials => l10n.lockNoScreenLock,
      UnlockResult.unavailable => l10n.lockUnavailable,
      _ => l10n.lockText,
    };
  }

  bool get _problem => switch (_last) {
    UnlockResult.failed ||
    UnlockResult.lockedOut ||
    UnlockResult.lockedOutUntilPin ||
    UnlockResult.notEnrolled ||
    UnlockResult.noCredentials ||
    UnlockResult.unavailable => true,
    _ => _support != null && !_support!.usable,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = context.yb;
    final business = ref.watch(settingsProvider).businessName;
    final usable = _support?.usable ?? true;
    final pinFirst =
        _last == UnlockResult.lockedOutUntilPin ||
        _last == UnlockResult.lockedOut ||
        _last == UnlockResult.notEnrolled;
    final face = _kind == BiometricKind.face;
    return PopScope(
      // Nothing behind the lock: back stays here.
      canPop: false,
      child: Scaffold(
        backgroundColor: c.background,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, box) => SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: box.maxHeight - 48),
                child: IntrinsicHeight(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Spacer(),
                      const Center(child: AppMark(size: 76)),
                      const SizedBox(height: 16),
                      Text(
                        'Yallapp Business',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: c.ink2,
                        ),
                      ),
                      if (business != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          business,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                      const SizedBox(height: 36),
                      Center(
                        child: Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            color: c.surface,
                            shape: BoxShape.circle,
                            border: Border.all(color: c.line),
                          ),
                          child: Icon(
                            !usable
                                ? AppIcons.lock
                                : _support == LockSupport.deviceCredential
                                ? AppIcons.pin
                                : face
                                ? AppIcons.face
                                : AppIcons.fingerprint,
                            size: 42,
                            color: c.accentText,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Semantics(
                        header: true,
                        child: Text(
                          l10n.lockTitle,
                          style: theme.textTheme.titleLarge,
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          _message(context),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: _problem ? c.warning : c.ink2,
                            fontWeight: _problem ? FontWeight.w600 : null,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const Spacer(),
                      const SizedBox(height: 24),
                      if (usable && !pinFirst)
                        FilledButton.icon(
                          onPressed: _busy ? null : _unlock,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                          ),
                          icon: Icon(
                            _support == LockSupport.deviceCredential
                                ? AppIcons.pin
                                : face
                                ? AppIcons.face
                                : AppIcons.fingerprint,
                          ),
                          label: Text(_unlockLabel(context)),
                        ),
                      if (usable &&
                          (_support == LockSupport.biometric || pinFirst)) ...[
                        const SizedBox(height: 10),
                        if (pinFirst)
                          FilledButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _unlock(pinOnly: true),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(52),
                            ),
                            icon: const Icon(AppIcons.pin),
                            label: Text(l10n.usePhonePin),
                          )
                        else
                          OutlinedButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _unlock(pinOnly: true),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(52),
                            ),
                            icon: const Icon(AppIcons.pin),
                            label: Text(l10n.usePhonePin),
                          ),
                      ],
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () =>
                            ref.read(sessionProvider.notifier).signOut(),
                        child: Text(l10n.signOutUsePassword),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 132 The app's mark as its icon draws it: the ivory "y" and its Ember dot
/// on Midnight.
class AppMark extends StatelessWidget {
  const AppMark({super.key, this.size = 64});

  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Yallapp Business',
    image: true,
    child: SizedBox.square(
      dimension: size,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Brand.midnight,
          borderRadius: BorderRadius.circular(size * 0.26),
          // On the Midnight page by night, its edge still shows.
          border: Theme.of(context).brightness == Brightness.dark
              ? Border.all(color: context.yb.line)
              : null,
        ),
        child: CustomPaint(painter: _MarkPainter()),
      ),
    ),
  );
}

class _MarkPainter extends CustomPainter {
  static final _y = yMark();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 1024, size.height / 1024);
    // The "y" where the launcher icon has it, its dot beside its foot.
    canvas.save();
    canvas.translate(178, 195);
    canvas.scale(0.66);
    canvas.drawPath(_y, Paint()..color = Brand.ivory);
    canvas.restore();
    canvas.drawCircle(const Offset(722, 706), 84, Paint()..color = Brand.ember);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_MarkPainter old) => false;
}
