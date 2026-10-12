import 'package:url_launcher/url_launcher.dart';

import '../app_environment.dart';

/// Opens [url] outside the app (browser, WhatsApp, store). Returns false when
/// nothing could open it.
Future<bool> openExternal(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } on Object {
    return false;
  }
}

/// A WhatsApp chat link for a support number such as "+90 532 123 45 67".
String whatsappLink(String number) {
  final digits = number.replaceAll(RegExp(r'[^0-9]'), '');
  return 'https://wa.me/$digits';
}

/// Where "Update now" sends the student.
///
/// The build config has no App Store ID yet, so iOS opens the App Store app's
/// updates page instead of the app's own listing.
String storeUrl(AppEnvironment env) => env.isIos
    ? 'itms-apps://apps.apple.com/updates'
    : 'https://play.google.com/store/apps/details?id=${env.build.androidPackage}';
