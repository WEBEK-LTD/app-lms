import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 129.4 Whether the phone asks apps to save data: Android's Data Saver
/// for this app (MainActivity.kt) or iOS's Low Data Mode (AppDelegate.swift).
/// A video banner doesn't play by itself then. False where the phone can't
/// say (the web preview) or doesn't answer within half a second (tests).
final dataSaverProvider = FutureProvider<bool>((ref) async {
  try {
    return await const MethodChannel('yallapp/data_saver')
        .invokeMethod<bool>('enabled')
        .then((on) => on ?? false)
        .timeout(const Duration(milliseconds: 500), onTimeout: () => false);
  } on MissingPluginException {
    return false;
  } on PlatformException {
    return false;
  }
});
