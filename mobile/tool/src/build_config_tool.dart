/// Pure functions behind `tool/apply_config.dart`: validation against
/// `docs/build-config.schema.json` and rendering of every generated file.
///
/// Nothing here touches the file system or the network, so it can be tested.
library;

import 'dart:convert';

const _topLevelKeys = {
  'schema_version',
  'client_id',
  'app_type',
  'app_name',
  'short_name',
  'site_url',
  'android_package',
  'ios_bundle_id',
  'version_name',
  'version_code',
  'branding',
  'firebase',
};

const _required = [
  'schema_version',
  'app_type',
  'app_name',
  'short_name',
  'site_url',
  'android_package',
  'ios_bundle_id',
  'version_name',
  'version_code',
  'branding',
];

const _brandingKeys = {
  'primary_color',
  'splash_color',
  'template',
  'font',
  'icon_url',
  'logo_url',
};

const _brandingRequired = ['primary_color', 'splash_color', 'template', 'font'];

const fonts = [
  'Bricolage Grotesque',
  'Plus Jakarta Sans',
  'Outfit',
  'Manrope',
  'DM Sans',
  'Lexend',
];

const templates = ['classic', 'bold', 'minimal'];

final _androidPackage = RegExp(r'^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$');
final _iosBundleId = RegExp(
  r'^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$',
);
final _version = RegExp(r'^\d+\.\d+\.\d+$');
final _color = RegExp(r'^#[0-9A-Fa-f]{6}$');

/// Java keywords can't be package segments, so Android rejects them.
const _javaKeywords = {
  'abstract',
  'assert',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extends',
  'final',
  'finally',
  'float',
  'for',
  'goto',
  'if',
  'implements',
  'import',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'try',
  'void',
  'volatile',
  'while',
  'true',
  'false',
  'null',
};

class ValidationResult {
  const ValidationResult(this.errors);
  final List<String> errors;
  bool get isValid => errors.isEmpty;
}

/// Checks a decoded build config against the schema's rules.
ValidationResult validateBuildConfig(Object? decoded) {
  final errors = <String>[];
  if (decoded is! Map<String, dynamic>) {
    return const ValidationResult(['The config must be a JSON object.']);
  }
  final c = decoded;

  for (final key in c.keys) {
    if (!_topLevelKeys.contains(key)) errors.add('Unknown field "$key".');
  }
  for (final key in _required) {
    if (!c.containsKey(key) || c[key] == null) {
      errors.add('Missing required field "$key".');
    }
  }

  if (c.containsKey('schema_version') && c['schema_version'] != 1) {
    errors.add('"schema_version" must be 1.');
  }
  if (c.containsKey('app_type') && c['app_type'] != 'lms') {
    errors.add('"app_type" must be "lms".');
  }
  _string(c, 'client_id', errors);
  _string(c, 'app_name', errors, min: 1, max: 30);
  _string(c, 'short_name', errors, min: 1, max: 12);

  final site = _string(c, 'site_url', errors);
  if (site != null) {
    final uri = Uri.tryParse(site);
    if (!site.startsWith('https://') ||
        uri == null ||
        uri.host.isEmpty ||
        uri.hasQuery ||
        uri.hasFragment) {
      errors.add(
        '"site_url" must be an https:// URL without query or fragment.',
      );
    }
  }

  final pkg = _string(c, 'android_package', errors);
  if (pkg != null) {
    if (!_androidPackage.hasMatch(pkg)) {
      errors.add('"android_package" must look like com.youracademy.app.');
    } else if (pkg.split('.').any(_javaKeywords.contains)) {
      errors.add('"android_package" can\'t contain a Java keyword segment.');
    }
  }
  final bundle = _string(c, 'ios_bundle_id', errors);
  if (bundle != null && !_iosBundleId.hasMatch(bundle)) {
    errors.add('"ios_bundle_id" must look like com.youracademy.app.');
  }
  final version = _string(c, 'version_name', errors);
  if (version != null && !_version.hasMatch(version)) {
    errors.add('"version_name" must look like 1.0.0.');
  }
  if (c.containsKey('version_code')) {
    final code = c['version_code'];
    if (code is! int || code < 1) {
      errors.add('"version_code" must be an integer of 1 or more.');
    }
  }

  final branding = c['branding'];
  if (branding != null) {
    if (branding is! Map<String, dynamic>) {
      errors.add('"branding" must be an object.');
    } else {
      for (final key in branding.keys) {
        if (!_brandingKeys.contains(key)) {
          errors.add('Unknown field "branding.$key".');
        }
      }
      for (final key in _brandingRequired) {
        if (!branding.containsKey(key) || branding[key] == null) {
          errors.add('Missing required field "branding.$key".');
        }
      }
      for (final key in ['primary_color', 'splash_color']) {
        final value = _string(branding, key, errors, prefix: 'branding.');
        if (value != null && !_color.hasMatch(value)) {
          errors.add('"branding.$key" must be a color like #0E0D24.');
        }
      }
      final template = _string(
        branding,
        'template',
        errors,
        prefix: 'branding.',
      );
      if (template != null && !templates.contains(template)) {
        errors.add(
          '"branding.template" must be one of ${templates.join(', ')}.',
        );
      }
      final font = _string(branding, 'font', errors, prefix: 'branding.');
      if (font != null && !fonts.contains(font)) {
        errors.add('"branding.font" must be one of ${fonts.join(', ')}.');
      }
      for (final key in ['icon_url', 'logo_url']) {
        final url = _string(branding, key, errors, prefix: 'branding.');
        if (url != null && !_isAbsoluteUrl(url)) {
          errors.add('"branding.$key" must be an absolute URL.');
        }
      }
    }
  }

  final firebase = c['firebase'];
  if (firebase != null) {
    if (firebase is! Map<String, dynamic>) {
      errors.add('"firebase" must be an object.');
    } else {
      for (final key in firebase.keys) {
        if (key != 'android_config_url' && key != 'ios_config_url') {
          errors.add('Unknown field "firebase.$key".');
        }
      }
      for (final key in ['android_config_url', 'ios_config_url']) {
        final url = _string(firebase, key, errors, prefix: 'firebase.');
        if (url != null && !_isAbsoluteUrl(url)) {
          errors.add('"firebase.$key" must be an absolute URL.');
        }
      }
    }
  }
  return ValidationResult(errors);
}

