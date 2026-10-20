import 'package:local_auth/local_auth.dart';

/// 59 Unlocking with fingerprint or face (or the phone's own lock) instead
/// of the password, after the first sign-in.
abstract class Biometrics {
  Future<bool> available();
  Future<bool> authenticate(String reason);
}

class LocalBiometrics implements Biometrics {
  final _auth = LocalAuthentication();

  @override
  Future<bool> available() async {
    try {
      return await _auth.isDeviceSupported();
    } on Object {
      return false;
    }
  }

  @override
  Future<bool> authenticate(String reason) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        persistAcrossBackgrounding: true,
      );
    } on Object {
      return false;
    }
  }
}

/// A phone without it (and the demo).
class NoBiometrics implements Biometrics {
  const NoBiometrics();

  @override
  Future<bool> available() async => false;

  @override
  Future<bool> authenticate(String reason) async => false;
}
