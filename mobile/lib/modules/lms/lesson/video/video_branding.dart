import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/gate/app_gate.dart';

/// 72 Whether videos from YouTube, Vimeo and the other video sites hide the
/// site's own player (roadmap 40: the app's controls, the site's branding
/// out of sight). Off by default: each site's normal player, with its
/// controls and branding. The owner turns it on in the Yallapp dashboard at
/// their own risk (`Config.app.hide_video_branding`); nothing is hidden
/// before the config is loaded.
final hideVideoBrandingProvider = Provider<bool>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady && gate.config.app.hideVideoBranding;
});
