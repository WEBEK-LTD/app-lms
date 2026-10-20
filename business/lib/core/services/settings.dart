import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// 59 What this phone remembers between launches (not secrets: the tokens
/// are in [TokenStore]).
class LocalSettings {
  LocalSettings(this._prefs);

  final SharedPreferences _prefs;

  static const _app = 'yb.selected_app';
  static const _biometric = 'yb.biometric_lock';
  static const _language = 'yb.language';
  static const _uploads = 'yb.pending_uploads';

  String? get selectedApp => _prefs.getString(_app);
  Future<void> setSelectedApp(String? id) =>
      id == null ? _prefs.remove(_app) : _prefs.setString(_app, id);

  /// Null until chosen: the lock turns on after the first sign-in on a phone
  /// that can use it.
  bool? get biometricLock => _prefs.getBool(_biometric);
  Future<void> setBiometricLock(bool on) => _prefs.setBool(_biometric, on);

  /// The language picked on this phone before signing in (en, ar, tr).
  String? get language => _prefs.getString(_language);
  Future<void> setLanguage(String? code) => code == null
      ? _prefs.remove(_language)
      : _prefs.setString(_language, code);

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
    await _prefs.remove(_uploads);
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
