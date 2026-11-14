import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

/// 130 The Signature looks put together: under a transparent header, 129's
/// video hero and parallax banner are covers too (as Studio's canvas has
/// them, components/studio/view.tsx `startsWithCover`), so a look's home
/// that starts with one reaches under the status bar.
void main() {
  StudioNode page(List<StudioNode> children) =>
      StudioNode(id: 'root', type: StudioNodeType.column, children: children);
  const text = StudioNode(id: 'text', type: StudioNodeType.text);

  test('a video hero and a parallax banner are covers, as a photo hero is', () {
    for (final type in [
      StudioNodeType.photoHero,
      StudioNodeType.mapHeader,
      StudioNodeType.videoHero,
      StudioNodeType.parallaxBanner,
    ]) {
      expect(
        studioStartsWithCover(page([StudioNode(id: 'c', type: type), text])),
        isTrue,
        reason: '$type',
      );
    }
    expect(studioStartsWithCover(page([text])), isFalse);
    expect(
      studioStartsWithCover(
        page([text, const StudioNode(id: 'v', type: StudioNodeType.videoHero)]),
      ),
      isFalse,
    );
  });
}
