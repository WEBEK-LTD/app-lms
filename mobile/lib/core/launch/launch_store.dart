import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/models/models.dart';
import '../theme/palette.dart';

/// 124.15 The launch screen kept on the phone: `/config` arrives after the
/// app has started, so each one that does is kept and shown from the next
/// start. With it, the app's main and second colours and logo as they were
/// (the build's until then).
@immutable
class KeptLaunch {
  const KeptLaunch({this.look, this.main, this.second, this.logoUrl});

  static KeptLaunch? fromJson(Object? value) {
    if (value is! Map) return null;
    final json = value.cast<String, dynamic>();
    return KeptLaunch(
      look: LaunchLook.fromJson(json['launch']),
      main: parseHexColor(json['main'] as String?),
      second: parseHexColor(json['second'] as String?),
      logoUrl: json['logo_url'] is String ? json['logo_url'] as String : null,
    );
  }

  /// Null: the owner hasn't chosen one (the Signature look).
  final LaunchLook? look;
  final Color? main;
  final Color? second;
  final String? logoUrl;

  Json toJson() => {
    'launch': look?.toJson(),
    'main': main == null ? null : _hex(main!),
    'second': second == null ? null : _hex(second!),
    'logo_url': logoUrl,
  };
}

String _hex(Color color) =>
    '#${(color.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

abstract final class LaunchStore {
  static const key = 'launch.kept';

  static KeptLaunch? read(SharedPreferences preferences) {
    try {
      final raw = preferences.getString(key);
      return raw == null ? null : KeptLaunch.fromJson(jsonDecode(raw));
    } on Object {
      return null;
    }
  }

  static Future<void> save(
    SharedPreferences preferences,
    KeptLaunch kept,
  ) async {
    try {
      await preferences.setString(key, jsonEncode(kept.toJson()));
    } on Object {
      // Nothing kept: the next start shows the Signature look.
    }
  }
}
