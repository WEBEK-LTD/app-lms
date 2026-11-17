import 'package:flutter/foundation.dart';

import 'image_store_stub.dart'
    if (dart.library.io) 'image_store_io.dart'
    as platform;

/// How much of a picture has arrived, and of how much (null: not said).
typedef ImageProgress = void Function(int loaded, int? total);

/// Where pictures from the network are kept: the app's cache folder on a
/// phone ([platform.createImageStore]); the web build (the app preview)
/// leaves them to the browser.
abstract class ImageStore {
  /// The picture's bytes: the copy kept under [key] when there is one, else
  /// downloaded from [url] (and kept).
  Future<Uint8List> load(String url, String key, {ImageProgress? onProgress});

  /// Drops the copy kept under [key].
  Future<void> forget(String key);
}

/// The store every [AppImage] reads from.
ImageStore imageStore = platform.createImageStore();

/// Puts [store] in place of the phone's own (tests).
@visibleForTesting
void debugSetImageStore(ImageStore store) => imageStore = store;
