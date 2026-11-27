import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../data/posts_api.dart';
import 'post_card.dart';

final _memberPostsProvider = FutureProvider.autoDispose
    .family<List<FeedEntry>, String>(
      (ref, id) async =>
          (await ref.watch(postsApiProvider).memberPosts(id)).items,
    );

/// A profile's Posts: the member's newest three.
class MemberPostsSection extends ConsumerWidget {
  const MemberPostsSection({super.key, required this.memberId});

  final String memberId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final posts = [
      for (final e
          in ref.watch(_memberPostsProvider(memberId)).value ??
              const <FeedEntry>[])
        ?e.post,
    ];
    if (posts.isEmpty) return const SizedBox.shrink();
    return Column(
      key: const ValueKey('profile-posts'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 10),
          child: Text(
            context.l10n.profilePosts,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: p.ink,
            ),
          ),
        ),
        for (final post in posts.take(3)) PostCard(post: post),
      ],
    );
  }
}
