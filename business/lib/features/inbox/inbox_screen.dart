import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import 'reviews.dart';

/// 59 Inbox: the conversations about the app's listings, newest message
/// first. 63 Also the questions students ask in courses managed in Yallapp
/// and their reviews, each kind in its own tab when the app (and the
/// person's role) has it.
class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key, this.initialTab});

  /// `messages`, `questions` or `reviews` (a push or Today opens one).
  final String? initialTab;

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  String? _tab;
  String _status = 'open';
  String _questionStatus = 'open';
  String _reviewFilter = 'all';
  int _version = 0;

  /// The average of the reviews shown in the app, from the first page.
  ReviewsPage? _reviewsHead;

  void _reload() => setState(() => _version++);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final appId = ref.watch(appIdProvider);
    final api = ref.watch(apiProvider);
    final f = ref.watch(currentAppProvider)?.features ?? const AppFeatures();
    final tabs = [
      if (f.inquiries) ('messages', l10n.inboxMessages),
      if (f.questions) ('questions', l10n.inboxQuestions),
      if (f.reviews) ('reviews', l10n.inboxReviews),
    ];
    if (tabs.isEmpty) return Scaffold(appBar: AppBar(title: Text(l10n.inbox)));
    final wanted = _tab ?? widget.initialTab;
    final tab = tabs.any((t) => t.$1 == wanted) ? wanted! : tabs.first.$1;

    Widget segments<T extends Object>(
      List<(T, String)> items,
      T selected,
      ValueChanged<T> onChanged,
    ) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: SizedBox(
        width: double.infinity,
        child: SegmentedButton<T>(
          showSelectedIcon: false,
          segments: [
            // 63 One line each at phone width; a long label shrinks to fit.
            for (final (value, label) in items)
              ButtonSegment(
                value: value,
                label: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(label, maxLines: 1, softWrap: false),
                ),
              ),
          ],
          selected: {selected},
          onSelectionChanged: (s) => onChanged(s.first),
        ),
      ),
    );

    final Widget list = switch (tab) {
      'questions' => PagedList<Question>(
        key: ValueKey('$appId-q-$_questionStatus-$_version'),
        load: (page) async => (await api.questions(
          appId,
          status: _questionStatus,
          page: page,
        )).page,
        empty: EmptyState(
          icon: AppIcons.question,
          title: l10n.noQuestions,
          text: l10n.noQuestionsText,
        ),
        itemBuilder: (context, q) =>
            _QuestionTile(question: q, onReturn: _reload),
      ),
      'reviews' => PagedList<Review>(
        key: ValueKey('$appId-r-$_reviewFilter-$_version'),
        load: (page) async {
          final result = await api.reviews(
            appId,
            filter: _reviewFilter,
            page: page,
          );
          if (page == 1 && mounted) setState(() => _reviewsHead = result);
          return result.page;
        },
        header: _reviewsHead == null ? null : _Average(head: _reviewsHead!),
        empty: EmptyState(
          icon: AppIcons.star,
          title: l10n.noReviews,
          text: l10n.noReviewsText,
        ),
        itemBuilder: (context, r) => ReviewCard(review: r, onChanged: _reload),
      ),
      _ => PagedList<Inquiry>(
        key: ValueKey('$appId-$_status-$_version'),
        load: (page) async =>
            (await api.inquiries(appId, status: _status, page: page)).page,
        empty: EmptyState(
          icon: AppIcons.inbox,
          title: l10n.noMessages,
          text: l10n.noMessagesText,
        ),
        itemBuilder: (context, i) =>
            _InquiryTile(inquiry: i, onReturn: _reload),
      ),
    };

    return Scaffold(
      appBar: AppBar(title: Text(l10n.inbox)),
      body: Column(
        children: [
          if (tabs.length > 1)
            segments(tabs, tab, (value) => setState(() => _tab = value)),
          switch (tab) {
            'questions' => segments(
              [
                ('open', l10n.questionsWaiting),
                ('answered', l10n.questionsAnswered),
                // 64 The questions hidden from others.
                ('hidden', l10n.hidden),
              ],
              _questionStatus,
              (v) => setState(() => _questionStatus = v),
            ),
            'reviews' => segments(
              [
                ('all', l10n.reviewsAll),
                ('unreplied', l10n.reviewsUnreplied),
                ('hidden', l10n.hidden),
              ],
              _reviewFilter,
              (v) => setState(() => _reviewFilter = v),
            ),
            _ => segments(
              [('open', l10n.inboxOpen), ('closed', l10n.inboxClosed)],
              _status,
              (v) => setState(() => _status = v),
            ),
          },
          Expanded(child: list),
        ],
      ),
    );
  }
}

/// 63 "4.3 out of 5 from 12 reviews", the reviews shown in the app.
class _Average extends StatelessWidget {
  const _Average({required this.head});

  final ReviewsPage head;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rating = head.rating;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          const Icon(AppIcons.star, fill: 1, color: Brand.ember),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              rating == null
                  ? l10n.noRatingYet
                  : l10n.reviewsAverage(
                      context.number(rating),
                      head.ratingCount,
                    ),
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
        ],
      ),
    );
  }
}

/// 63 A student's question: who, which course, and whether it waits for you.
class _QuestionTile extends StatelessWidget {
  const _QuestionTile({required this.question, required this.onReturn});

  final Question question;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final q = question;
    return Panel(
      onTap: () async {
        await context.push(Paths.question(q.id));
        onReturn();
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  q.person,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: q.open ? FontWeight.w800 : null,
                  ),
                ),
              ),
              Text(context.ago(q.updatedAt), style: theme.textTheme.bodySmall),
            ],
          ),
          Text(l10n.inCourse(q.courseTitle), style: theme.textTheme.bodySmall),
          const SizedBox(height: 4),
          Text(
            q.text,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              if (q.hidden)
                StatusChip(l10n.hiddenFromOthers, tone: Tone.warn)
              else if (q.open)
                StatusChip(l10n.questionsWaiting, tone: Tone.accent)
              else
                StatusChip(l10n.questionsAnswered, tone: Tone.good),
              StatusChip(l10n.answersCount(q.answerCount)),
            ],
          ),
        ],
      ),
    );
  }
}

class _InquiryTile extends StatelessWidget {
  const _InquiryTile({required this.inquiry, required this.onReturn});

  final Inquiry inquiry;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final unread = inquiry.unread > 0;
    return Panel(
      onTap: () async {
        await context.push(Paths.inquiry(inquiry.id));
        onReturn();
      },
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: context.yb.muted,
            foregroundColor: context.yb.ink,
            child: Text(
              inquiry.person.isEmpty ? '?' : inquiry.person.characters.first,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        inquiry.person,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: unread ? FontWeight.w800 : null,
                        ),
                      ),
                    ),
                    Text(
                      context.ago(inquiry.updatedAt),
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
                Text(inquiry.listingTitle, style: theme.textTheme.bodySmall),
                if (inquiry.lastMessage != null)
                  Text(
                    inquiry.lastMessage!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium,
                  ),
              ],
            ),
          ),
          if (unread) ...[
            const SizedBox(width: 8),
            Badge(
              backgroundColor: Brand.ember,
              textColor: Brand.midnight,
              label: Text('${inquiry.unread}'),
              child: const SizedBox.shrink(),
            ),
            Semantics(label: l10n.unreadCount(inquiry.unread)),
          ],
        ],
      ),
    );
  }
}
