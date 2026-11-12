import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../l10n/l10n.dart';
import '../widgets/common.dart';

/// 124.9 What a page in the app asked the phone for.
typedef MediaAsk = ({bool camera, bool microphone});

/// 124.9 Asks the person for the camera and microphone a page wants; true
/// once the app may use all of them.
typedef MediaRequestHandler = Future<bool> Function({
  required bool camera,
  required bool microphone,
});

/// 124.9 What a page's request for [types] may get, while [pageOpen]: the
/// camera, the microphone or both, asked of the person first. Anything else
/// (MIDI devices, protected media IDs, a request with nothing in it, or a
/// page that is no longer open) is refused: null.
MediaAsk? mediaToAsk(
  Set<WebViewPermissionResourceType> types, {
  required bool pageOpen,
}) {
  if (!pageOpen || types.isEmpty) return null;
  const allowed = {
    WebViewPermissionResourceType.camera,
    WebViewPermissionResourceType.microphone,
  };
  if (!types.every(allowed.contains)) return null;
  return (
    camera: types.contains(WebViewPermissionResourceType.camera),
    microphone: types.contains(WebViewPermissionResourceType.microphone),
  );
}

/// 124.9 The phone's own question for the camera and microphone (Android's
/// and iOS's permission prompts, `yallapp/media_permission` in MainActivity
/// and AppDelegate).
abstract interface class MediaPermissions {
  Future<bool> request({required bool camera, required bool microphone});
}

class ChannelMediaPermissions implements MediaPermissions {
  const ChannelMediaPermissions();

  static const _channel = MethodChannel('yallapp/media_permission');

  @override
  Future<bool> request({required bool camera, required bool microphone}) async {
    try {
      return await _channel.invokeMethod<bool>('request', {
            'camera': camera,
            'microphone': microphone,
          }) ??
          false;
    } catch (_) {
      return false;
    }
  }
}

final mediaPermissionsProvider = Provider<MediaPermissions>(
  (ref) => const ChannelMediaPermissions(),
);

/// 124.9 How a web page or tab of the app answers its page's request for
/// the camera or microphone: the phone asks the person, and a short message
/// says so when they refuse.
MediaRequestHandler pageMediaRequests(BuildContext context, WidgetRef ref) =>
    ({required bool camera, required bool microphone}) async {
      final granted = await ref
          .read(mediaPermissionsProvider)
          .request(camera: camera, microphone: microphone);
      if (!granted && context.mounted) {
        showMessage(context, context.l10n.webPageMediaRefused);
      }
      return granted;
    };
