import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 53 A PDF open in the app's own viewer: its page count and each page drawn
/// as a PNG image.
class PdfDocumentHandle {
  const PdfDocumentHandle({
    required this.pageCount,
    required this.render,
    required this.close,
  });

  final int pageCount;

  /// Page [index] (from 0), [width] pixels wide; null when it can't be drawn.
  final Future<Uint8List?> Function(int index, int width) render;
  final Future<void> Function() close;
}

/// 53 Draws PDF pages with the phone's own renderer (Android's PdfRenderer,
/// iOS's PDFKit) through the `yallapp/pdf` channel. The document goes over
/// in memory: Android keeps it in a file in the app's private cache only
/// while it's being opened (deleted at once, and at the next start), iOS
/// never writes it. Nothing offers to share, save or print it.
class PdfPages {
  const PdfPages();

  static const _channel = MethodChannel('yallapp/pdf');

  /// Null when the platform has no renderer (the web preview, tests) or the
  /// file isn't a PDF it can read.
  Future<PdfDocumentHandle?> open(Uint8List bytes) async {
    try {
      final opened = await _channel.invokeMapMethod<String, Object?>('open', {
        'bytes': bytes,
      });
      final id = opened?['id'];
      final pages = opened?['pages'];
      if (id is! int || pages is! int || pages < 1) return null;
      return PdfDocumentHandle(
        pageCount: pages,
        render: (index, width) async {
          try {
            return await _channel.invokeMethod<Uint8List>('render', {
              'id': id,
              'page': index,
              'width': width,
            });
          } on PlatformException {
            return null;
          }
        },
        close: () async {
          try {
            await _channel.invokeMethod<void>('close', {'id': id});
          } on Object {
            // Already closed.
          }
        },
      );
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }
}

final pdfPagesProvider = Provider<PdfPages>((ref) => const PdfPages());
