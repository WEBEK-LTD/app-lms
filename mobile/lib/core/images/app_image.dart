import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter/rendering.dart' show BoxConstraints;

import 'image_store.dart';

/// How big a picture is decoded, in physical pixels: about the size of the
/// box it fills, so a 4000 px phone photo shown in a 120 pt card isn't held
/// in memory at its full size (48 MB decoded; a few hundred KB this way).
///
/// A null side doesn't limit. [cover]: the picture fills the box (both sides
/// at least this big); else it fits inside it (the box's biggest side).
/// Never bigger than the picture itself.
@immutable
class DecodeTarget {
  const DecodeTarget({this.width, this.height, this.cover = true});

  final int? width;
  final int? height;
  final bool cover;

  /// Sides are rounded up to steps of this many pixels, so a box that
  /// changes a little keeps the picture already decoded.
  static const step = 64;

  static int stepUp(double pixels) =>
      math.max(step, (pixels / step).ceil() * step);

  /// The size to decode a [pictureWidth] × [pictureHeight] picture at: only
  /// the width, so the engine keeps the picture's own proportions.
  ui.TargetImageSize sizeFor(int pictureWidth, int pictureHeight) {
    double? scale;
    void side(int? box, int picture) {
      if (box == null || picture <= 0) return;
      final s = box / picture;
      scale = scale == null
          ? s
          : (cover ? math.max(scale!, s) : math.min(scale!, s));
    }

    side(width, pictureWidth);
    side(height, pictureHeight);
    final s = scale;
    if (s == null || s >= 1) return const ui.TargetImageSize();
    return ui.TargetImageSize(width: math.max(1, (pictureWidth * s).ceil()));
  }

  /// A target sharp enough for this one and [other] (null: the full size).
  DecodeTarget? union(DecodeTarget other) {
    if (cover != other.cover) return other;
    int? side(int? a, int? b) {
      if (a == null) return cover ? b : null;
      if (b == null) return cover ? a : null;
      return math.max(a, b);
    }

    final w = side(width, other.width);
    final h = side(height, other.height);
    if (w == null && h == null) return null;
    return DecodeTarget(width: w, height: h, cover: cover);
  }

  /// Whether a picture decoded for this target is sharp enough for [other].
  bool covers(DecodeTarget other) {
    if (cover != other.cover) return false;
    bool side(int? mine, int? theirs) {
      if (theirs == null) return cover || mine == null;
      return mine != null && mine >= theirs;
    }

    return side(width, other.width) && side(height, other.height);
  }

  @override
  bool operator ==(Object other) =>
      other is DecodeTarget &&
      other.width == width &&
      other.height == height &&
      other.cover == cover;

  @override
  int get hashCode => Object.hash(width, height, cover);

  @override
  String toString() =>
      'DecodeTarget(${width ?? '∞'}×${height ?? '∞'}${cover ? ' cover' : ''})';
}

/// The decode size for a picture drawn by an [Image] with these [width],
/// [height] and [fit] under [constraints], or null for its full size (it's
/// drawn at its own size, or nothing bounds it).
///
/// The [Image] lays itself out the same way with the smaller picture: in a
/// tight box its size is the box's; in a loose one the picture still reaches
/// the box's bounded side, so it's scaled down to the same size as before.
DecodeTarget? decodeTargetFor(
  BoxConstraints constraints, {
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
  required double devicePixelRatio,
}) {
  if (fit == BoxFit.none) return null;
  final box = BoxConstraints.tightFor(
    width: width,
    height: height,
  ).enforce(constraints);
  final w = box.hasBoundedWidth ? box.maxWidth : null;
  final h = box.hasBoundedHeight ? box.maxHeight : null;
  if (w == null && h == null) return null;
  final ratio = devicePixelRatio > 0 ? devicePixelRatio : 1.0;
  return DecodeTarget(
    width: w == null ? null : DecodeTarget.stepUp(w * ratio),
    height: h == null ? null : DecodeTarget.stepUp(h * ratio),
    cover: box.isTight && fit != BoxFit.contain && fit != BoxFit.scaleDown,
  );
}

/// The address a picture is kept under. The media gate's signed links
/// (`/v/<app>/<file>/<ext>?expires=…&sig=…`) change each time the platform
/// signs them, for the same file: kept without the signature, so the app
/// doesn't download the same picture again.
String imageCacheKey(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null || !uri.hasQuery || !_signedMedia.hasMatch(uri.path)) {
    return url;
  }
  final kept = Map.of(uri.queryParameters)
    ..remove('expires')
    ..remove('sig');
  final address = url.substring(0, url.indexOf('?'));
  if (kept.isEmpty) return address;
  final sorted = Map.fromEntries(
    kept.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
  );
  return '$address?${Uri(queryParameters: sorted).query}';
}

final _uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
final _signedMedia = RegExp('/v/$_uuid/$_uuid[./][a-z0-9]+\$');

/// The [ImageCache] key of an [AppImage].
@immutable
class AppImageKey {
  const AppImageKey(this.cacheKey, this.target);

