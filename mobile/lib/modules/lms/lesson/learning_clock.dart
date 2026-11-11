import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/providers.dart';

/// 123 Counts the time a signed-in student spends in a lesson, while it is
/// open and the app in front, and sends it about once a minute and when
/// the lesson closes (`POST /me/learning-time`). A few seconds are not
/// worth sending; nothing is counted while the app is in the background.
class LearningClock extends ConsumerStatefulWidget {
  const LearningClock({super.key, required this.courseId, required this.child});

  final int courseId;
  final Widget child;

  /// How often what was counted is sent, in seconds.
  static const every = 60;

  /// Less than this isn't sent, in seconds.
  static const least = 5;

  @override
  ConsumerState<LearningClock> createState() => _LearningClockState();
}

class _LearningClockState extends ConsumerState<LearningClock>
    with WidgetsBindingObserver {
  /// The seconds counted and not sent yet, one a second while in front.
  int _seconds = 0;
  bool _front = true;
  Timer? _timer;

  /// Read once: the lesson may close after the app signs out.
  late final YallappApi _api = ref.read(yallappApiProvider);
  late final bool _signedIn = ref.read(authControllerProvider).isSignedIn;

  @override
  void initState() {
    super.initState();
    if (!_signedIn) return;
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!_front) return;
      _seconds += 1;
      if (_seconds >= LearningClock.every) _send();
    });
  }

  void _send() {
    final counted = _seconds;
    _seconds = 0;
    if (counted < LearningClock.least) return;
    final seconds = counted.clamp(1, 300);
    unawaited(
      _api.addLearningTime(widget.courseId, seconds).catchError((Object _) {}),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _front = state == AppLifecycleState.resumed;
    if (!_front) _send();
  }

  @override
  void dispose() {
    if (_signedIn) {
      WidgetsBinding.instance.removeObserver(this);
      _timer?.cancel();
      _send();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
