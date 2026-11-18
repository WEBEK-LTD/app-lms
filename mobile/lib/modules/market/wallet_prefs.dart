import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/storage/local_settings.dart';

/// 115.60 "Use it at checkout first" (07a): whether the wallet pays first
/// at checkout, kept on the phone (SharedPreferences, so per app); on by
/// default. The wallet screen's switch writes it and checkout reads it.
final walletUseFirstProvider = NotifierProvider<WalletUseFirst, bool>(
  WalletUseFirst.new,
);

class WalletUseFirst extends Notifier<bool> {
  static const key = 'market.wallet_use_first';

  @override
  bool build() => ref.watch(sharedPreferencesProvider).getBool(key) ?? true;

  void set(bool on) {
    ref.read(sharedPreferencesProvider).setBool(key, on);
    state = on;
  }
}
