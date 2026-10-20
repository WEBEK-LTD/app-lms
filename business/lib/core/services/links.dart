import 'package:url_launcher/url_launcher.dart';

/// 59 Opens a link outside the app: the browser (yallapp.com.tr, store
/// pages, downloads), WhatsApp, email or the phone dialler.
typedef OpenExternal = Future<bool> Function(String url);

Future<bool> openExternal(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } on Object {
    return false;
  }
}
