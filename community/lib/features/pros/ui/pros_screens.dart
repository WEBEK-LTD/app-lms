import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../qa/ui/content_direction.dart';
import '../../qa/ui/widgets/member_avatar.dart';
import '../../showcase/ui/flat_kit.dart';
import '../../showcase/ui/showcase_screens.dart';
import '../data/pros_api.dart';

final prosAvailableOnlyProvider = NotifierProvider<_Only, bool>(_Only.new);

class _Only extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool v) => state = v;
}

final prosProvider = FutureProvider.autoDispose<List<ProProfile>>(
  (ref) => ref
      .watch(prosApiProvider)
      .pros(availableOnly: ref.watch(prosAvailableOnlyProvider)),
);

final proProvider = FutureProvider.autoDispose.family<ProProfile, String>(
  (ref, member) => ref.watch(prosApiProvider).pro(member),
);

String availabilityLabel(BuildContext context, Availability a) {
  final l = context.l10n;
  return switch (a) {
    Availability.available => l.proAvailable,
    Availability.busy => l.proBusy,
    Availability.unavailable => l.proUnavailable,
  };
}

/// 234.1 Pros, best rated first.
class ProsScreen extends ConsumerWidget {
  const ProsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final only = ref.watch(prosAvailableOnlyProvider);
    return FlatPage(
      title: l.prosTitle,
      body: Column(
        children: [
          FlatChoices<bool>(
            values: const [false, true],
            label: (v) => v ? l.proAvailableOnly : l.showcaseAll,
            selected: only,
            onSelected: ref.read(prosAvailableOnlyProvider.notifier).set,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FlatAsyncList<ProProfile>(
              value: ref.watch(prosProvider),
              onRetry: () => ref.refresh(prosProvider.future),
              empty: l.prosEmpty,
              item: (pro) => _ProCard(pro: pro),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProCard extends StatelessWidget {
  const _ProCard({required this.pro});

  final ProProfile pro;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return FlatCard(
      semanticLabel: pro.member.name,
      onTap: () => context.push(FeatureLinks.pro(pro.member.id)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MemberAvatar(member: pro.member, size: 44),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FlatHeading(pro.member.name, size: 15.5),
                if (pro.headline.isNotEmpty)
                  Text(
                    pro.headline,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: p.muted),
                  ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    FlatTag(
                      availabilityLabel(context, pro.availability),
                      accent: pro.availability == Availability.available,
                    ),
                    if (pro.rating != null)
                      FlatTag(
                        '${pro.rating!.toStringAsFixed(1)} · ${l.proReviews(pro.reviewCount)}',
                        icon: Symbols.star_rounded,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A pro's profile: services with their rates as text, skills, portfolio,
/// and the hire request, which opens a message thread.
class ProScreen extends ConsumerWidget {
  const ProScreen({super.key, required this.member});

  final String member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final value = ref.watch(proProvider(member));
    final pro = value.value;
    final me = ref.watch(meProvider);
    final self = pro != null && me?.member.id == pro.member.id;
    return FlatPage(
      title: pro?.member.name ?? l.prosTitle,
      body: pro == null
          ? Center(
              child: value.hasError
                  ? TextButton(
                      onPressed: () => ref.invalidate(proProvider(member)),
                      child: Text(l.commonRetry),
                    )
                  : const CircularProgressIndicator(),
            )
          : ListView(
              padding: EdgeInsets.fromLTRB(
                16,
                4,
                16,
                120 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                Row(
                  children: [
                    MemberAvatar(member: pro.member, size: 56),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          FlatHeading(
                            pro.headline.isEmpty
                                ? pro.member.name
                                : pro.headline,
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              FlatTag(
                                availabilityLabel(context, pro.availability),
                                accent:
                                    pro.availability == Availability.available,
                              ),
                              FlatTag(
                                l.proDone(pro.doneCount),
                                icon: Symbols.task_alt_rounded,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (pro.about.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(
                    pro.about,
                    textDirection: contentDirection(pro.about),
                    style: TextStyle(fontSize: 15, height: 1.6, color: p.ink),
                  ),
                ],
                if (pro.services.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  FlatHeading(l.proServices, size: 15),
                  const SizedBox(height: 8),
                  for (final s in pro.services)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: FlatCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              s.title,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: p.ink,
                              ),
                            ),
                            if (s.description.isNotEmpty)
                              Text(
                                s.description,
                                style: TextStyle(fontSize: 13, color: p.muted),
                              ),
                            if (s.rate != null) ...[
                              const SizedBox(height: 6),
                              FlatTag(s.rate!),
                            ],
                          ],
                        ),
                      ),
                    ),
                ],
                if (pro.skills.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  FlatHeading(l.proSkills, size: 15),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [for (final s in pro.skills) FlatTag(s)],
                  ),
                ],
                if (pro.portfolio.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  FlatHeading(l.proPortfolio, size: 15),
                  const SizedBox(height: 8),
                  for (final item in pro.portfolio)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ShowcaseCard(item: item),
                    ),
                ],
                if (!self && me != null) ...[
                  const SizedBox(height: 18),
                  FlatButton(
                    label: l.proHire,
                    icon: Symbols.handshake_rounded,
                    onPressed: () => _hire(context, ref, pro),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l.proDirect,
                    style: TextStyle(fontSize: 12.5, color: p.muted),
                  ),
                ],
              ],
            ),
    );
  }
}

Future<void> _hire(BuildContext context, WidgetRef ref, ProProfile pro) async {
  final l = context.l10n;
  final message = await askText(
    context,
    title: l.proHire,
    hint: l.proHireHint,
    send: l.challengeSend,
    long: true,
  );
  if (message == null || message.length < 10) return;
  try {
    final conversation = await ref
        .read(prosApiProvider)
        .hire(pro.member.id, message: message);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(l.proHireSent)));
    context.push(FeatureLinks.conversation(conversation));
  } catch (e) {
    if (context.mounted) showFailure(context, e);
  }
}
