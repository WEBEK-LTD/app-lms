import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/providers.dart';
import 'cart_controller.dart';

/// 85.3 Tells the server how many items the cart holds when that number
/// changes (signed in only), so a shop can send "You left something in your
/// cart". Nothing else about the cart leaves the phone. A server that
/// doesn't keep it (404) isn't asked again until the app restarts. Watched
/// once at the app root.
final cartSyncProvider = Provider<void>((ref) {
  final signedIn = ref.watch(
    authControllerProvider.select((state) => state.isSignedIn),
  );
  if (!signedIn) return;
  var stopped = false;
  int? sent;

  Future<void> send(int count) async {
    try {
      await ref.read(yallappApiProvider).setCart(count);
    } on ApiException catch (e) {
      if (e.statusCode == 404) stopped = true;
      // Otherwise the next change says it again.
      if (sent == count) sent = null;
    }
  }

  ref.listen<List<CartItem>>(cartProvider, (_, next) {
    final count = next.fold<int>(0, (n, i) => n + i.quantity).clamp(0, 999);
    if (stopped || count == sent) return;
    sent = count;
    unawaited(send(count));
  });
});