  final String cacheKey;
  final DecodeTarget? target;

  @override
  bool operator ==(Object other) =>
      other is AppImageKey &&
      other.cacheKey == cacheKey &&
      other.target == target;

  @override
  int get hashCode => Object.hash(cacheKey, target);

  @override
  String toString() => 'AppImageKey($cacheKey, $target)';
}

/// A picture from the network, kept on the phone ([imageStore]) so it shows
/// at once the next time (also after the app was closed, and offline), and
/// decoded at about the size it's shown ([DecodeTarget]).
///
/// [AppImage.whenLaidOut] gets its size once its box is laid out.
class AppImage extends ImageProvider<AppImageKey> {
  const AppImage(this.url, {this.target}) : _target = null;

  /// Decoded at the size [target] completes with.
  AppImage.whenLaidOut(this.url, Future<DecodeTarget?> target)
    : target = null,
      _target = target;

  final String url;
  final DecodeTarget? target;
  final Future<DecodeTarget?>? _target;

  @override
  Future<AppImageKey> obtainKey(ImageConfiguration configuration) {
    final later = _target;
    if (later != null) {
      return later.then((t) => AppImageKey(imageCacheKey(url), t));
    }
    return SynchronousFuture(AppImageKey(imageCacheKey(url), target));
  }

  @override
  ImageStreamCompleter loadImage(AppImageKey key, ImageDecoderCallback decode) {
    final chunks = StreamController<ImageChunkEvent>();
    return MultiFrameImageStreamCompleter(
      codec: _load(key, decode, chunks),
      chunkEvents: chunks.stream,
      scale: 1.0,
      debugLabel: url,
      informationCollector: () => [
        DiagnosticsProperty<ImageProvider>('Image provider', this),
        DiagnosticsProperty<AppImageKey>('Image key', key),
      ],
    );
  }

  Future<ui.Codec> _load(
    AppImageKey key,
    ImageDecoderCallback decode,
    StreamController<ImageChunkEvent> chunks,
  ) async {
    try {
      final bytes = await imageStore.load(
        url,
        key.cacheKey,
        onProgress: (loaded, total) => chunks.add(
          ImageChunkEvent(
            cumulativeBytesLoaded: loaded,
            expectedTotalBytes: total,
          ),
        ),
      );
      if (bytes.lengthInBytes == 0) {
        throw NetworkImageLoadException(statusCode: 200, uri: Uri.parse(url));
      }
      final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
      final target = key.target;
      try {
        return await decode(
          buffer,
          getTargetSize: target == null
              ? null
              : (width, height) => target.sizeFor(width, height),
        );
      } on Object {
        // Not a picture (a broken copy, or a page instead of the file):
        // dropped, so the next try downloads it again.
        unawaited(imageStore.forget(key.cacheKey));
        rethrow;
      }
    } on Object {
      // As NetworkImage does: a later build tries again.
      scheduleMicrotask(() {
        PaintingBinding.instance.imageCache.evict(key);
      });
      rethrow;
    } finally {
      unawaited(chunks.close());
    }
  }

  @override
  bool operator ==(Object other) =>
      other is AppImage &&
      other.url == url &&
      other.target == target &&
      identical(other._target, _target);

  @override
  int get hashCode => Object.hash(url, target, _target);

  @override
  String toString() =>
      '${objectRuntimeType(this, 'AppImage')}("$url", ${_target == null ? target : 'when laid out'})';
}

/// The size each picture was last decoded at, so a box built again (a list
/// scrolled back, a page opened again) asks for that size at once and finds
/// the picture in the image cache, with no frame without it.
abstract final class DecodeMemory {
  static const _most = 600;
  static final _sizes = <String, DecodeTarget?>{};

  static bool knows(String url) => _sizes.containsKey(url);

  /// Null: decoded at its full size.
  static DecodeTarget? of(String url) => _sizes[url];

  static void remember(String url, DecodeTarget? target) {
    _sizes
      ..remove(url)
      ..[url] = target;
    if (_sizes.length > _most) _sizes.remove(_sizes.keys.first);
  }

  @visibleForTesting
  static void clear() => _sizes.clear();
}

/// The screenshots put their pictures in the image cache under
/// [NetworkImage] keys: with this on, pictures load as they did before
/// (Flutter's NetworkImage, full size, nothing kept).
@visibleForTesting
bool debugPlainNetworkImages = false;

/// Whether pictures load with Flutter's own [NetworkImage]: on the web (the
/// app preview; the browser keeps the files itself), and in screenshots.
bool get plainNetworkImages => kIsWeb || debugPlainNetworkImages;

/// The picture at [url] as an [ImageProvider]: an [AppImage] on a phone,
/// else ([plainNetworkImages]) a [NetworkImage].
ImageProvider networkPicture(String url, {DecodeTarget? target}) =>
    plainNetworkImages
    ? NetworkImage(url, webHtmlElementStrategy: WebHtmlElementStrategy.fallback)
    : AppImage(url, target: target);
