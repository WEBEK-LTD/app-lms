/// How much of a video has been watched: distinct seconds played, so skipping
/// ahead doesn't count.
class WatchTracker {
  WatchTracker({int? durationSeconds}) : _duration = durationSeconds;

  final _seconds = <int>{};
  int? _duration;

  set durationSeconds(int value) => _duration = value;

  void record(Duration position) => _seconds.add(position.inSeconds);

  double get percent {
    final d = _duration;
    if (d == null || d <= 0) return 0;
    return (_seconds.length / d * 100).clamp(0, 100).toDouble();
  }
}
