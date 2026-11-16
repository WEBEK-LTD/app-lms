import 'package:local_auth/local_auth.dart';

/// 59 Unlocking with fingerprint or face (or the phone's own lock) instead
/// of the password, after the first sign-in. 132 A real app lock: what the
/// phone can do (a face or a fingerprint set up, only its PIN, nothing), and
/// why an unlock didn't go through (cancelled, no match, locked out after
/// too many tries), so the lock screen can say what to do next.

/// What the phone has for the lock.
enum LockSupport {
  /// A face or a fingerprint set up, and the phone's PIN, pattern or
  /// password as the fallback.
  biometric,

  /// No face or fingerprint set up: the phone's PIN, pattern or password.
  deviceCredential,

  /// The phone has no screen lock at all: nothing to unlock with.
  noCredentials,

  /// The phone can't (no hardware, or the system says no).
  unavailable;

  bool get usable => this == biometric || this == deviceCredential;
}

/// Which biometric the phone uses, for the button's words.
enum BiometricKind { face, fingerprint, other }

/// How an unlock ended.
enum UnlockResult {
  success,

  /// The person closed the prompt (or the system did): nothing to say.
  cancelled,

  /// It didn't match.
  failed,

  /// Too many tries: wait, or use the phone's PIN.
  lockedOut,

  /// Face or fingerprint are blocked until the phone's PIN is used.
  lockedOutUntilPin,

  /// No face or fingerprint is set up on the phone.
  notEnrolled,

  /// The phone has no PIN, pattern or password.
  noCredentials,

  /// The phone can't show the prompt now.
  unavailable,
}

abstract class Biometrics {
  /// Whether the lock can be used at all (a face, a fingerprint or a PIN).
  Future<bool> available() async => (await support()).usable;

  Future<LockSupport> support();
  Future<BiometricKind> kind();

  /// Asks for a face or a fingerprint with the phone's PIN as the fallback;
  /// [pinOnly] goes straight to the phone's PIN, pattern or password where
  /// the system allows it (a fingerprint or face locked out, or none set up).
  Future<UnlockResult> unlock(String reason, {bool pinOnly = false});

  /// True when [unlock] succeeded.
  Future<bool> authenticate(String reason) async =>
      await unlock(reason) == UnlockResult.success;
}

class LocalBiometrics extends Biometrics {
  final _auth = LocalAuthentication();

  @override
  Future<LockSupport> support() async {
    try {
      final supported = await _auth.isDeviceSupported();
      if (!supported) {
        // A phone with the hardware but no screen lock says it isn't supported.
        final hardware = await _auth.canCheckBiometrics;
        return hardware ? LockSupport.noCredentials : LockSupport.unavailable;
      }
      final enrolled = await _auth.getAvailableBiometrics();
      return enrolled.isEmpty
          ? LockSupport.deviceCredential
          : LockSupport.biometric;
    } on Object {
      return LockSupport.unavailable;
    }
  }

  @override
  Future<BiometricKind> kind() async {
    try {
      final enrolled = await _auth.getAvailableBiometrics();
      if (enrolled.contains(BiometricType.face)) return BiometricKind.face;
      if (enrolled.contains(BiometricType.fingerprint)) {
        return BiometricKind.fingerprint;
      }
      return BiometricKind.other;
    } on Object {
      return BiometricKind.other;
    }
  }

  @override
  Future<UnlockResult> unlock(String reason, {bool pinOnly = false}) async {
    try {
      final ok = await _auth.authenticate(
        localizedReason: reason,
        // The phone's PIN, pattern or password is always the fallback.
        biometricOnly: false,
        persistAcrossBackgrounding: true,
      );
      return ok ? UnlockResult.success : UnlockResult.failed;
    } on LocalAuthException catch (e) {
      return resultOf(e.code);
    } on Object {
      return UnlockResult.unavailable;
    }
  }

  /// What a refusal of the system's prompt means for the lock screen.
  static UnlockResult resultOf(LocalAuthExceptionCode code) => switch (code) {
    LocalAuthExceptionCode.userCanceled ||
    LocalAuthExceptionCode.systemCanceled ||
    LocalAuthExceptionCode.timeout ||
    LocalAuthExceptionCode.userRequestedFallback ||
    LocalAuthExceptionCode.authInProgress => UnlockResult.cancelled,
    LocalAuthExceptionCode.temporaryLockout => UnlockResult.lockedOut,
    LocalAuthExceptionCode.biometricLockout => UnlockResult.lockedOutUntilPin,
    LocalAuthExceptionCode.noBiometricsEnrolled => UnlockResult.notEnrolled,
    LocalAuthExceptionCode.noCredentialsSet => UnlockResult.noCredentials,
    LocalAuthExceptionCode.noBiometricHardware ||
    LocalAuthExceptionCode.biometricHardwareTemporarilyUnavailable ||
    LocalAuthExceptionCode.uiUnavailable => UnlockResult.unavailable,
    _ => UnlockResult.failed,
  };
}

/// A phone without it (and the demo).
class NoBiometrics extends Biometrics {
  NoBiometrics();

  @override
  Future<LockSupport> support() async => LockSupport.unavailable;

  @override
  Future<BiometricKind> kind() async => BiometricKind.other;

  @override
  Future<UnlockResult> unlock(String reason, {bool pinOnly = false}) async =>
      UnlockResult.unavailable;
}
