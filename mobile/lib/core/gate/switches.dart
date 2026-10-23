import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_gate.dart';

/// 83.3 Whether the Yallapp team left a module or new feature on for this
/// app (`Config.switches`); on until the config has loaded.
bool switchOn(WidgetRef ref, String name) {
  final gate = ref.watch(appGateProvider);
  return gate is! GateReady || gate.config.switchOn(name);
}