bool _isAbsoluteUrl(String value) {
  final uri = Uri.tryParse(value);
  return uri != null && uri.hasScheme && uri.host.isNotEmpty;
}

String? _string(
  Map<String, dynamic> map,
  String key,
  List<String> errors, {
  int? min,
  int? max,
  String prefix = '',
}) {
  if (!map.containsKey(key) || map[key] == null) return null;
  final value = map[key];
  if (value is! String) {
    errors.add('"$prefix$key" must be a string.');
    return null;
  }
  final length = value.runes.length;
  if (min != null && length < min) {
    errors.add('"$prefix$key" must have at least $min character(s).');
  }
  if (max != null && length > max) {
    errors.add('"$prefix$key" must have at most $max characters.');
  }
  return value;
}

/// Firebase values parsed from the client's config files.
class FirebaseValues {
  const FirebaseValues({
    required this.apiKey,
    required this.appId,
    required this.messagingSenderId,
    required this.projectId,
    this.storageBucket,
    this.iosBundleId,
  });

  final String apiKey;
  final String appId;
  final String messagingSenderId;
  final String projectId;
  final String? storageBucket;
  final String? iosBundleId;
}

/// Reads the Android client matching [packageName] from google-services.json.
FirebaseValues parseGoogleServicesJson(String source, String packageName) {
  final json = jsonDecode(source) as Map<String, dynamic>;
  final project = json['project_info'] as Map<String, dynamic>;
  final clients = (json['client'] as List).cast<Map<String, dynamic>>();
  final client = clients.firstWhere(
    (c) =>
        ((c['client_info'] as Map)['android_client_info']
            as Map)['package_name'] ==
        packageName,
    orElse: () => throw FormatException(
      'google-services.json has no Android app for "$packageName".',
    ),
  );
  final keys = (client['api_key'] as List).cast<Map<String, dynamic>>();
  return FirebaseValues(
    apiKey: keys.first['current_key'] as String,
    appId: (client['client_info'] as Map)['mobilesdk_app_id'] as String,
    messagingSenderId: project['project_number'] as String,
    projectId: project['project_id'] as String,
    storageBucket: project['storage_bucket'] as String?,
  );
}

/// Reads GoogleService-Info.plist (XML plist).
FirebaseValues parseGoogleServiceInfoPlist(String source) {
  String? value(String key) {
    final match = RegExp(
      '<key>${RegExp.escape(key)}</key>\\s*<string>([^<]*)</string>',
    ).firstMatch(source);
    return match?.group(1);
  }

  String need(String key) =>
      value(key) ??
      (throw FormatException('GoogleService-Info.plist has no $key.'));

  return FirebaseValues(
    apiKey: need('API_KEY'),
    appId: need('GOOGLE_APP_ID'),
    messagingSenderId: need('GCM_SENDER_ID'),
    projectId: need('PROJECT_ID'),
    storageBucket: value('STORAGE_BUCKET'),
    iosBundleId: value('BUNDLE_ID'),
  );
}

