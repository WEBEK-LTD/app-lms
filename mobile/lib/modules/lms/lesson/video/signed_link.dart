import 'dart:async';

import '../../../../core/api/models/models.dart';

/// 51 Keeps a lesson video's signed link working: uploaded videos and videos
/// from the owner's Yallapp Media library come with a link that ends at
/// `Video.expires_at`. A new one comes from fetching the lesson again
/// ([reload]). The player asks for one shortly before the link ends (so a
/// paused video resumes without a hitch) and whenever it stops on a link
/// that no longer works, and carries on where it was.
class SignedVideoLink {
  SignedVideoLink(Video video, {required this.reload, DateTime Function()? now})
    : _video = video,
      _now = now ?? DateTime.now;

  /// Fetches the lesson again; null when it couldn't.
  final Future<Video?> Function() reload;
  final DateTime Function() _now;
  Video _video;
  Future<bool>? _renewing;

  /// How long before the end a new link is asked for.
  static const ahead = Duration(minutes: 5);

  /// A link this close to its end is replaced before it's used.
  static const margin = Duration(seconds: 30);

  /// The video with the newest link.
  Video get video => _video;

  /// When to ask for a new link: [ahead] of the end, at least 10 seconds
  /// from now; null for a link that doesn't end.
  Duration? refreshIn() {
    final end = _video.expiresAt;
    if (end == null) return null;
    final wait = end.difference(_now().toUtc()) - ahead;
    return wait < const Duration(seconds: 10)
        ? const Duration(seconds: 10)
        : wait;
  }

  /// A link that works now: the current one, or a new one when it has ended
  /// (or is about to).
  Future<Video> current() async {
    final end = _video.expiresAt;
    if (end != null && !_now().toUtc().add(margin).isBefore(end)) {
      await renew();
    }
    return _video;
  }

  /// Asks for a new link (one request at a time). True when it got a
  /// different one; the old one stays when the lesson couldn't be fetched.
  Future<bool> renew() => _renewing ??= _fetch().whenComplete(() {
    _renewing = null;
  });

  Future<bool> _fetch() async {
    final fresh = await reload();
    if (fresh == null || fresh.url == null || fresh.url!.isEmpty) return false;
    final changed = fresh.url != _video.url;
    _video = fresh;
    return changed;
  }
}
