import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'ringtones.dart';

/// 59 What this phone remembers between launches (not secrets: the tokens
/// are in [TokenStore]).
class LocalSettings {
  LocalSettings(this._prefs);

  final SharedPreferences _prefs;

  static const _app = 'yb.selected_app';
  static const _biometric = 'yb.biometric_lock';
  static const _language = 'yb.language';
  static const _uploads = 'yb.pending_uploads';
  static const _theme = 'yb.theme';
  static const _appTheme = 'yb.app_theme';
  static const _lockAfter = 'yb.lock_after_minutes';
  static const _business = 'yb.business_name';

  String? get selectedApp => _prefs.getString(_app);
  Future<void> setSelectedApp(String? id) =>
      id == null ? _prefs.remove(_app) : _prefs.setString(_app, id);

  /// Null until chosen: the lock turns on after the first sign-in on a phone
  /// that can use it.
  bool? get biometricLock => _prefs.getBool(_biometric);
  Future<void> setBiometricLock(bool on) => _prefs.setBool(_biometric, on);

  /// 132 The choices for how long the app may stay in the background before
  /// the lock asks again (0: as soon as it leaves the screen).
  static const lockAfterChoices = [0, 1, 5, 15];

  /// 132 Minutes in the background before the lock asks again; 1 unless chosen.
  int get lockAfterMinutes {
    final value = _prefs.getInt(_lockAfter);
    return lockAfterChoices.contains(value) ? value! : 1;
  }

  Future<void> setLockAfterMinutes(int minutes) =>
      _prefs.setInt(_lockAfter, minutes);

  /// 132 The business last open on this phone, for the lock screen (shown
  /// before the account loads).
  String? get businessName => _prefs.getString(_business);
  Future<void> setBusinessName(String? name) => name == null
      ? _prefs.remove(_business)
      : _prefs.setString(_business, name);

  /// The language picked on this phone before signing in (en, ar, tr).
  String? get language => _prefs.getString(_language);
  Future<void> setLanguage(String? code) => code == null
      ? _prefs.remove(_language)
      : _prefs.setString(_language, code);

  /// 61 Light, dark, or null to follow the phone.
  String? get theme => _prefs.getString(_theme);
  Future<void> setTheme(String? mode) =>
      mode == null ? _prefs.remove(_theme) : _prefs.setString(_theme, mode);

  /// 215 The app's theme: null (the default look) or 'pharaonic'.
  String? get appTheme => _prefs.getString(_appTheme);
  Future<void> setAppTheme(String? theme) => theme == null
      ? _prefs.remove(_appTheme)
      : _prefs.setString(_appTheme, theme);

  /// 125 A Prime app's look (classic, midnightGold, ember, sage), per app.
  String? primeLook(String appId) => _prefs.getString('yb.prime_look.$appId');
  Future<void> setPrimeLook(String appId, String look) =>
      _prefs.setString('yb.prime_look.$appId', look);

  /// 125 The Prime header on Today (on unless turned off), per app.
  bool primeHeader(String appId) =>
      _prefs.getBool('yb.prime_header.$appId') ?? true;
  Future<void> setPrimeHeader(String appId, bool on) =>
      _prefs.setBool('yb.prime_header.$appId', on);

  /// 207 Settings › Ringtones (kept on this phone, sent to the server).
  static const _ring = 'yb.ring_settings';
  static const _ringSent = 'yb.ring_settings_sent';

  RingSettings get ringSettings {
    final raw = _prefs.getString(_ring);
    if (raw == null) return const RingSettings();
    try {
      return RingSettings.fromJson(
        (jsonDecode(raw) as Map).cast<String, dynamic>(),
      );
    } on Object {
      return const RingSettings();
    }
  }

  /// [sent]: nothing the server keeps changed (the in-app volume).
  Future<void> setRingSettings(
    RingSettings settings, {
    bool sent = false,
  }) async {
    await _prefs.setString(_ring, jsonEncode(settings.toJson()));
    if (!sent) await _prefs.setBool(_ringSent, false);
  }

  /// 207 Whether the server has this phone's latest choices.
  bool get ringSettingsSent => _prefs.getBool(_ringSent) ?? false;
  Future<void> setRingSettingsSent(bool sent) =>
      _prefs.setBool(_ringSent, sent);

  /// Uploads to Media that haven't finished, so they can carry on later.
  List<PendingUpload> get pendingUploads {
    final raw = _prefs.getString(_uploads);
    if (raw == null) return const [];
    try {
      return [
        for (final item in jsonDecode(raw) as List)
          PendingUpload.fromJson((item as Map).cast<String, dynamic>()),
      ];
    } on Object {
      return const [];
    }
  }

  Future<void> setPendingUploads(List<PendingUpload> uploads) => uploads.isEmpty
      ? _prefs.remove(_uploads)
      : _prefs.setString(
          _uploads,
          jsonEncode([for (final u in uploads) u.toJson()]),
        );

  Future<void> clearAccount() async {
    await _prefs.remove(_app);
    await _prefs.remove(_business);
    await _prefs.remove(_uploads);
    // 207 The ringtones stay on the phone; the next account gets them again.
    await _prefs.remove(_ringSent);
  }
}

class PendingUpload {
  const PendingUpload({
    required this.appId,
    required this.mediaId,
    required this.path,
    required this.name,
    required this.size,
    required this.type,
  });

  factory PendingUpload.fromJson(Map<String, dynamic> json) => PendingUpload(
    appId: '${json['app_id']}',
    mediaId: '${json['media_id']}',
    path: '${json['path']}',
    name: '${json['name']}',
    size: (json['size'] as num).toInt(),
    type: '${json['type']}',
  );

  final String appId;
  final String mediaId;
  final String path;
  final String name;
  final int size;
  final String type;

  Map<String, dynamic> toJson() => {
    'app_id': appId,
    'media_id': mediaId,
    'path': path,
    'name': name,
    'size': size,
    'type': type,
  };
}
