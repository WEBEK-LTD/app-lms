import 'dart:typed_data';

import 'image_store.dart';

ImageStore createImageStore() => const NoImageStore();

/// The web build reads pictures with the browser's own [NetworkImage]
/// (networkPicture), which keeps the files itself: nothing here.
class NoImageStore implements ImageStore {
  const NoImageStore();

  @override
  Future<Uint8List> load(String url, String key, {ImageProgress? onProgress}) =>
      Future.error(UnsupportedError('Pictures load with NetworkImage here.'));

  @override
  Future<void> forget(String key) async {}
}
