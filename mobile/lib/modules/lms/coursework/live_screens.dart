import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../shared/account/account_scaffold.dart';
import 'coursework_providers.dart';

/// 112.5 Live classes of courses managed in Yallapp: one class (when it
/// starts, the academy's notes, joining from 15 minutes before it starts in
/// the meeting app, the recording once it's over) and the student's live
/// classes, coming and past.

String liveWhen(BuildContext context, LiveSession live) =>
    '${dayAndTime(live.startsAt)} · ${formatMinutes(live.durationMinutes)}';

class LiveSessionScreen extends ConsumerWidget {
  const LiveSessionScreen({super.key, required this.liveId});

  final int liveId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(liveSessionProvider(liveId));
    final live = state.value;
    final open = ref.read(openExternalProvider);
    return AccountScaffold(
      title: live?.title ?? context.l10n.liveClass,
      footer: live == null
          ? null
          : live.joinUrl != null
          ? PrimaryButton(
              key: const ValueKey('live-join'),
              label: context.l10n.liveJoin,
              icon: AppIcons.live,
              height: 54,
              onPressed: () => open(live.joinUrl!),
            )
          : live.recordingUrl != null
          ? PrimaryButton(
              key: const ValueKey('live-recording'),
              label: context.l10n.liveRecording,
              icon: AppIcons.playCircle,
              height: 54,
              onPressed: () => open(live.recordingUrl!),
            )
          : null,
      child: switch (state) {
        AsyncData(:final value) => _LiveBody(live: value),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(liveSessionProvider(liveId)),
        ),
        _ => const SkeletonList(
          layout: SkeletonLayout.text,
          count: 2,
          padding: EdgeInsets.zero,
        ),
      },
    );
  }
}

class _LiveBody extends StatelessWidget {
  const _LiveBody({required this.live});

  final LiveSession live;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final status = switch (live.status) {
      LiveStatus.live => l10n.liveNow,
      LiveStatus.ended => l10n.liveEnded,
      LiveStatus.upcoming =>
        live.joinUrl == null ? l10n.liveJoinSoon : l10n.liveStartsSoon,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            children: [
              SettingsTile(
                icon: AppIcons.calendar,
                title: liveWhen(context, live),
                chevron: false,
              ),
              Divider(height: 1, color: p.divider),
              SettingsTile(icon: AppIcons.live, title: status, chevron: false),
              if (live.courseTitle.isNotEmpty) ...[
                Divider(height: 1, color: p.divider),
                SettingsTile(
                  icon: AppIcons.myCourses,
                  title: live.courseTitle,
                  onTap: () => context.push(Paths.course(live.courseId)),
                ),
              ],
            ],
          ),
        ),
        if (live.notes.trim().isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(live.notes, style: TextStyle(fontSize: 15, color: p.textBody)),
        ],
      ],
    );
  }
}

/// The student's live classes: coming up (soonest first) and past.
class LiveClassesScreen extends ConsumerStatefulWidget {
  const LiveClassesScreen({super.key});

  @override
  ConsumerState<LiveClassesScreen> createState() => _LiveClassesScreenState();
}

class _LiveClassesScreenState extends ConsumerState<LiveClassesScreen> {
  bool _past = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(myLiveSessionsProvider(_past));
    return AccountScaffold(
      title: l10n.liveClasses,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SegmentedTabs(
            labels: [l10n.liveUpcoming, l10n.livePast],
            selected: _past ? 1 : 0,
            onChanged: (i) => setState(() => _past = i == 1),
          ),
          const SizedBox(height: 12),
          switch (state) {
            AsyncData(:final value) when value.isEmpty => MessageView(
              icon: AppIcons.live,
              title: _past ? l10n.liveNonePast : l10n.liveNone,
              compact: true,
            ),
            AsyncData(:final value) => AppCard(
              child: Column(
                children: [
                  for (final (i, live) in value.indexed) ...[
                    if (i > 0)
                      Divider(height: 1, color: context.palette.divider),
                    SettingsTile(
                      key: ValueKey('live-${live.id}'),
                      icon: AppIcons.live,
                      title: live.title,
                      subtitle:
                          '${live.courseTitle} · ${liveWhen(context, live)}',
                      value: live.status == LiveStatus.live
                          ? l10n.liveNow
                          : null,
                      onTap: () => context.push(Paths.liveSession(live.id)),
                    ),
                  ],
                ],
              ),
            ),
            AsyncError(:final error) => ErrorView(
              error: error,
              onRetry: () => ref.invalidate(myLiveSessionsProvider(_past)),
            ),
            _ => const SkeletonList(
              layout: SkeletonLayout.text,
              count: 3,
              padding: EdgeInsets.zero,
            ),
          },
        ],
      ),
    );
  }
}
