import 'dart:async';

import 'package:yallapp/core/images/app_image.dart';

/// The screenshots put their pictures in the image cache under NetworkImage
/// keys (`_seed` in each file): pictures load with NetworkImage here.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  debugPlainNetworkImages = true;
  await testMain();
}
