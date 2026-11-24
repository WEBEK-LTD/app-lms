import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/session.dart';
import '../widgets/coming_soon.dart';
import 'feature_routes.dart';
import 'paths.dart';

/// Refreshes the router when the session changes.
class _SessionListenable extends ChangeNotifier {
  _SessionListenable(Ref ref) {
    ref.listen(sessionProvider, (_, _) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _SessionListenable(ref);
  ref.onDispose(refresh.dispose);
  return GoRouter(
    initialLocation: Paths.home,
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(sessionProvider);
      final here = state.matchedLocation;
      if (session is AuthRestoring) return null;
      final public = Paths.public.contains(here);
      if (session is SignedOut && !public) return Paths.welcome;
      if (session is SignedInState && public) return Paths.home;
      return null;
    },
    routes: [
      GoRoute(
        path: Paths.welcome,
        builder: (context, state) => const ComingSoonPage(title: 'Welcome'),
      ),
      GoRoute(
        path: Paths.home,
        builder: (context, state) => const ComingSoonPage(title: 'Home'),
      ),
      ...featureTabRoutes(),
      ...featureRoutes(),
    ],
  );
});
