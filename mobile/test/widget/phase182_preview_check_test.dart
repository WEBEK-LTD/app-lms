import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/preview/preview_check.dart';

/// 182 The preview's check mode: the overflow it reports in a release build
/// is the one Flutter's debug check finds (a row whose children need more
/// room than it has), and a row that fits reports none.
void main() {
  Future<RenderFlex> pumpRow(
    WidgetTester tester,
    List<Widget> children, {
    double spacing = 0,
  }) async {
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Center(
          child: SizedBox(
            width: 100,
            height: 20,
            child: Row(
              key: const Key('row'),
              spacing: spacing,
              children: children,
            ),
          ),
        ),
      ),
    );
    return tester.renderObject<RenderFlex>(find.byKey(const Key('row')));
  }

  testWidgets(
    'a row whose children are wider than it overflows by the difference',
    (tester) async {
      final flex = await pumpRow(tester, const [
        SizedBox(width: 80),
        SizedBox(width: 50),
      ]);
      // Flutter's own debug check sees the same overflow.
      expect(tester.takeException(), isA<FlutterError>());
      expect(PreviewCheck.overflowOf(flex), closeTo(30, 0.01));
    },
  );

  testWidgets('the room between children counts', (tester) async {
    final flex = await pumpRow(tester, const [
      SizedBox(width: 45),
      SizedBox(width: 45),
    ], spacing: 20);
    expect(tester.takeException(), isA<FlutterError>());
    expect(PreviewCheck.overflowOf(flex), closeTo(10, 0.01));
  });

  testWidgets('a row that fits, or whose text gives way, has no overflow', (
    tester,
  ) async {
    var flex = await pumpRow(tester, const [
      SizedBox(width: 40),
      SizedBox(width: 50),
    ]);
    expect(PreviewCheck.overflowOf(flex), lessThanOrEqualTo(0));
    flex = await pumpRow(tester, const [
      SizedBox(width: 60),
      Expanded(
        child: Text(
          'A long text that gives way',
          overflow: TextOverflow.ellipsis,
        ),
      ),
    ]);
    expect(tester.takeException(), isNull);
    expect(PreviewCheck.overflowOf(flex), lessThanOrEqualTo(0.5));
  });

  test('only a link with check=1 asks for it', () {
    expect(
      PreviewCheck.requested(
        Uri.parse('https://yallapp.test/preview-app/?token=x&check=1'),
      ),
      isTrue,
    );
    expect(
      PreviewCheck.requested(
        Uri.parse('https://yallapp.test/preview-app/?token=x'),
      ),
      isFalse,
    );
  });
}
