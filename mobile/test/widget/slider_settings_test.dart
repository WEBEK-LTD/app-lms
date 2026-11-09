import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart';

import '../support/test_app.dart';
import 'phase110_look_test.dart' show pumpBlocks;

/// 1.6 A slider's own settings: how long each slide shows, its shape and how
/// it shows where it is.
void main() {
  Map<String, dynamic> slider(Map<String, dynamic> extra) => {
    'id': 's1',
    'type': 'slider',
    'auto_advance': false,
    'slides': [
      {'heading': 'One'},
      {'heading': 'Two'},
      {'heading': 'Three'},
    ],
    ...extra,
  };

  test('reads the time, the shape and the indicator, within bounds', () {
    final b =
        PageBlock.tryParse(
              slider({
                'interval_ms': 3000,
                'aspect_ratio': 1.33,
                'indicator': 'count',
              }),
            )!
            as SliderBlock;
    expect(b.intervalMs, 3000);
    expect(b.aspectRatio, 1.33);
    expect(b.indicator, StudioIndicator.count);
    // Missing or odd: 5 seconds, the template's shape, dots.
    final plain = PageBlock.tryParse(slider({}))! as SliderBlock;
    expect(plain.intervalMs, 5000);
    expect(plain.aspectRatio, isNull);
    expect(plain.indicator, StudioIndicator.dots);
    final odd =
        PageBlock.tryParse(
              slider({
                'interval_ms': 60000,
                'aspect_ratio': 99,
                'indicator': 'stars',
              }),
            )!
            as SliderBlock;
    expect(odd.intervalMs, 10000);
    expect(odd.aspectRatio, isNull);
    expect(odd.indicator, StudioIndicator.dots);
  });

  testWidgets('a square slider with "1 / 3" in its corner', (tester) async {
    await pumpBlocks(tester, [
      slider({'aspect_ratio': 1, 'indicator': 'count'}),
    ]);
    final box = tester.getSize(
      find.descendant(
        of: find.byType(SliderView),
        matching: find.byType(AspectRatio),
      ),
    );
    expect(box.width, closeTo(box.height, 0.5));
    expect(find.byKey(const ValueKey('slider-count-s1')), findsOneWidget);
    expect(find.text('1 / 3'), findsOneWidget);
    expect(find.byKey(const ValueKey('slider-lines-s1')), findsNothing);
  });

  testWidgets('lines over a 4:3 slider, and no dots under it', (tester) async {
    await pumpBlocks(tester, [
      slider({'aspect_ratio': 1.33, 'indicator': 'progress'}),
    ]);
    final box = tester.getSize(
      find.descendant(
        of: find.byType(SliderView),
        matching: find.byType(AspectRatio),
      ),
    );
    expect(box.width / box.height, closeTo(1.33, 0.01));
    expect(find.byKey(const ValueKey('slider-lines-s1')), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(SliderView),
        matching: find.byType(AnimatedContainer),
      ),
      findsNothing,
    );
  });

  testWidgets('it moves on after the time chosen', (tester) async {
    await pumpBlocks(tester, [
      slider({'auto_advance': true, 'interval_ms': 2000, 'indicator': 'count'}),
    ]);
    expect(find.text('1 / 3'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 2100));
    await TestApp.settle(tester, 5);
    expect(find.text('2 / 3'), findsOneWidget);
  });
}
