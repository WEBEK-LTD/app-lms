import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/models/models.dart';
import '../l10n/l10n.dart';

enum VideoQuality {
  auto,
  p1080,
  p720,
  p480;

  /// "Auto", "1080p".
  String get label => switch (this) {
    auto => currentL10n.videoQualityAuto,
    p1080 => '1080p',
    p720 => '720p',
    p480 => '480p',
  };
}

const playbackSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

/// 28 The signed-in user's tickets kept on this phone (Events & tickets
/// apps), so they show offline; forgotten on sign-out.
const ticketWalletKey = 'events.tickets';

/// 63 The member's memberships with their door codes (gyms), kept on this
/// phone so the code shows offline; forgotten on sign-out.
const membershipWalletKey = 'bookings.memberships';

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
    this.language,
    this.shareUsage = true,
    this.crashReports = true,
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

  /// The interface language the user picked (`en`, `ar`, `tr`); null until
  /// they pick one.
  final String? language;

  /// 44 "Share usage statistics": on by default; off stops the app sending
  /// them and deletes what it hadn't sent.
  final bool shareUsage;

  /// 46 The user lets the app send crash reports (on by default; the
  /// owner's switch in the dashboard comes first).
  final bool crashReports;

  LocalSettings copyWith({
    ThemeMode? themeMode,
    bool? themeModeChosen,
    VideoQuality? videoQuality,
    double? playbackSpeed,
    bool? autoplayNext,
    NotificationPreferences? notifications,
    bool? guestMode,
    String? language,
    bool? shareUsage,
    bool? crashReports,
  }) => LocalSettings(
    themeMode: themeMode ?? this.themeMode,
    themeModeChosen: themeModeChosen ?? this.themeModeChosen,
    videoQuality: videoQuality ?? this.videoQuality,
    playbackSpeed: playbackSpeed ?? this.playbackSpeed,
    autoplayNext: autoplayNext ?? this.autoplayNext,
    notifications: notifications ?? this.notifications,
    guestMode: guestMode ?? this.guestMode,
    language: language ?? this.language,
    shareUsage: shareUsage ?? this.shareUsage,
    crashReports: crashReports ?? this.crashReports,
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
  static const _news = 'settings.notify_news';
  static const _donations = 'settings.notify_donations';
  static const _guest = 'settings.guest_mode';
  static const _crashReports = 'settings.crash_reports';
  static const _language = languageKey;
  static const shareUsageKey = 'settings.share_usage';

  /// Where the language the user picked is kept (the app preview sets it
  /// from its link, 17).
  static const languageKey = 'settings.language';

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
        news: p.getBool(_news) ?? true,
        donations: p.getBool(_donations) ?? false,
      ),
      guestMode: p.getBool(_guest) ?? false,
      language: p.getString(_language),
      shareUsage: p.getBool(shareUsageKey) ?? true,
      crashReports: p.getBool(_crashReports) ?? true,
    );
  }

  void setShareUsage(bool on) {
    _prefs.setBool(shareUsageKey, on);
    state = state.copyWith(shareUsage: on);
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
      ..setBool(_reminder, value.dailyReminder)
      ..setBool(_news, value.news)
      ..setBool(_donations, value.donations);
    state = state.copyWith(notifications: value);
  }

  void setGuestMode(bool value) {
    _prefs.setBool(_guest, value);
    state = state.copyWith(guestMode: value);
  }

  void setCrashReports(bool value) {
    _prefs.setBool(_crashReports, value);
    state = state.copyWith(crashReports: value);
  }

  void setLanguage(String code) {
    _prefs.setString(_language, code);
    state = state.copyWith(language: code);
  }
}
