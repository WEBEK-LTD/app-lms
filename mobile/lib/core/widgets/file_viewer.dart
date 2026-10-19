import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/l10n.dart';
import '../services/pdf_pages.dart';
import '../services/screen_security.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import 'buttons.dart';
import 'common.dart';

/// 53 What the app's own viewer can show.
enum ViewerKind { pdf, image, text, other }

/// The kind of a file from its type, its name or its first bytes.
ViewerKind viewerKindOf(String name, String? mimeType, [Uint8List? bytes]) {
  final type = (mimeType ?? '').toLowerCase();
  final extension = name.contains('.')
      ? name.split('.').last.toLowerCase()
      : '';
  if (type == 'application/pdf' || extension == 'pdf') return ViewerKind.pdf;
  if (bytes != null &&
      bytes.length > 4 &&
      bytes[0] == 0x25 &&
      bytes[1] == 0x50 &&
      bytes[2] == 0x44 &&
      bytes[3] == 0x46) {
    return ViewerKind.pdf;
  }
  const images = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'};
  if (type.startsWith('image/') && type != 'image/svg+xml') {
    return ViewerKind.image;
  }
  if (images.contains(extension)) return ViewerKind.image;
  const texts = {'txt', 'csv', 'md', 'json'};
  if (type.startsWith('text/') || texts.contains(extension)) {
    return ViewerKind.text;
  }
  return ViewerKind.other;
}

/// The largest course file the viewer downloads (100 MB).
const viewerMaxBytes = 100 * 1024 * 1024;

/// 53 Downloads an attachment into memory for the viewer (never to a file);
/// null when it fails or is too big. Replaced in tests.
final attachmentFetcherProvider =
    Provider<Future<Uint8List?> Function(String url)>((ref) => fetchAttachment);

Future<Uint8List?> fetchAttachment(String url) async {
  final cancel = CancelToken();
  try {
    final response =
        await Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 20),
            receiveTimeout: const Duration(seconds: 60),
            responseType: ResponseType.bytes,
          ),
        ).get<List<int>>(
          url,
          cancelToken: cancel,
          onReceiveProgress: (received, _) {
            if (received > viewerMaxBytes) cancel.cancel();
          },
        );
    final data = response.data;
    return data == null ? null : Uint8List.fromList(data);
  } on Object {
    return null;
  }
}

/// Opens [name] in the app's own viewer. [load] gives its content.
Future<void> openInViewer(
  BuildContext context, {
  required String name,
  String? mimeType,
  required Future<Uint8List?> Function() load,
}) => Navigator.of(context, rootNavigator: true).push(
  MaterialPageRoute<void>(
    builder: (_) =>
        FileViewerScreen(name: name, mimeType: mimeType, load: load),
  ),
);

/// 53 A course file (PDF, picture or text) shown inside the app while
/// screen protection is on: protected like a lesson, kept in memory, and
/// with nothing to share, save, open in another app or print.
class FileViewerScreen extends ConsumerStatefulWidget {
  const FileViewerScreen({
    super.key,
    required this.name,
    required this.load,
    this.mimeType,
  });

  final String name;
  final String? mimeType;
  final Future<Uint8List?> Function() load;

  @override
  ConsumerState<FileViewerScreen> createState() => _FileViewerScreenState();
}

class _FileViewerScreenState extends ConsumerState<FileViewerScreen> {
  late final Future<_Loaded?> _loaded = _load();
  PdfDocumentHandle? _pdf;
  bool _disposed = false;

