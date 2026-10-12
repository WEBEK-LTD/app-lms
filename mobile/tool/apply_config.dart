// Applies a client's build config to this Flutter project.
//
//   dart run tool/apply_config.dart config/example.json [--offline]
//
// Validates the config against docs/build-config.schema.json and writes:
//   lib/generated/build_config.g.dart                 Dart constants
//   android/app/yallapp.properties                    applicationId, namespace
//   android/app/src/main/res/values/yallapp_config.xml    launcher label, splash color
//   ios/Flutter/YallappBuild.xcconfig                 bundle id, display name
//   pubspec.yaml                                      version line
// and, when the config lists Firebase files, downloads them to
//   android/app/google-services.json, ios/Runner/GoogleService-Info.plist
// (both git-ignored). Running it twice with the same config changes nothing.
//
// --offline skips the Firebase downloads (push stays off in that build).
// Launcher icons and splash images from branding.icon_url are a later step.

import 'dart:convert';
import 'dart:io';

import 'src/build_config_tool.dart';

Future<void> main(List<String> args) async {
  final offline = args.contains('--offline');
  final paths = args.where((a) => !a.startsWith('--')).toList();
  if (paths.length != 1) {
    stderr.writeln(
      'Usage: dart run tool/apply_config.dart <config.json> [--offline]',
    );
    exit(64);
  }

  final root = _projectRoot();
  final configFile = File(paths.single);
  if (!configFile.existsSync()) {
    stderr.writeln('Config not found: ${configFile.path}');
    exit(66);
  }

  final Object? decoded;
  try {
    decoded = jsonDecode(configFile.readAsStringSync());
  } on FormatException catch (e) {
    stderr.writeln('The config is not valid JSON: ${e.message}');
    exit(65);
  }
  final result = validateBuildConfig(decoded);
  if (!result.isValid) {
    stderr.writeln('The build config is invalid:');
    for (final error in result.errors) {
      stderr.writeln('  - $error');
    }
    exit(65);
  }
  final config = decoded! as Map<String, dynamic>;

  final googleServices = File('${root.path}/android/app/google-services.json');
  final serviceInfo = File('${root.path}/ios/Runner/GoogleService-Info.plist');
  final firebase = config['firebase'] as Map<String, dynamic>?;
  FirebaseValues? firebaseAndroid;
  FirebaseValues? firebaseIos;

  final androidUrl = firebase?['android_config_url'] as String?;
  final iosUrl = firebase?['ios_config_url'] as String?;
  if (androidUrl != null && !offline) {
    final body = await _download(androidUrl);
    firebaseAndroid = parseGoogleServicesJson(
      body,
      config['android_package'] as String,
    );
    _write(googleServices, body);
  } else {
    _remove(googleServices);
  }
  if (iosUrl != null && !offline) {
    final body = await _download(iosUrl);
    firebaseIos = parseGoogleServiceInfoPlist(body);
    _write(serviceInfo, body);
  } else {
    _remove(serviceInfo);
  }

  _write(
    File('${root.path}/lib/generated/build_config.g.dart'),
    renderDartConfig(
      config,
      firebaseAndroid: firebaseAndroid,
      firebaseIos: firebaseIos,
    ),
  );
  _write(
    File('${root.path}/android/app/yallapp.properties'),
    renderAndroidProperties(config),
  );
  _write(
    File('${root.path}/android/app/src/main/res/values/yallapp_config.xml'),
    renderAndroidResources(config),
  );
  _write(
    File('${root.path}/ios/Flutter/YallappBuild.xcconfig'),
    renderIosXcconfig(config),
  );
  final pubspec = File('${root.path}/pubspec.yaml');
  _write(pubspec, updatePubspecVersion(pubspec.readAsStringSync(), config));

  stdout.writeln(
    'Applied ${configFile.path}: ${config['app_name']} '
    '(${config['android_package']}, ${config['ios_bundle_id']}) '
    '${config['version_name']}+${config['version_code']}'
    '${firebaseAndroid != null || firebaseIos != null ? ', push on' : ', push off'}.',
  );
}

/// The Flutter project directory (the parent of tool/).
Directory _projectRoot() {
  final script = File.fromUri(Platform.script);
  if (script.existsSync()) return script.parent.parent;
  return Directory.current;
}

void _write(File file, String contents) {
  if (file.existsSync() && file.readAsStringSync() == contents) return;
  file.parent.createSync(recursive: true);
  file.writeAsStringSync(contents);
  stdout.writeln('  wrote ${file.path}');
}

void _remove(File file) {
  if (!file.existsSync()) return;
  file.deleteSync();
  stdout.writeln('  removed ${file.path} (not in this config)');
}

Future<String> _download(String url) async {
  final client = HttpClient();
  try {
    final request = await client.getUrl(Uri.parse(url));
    final response = await request.close();
    final body = await response.transform(utf8.decoder).join();
    if (response.statusCode != 200) {
      throw HttpException('HTTP ${response.statusCode} for $url');
    }
    return body;
  } finally {
    client.close();
  }
}
