import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

/// 59 The sound Kitchen mode plays when a new order arrives.
abstract class Chime {
  Future<void> play();
}

class AssetChime implements Chime {
  AudioPlayer? _player;

  @override
  Future<void> play() async {
    try {
      final player = _player ??= AudioPlayer();
      await player.play(AssetSource('sounds/new_order.wav'));
    } on Object {
      // No sound (silent mode, no audio device): the haptic still goes.
    }
    await HapticFeedback.heavyImpact();
  }
}
