import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../gate/app_gate.dart';
import '../providers.dart';
import '../storage/local_settings.dart';

/// 46 Good moments after which the app may ask for a rating.
enum GoodMoment {
  lessonCompleted,
  orderPlaced,
  bookingMade,
  ticketBooked,
  donationMade,

  /// The third time the app is opened.
  thirdSession,
}

/// When the app may ask for a rating with the store's own prompt (Google
/// Play In-App Review, SKStoreReviewController). The store decides whether
/// the prompt shows and limits it itself (a few times a year); these rules
/// only make sure the app asks at a good moment, never too early and not
/// over and over. Everyone gets the same prompt: the app never asks first
/// who is happy (the stores forbid filtering who is sent to rate).
abstract final class ReviewPromptRules {
  /// Not before the app has been opened this many times...
  static const minSessions = 3;

  /// ...over at least this many days.
  static const minDays = 2;

  /// At most once in this many days.
  static const daysBetween = 120;

  /// At most this many times in a year.
  static const maxPerYear = 3;

  /// Whether to ask now. Pure.
  static bool shouldAsk({
    required bool allowed,
    required bool preview,
    required int sessions,
    required DateTime firstOpened,
    required List<DateTime> asked,
    required DateTime now,
  }) {
    if (!allowed || preview) return false;
    if (sessions < minSessions) return false;
    if (now.difference(firstOpened).inDays < minDays) return false;
    final yearAgo = now.subtract(const Duration(days: 365));
    final recent = asked.where((a) => a.isAfter(yearAgo)).toList();
    if (recent.length >= maxPerYear) return false;
    final last = recent.isEmpty
        ? null
        : recent.reduce((a, b) => a.isAfter(b) ? a : b);
    return last == null || now.difference(last).inDays >= daysBetween;
  }
}

/// Counts app runs and asks for a rating after a good moment, when
/// [ReviewPromptRules] allow it.
class ReviewPrompter {
  ReviewPrompter({
    required SharedPreferences preferences,
    required this.allowed,
    required this.preview,
    Future<bool> Function()? isAvailable,
    Future<void> Function()? request,
    DateTime Function()? clock,
  }) : _prefs = preferences,
       _isAvailable = isAvailable ?? InAppReview.instance.isAvailable,
       _request = request ?? InAppReview.instance.requestReview,
       _clock = clock ?? DateTime.now;

  final SharedPreferences _prefs;

  /// The owner lets the app ask (`Config.app.review_prompt`).
  final bool Function() allowed;
  final bool preview;
  final Future<bool> Function() _isAvailable;
  final Future<void> Function() _request;
  final DateTime Function() _clock;

  static const _sessionsKey = 'review.sessions';
  static const _firstKey = 'review.first_opened';
  static const _askedKey = 'review.asked';

  int get sessions => _prefs.getInt(_sessionsKey) ?? 0;

  DateTime get firstOpened =>
      DateTime.tryParse(_prefs.getString(_firstKey) ?? '') ?? _clock();

  List<DateTime> get asked => [
    for (final value in _prefs.getStringList(_askedKey) ?? const <String>[])
      ?DateTime.tryParse(value),
  ];

  bool _recorded = false;

  /// [recordSession], once in this run (when the app's config first loads).
  void recordSessionOnce() {
    if (_recorded) return;
    _recorded = true;
    unawaited(recordSession());
  }

  /// Called once per app start. The third start is a good moment itself.
  Future<void> recordSession() async {
    if (preview) return;
    if (_prefs.getString(_firstKey) == null) {
      await _prefs.setString(_firstKey, _clock().toUtc().toIso8601String());
    }
    final count = sessions + 1;
    await _prefs.setInt(_sessionsKey, count);
    if (count == ReviewPromptRules.minSessions) {
      unawaited(goodMoment(GoodMoment.thirdSession));
    }
  }

  /// After a good moment: asks the store's prompt when the rules allow it.
  /// True when the prompt was requested (the store may still not show it).
  Future<bool> goodMoment(GoodMoment moment) async {
    final now = _clock();
    if (!ReviewPromptRules.shouldAsk(
      allowed: allowed(),
      preview: preview,
      sessions: sessions,
      firstOpened: firstOpened,
      asked: asked,
      now: now,
    )) {
      return false;
    }
    try {
      if (!await _isAvailable()) return false;
      // Counted before asking: a prompt that fails isn't retried at once.
      await _prefs.setStringList(_askedKey, [
        for (final a in asked) a.toUtc().toIso8601String(),
        now.toUtc().toIso8601String(),
      ]);
      await _request();
      return true;
    } on Object {
      return false;
    }
  }
}

/// The app's [ReviewPrompter]: on when the owner allows it (`Config.app`),
/// never in the app preview.
final reviewPrompterProvider = Provider<ReviewPrompter>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  return ReviewPrompter(
    preferences: ref.watch(sharedPreferencesProvider),
    preview: env.isPreview,
    allowed: () {
      final gate = ref.read(appGateProvider);
      return gate is GateReady && gate.config.app.reviewPrompt;
    },
  );
});

/// Tells the prompter about a good moment, without waiting for it.
void reportGoodMoment(WidgetRef ref, GoodMoment moment) {
  unawaited(ref.read(reviewPrompterProvider).goodMoment(moment));
}
