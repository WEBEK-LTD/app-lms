import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/build_config_data.dart';
import '../../core/gate/app_gate.dart';
import '../../core/providers.dart';

/// 116 A school's (a university's) or an academy's staff app: the same app
/// built for the teachers and staff only (`role` staff), next to the
/// students' and parents' app, as the couriers' app (112.3) and the
/// vendors' (115) are.

/// This build is the staff app of a school or of an academy with many
/// teachers: the staff's screens and the account only.
final staffAppProvider = Provider<bool>((ref) {
  final build = ref.watch(appEnvironmentProvider).build;
  return build.role == AppRole.staff &&
      (build.appType == AppType.school || build.appType == AppType.lms);
});

/// Whether this build shows the teachers' and staff's screens: the staff
/// app always; the main app only while they work in it (`staff_app` same,
/// or a server that doesn't say). Builds of the main app made before 116
/// show them either way, for the people who haven't updated.
final staffScreensHereProvider = Provider<bool>((ref) {
  if (ref.watch(staffAppProvider)) return true;
  final gate = ref.watch(appGateProvider);
  if (gate is! GateReady) return true;
  return switch (ref.watch(appEnvironmentProvider).build.appType) {
    AppType.school => !(gate.config.school?.staffAppBundled ?? false),
    AppType.lms => !(gate.config.instructors?.staffAppBundled ?? false),
    _ => true,
  };
});
