import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// 59 The camera that reads tickets' QR codes. The widget tests use a fake.
abstract class CameraScanner {
  Widget view(
    BuildContext context,
    void Function(String code) onCode,
    Widget Function(BuildContext context) onDenied,
  );

  /// Whether the flashlight is on (null when the phone has none).
  ValueNotifier<bool?> get torch;
  Future<void> toggleTorch();
  void dispose();
}

final cameraScannerProvider = Provider<CameraScanner Function()>(
  (ref) => MobileCameraScanner.new,
);

class MobileCameraScanner implements CameraScanner {
  MobileCameraScanner() {
    _controller.addListener(_sync);
  }

  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );

  @override
  final torch = ValueNotifier<bool?>(null);

  void _sync() {
    final state = _controller.value.torchState;
    torch.value = switch (state) {
      TorchState.on => true,
      TorchState.off || TorchState.auto => false,
      TorchState.unavailable => null,
    };
  }

  @override
  Widget view(
    BuildContext context,
    void Function(String code) onCode,
    Widget Function(BuildContext context) onDenied,
  ) => MobileScanner(
    controller: _controller,
    onDetect: (capture) {
      for (final code in capture.barcodes) {
        final value = code.rawValue;
        if (value != null && value.isNotEmpty) {
          onCode(value);
          return;
        }
      }
    },
    errorBuilder: (context, _) => onDenied(context),
  );

  @override
  Future<void> toggleTorch() async {
    try {
      await _controller.toggleTorch();
    } on Object {
      torch.value = null;
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_sync);
    _controller.dispose();
    torch.dispose();
  }
}
