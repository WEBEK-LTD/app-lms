import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models.dart';
import '../providers.dart';

/// Where the member is: still restoring the saved session, signed out, or
/// signed in as [me].
sealed class AuthState {
  const AuthState();
}

class AuthRestoring extends AuthState {
  const AuthRestoring();
}

class SignedOut extends AuthState {
  const SignedOut();
}

class SignedInState extends AuthState {
  const SignedInState(this.me, {this.isNew = false});

  final Profile me;

  /// Signed up just now (the profile asks for the rest).
  final bool isNew;
}

/// The member's session: restored at launch from the token store, set by
/// any of the sign-in ways, ended by Log out (or a token the server refuses).
class SessionController extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(_restore);
    return const AuthRestoring();
  }

  Future<void> _restore() async {
    final saved = await ref.read(tokenStoreProvider).read();
    if (saved == null) {
      state = const SignedOut();
      return;
    }
    ref.read(accessTokenProvider.notifier).set(saved.accessToken);
    try {
      state = SignedInState(await ref.read(communityApiProvider).me());
    } on ApiException catch (e) {
      if (e.code == ApiException.invalidToken) {
        await _clear();
      } else {
        // Offline: stay signed out of the UI until the next launch.
        state = const SignedOut();
      }
    }
  }

  /// After any way of signing in.
  Future<void> signedIn(SignedIn result) async {
    await ref.read(tokenStoreProvider).write(result.session);
    ref.read(accessTokenProvider.notifier).set(result.session.accessToken);
    state = SignedInState(result.me, isNew: result.isNew);
  }

  /// The member's profile, fetched again (after an edit, a link).
  Future<void> refresh() async {
    if (state is! SignedInState) return;
    state = SignedInState(await ref.read(communityApiProvider).me());
  }

  void replace(Profile me) {
    if (state is SignedInState) state = SignedInState(me);
  }

  Future<void> signOut() async {
    try {
      await ref.read(communityApiProvider).signOut();
    } on ApiException {
      // Signed out on this phone all the same.
    }
    await _clear();
  }

  Future<void> _clear() async {
    await ref.read(tokenStoreProvider).clear();
    ref.read(accessTokenProvider.notifier).set(null);
    state = const SignedOut();
  }
}

final sessionProvider = NotifierProvider<SessionController, AuthState>(
  SessionController.new,
);

/// The signed-in member, or null.
final meProvider = Provider<Profile?>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedInState ? s.me : null;
});
