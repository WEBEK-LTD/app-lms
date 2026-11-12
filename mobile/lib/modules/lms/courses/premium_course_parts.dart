import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../teachers/follow_button.dart';

/// 123 The parts of the premium academy's course page (`Config.screens.
/// course_page` `look: premium`): the teacher on a card with following
/// them, the tabs as chips in ink, and the price with its saving.

/// The course's teacher on a card: their photo, name and bio, and the
/// button to follow them.
class TeacherCard extends StatelessWidget {
  const TeacherCard({super.key, required this.instructor, this.onTap});

  final Instructor instructor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bio = instructor.bio?.trim();
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: p.divider),
        ),
        child: InkWell(
          key: const ValueKey('course-teacher-card'),
          borderRadius: BorderRadius.circular(24),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Theme.of(context).colorScheme.secondary,
                      width: 2,
                    ),
                  ),
                  child: ClipOval(
                    child: AppNetworkImage(
                      url: instructor.avatarUrl,
                      seed: instructor.id,
                      width: 48,
                      height: 48,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        instructor.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                      if (bio != null && bio.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          bio,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (instructor.following case final following?
                    when instructor.id > 0) ...[
                  const SizedBox(width: 8),
                  FollowButton(
                    instructorId: instructor.id,
                    name: instructor.name,
                    following: following,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The tabs as chips, the open one in ink.
class InkChips extends StatelessWidget {
  const InkChips({
    super.key,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: labels.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final on = i == selected;
          return Semantics(
            button: true,
            selected: on,
            child: InkWell(
              key: ValueKey('ink-chip-$i'),
              borderRadius: BorderRadius.circular(999),
              onTap: () => onChanged(i),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: on ? p.text : p.text.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  labels[i],
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: on ? p.surface : p.text,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Where the course's price shows with its saving (a premium page).
class PremiumPrice extends InheritedWidget {
  const PremiumPrice({super.key, required super.child});

  static bool of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<PremiumPrice>() != null;

  @override
  bool updateShouldNotify(PremiumPrice oldWidget) => false;
}

/// The price large, and on a sale the old one struck through with how much
/// is saved.
class PremiumPriceColumn extends StatelessWidget {
  const PremiumPriceColumn({super.key, required this.price});

  final Price price;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final now = num.tryParse(price.saleAmount ?? '');
    final was = num.tryParse(price.amount ?? '');
    final sale = now != null && was != null && was > now && was > 0;
    final saved = sale ? ((was - now) / was * 100).round() : 0;
    return Column(
      key: const ValueKey('premium-price'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (sale)
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: _plain(price.amount!),
                  style: const TextStyle(
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
                TextSpan(text: ' · ${l10n.saveShare(saved)}'),
              ],
            ),
            style: TextStyle(fontSize: 11.5, color: p.textSecondary),
          ),
        Text(
          price.isFree ? l10n.free : (price.formatted ?? ''),
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
      ],
    );
  }
}

/// "590.00" as "590".
String _plain(String amount) =>
    amount.endsWith('.00') ? amount.substring(0, amount.length - 3) : amount;