String _dartString(String? value) {
  if (value == null) return 'null';
  final escaped = value
      .replaceAll(r'\', r'\\')
      .replaceAll("'", r"\'")
      .replaceAll(r'$', r'\$')
      .replaceAll('\n', r'\n')
      .replaceAll('\r', r'\r');
  return "'$escaped'";
}

String _dartColor(String hex) => '0xFF${hex.substring(1).toUpperCase()}';

String _firebaseDart(FirebaseValues? f) {
  if (f == null) return 'null';
  return '''
FirebaseOptionsData(
    apiKey: ${_dartString(f.apiKey)},
    appId: ${_dartString(f.appId)},
    messagingSenderId: ${_dartString(f.messagingSenderId)},
    projectId: ${_dartString(f.projectId)},
    storageBucket: ${_dartString(f.storageBucket)},
    iosBundleId: ${_dartString(f.iosBundleId)},
  )''';
}

String _trimSlash(String url) {
  var value = url;
  while (value.endsWith('/')) {
    value = value.substring(0, value.length - 1);
  }
  return value;
}

/// `lib/generated/build_config.g.dart`.
String renderDartConfig(
  Map<String, dynamic> c, {
  FirebaseValues? firebaseAndroid,
  FirebaseValues? firebaseIos,
}) {
  final b = c['branding'] as Map<String, dynamic>;
  return '''
// GENERATED by tool/apply_config.dart from a build config. Do not edit.
// Regenerate with: dart run tool/apply_config.dart <config.json>

import '../core/config/build_config_data.dart';

const buildConfig = BuildConfigData(
  appName: ${_dartString(c['app_name'] as String)},
  shortName: ${_dartString(c['short_name'] as String)},
  siteUrl: ${_dartString(_trimSlash(c['site_url'] as String))},
  androidPackage: ${_dartString(c['android_package'] as String)},
  iosBundleId: ${_dartString(c['ios_bundle_id'] as String)},
  versionName: ${_dartString(c['version_name'] as String)},
  versionCode: ${c['version_code']},
  primaryColor: ${_dartColor(b['primary_color'] as String)},
  splashColor: ${_dartColor(b['splash_color'] as String)},
  template: AppTemplate.${b['template']},
  font: ${_dartString(b['font'] as String)},
  clientId: ${_dartString(c['client_id'] as String?)},
  iconUrl: ${_dartString(b['icon_url'] as String?)},
  logoUrl: ${_dartString(b['logo_url'] as String?)},
  firebaseAndroid: ${_firebaseDart(firebaseAndroid)},
  firebaseIos: ${_firebaseDart(firebaseIos)},
);
''';
}

/// `android/app/yallapp.properties`, read by `android/app/build.gradle.kts`.
String renderAndroidProperties(Map<String, dynamic> c) =>
    '''
# GENERATED by tool/apply_config.dart. Do not edit.
applicationId=${c['android_package']}
namespace=${c['android_package']}
''';

/// Escapes text for an Android string resource.
String escapeAndroidString(String value) {
  var out = value
      .replaceAll(r'\', r'\\')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll("'", r"\'")
      .replaceAll('"', r'\"')
      .replaceAll('\n', r'\n');
  if (out.startsWith('@') || out.startsWith('?')) out = '\\$out';
  return out;
}

/// `android/app/src/main/res/values/yallapp_config.xml`: the label under the
/// launcher icon and the launch screen color.
String renderAndroidResources(Map<String, dynamic> c) {
  final branding = c['branding'] as Map<String, dynamic>;
  return '''
<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by tool/apply_config.dart. Do not edit. -->
<resources>
    <string name="app_name">${escapeAndroidString(c['short_name'] as String)}</string>
    <color name="yallapp_splash">${(branding['splash_color'] as String).toUpperCase()}</color>
</resources>
''';
}

/// Escapes a value for an .xcconfig file, where `//` starts a comment.
String escapeXcconfig(String value) =>
    value.replaceAll(r'$', r'$$').replaceAll('//', r'/$()/');

/// `ios/Flutter/YallappBuild.xcconfig`, included by Debug and Release.
String renderIosXcconfig(Map<String, dynamic> c) =>
    '''
// GENERATED by tool/apply_config.dart. Do not edit.
YALLAPP_BUNDLE_ID = ${c['ios_bundle_id']}
YALLAPP_DISPLAY_NAME = ${escapeXcconfig(c['short_name'] as String)}
''';

/// Replaces the `version:` line of pubspec.yaml.
String updatePubspecVersion(String pubspec, Map<String, dynamic> c) {
  final version = '${c['version_name']}+${c['version_code']}';
  final pattern = RegExp(r'^version:.*$', multiLine: true);
  if (!pattern.hasMatch(pubspec)) {
    throw const FormatException('pubspec.yaml has no version line.');
  }
  return pubspec.replaceFirst(pattern, 'version: $version');
}
