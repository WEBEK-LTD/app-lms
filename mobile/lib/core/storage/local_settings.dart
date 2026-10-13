import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/models/models.dart';

enum VideoQuality {
  auto('Auto'),
  p1080('1080p'),
  p720('720p'),
  p480('480p');

  const VideoQuality(this.label);
  final String label;
}

const playbackSpeeds = [0.75, 1.0, 1.25, 1.5, 2.0];

String speedLabel(double speed) {
  final text = speed == speed.roundToDouble()
      ? speed.toStringAsFixed(0)
      : speed.toString();
  return '${text}x';
}

/// Preferences kept on this device only.
@immutable
class LocalSettings {
  const LocalSettings({
    this.themeMode = ThemeMode.system,
    this.themeModeChosen = false,
    this.videoQuality = VideoQuality.auto,
    this.playbackSpeed = 1.0,
    this.autoplayNext = true,
    this.notifications = const NotificationPreferences(),
    this.guestMode = false,
  });

  final ThemeMode themeMode;

  /// The student picked [themeMode]; until then the client's default applies.
  final bool themeModeChosen;
  final VideoQuality videoQuality;
  final double playbackSpeed;
  final bool autoplayNext;
  final NotificationPreferences notifications;

  /// The student chose to browse without signing in.
  final bool guestMode;

  LocalSettings copyWith({
    ThemeMode? themeMode,
    bool? themeModeChosen,
    VideoQuality? videoQuality,
    double? playbackSpeed,
    bool? autoplayNext,
    NotificationPreferences? notifications,
    bool? guestMode,
  }) => LocalSettings(
    themeMode: themeMode ?? this.themeMode,
    themeModeChosen: themeModeChosen ?? this.themeModeChosen,
    videoQuality: videoQuality ?? this.videoQuality,
    playbackSpeed: playbackSpeed ?? this.playbackSpeed,
    autoplayNext: autoplayNext ?? this.autoplayNext,
    notifications: notifications ?? this.notifications,
    guestMode: guestMode ?? this.guestMode,
  );
}

/// Must be overridden with the instance loaded at start-up.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('Override sharedPreferencesProvider'),
);

final localSettingsProvider =
    NotifierProvider<LocalSettingsController, LocalSettings>(
      LocalSettingsController.new,
    );

class LocalSettingsController extends Notifier<LocalSettings> {
  static const _theme = 'settings.theme_mode';
  static const _quality = 'settings.video_quality';
  static const _speed = 'settings.playback_speed';
  static const _autoplay = 'settings.autoplay_next';
  static const _newLessons = 'settings.notify_new_lessons';
  static const _announcements = 'settings.notify_announcements';
  static const _reminder = 'settings.notify_daily_reminder';
  static const _guest = 'settings.guest_mode';

  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  LocalSettings build() {
    final p = ref.watch(sharedPreferencesProvider);
    T pick<T extends Enum>(List<T> values, String? name, T fallback) =>
        values.where((v) => v.name == name).firstOrNull ?? fallback;
    final speed = p.getDouble(_speed) ?? 1.0;
    return LocalSettings(
      themeMode: pick(ThemeMode.values, p.getString(_theme), ThemeMode.system),
      themeModeChosen: p.getString(_theme) != null,
      videoQuality: pick(
        VideoQuality.values,
        p.getString(_quality),
        VideoQuality.auto,
      ),
      playbackSpeed: playbackSpeeds.contains(speed) ? speed : 1.0,
      autoplayNext: p.getBool(_autoplay) ?? true,
      notifications: NotificationPreferences(
        newLessons: p.getBool(_newLessons) ?? true,
        announcements: p.getBool(_announcements) ?? true,
        dailyReminder: p.getBool(_reminder) ?? false,
      ),
      guestMode: p.getBool(_guest) ?? false,
    );
  }

  void setThemeMode(ThemeMode mode) {
    _prefs.setString(_theme, mode.name);
    state = state.copyWith(themeMode: mode, themeModeChosen: true);
  }

  void setVideoQuality(VideoQuality quality) {
    _prefs.setString(_quality, quality.name);
    state = state.copyWith(videoQuality: quality);
  }

  void setPlaybackSpeed(double speed) {
    _prefs.setDouble(_speed, speed);
    state = state.copyWith(playbackSpeed: speed);
  }

  void setAutoplayNext(bool value) {
    _prefs.setBool(_autoplay, value);
    state = state.copyWith(autoplayNext: value);
  }

  void setNotifications(NotificationPreferences value) {
    _prefs
      ..setBool(_newLessons, value.newLessons)
      ..setBool(_announcements, value.announcements)
      ..setBool(_reminder, value.dailyReminder);
    state = state.copyWith(notifications: value);
  }

  void setGuestMode(bool value) {
    _prefs.setBool(_guest, value);
    state = state.copyWith(guestMode: value);
  }
}
