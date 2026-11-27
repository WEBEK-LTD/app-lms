import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/json.dart';
import '../l10n.dart';
import '../providers.dart';
import '../theme/tokens.dart';

/// Which kinds of notification also come as a push (232.6), next to
/// phase 1's email choices on `/notifications/settings`: `{email, push}`.
abstract class PushSettingsApi {
  Future<Map<String, bool>> get();
  Future<Map<String, bool>> set(Map<String, bool> push);
}

/// Phase 2's kinds, shown when the server sends no `push` choices yet.
const pushKinds = [
  'message',
  'post_comment',
  'comment_reply',
  'post_like',
  'follow',
  'friend_request',
  'group_request',
  'answer',
  'answer_accepted',
  'badge_granted',
];

class HttpPushSettingsApi implements PushSettingsApi {
  HttpPushSettingsApi(this.client);

  final ApiClient client;
  Map<String, bool> _push(Json j) {
    // The server lists every kind; phase 2's own when it sends none.
    final push = optObject(j, 'push');
    return push == null
        ? {for (final k in pushKinds) k: true}
        : {for (final e in push.entries) e.key: e.value == true};
  }

  @override
  Future<Map<String, bool>> get() async =>
      _push(await client.get('/notifications/settings'));

  @override
  Future<Map<String, bool>> set(Map<String, bool> push) async => _push(
    await client.put(
      '/notifications/settings',
      // Only push: the email choices stay as they are.
      body: {'push': push},
    ),
  );
}

class FakePushSettingsApi implements PushSettingsApi {
  final saved = <Map<String, bool>>[];
  var _now = {for (final k in pushKinds) k: true};

  @override
  Future<Map<String, bool>> get() async => Map.of(_now);

  @override
  Future<Map<String, bool>> set(Map<String, bool> push) async {
    saved.add(Map.of(push));
    return _now = Map.of(push);
  }
}

final pushSettingsApiProvider = Provider<PushSettingsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakePushSettingsApi()
      : HttpPushSettingsApi(ref.watch(apiClientProvider)),
);

/// Settings → Push notifications: one switch per kind.
class PushSettingsPage extends ConsumerStatefulWidget {
  const PushSettingsPage({super.key});

  @override
  ConsumerState<PushSettingsPage> createState() => _PushSettingsPageState();
}

class _PushSettingsPageState extends ConsumerState<PushSettingsPage> {
  Map<String, bool>? _push;
  var _failed = false;

  @override
  void initState() {
    super.initState();
    ref
        .read(pushSettingsApiProvider)
        .get()
        .then((p) {
          if (mounted) setState(() => _push = p);
        })
        .catchError((Object _) {
          if (mounted) setState(() => _failed = true);
        });
  }

  Future<void> _set(String kind, bool on) async {
    final was = _push!;
    final next = {...was, kind: on};
    setState(() => _push = next);
    try {
      final saved = await ref.read(pushSettingsApiProvider).set(next);
      if (mounted) setState(() => _push = saved);
    } on Object {
      if (mounted) setState(() => _push = was);
    }
  }

  String _label(AppLocalizations l, String kind) => switch (kind) {
    'message' => l.pushKindMessage,
    'post_comment' => l.pushKindComment,
    'comment_reply' => l.pushKindReply,
    'post_like' || 'post_liked' => l.pushKindLike,
    'follow' => l.notifKindFollow,
    'friend_request' => l.notifKindFriend,
    'group_request' => l.pushKindGroup,
    'answer' => l.notifKindAnswer,
    'answer_accepted' => l.notifKindAccepted,
    'badge_granted' => l.notifKindBadge,
    _ => l.notifKindOther,
  };

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final push = _push;
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.pushTitle),
      ),
      body: _failed
          ? Center(child: Text(l.commonError))
          : push == null
          ? const Center(child: CircularProgressIndicator(color: Brand.orange))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(l.pushBody, style: TextStyle(color: p.muted, height: 1.5)),
                const SizedBox(height: 12),
                Material(
                  color: p.card,
                  clipBehavior: Clip.antiAlias,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: p.line),
                  ),
                  child: Column(
                    children: [
                      for (final k in push.keys)
                        SwitchListTile(
                          key: ValueKey('push-$k'),
                          title: Text(
                            _label(l, k),
                            style: TextStyle(color: p.ink),
                          ),
                          value: push[k]!,
                          activeThumbColor: Colors.white,
                          activeTrackColor: Brand.orange,
                          onChanged: (v) => _set(k, v),
                        ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
