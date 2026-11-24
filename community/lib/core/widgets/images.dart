import 'package:flutter/widgets.dart';

/// A picture from the API (`https://…`), or one of the app's own
/// (`asset:assets/images/…`, the demo's).
ImageProvider imageOf(String url) =>
    url.startsWith('asset:') ? AssetImage(url.substring(6)) : NetworkImage(url);
