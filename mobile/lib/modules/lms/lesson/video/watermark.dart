import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../../../../core/api/models/models.dart';

/// The watermark text for the site's `content.watermark` setting, or null.
String? watermarkText(WatermarkMode mode, User? user) {
  if (user == null) return null;
  final name = user.name.trim();
  final phone = user.phone.trim();
  return switch (mode) {
    WatermarkMode.off => null,
    WatermarkMode.phone => phone.isEmpty ? null : phone,
    WatermarkMode.name => name.isEmpty ? null : name,
    WatermarkMode.nameAndPhone => [
      name,
      phone,
    ].where((s) => s.isNotEmpty).join(' · '),
  };
}

/// A faint label over the video that moves to a new spot every few seconds,
/// so recordings can be traced to the student.
class MovingWatermark extends StatefulWidget {
  const MovingWatermark({
    super.key,
    required this.text,
    this.interval = const Duration(seconds: 8),
    this.random,
  });

  final String text;
  final Duration interval;
  final Random? random;

  @override
  State<MovingWatermark> createState() => _MovingWatermarkState();
}

class _MovingWatermarkState extends State<MovingWatermark> {
  late final Random _random = widget.random ?? Random();
  Alignment _alignment = const Alignment(0.6, -0.7);
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(widget.interval, (_) => _move());
  }

  void _move() {
    if (!mounted) return;
    setState(() {
      _alignment = Alignment(
        _random.nextDouble() * 1.6 - 0.8,
        _random.nextDouble() * 1.6 - 0.8,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: ExcludeSemantics(
      child: AnimatedAlign(
        alignment: _alignment,
        duration: const Duration(milliseconds: 900),
        curve: Curves.easeInOut,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Text(
            widget.text,
            style: TextStyle(
              fontSize: 12,
              letterSpacing: 1,
              color: Colors.white.withValues(alpha: 0.45),
              shadows: const [Shadow(color: Color(0x66000000), blurRadius: 2)],
            ),
          ),
        ),
      ),
    ),
  );
}
