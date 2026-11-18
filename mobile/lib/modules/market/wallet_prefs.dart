import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/storage/local_settings.dart' show sharedPreferencesProvider;

/// 115 The wallet's "Use it at checkout first", kept on the phone (on by
/// default): the checkout starts with the wallet on when it is.
class WalletUseFirst extends Notifier<bool> {
  static const key = 'market.wallet_use_first';

  @override
  bool build() => ref.read(sharedPreferencesProvider).getBool(key) ?? true;

  Future<void> set(bool value) async {
    state = value;
    await ref.read(sharedPreferencesProvider).setBool(key, value);
  }
}

final walletUseFirstProvider = NotifierProvider<WalletUseFirst, bool>(
  WalletUseFirst.new,
);
