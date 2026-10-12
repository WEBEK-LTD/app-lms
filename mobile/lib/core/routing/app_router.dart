import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../modules/lms/lms_routes.dart';
import '../auth/auth_controller.dart';
import '../storage/local_settings.dart';
import 'paths.dart';

/// Decides where a location should go given the sign-in state.
///
/// - Signed-out students who haven't chosen to browse as a guest start at
///   sign-in.
/// - Pages that need an account send signed-out students to sign-in and
///   bring them back afterwards (`from`).
/// - Signed-in students never see the sign-in screens.
String? redirectFor({
  required String location,
  required AuthState auth,
  required bool guestMode,
}) {
  if (auth is AuthChecking) return null;
  final signingIn = Paths.isSignIn(location);
  if (auth.isSignedIn) {
    if (!signingIn) return null;
    final from = Uri.parse(location).queryParameters['from'];
    return (from != null && from.startsWith('/')) ? from : Paths.home;
  }
  if (signingIn) return null;
  if (Paths.requiresAuth(location)) {
    return Uri(
      path: Paths.signIn,
      queryParameters: {'from': location},
    ).toString();
  }
  if (!guestMode && (location == '/' || location.startsWith(Paths.home))) {
    return Paths.signIn;
  }
  if (location == '/') return Paths.home;
  return null;
}

class _RouterRefresh extends ChangeNotifier {
  void ping() => notifyListeners();
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefresh();
  ref
    ..listen(authControllerProvider, (_, _) => refresh.ping())
    ..listen(
      localSettingsProvider.select((s) => s.guestMode),
      (_, _) => refresh.ping(),
    );
  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: Paths.home,
    refreshListenable: refresh,
    debugLogDiagnostics: false,
    redirect: (context, state) => redirectFor(
      location: state.uri.toString(),
      auth: ref.read(authControllerProvider),
      guestMode: ref.read(localSettingsProvider).guestMode,
    ),
    routes: lmsRoutes(),
    errorBuilder: (context, state) => const LmsNotFoundScreen(),
  );
  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});
