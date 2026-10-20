// 65 Huawei Push Kit for the Android build of Yallapp Business: writes
// android/app/agconnect-services.json (git-ignored, never committed) from
// the environment and prints the app ID to pass as
// `--dart-define=YB_HMS_APP_ID=…`. The Android build includes Huawei's push
// SDK (android/hms_push) only when that file is there.
//
//   YB_HMS_APP_ID               AppGallery Connect › Project settings ›
//                               General information › App ID
//   YB_HMS_AGCONNECT_SERVICES   optional: the contents of the app's
//                               agconnect-services.json (same page)
//
// With only the app ID, the file written has the app ID and the package
// name, which is what Push Kit's token needs. With neither, nothing is
// written, nothing is printed and the build has nothing from Huawei.
//
// Run from business/: `dart run tool/hms_config.dart`. Only the app ID goes
// to standard output; problems go to standard error with exit code 1.
import 'dart:convert';
import 'dart:io';

const package = 'tr.com.yallapp.business';

/// What to write for Huawei push: the app ID and the agconnect-services.json
/// to put in android/app. Null when Huawei push is off.
typedef HmsFiles = ({String appId, String agconnect});

/// The app ID and agconnect-services.json from the two values, or null when
/// both are empty. Throws [FormatException] when they don't fit: an app ID
/// that isn't digits, a file that isn't JSON or has no app ID, another app's
/// file. Pure.
HmsFiles? hmsFiles({String appId = '', String agconnect = ''}) {
  final id = appId.trim();
  final file = agconnect.trim();
  if (id.isEmpty && file.isEmpty) return null;
  if (id.isNotEmpty && !_digits.hasMatch(id)) {
    throw const FormatException(
      "YB_HMS_APP_ID isn't an AppGallery Connect app ID (digits only).",
    );
  }
  if (file.isEmpty) {
    final app = {'app_id': id, 'package_name': package};
    final json = {
      'client': app,
      'app_info': app,
      'configuration_version': '3.0',
    };
    return (
      appId: id,
      agconnect: '${const JsonEncoder.withIndent('  ').convert(json)}\n',
    );
  }
  final Object? json;
  try {
    json = jsonDecode(file);
  } on FormatException {
    throw const FormatException(
      "YB_HMS_AGCONNECT_SERVICES isn't the JSON of agconnect-services.json.",
    );
  }
  if (json is! Map) {
    throw const FormatException(
      "YB_HMS_AGCONNECT_SERVICES isn't the JSON of agconnect-services.json.",
    );
  }
  final Map<Object?, Object?> map = json;
  String? field(String section, String key) {
    final part = map[section];
    if (part is! Map) return null;
    final value = '${part[key] ?? ''}'.trim();
    return value.isEmpty ? null : value;
  }

  final fileId = field('app_info', 'app_id') ?? field('client', 'app_id');
  if (fileId == null || !_digits.hasMatch(fileId)) {
    throw const FormatException(
      'The agconnect-services.json in YB_HMS_AGCONNECT_SERVICES has no app ID.',
    );
  }
  if (id.isNotEmpty && id != fileId) {
    throw FormatException(
      'YB_HMS_APP_ID ($id) is another app than the agconnect-services.json '
      'in YB_HMS_AGCONNECT_SERVICES ($fileId).',
    );
  }
  final filePackage =
      field('app_info', 'package_name') ?? field('client', 'package_name');
  if (filePackage != null && filePackage != package) {
    throw FormatException(
      'The agconnect-services.json in YB_HMS_AGCONNECT_SERVICES is for '
      '$filePackage, not $package.',
    );
  }
  return (appId: fileId, agconnect: file.endsWith('\n') ? file : '$file\n');
}

final _digits = RegExp(r'^[0-9]{1,32}$');

void main() {
  // The Flutter project (the parent of tool/), else the current folder.
  final script = File.fromUri(Platform.script);
  final root = script.existsSync() ? script.parent.parent : Directory.current;
  final target = File('${root.path}/android/app/agconnect-services.json');
  final HmsFiles? files;
  try {
    files = hmsFiles(
      appId: Platform.environment['YB_HMS_APP_ID'] ?? '',
      agconnect: Platform.environment['YB_HMS_AGCONNECT_SERVICES'] ?? '',
    );
  } on FormatException catch (e) {
    stderr.writeln(e.message);
    exitCode = 1;
    return;
  }
  if (files == null) {
    stderr.writeln('Huawei push: off (no YB_HMS_* values).');
    return;
  }
  target.writeAsStringSync(files.agconnect);
  stderr.writeln('Huawei push: on, app ${files.appId} (${target.path}).');
  stdout.write(files.appId);
}
