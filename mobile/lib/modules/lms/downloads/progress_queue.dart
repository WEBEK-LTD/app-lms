import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/storage/local_settings.dart';

/// 45 A lesson's progress made without a connection, waiting to be sent.
class QueuedProgress {
  const QueuedProgress({
    required this.lessonId,
    required this.complete,
    this.positionSeconds = 0,
    this.watchedPercent = 0,
  });

  factory QueuedProgress.fromJson(Map<String, dynamic> json) => QueuedProgress(
    lessonId: (json['lesson_id'] as num).toInt(),
    complete: json['complete'] == true,
    positionSeconds: (json['position'] as num?)?.toInt() ?? 0,
    watchedPercent: (json['percent'] as num?)?.toDouble() ?? 0,
  );

  final int lessonId;

  /// "Mark as complete"; otherwise the video's place.
  final bool complete;
  final int positionSeconds;
  final double watchedPercent;

  Map<String, dynamic> toJson() => {
    'lesson_id': lessonId,
    'complete': complete,
    'position': positionSeconds,
    'percent': watchedPercent,
  };
}

/// 45 Watch progress and "Mark as complete" made offline, kept on the phone
/// and sent with the usual calls (`PUT /lessons/{id}/progress`, `POST
/// /lessons/{id}/complete`) when the app is back online: places first, so a
/// required share of the video counts before completing. A lesson keeps only
/// its latest place and its highest watched share. Forgotten on sign-out.
class ProgressQueue {
  ProgressQueue(this._prefs);

  static const key = 'learning.offline_progress';
  final SharedPreferences? _prefs;
  bool _flushing = false;

  List<QueuedProgress> get items {
    final raw = _prefs?.getString(key);
    if (raw == null) return const [];
    try {
      return [
        for (final item in jsonDecode(raw) as List)
          QueuedProgress.fromJson(Map<String, dynamic>.from(item as Map)),
      ];
    } on Object {
      return const [];
    }
  }

  bool get isEmpty => items.isEmpty;

  Future<void> _save(List<QueuedProgress> items) async {
    final prefs = _prefs;
    if (prefs == null) return;
    if (items.isEmpty) {
      await prefs.remove(key);
    } else {
      await prefs.setString(
        key,
        jsonEncode([for (final i in items) i.toJson()]),
      );
    }
  }

  Future<void> addProgress(
    int lessonId, {
    required int positionSeconds,
    required double watchedPercent,
  }) async {
    final all = items;
    final earlier = all
        .where((i) => i.lessonId == lessonId && !i.complete)
        .firstOrNull;
    await _save([
      for (final i in all)
        if (i.lessonId != lessonId || i.complete) i,
      QueuedProgress(
        lessonId: lessonId,
        complete: false,
        positionSeconds: positionSeconds,
        watchedPercent:
            earlier == null || watchedPercent > earlier.watchedPercent
            ? watchedPercent
            : earlier.watchedPercent,
      ),
    ]);
  }

  Future<void> addComplete(int lessonId) async {
    final all = items;
    if (all.any((i) => i.lessonId == lessonId && i.complete)) return;
    await _save([...all, QueuedProgress(lessonId: lessonId, complete: true)]);
  }

  /// Whether this lesson was completed offline and isn't sent yet.
  bool completedOffline(int lessonId) =>
      items.any((i) => i.lessonId == lessonId && i.complete);

  Future<void> clear() => _save(const []);

  /// Sends what's waiting. Stops at the first connection failure (the rest
  /// waits for the next try); an answer the server refuses (no longer
  /// enrolled, a watch requirement not met) is dropped. Returns how many
  /// were sent.
  Future<int> flush(YallappApi api) async {
    if (_flushing) return 0;
    _flushing = true;
    var sent = 0;
    try {
      final all = items;
      final ordered = [
        ...all.where((i) => !i.complete),
        ...all.where((i) => i.complete),
      ];
      final left = [...ordered];
      for (final item in ordered) {
        try {
          if (item.complete) {
            await api.completeLesson(item.lessonId);
          } else {
            await api.saveLessonProgress(
              item.lessonId,
              positionSeconds: item.positionSeconds,
              watchedPercent: item.watchedPercent,
            );
          }
          sent++;
        } on ApiException catch (e) {
          if (e.isOffline || e.isUnauthorized || (e.statusCode ?? 500) >= 500) {
            break;
          }
          // Refused for good: dropped.
        }
        left.remove(item);
        await _save(left);
      }
    } finally {
      _flushing = false;
    }
    return sent;
  }
}

final progressQueueProvider = Provider<ProgressQueue>((ref) {
  try {
    return ProgressQueue(ref.watch(sharedPreferencesProvider));
  } on Object {
    // No preferences (some tests): nothing is kept.
    return ProgressQueue(null);
  }
});
