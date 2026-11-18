import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';

/// 182 The preview's check mode (`check=1` in the preview link): the check
/// after each client build (build/scripts/check_app.mjs) opens the app in a
/// browser and reads what goes wrong from the console. The preview is a
/// release build, so Flutter's own overflow checks (debug only) don't run in
/// it: after each frame this walks the screen's flexes (rows and columns) and
/// reports one whose children need more room than it has, as the debug check
/// does with its stripes. Flutter's errors and uncaught ones are reported too.
/// Each report is one console line, `YALLAPP_CHECK {json}`. Off without
/// `check=1`: the owner's preview is unchanged.
abstract final class PreviewCheck {
  static const prefix = 'YALLAPP_CHECK ';

  /// Overflows already reported, so a screen that stays as it is reports once.
  static final _seen = <String>{};
  static bool _on = false;
  static Timer? _pending;

  /// Whether the preview link asks for the check mode.
  static bool requested(Uri uri) => uri.queryParameters['check'] == '1';

  /// Starts reporting: Flutter's errors, uncaught ones, and overflows after each frame.
  static void start() {
    if (_on) return;
    _on = true;
    final flutterError = FlutterError.onError;
    FlutterError.onError = (details) {
      report(
        'error',
        details.exceptionAsString(),
        detail: details.context?.toDescription(),
      );
      flutterError?.call(details);
    };
    final platformError = PlatformDispatcher.instance.onError;
    PlatformDispatcher.instance.onError = (error, stack) {
      report('error', '$error');
      return platformError?.call(error, stack) ?? false;
    };
    // A little after a frame, once for frames close together: an animation doesn't walk the tree each frame,
    // and the last frame of one is always looked at.
    SchedulerBinding.instance.addPersistentFrameCallback((_) {
      _pending ??= Timer(const Duration(milliseconds: 400), () {
        _pending = null;
        scan();
      });
    });
    report('ready', 'check mode');
  }

  /// One report on the console.
  static void report(String kind, String message, {String? detail}) {
    // ignore: avoid_print
    print(
      '$prefix${jsonEncode({'kind': kind, 'message': message.split('\n').first, 'detail': ?detail})}',
    );
  }

  /// Every flex on the screen whose children run past it.
  static void scan() {
    for (final view in RendererBinding.instance.renderViews) {
      _visit(view);
    }
  }

  static void _visit(RenderObject object) {
    if (object is RenderFlex && object.hasSize) {
      final over = overflowOf(object);
      if (over > 0.5) {
        final axis = object.direction == Axis.horizontal ? 'right' : 'bottom';
        // Flutter's own words (a release build's class names are minified).
        final message =
            'A RenderFlex overflowed by ${over.toStringAsFixed(1)} pixels on the $axis.';
        final key = '${identityHashCode(object)}:$message';
        if (_seen.add(key)) {
          report('overflow', message, detail: object.toStringShort());
        }
      }
    }
    object.visitChildren(_visit);
  }

  /// How far a flex's children run past its main axis (0 when they fit), the
  /// sum the debug check makes: each child's extent and the room between them.
  static double overflowOf(RenderFlex flex) {
    final horizontal = flex.direction == Axis.horizontal;
    final room = horizontal ? flex.size.width : flex.size.height;
    var used = 0.0;
    var count = 0;
    flex.visitChildren((child) {
      if (child is RenderBox && child.hasSize) {
        used += horizontal ? child.size.width : child.size.height;
        count += 1;
      }
    });
    if (count > 1) used += flex.spacing * (count - 1);
    return used - room;
  }
}