  Future<_Loaded?> _load() async {
    final bytes = await widget.load();
    if (bytes == null) return null;
    final kind = viewerKindOf(widget.name, widget.mimeType, bytes);
    if (kind != ViewerKind.pdf) return _Loaded(kind, bytes, null);
    final pdf = await ref.read(pdfPagesProvider).open(bytes);
    if (_disposed) {
      await pdf?.close();
      return null;
    }
    _pdf = pdf;
    return _Loaded(pdf == null ? ViewerKind.other : kind, bytes, pdf);
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_pdf?.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ProtectedContent(
    child: Scaffold(
      appBar: AppBar(
        leading: const AppBarBackButton(),
        title: Text(widget.name, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: FutureBuilder<_Loaded?>(
        future: _loaded,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return LoadingView(label: context.l10n.loading);
          }
          final loaded = snapshot.data;
          if (loaded == null) {
            return MessageView(
              icon: AppIcons.attachment,
              title: context.l10n.fileOpenFailed,
            );
          }
          return switch (loaded.kind) {
            ViewerKind.pdf => _PdfPagesView(document: loaded.pdf!),
            ViewerKind.image => InteractiveViewer(
              maxScale: 5,
              child: Center(
                child: Image.memory(
                  loaded.bytes,
                  key: const ValueKey('viewer-image'),
                  errorBuilder: (context, _, _) => MessageView(
                    icon: AppIcons.attachment,
                    title: context.l10n.fileOpenFailed,
                  ),
                ),
              ),
            ),
            ViewerKind.text => SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Text(
                utf8.decode(loaded.bytes, allowMalformed: true),
                key: const ValueKey('viewer-text'),
              ),
            ),
            ViewerKind.other => MessageView(
              icon: AppIcons.attachment,
              title: context.l10n.fileInAppOnly,
              message: context.l10n.fileInAppOnlyMessage,
            ),
          };
        },
      ),
    ),
  );
}

class _Loaded {
  const _Loaded(this.kind, this.bytes, this.pdf);

  final ViewerKind kind;
  final Uint8List bytes;
  final PdfDocumentHandle? pdf;
}

/// The pages one under the other, drawn as they scroll into view; a tap
/// opens a page on its own to zoom.
class _PdfPagesView extends StatelessWidget {
  const _PdfPagesView({required this.document});

  final PdfDocumentHandle document;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final width =
          (constraints.maxWidth * MediaQuery.devicePixelRatioOf(context))
              .round()
              .clamp(320, 2400);
      return ListView.separated(
        key: const ValueKey('viewer-pdf'),
        padding: const EdgeInsets.all(12),
        itemCount: document.pageCount,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) => _PdfPage(
          document: document,
          index: index,
          width: width,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => ProtectedContent(
                child: _PdfPageZoom(
                  document: document,
                  index: index,
                  width: width * 2,
                ),
              ),
            ),
          ),
        ),
      );
    },
  );
}

class _PdfPage extends StatefulWidget {
  const _PdfPage({
    required this.document,
    required this.index,
    required this.width,
    this.onTap,
  });

  final PdfDocumentHandle document;
  final int index;
  final int width;
  final VoidCallback? onTap;

  @override
  State<_PdfPage> createState() => _PdfPageState();
}

class _PdfPageState extends State<_PdfPage> {
  late final Future<Uint8List?> _image = widget.document.render(
    widget.index,
    widget.width,
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Semantics(
      label: l10n.pageOf(widget.index + 1, widget.document.pageCount),
      button: widget.onTap != null,
      child: GestureDetector(
        onTap: widget.onTap,
        child: FutureBuilder<Uint8List?>(
          future: _image,
          builder: (context, snapshot) {
            final image = snapshot.data;
            if (image == null) {
              return AspectRatio(
                aspectRatio: 1 / 1.414,
                child: ColoredBox(
                  color: context.palette.surfaceMuted,
                  child: snapshot.connectionState == ConnectionState.done
                      ? Center(
                          child: AppIcon(
                            AppIcons.attachment,
                            color: context.palette.textSecondary,
                          ),
                        )
                      : const SizedBox.expand(),
                ),
              );
            }
            return Image.memory(
              image,
              key: ValueKey('viewer-page-${widget.index}'),
              fit: BoxFit.fitWidth,
              gaplessPlayback: true,
              // A page's place until the picture is ready.
              frameBuilder: (context, child, frame, sync) =>
                  frame == null && !sync
                  ? AspectRatio(aspectRatio: 1 / 1.414, child: child)
                  : child,
            );
          },
        ),
      ),
    );
  }
}

class _PdfPageZoom extends StatelessWidget {
  const _PdfPageZoom({
    required this.document,
    required this.index,
    required this.width,
  });

  final PdfDocumentHandle document;
  final int index;
  final int width;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leading: const AppBarBackButton(),
      title: Text(context.l10n.pageOf(index + 1, document.pageCount)),
    ),
    body: InteractiveViewer(
      maxScale: 5,
      child: Center(
        child: _PdfPage(document: document, index: index, width: width),
      ),
    ),
  );
}
