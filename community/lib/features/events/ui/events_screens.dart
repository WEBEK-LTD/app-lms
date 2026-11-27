import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/sym.dart';
import '../../qa/ui/content_direction.dart';
import '../../showcase/ui/flat_kit.dart';
import '../data/events_api.dart';

/// Events or live sessions only (the Live filter).
final eventsLiveOnlyProvider = NotifierProvider<_LiveOnly, bool>(_LiveOnly.new);

class _LiveOnly extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool v) => state = v;
}

final eventsProvider = FutureProvider.autoDispose<List<CommunityEvent>>(
  (ref) => ref
      .watch(eventsApiProvider)
      .events(liveOnly: ref.watch(eventsLiveOnlyProvider)),
);

final eventProvider = FutureProvider.autoDispose.family<CommunityEvent, String>(
  (ref, id) => ref.watch(eventsApiProvider).event(id),
);

final eventCommentsProvider = FutureProvider.autoDispose
    .family<List<EventComment>, String>(
      (ref, id) => ref.watch(eventsApiProvider).comments(id),
    );

String eventKindLabel(BuildContext context, EventKind k) {
  final l = context.l10n;
  return switch (k) {
    EventKind.online => l.eventOnline,
    EventKind.inPerson => l.eventInPerson,
    EventKind.live => l.eventLive,
  };
}

List<Widget> _tags(BuildContext context, CommunityEvent e) {
  final l = context.l10n;
  return [
    if (e.cancelled)
      FlatTag(l.eventCancelled)
    else if (e.liveNow)
      FlatTag(l.eventLiveNow, icon: Symbols.sensors_rounded, accent: true)
    else
      FlatTag(eventKindLabel(context, e.kind)),
    FlatTag(localWhen(context, e.startsAt), icon: Symbols.schedule_rounded),
    if (e.location != null && e.kind == EventKind.inPerson)
      FlatTag(e.location!, icon: Symbols.location_on_rounded),
    FlatTag(l.eventFree),
    FlatTag(l.eventGoingCount(e.goingCount), icon: Symbols.group_rounded),
  ];
}

/// 234.3–234.4 Events and live sessions, at the viewer's own time.
class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final live = ref.watch(eventsLiveOnlyProvider);
    return FlatPage(
      title: l.eventsTitle,
      body: Column(
        children: [
          FlatChoices<bool>(
            values: const [false, true],
            label: (v) => v ? l.eventLive : l.eventAll,
            selected: live,
            onSelected: ref.read(eventsLiveOnlyProvider.notifier).set,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FlatAsyncList<CommunityEvent>(
              value: ref.watch(eventsProvider),
              onRetry: () => ref.refresh(eventsProvider.future),
              empty: l.eventsEmpty,
              item: (e) => FlatCard(
                semanticLabel: e.title,
                onTap: () => context.push(FeatureLinks.event(e.id)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FlatHeading(e.title, size: 15.5),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _tags(context, e),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// An event: when and where, RSVP, the calendar file; a live session's
/// watch link and its comments, and the replay after.
class EventScreen extends ConsumerWidget {
  const EventScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final value = ref.watch(eventProvider(id));
    final e = value.value;
    final signedIn = ref.watch(meProvider) != null;
    if (e == null) {
      return FlatPage(
        title: l.eventsTitle,
        body: Center(
          child: value.hasError
              ? TextButton(
                  onPressed: () => ref.invalidate(eventProvider(id)),
                  child: Text(l.commonRetry),
                )
              : const CircularProgressIndicator(),
        ),
      );
    }
    final watch = e.liveNow ? (e.embedUrl ?? e.joinUrl) : null;
    final join = !e.liveNow && e.going ? e.joinUrl : null;
    return FlatPage(
      title: e.title,
      body: ListView(
        padding: EdgeInsets.fromLTRB(
          16,
          4,
          16,
          120 + MediaQuery.paddingOf(context).bottom,
        ),
        children: [
          Wrap(spacing: 6, runSpacing: 6, children: _tags(context, e)),
          const SizedBox(height: 14),
          Text(
            e.description,
            textDirection: contentDirection(e.description),
            style: TextStyle(fontSize: 15, height: 1.6, color: p.ink),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (watch != null)
                FlatButton(
                  label: l.eventWatch,
                  icon: Symbols.play_circle_rounded,
                  onPressed: () => openLink(context, ref, watch),
                ),
              if (join != null)
                FlatButton(
                  label: l.eventJoin,
                  icon: Symbols.videocam_rounded,
                  onPressed: () => openLink(context, ref, join),
                ),
              if (e.replayUrl != null)
                FlatButton(
                  label: l.eventReplay,
                  icon: Symbols.replay_rounded,
                  outlined: true,
                  onPressed: () => openLink(context, ref, e.replayUrl!),
                ),
              if (signedIn && !e.cancelled)
                FlatButton(
                  label: e.going ? l.eventNotGoing : l.eventRsvp,
                  icon: e.going
                      ? Symbols.event_busy_rounded
                      : Symbols.event_available_rounded,
                  outlined: e.going || watch != null,
                  onPressed: () async {
                    try {
                      await ref
                          .read(eventsApiProvider)
                          .rsvp(e.id, going: !e.going);
                      ref
                        ..invalidate(eventProvider(id))
                        ..invalidate(eventsProvider);
                    } catch (err) {
                      if (context.mounted) showFailure(context, err);
                    }
                  },
                ),
              FlatButton(
                label: l.eventCalendar,
                icon: Symbols.calendar_add_on_rounded,
                outlined: true,
                onPressed: () => openLink(
                  context,
                  ref,
                  ref.read(eventsApiProvider).icsUrl(e.id),
                ),
              ),
            ],
          ),
          if (e.kind == EventKind.live) ...[
            const SizedBox(height: 22),
            FlatHeading(l.eventComments, size: 15),
            const SizedBox(height: 8),
            for (final c
                in ref.watch(eventCommentsProvider(id)).value ??
                    const <EventComment>[])
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: FlatCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.author.name,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: p.ink,
                        ),
                      ),
                      Text(
                        c.body,
                        textDirection: contentDirection(c.body),
                        style: TextStyle(color: p.ink),
                      ),
                    ],
                  ),
                ),
              ),
            if (signedIn) _LiveComposer(id: id),
          ],
        ],
      ),
    );
  }
}

class _LiveComposer extends ConsumerStatefulWidget {
  const _LiveComposer({required this.id});

  final String id;

  @override
  ConsumerState<_LiveComposer> createState() => _LiveComposerState();
}

class _LiveComposerState extends ConsumerState<_LiveComposer> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _text.text.trim();
    if (body.isEmpty) return;
    try {
      await ref.read(eventsApiProvider).comment(widget.id, body);
      _text.clear();
      ref.invalidate(eventCommentsProvider(widget.id));
    } catch (e) {
      if (mounted) showFailure(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _text,
            decoration: InputDecoration(hintText: l.eventCommentHint),
            onSubmitted: (_) => _send(),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          tooltip: l.challengeSend,
          onPressed: _send,
          icon: const Sym(
            Symbols.send_rounded,
            color: Brand.orange,
            fill: true,
          ),
        ),
      ],
    );
  }
}
