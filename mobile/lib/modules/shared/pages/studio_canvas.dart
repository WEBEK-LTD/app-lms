import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'page_actions.dart';
import 'page_blocks.dart';

/// 103 A page designed in Yallapp Studio, drawn from its canvas: every layer
/// where the owner placed it, scaled to the screen's width (positions, sizes,
/// corners, borders and texts alike), scrolling when the canvas is taller
/// than the screen. A page opened on top of the tabs keeps a back button.
class StudioCanvasView extends StatelessWidget {
  const StudioCanvasView({
    super.key,
    required this.canvas,
    required this.pageSlug,
    this.pushed = false,
  });

  final StudioCanvas canvas;
  final String pageSlug;
  final bool pushed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final top = MediaQuery.paddingOf(context).top;
    final background = parseHexColor(canvas.background) ?? p.background;
    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = constraints.maxWidth / canvas.width;
        return ColoredBox(
          key: ValueKey('studio-$pageSlug'),
          color: background,
          child: Stack(
            children: [
              ListView(
                padding: EdgeInsets.only(top: top),
                children: [
                  SizedBox(
                    height: canvas.height * scale,
                    child: Stack(
                      clipBehavior: Clip.hardEdge,
                      children: [
                        for (final layer in canvas.layers)
                          PositionedDirectional(
                            key: ValueKey('studio-layer-${layer.id}'),
                            start: layer.x * scale,
                            top: layer.y * scale,
                            width: layer.w * scale,
                            height: layer.h * scale,
                            child: StudioLayerView(
                              layer: layer,
                              scale: scale,
                              pageSlug: pageSlug,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              if (pushed)
                PositionedDirectional(
                  top: top + 8,
                  start: 16,
                  child: const AppBackButton(),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// One layer at its size: its shape, then what it holds, tappable when it
/// has a tap action this app can follow.
class StudioLayerView extends ConsumerWidget {
  const StudioLayerView({
    super.key,
    required this.layer,
    required this.scale,
    required this.pageSlug,
  });

  final StudioLayer layer;
  final double scale;
  final String pageSlug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final radius = BorderRadius.circular(layer.radius * scale);
    final border = parseHexColor(layer.borderColor);
    final decoration = BoxDecoration(
      color: parseHexColor(layer.fill),
      borderRadius: radius,
      border: border != null && layer.borderWidth > 0
          ? Border.all(color: border, width: layer.borderWidth * scale)
          : null,
      boxShadow: layer.shadow
          ? [
              BoxShadow(
                color: const Color(0x2E000000),
                blurRadius: 12 * scale,
                offset: Offset(0, 4 * scale),
              ),
            ]
          : null,
    );
    final color = parseHexColor(layer.color) ?? p.text;
    Text text() => Text(
      layer.text ?? '',
      textAlign: switch (layer.align) {
        StudioAlign.start => TextAlign.start,
        StudioAlign.center => TextAlign.center,
        StudioAlign.end => TextAlign.end,
      },
      overflow: TextOverflow.fade,
      style: TextStyle(
        fontSize: layer.fontSize * scale,
        fontWeight: _weight(layer.fontWeight),
        color: color,
        height: 1.25,
      ),
    );
    final Widget content = switch (layer.type) {
      StudioLayerType.box => const SizedBox.expand(),
      StudioLayerType.text => Align(
        alignment: AlignmentDirectional.topStart,
        child: SizedBox(width: double.infinity, child: text()),
      ),
      StudioLayerType.button => Center(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 8 * scale),
          child: text(),
        ),
      ),
      StudioLayerType.image => ClipRRect(
        borderRadius: radius,
        child: AppNetworkImage(
          url: layer.imageUrl,
          seed: layer.id.hashCode,
          fit: layer.contain ? BoxFit.contain : BoxFit.cover,
          width: double.infinity,
          height: double.infinity,
          clearPlaceholder: layer.contain,
        ),
      ),
      StudioLayerType.icon => Center(
        child: AppIcon(
          symbolByName(layer.icon),
          size: math.min(layer.w, layer.h) * scale,
          color: color,
        ),
      ),
      StudioLayerType.items => ClipRRect(
        borderRadius: radius,
        child: SingleChildScrollView(
          child: PageBlockView(block: layer.items!, pageSlug: pageSlug),
        ),
      ),
    };
    final action = layer.action;
    final tappable = action != null && canOpenAction(ref, action);
    Widget box = DecoratedBox(decoration: decoration, child: content);
    if (tappable) {
      box = Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: radius,
          onTap: () => runPageAction(context, ref, action),
          child: box,
        ),
      );
      box = Semantics(
        button: true,
        label: layer.type == StudioLayerType.button ? null : layer.text,
        child: box,
      );
    }
    if (layer.opacity < 1) box = Opacity(opacity: layer.opacity, child: box);
    return box;
  }
}

FontWeight _weight(int weight) => switch (weight) {
  >= 800 => FontWeight.w800,
  >= 700 => FontWeight.w700,
  >= 600 => FontWeight.w600,
  >= 500 => FontWeight.w500,
  _ => FontWeight.w400,
};
