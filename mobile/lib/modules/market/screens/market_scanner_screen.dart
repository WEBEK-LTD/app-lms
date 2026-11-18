import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/market_models.dart';
import '../data/market_store.dart';
import '../widgets/market_store_widgets.dart';

/// 115.40 Whether the scanner opens the camera: on phones (not the web,
/// desktops or tests, where the code is typed instead).
final marketScannerCameraProvider = Provider<bool>(
  (ref) =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS),
);

/// 115.40 Scans a barcode (or takes it typed), finds it in [page]'s store
/// only, and opens the product; says so when the store has none.
Future<void> scanAndOpen(
  BuildContext context,
  WidgetRef ref,
  MarketVendorPage page,
) async {
  final l10n = context.l10n;
  final code = await Navigator.of(context).push<String>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => MarketScannerScreen(storeName: page.vendor.name),
    ),
  );
  if (code == null || code.isEmpty || !context.mounted) return;
  MarketItem? item;
  try {
    item = await findMarketBarcode(ref, page.vendor.id, code);
  } on ApiException catch (e) {
    if (context.mounted) showMessage(context, e.message);
    return;
  }
  if (!context.mounted) return;
  if (item == null) {
    showMessage(context, l10n.marketBarcodeNotFound(page.vendor.name));
    return;
  }
  await context.push(Paths.marketProduct(page.vendor.id, item.id), extra: item);
}

/// The camera reading barcodes (EAN, UPC, Code 128 and the like), with
/// typing the numbers as the way without a camera or its permission.
class MarketScannerScreen extends ConsumerStatefulWidget {
  const MarketScannerScreen({super.key, required this.storeName});

  final String storeName;

  @override
  ConsumerState<MarketScannerScreen> createState() =>
      _MarketScannerScreenState();
}

class _MarketScannerScreenState extends ConsumerState<MarketScannerScreen> {
  MobileScannerController? _camera;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    if (ref.read(marketScannerCameraProvider)) {
      _camera = MobileScannerController(
        formats: const [
          BarcodeFormat.ean13,
          BarcodeFormat.ean8,
          BarcodeFormat.upcA,
          BarcodeFormat.upcE,
          BarcodeFormat.code128,
          BarcodeFormat.code39,
          BarcodeFormat.itf14,
        ],
      );
    }
  }

  @override
  void dispose() {
    _camera?.dispose();
    super.dispose();
  }

  void _found(String code) {
    if (_done || code.trim().isEmpty) return;
    _done = true;
    Navigator.of(context).pop(code.trim());
  }

  Future<void> _type() async {
    final l10n = context.l10n;
    final code = await askMarketText(
      context,
      label: l10n.marketBarcodeHint,
      button: l10n.marketFind,
      fieldKey: const ValueKey('market-barcode-field'),
      buttonKey: const ValueKey('market-barcode-find'),
      keyboard: TextInputType.number,
      icon: const AppIcon(Symbols.barcode_rounded),
    );
    if (code != null && mounted) _found(code);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final camera = _camera;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
          icon: const AppIcon(Symbols.close_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(l10n.marketScanTitle),
      ),
      body: Column(
        children: [
          Expanded(
            child: camera == null
                ? _NoCamera(text: l10n.marketCameraOff)
                : Stack(
                    fit: StackFit.expand,
                    children: [
                      MobileScanner(
                        controller: camera,
                        onDetect: (capture) {
                          final value = capture.barcodes
                              .map((b) => b.rawValue)
                              .whereType<String>()
                              .firstOrNull;
                          if (value != null) _found(value);
                        },
                        errorBuilder: (context, error) => _NoCamera(
                          text:
                              error.errorCode ==
                                  MobileScannerErrorCode.permissionDenied
                              ? l10n.marketCameraOff
                              : error.errorDetails?.message ??
                                    l10n.marketCameraOff,
                        ),
                      ),
                      Center(
                        child: Container(
                          width: 280,
                          height: 160,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: p.accent, width: 3),
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.marketScanHint(widget.storeName),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.marketScanWhy,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(height: 14),
                  OutlinedButton.icon(
                    key: const ValueKey('market-barcode-type'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white54),
                      minimumSize: const Size.fromHeight(50),
                    ),
                    onPressed: _type,
                    icon: const AppIcon(
                      Symbols.keyboard_rounded,
                      color: Colors.white,
                    ),
                    label: Text(l10n.marketTypeBarcode),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NoCamera extends StatelessWidget {
  const _NoCamera({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const AppIcon(
            Symbols.no_photography_rounded,
            size: 48,
            color: Colors.white70,
          ),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white, fontSize: 15),
          ),
        ],
      ),
    ),
  );
}
