import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/sym.dart';
import '../../pros/data/pros_api.dart';
import '../../pros/ui/pros_screens.dart';
import '../data/showcase_api.dart';
import 'flat_kit.dart';
import 'showcase_screens.dart';

/// 232–234 (area E) A profile's Showcase and Pro sections (area D's
/// `profileSections`); nothing when the member has none.
final memberShowcaseProvider = FutureProvider.autoDispose
    .family<List<ShowcaseSummary>, String>(
      (ref, member) => ref.watch(showcaseApiProvider).gallery(member: member),
    );

final memberProProvider = FutureProvider.autoDispose
    .family<ProProfile?, String>((ref, member) async {
      try {
        return await ref.watch(prosApiProvider).pro(member);
      } catch (_) {
        // Not a pro (404), or not now: no section.
        return null;
      }
    });

class MemberShowcaseSection extends ConsumerWidget {
  const MemberShowcaseSection({super.key, required this.memberId});

  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(memberShowcaseProvider(memberId)).value;
    if (items == null || items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FlatHeading(context.l10n.showcaseTitle, size: 16),
          const SizedBox(height: 10),
          for (final item in items.take(3))
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ShowcaseCard(item: item),
            ),
        ],
      ),
    );
  }
}

class MemberProSection extends ConsumerWidget {
  const MemberProSection({super.key, required this.memberId});

  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pro = ref.watch(memberProProvider(memberId)).value;
    if (pro == null) return const SizedBox.shrink();
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: FlatCard(
        semanticLabel: context.l10n.prosTitle,
        onTap: () => context.push(FeatureLinks.pro(pro.member.id)),
        child: Row(
          children: [
            const Sym(Symbols.work_rounded, color: Brand.orange),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FlatHeading(context.l10n.prosTitle, size: 15),
                  if (pro.headline.isNotEmpty)
                    Text(
                      pro.headline,
                      style: TextStyle(fontSize: 13, color: p.muted),
                    ),
                ],
              ),
            ),
            FlatTag(
              availabilityLabel(context, pro.availability),
              accent: pro.availability == Availability.available,
            ),
          ],
        ),
      ),
    );
  }
}
