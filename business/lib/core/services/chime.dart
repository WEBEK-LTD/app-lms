import 'ringtones.dart';

/// 59 The sound Kitchen mode plays when a new order arrives: 206 the
/// ringtone chosen for new orders (Settings › Ringtones), unless the app is
/// already ringing for it.
abstract class Chime {
  Future<void> play();
}

class AssetChime implements Chime {
  AssetChime(this._ringer, this._settings);

  final Ringer _ringer;
  final RingSettings Function() _settings;

  @override
  Future<void> play() async {
    if (_ringer.ringing.value) return;
    final settings = _settings();
    await _ringer.play(
      settings.soundOf(SoundGroup.orders),
      volume: settings.volume,
    );
  }
}
