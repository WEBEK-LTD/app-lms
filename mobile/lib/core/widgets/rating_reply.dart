import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../providers.dart';
import '../l10n/l10n.dart';
import '../theme/palette.dart';

/// 132 The business's reply under the customer's own rating (a food
/// order's, a ride's), in the business's name: the app's.
class RatingReplyBox extends ConsumerWidget {
  const RatingReplyBox({super.key, required this.reply});

  final RatingReply reply;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final business = ref.watch(appEnvironmentProvider).build.appName;
    return Container(
      key: const ValueKey('rating-reply'),
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surfaceMuted,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.l10n.ratingReplyFrom('\u2068$business\u2069'),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: p.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '\u2068${reply.text}\u2069',
            style: TextStyle(fontSize: 15, color: p.text),
          ),
        ],
      ),
    );
  }
}
