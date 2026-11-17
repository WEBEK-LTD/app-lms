import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Tells [onLayout] the constraints its [child] is laid out with: the box a
/// picture fills, for the size to decode it at. Unlike a LayoutBuilder it
/// answers intrinsic sizes (IntrinsicHeight around a card with a picture).
///
/// [onLayout] runs during layout: it must not rebuild anything then.
class DecodeProbe extends SingleChildRenderObjectWidget {
  const DecodeProbe({super.key, required this.onLayout, super.child});

  final ValueChanged<BoxConstraints> onLayout;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      RenderDecodeProbe(onLayout);

  @override
  void updateRenderObject(
    BuildContext context,
    RenderDecodeProbe renderObject,
  ) => renderObject.onLayout = onLayout;
}

class RenderDecodeProbe extends RenderProxyBox {
  RenderDecodeProbe(this.onLayout);

  ValueChanged<BoxConstraints> onLayout;

  @override
  void performLayout() {
    super.performLayout();
    onLayout(constraints);
  }
}
