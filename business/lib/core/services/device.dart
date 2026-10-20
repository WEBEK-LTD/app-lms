import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../api/models.dart';

/// 59 What the phone tells the API at sign-in, for "Signed-in devices".
Future<DeviceInfo> loadDeviceInfo() async {
  final ios = defaultTargetPlatform == TargetPlatform.iOS;
  var name = ios ? 'iPhone' : 'Android phone';
  String? version;
  try {
    final info = DeviceInfoPlugin();
    if (ios) {
      final d = await info.iosInfo;
      name = d.name.isNotEmpty ? d.name : d.model;
    } else {
      final d = await info.androidInfo;
      name = '${d.manufacturer} ${d.model}'.trim();
    }
  } on Object {
    // Keep the generic name.
  }
  try {
    version = (await PackageInfo.fromPlatform()).version;
  } on Object {
    version = null;
  }
  return DeviceInfo(
    name: name,
    platform: ios ? 'ios' : 'android',
    appVersion: version,
  );
}

Future<String> loadAppVersion() async {
  try {
    final info = await PackageInfo.fromPlatform();
    return '${info.version} (${info.buildNumber})';
  } on Object {
    return '1.0.0';
  }
}
