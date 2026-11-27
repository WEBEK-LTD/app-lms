import 'dart:io';

import 'package:flutter/widgets.dart';

/// A picture from the API (`https://…`), or one of the app's own
/// (`asset:assets/images/…`, the demo's), or a picked file (a path).
ImageProvider imageOf(String url) => url.startsWith('asset:')
    ? AssetImage(url.substring(6))
    : url.startsWith('/')
    ? FileImage(File(url))
    : NetworkImage(url);
