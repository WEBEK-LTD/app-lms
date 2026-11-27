import 'dart:math' as math;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/routing/feature_routes.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/avatar.dart';
import '../../core/widgets/badge_mark.dart';
import '../../core/widgets/coming_soon.dart';
import '../../core/widgets/community_header.dart';
import '../../core/widgets/floating_tab_bar.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/images.dart';
import '../../core/widgets/sym.dart';
import '../link/link_suggestion.dart';
import '../shell/side_menu.dart';
import '../social/data/social.dart';
import 'data/home_api.dart';

/// Home (mobile.html "Home · header with menu + profile"): the header, the
/// greeting, the featured card, the shortcuts as story rings, and the
/// community's newest questions and tutorials as posts.
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final me = ref.watch(meProvider);
    final feed = ref.watch(homeFeedProvider);
    final top = MediaQuery.paddingOf(context).top;
    return Scaffold(
      backgroundColor: p.screen,
      body: Stack(
        children: [
          RefreshIndicator(
            color: Brand.orange,
            onRefresh: () async => ref.refresh(homeFeedProvider.future),
            child: ListView(
              key: const ValueKey('home-list'),
              padding: EdgeInsets.only(
                top: top,
                bottom: FloatingTabBar.clearance,
              ),
              children: [
                if (me != null)
                  CommunityHeader(
                    meId: me.member.id,
                    meName: me.member.name,
                    meAvatar: me.member.avatarUrl,
                    // The account's unread count, or area E's live one.
                    notifications: math.max(
                      ref.watch(unreadNotificationsProvider),
                      me.account?.unreadNotifications ?? 0,
                    ),
                    onMenu: () =>
                        openSideMenu(context, current: MenuSection.home),
                    onSearch: () => context.push(FeatureLinks.search),
                    onMessages: () =>
                        showComingSoon(context, context.l10n.headerMessages),
                    onNotifications: () =>
                        context.push(FeatureLinks.notifications),
                    onProfile: () => context.push(Paths.me),
                  ),
                if (me != null) _Hello(name: me.member.name),
                // Shows only while /me suggests a Yallapp account to link.
                const LinkSuggestionBanner(
                  margin: EdgeInsets.fromLTRB(16, 0, 16, 14),
                ),
                ...switch (feed) {
                  AsyncData(:final value) => [
                    if (value.featured != null)
                      _Featured(item: value.featured!),
                    _Stories(feed: value),
                    if (value.items.isEmpty)
                      _Empty(text: context.l10n.homeFeedEmpty),
                    for (final item in value.items) _Post(item: item),
                  ],
                  AsyncError() => [
                    _Empty(
                      text: context.l10n.commonError,
                      retry: () => ref.invalidate(homeFeedProvider),
                    ),
                  ],
                  _ => [
                    const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(
                        child: CircularProgressIndicator(color: Brand.orange),
                      ),
                    ),
                  ],
                },
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Hello extends StatelessWidget {
  const _Hello({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final hour = DateTime.now().hour;
    final hello = hour < 12
        ? l.homeMorning
        : (hour < 18 ? l.homeAfternoon : l.homeEvening);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(hello, style: TextStyle(fontSize: 13, color: p.muted)),
          Text(
            name,
            key: const ValueKey('home-name'),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -.5,
              color: p.ink,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// The featured card (`.feat`): a photo under a navy fade, its label in a
/// glass chip, its title, and a countdown with "Join now" when it ends, else
/// "Read".
class _Featured extends StatelessWidget {
  const _Featured({required this.item});

  final FeedItem item;

  @override
  Widget build(BuildContext context) {
    final image = item.imageUrl;
    final l = context.l10n;
    final open = _opener(context, item);
    return GestureDetector(
      key: const ValueKey('home-featured'),
      onTap: open,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        height: 168,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Brand.indigo,
          image: image == null
              ? null
              : DecorationImage(
                  image: imageOf(image),
                  fit: BoxFit.cover,
                  alignment: const Alignment(0, -.4),
                ),
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: const Color(0x800E0D24),
                ),
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (item.label != null)
                    Glass(
                      radius: 10,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Sym(
                            item.endsAt != null
                                ? Symbols.emoji_events_rounded
                                : Symbols.auto_awesome_rounded,
                            size: 14,
                            fill: true,
                            color: Brand.gold,
                          ),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              item.label!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                // CSS `line-height: normal` for Inter.
                                height: 1.21,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(top: 8, bottom: 10),
                    child: Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.3,
                        height: 1.21,
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      if (item.endsAt != null) _Countdown(endsAt: item.endsAt!),
                      const Spacer(),
                      GestureDetector(
                        key: const ValueKey('home-featured-go'),
                        onTap: open,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 9,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            // Any kind of item fits the slot (phase 3's
                            // challenges with their countdown).
                            item.endsAt != null
                                ? l.homeJoin
                                : (item.kind == FeedKind.tutorial
                                      ? l.homeStartTutorial
                                      : l.homeRead),
                            style: const TextStyle(
                              color: Brand.navy,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Countdown extends StatefulWidget {
  const _Countdown({required this.endsAt});

  final DateTime endsAt;

  @override
  State<_Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<_Countdown> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => setState(() {}),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    var left = widget.endsAt.difference(DateTime.now());
    if (left.isNegative) left = Duration.zero;
    String two(int n) => n.toString().padLeft(2, '0');
    Widget cell(String value, String unit) => Padding(
      padding: const EdgeInsetsDirectional.only(end: 6),
      child: Glass(
        radius: 12,
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                fontFamily: 'Readex Pro',
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                height: 1.2,
              ),
            ),
            Text(
              unit,
              style: const TextStyle(
                fontSize: 10,
                color: Colors.white,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
    return Row(
      key: const ValueKey('home-countdown'),
      mainAxisSize: MainAxisSize.min,
      children: [
        cell(two(left.inDays), l.homeDays),
        cell(two(left.inHours % 24), l.homeHours),
        cell(two(left.inMinutes % 60), l.homeMinutes),
      ],
    );
  }
}

/// The shortcuts (`.stories`): rings in the brand's colours for what is new,
/// grey once seen; a later phase's open "Coming soon".
class _Stories extends StatelessWidget {
  const _Stories({required this.feed});

  final HomeFeed feed;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    FeedItem? newestTutorial;
    for (final i in feed.items) {
      if (i.kind == FeedKind.tutorial) {
        newestTutorial = i;
        break;
      }
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        // One-line labels sit under their ring, as two-line ones.
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Story(
            key: const ValueKey('story-live'),
            label: l.homeStoryLive,
            fill: Brand.solid(Brand.violet),
            icon: Symbols.live_tv_rounded,
            onTap: () => showComingSoon(context, l.homeStoryLive),
          ),
          _Story(
            key: const ValueKey('story-tutorial'),
            label: l.homeStoryTutorial,
            image: 'asset:assets/images/bunny-knit.jpg',
            seen: !feed.newTutorial,
            onTap: () => context.push(
              newestTutorial == null
                  ? FeatureLinks.learn
                  : FeatureLinks.tutorial(newestTutorial.id),
            ),
          ),
          _Story(
            key: const ValueKey('story-showcase'),
            label: l.homeStoryShowcase,
            image: 'asset:assets/images/bath-set.jpg',
            onTap: () => showComingSoon(context, l.homeStoryShowcase),
          ),
          _Story(
            key: const ValueKey('story-tip'),
            label: l.homeStoryTip,
            image: 'asset:assets/images/bed-bright.jpg',
            seen: true,
            onTap: () => showComingSoon(context, l.homeStoryTip),
          ),
          _Story(
            key: const ValueKey('story-news'),
            label: l.homeStoryNews,
            fill: Brand.solid(Brand.green),
            icon: Symbols.campaign_rounded,
            seen: !feed.news,
            onTap: () => context.push(FeatureLinks.learn),
          ),
        ],
      ),
    );
  }
}

class _Story extends StatelessWidget {
  const _Story({
    super.key,
    required this.label,
    required this.onTap,
    this.image,
    this.fill,
    this.icon,
    this.seen = false,
  });

  final String label;
  final VoidCallback onTap;
  final String? image;
  final Gradient? fill;
  final IconData? icon;
  final bool seen;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: 62,
          child: Column(
            children: [
              Container(
                width: 58,
                height: 58,
                padding: const EdgeInsets.all(2.5),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: seen ? null : Brand.storyRing,
                  color: seen
                      ? (p.dark
                            ? const Color(0xFF2A2848)
                            : const Color(0xFFDDD6CB))
                      : null,
                ),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: p.screen, width: 2.5),
                    gradient: fill,
                    image: image == null
                        ? null
                        : DecorationImage(
                            image: imageOf(image!),
                            fit: BoxFit.cover,
                          ),
                  ),
                  alignment: Alignment.center,
                  child: icon == null
                      ? null
                      : Sym(icon!, size: 26, fill: true, color: Colors.white),
                ),
              ),
              const SizedBox(height: 5),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  height: 1.15,
                  color: p.dark ? p.soft : const Color(0xFF3C3A50),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A question or a tutorial as the design's post (`.post`): its photo (a
/// gradient when it has none) under the author, Follow, its label and its
/// score, then its words.
class _Post extends ConsumerWidget {
  const _Post({required this.item});

  final FeedItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final author = item.author;
    final me = ref.watch(meProvider);
    final image = item.imageUrl;
    final following = author == null
        ? false
        : ref.watch(followingProvider(author.id));
    final lang = ref.watch(languageProvider);
    final meta = [
      ago(item.at, lang: lang),
      ?author?.level,
    ].where((s) => s.isNotEmpty).join(' · ');
    return GestureDetector(
      key: ValueKey('post-${item.id}'),
      onTap: _opener(context, item),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: p.dark ? const Color(0x0BFFFFFF) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: p.dark ? Border.all(color: const Color(0x12FFFFFF)) : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 200,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: image == null
                            ? Brand.solid(Brand.darkNavy)
                            : null,
                        image: image == null
                            ? null
                            : DecorationImage(
                                image: imageOf(image),
                                fit: BoxFit.cover,
                                alignment: const Alignment(0, -.4),
                              ),
                      ),
                    ),
                  ),
                  const Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: Color(0x660E0D24)),
                    ),
                  ),
                  if (image == null)
                    Positioned(
                      left: 18,
                      right: 18,
                      top: 62,
                      child: Text(
                        item.title,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          height: 1.3,
                          letterSpacing: -.3,
                        ),
                      ),
                    ),
                  if (author != null)
                    Positioned(
                      top: 12,
                      left: 12,
                      right: 12,
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: () => context.push(Paths.member(author.id)),
                            child: Avatar(
                              id: author.id,
                              name: author.name,
                              url: author.avatarUrl,
                              size: 34,
                              team: author.team,
                              border: const Color(0xCCFFFFFF),
                            ),
                          ),
                          const SizedBox(width: 9),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        author.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    BadgeMark(author.badge),
                                  ],
                                ),
                                if (meta.isNotEmpty)
                                  Text(
                                    meta,
                                    style: const TextStyle(
                                      color: Color(0xD9FFFFFF),
                                      fontSize: 11.5,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (me != null &&
                              author.id != me.member.id &&
                              !author.team)
                            GestureDetector(
                              key: ValueKey('post-follow-${item.id}'),
                              onTap: () => ref
                                  .read(followingProvider(author.id).notifier)
                                  .toggle(),
                              child: Glass(
                                radius: 12,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                child: Text(
                                  following
                                      ? l.socialFollowingState
                                      : l.socialFollow,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  // The glass chip: a tutorial's "Start tutorial", a
                  // question's answers (phase 2's showcase brings back
                  // "Build one like it").
                  if (_chip(context, item) case final chip?)
                    PositionedDirectional(
                      bottom: 12,
                      start: 12,
                      end: 90,
                      child: Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: Glass(
                          radius: 10,
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            10,
                            6,
                            12,
                            6,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Sym(
                                switch (item.kind) {
                                  FeedKind.question => Symbols.forum_rounded,
                                  FeedKind.tutorial => Symbols.school_rounded,
                                  FeedKind.announcement =>
                                    Symbols.campaign_rounded,
                                },
                                size: 16,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 7),
                              Flexible(
                                child: Text(
                                  chip,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 7),
                              Sym(
                                Directionality.of(context) == TextDirection.rtl
                                    ? Symbols.arrow_back_rounded
                                    : Symbols.arrow_forward_rounded,
                                size: 15,
                                color: Colors.white,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  PositionedDirectional(
                    bottom: 12,
                    end: 12,
                    child: Glass(
                      radius: 10,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Sym(
                            item.kind == FeedKind.question
                                ? Symbols.arrow_upward_rounded
                                : Symbols.favorite_rounded,
                            size: 16,
                            fill: true,
                            color: item.kind == FeedKind.question
                                ? Brand.peach
                                : const Color(0xFFFF7A7A),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            count(item.score),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (image != null || item.text.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Text(
                  image != null ? item.title : item.text,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 14, height: 1.55, color: p.soft),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

VoidCallback _opener(BuildContext context, FeedItem item) =>
    () => switch (item.kind) {
      FeedKind.question => context.push(FeatureLinks.question(item.id)),
      FeedKind.tutorial => context.push(FeatureLinks.tutorial(item.id)),
      FeedKind.announcement => context.push(FeatureLinks.learn),
    };

class _Empty extends StatelessWidget {
  const _Empty({required this.text, this.retry});

  final String text;
  final VoidCallback? retry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
      child: Column(
        children: [
          Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(color: p.muted, fontSize: 14, height: 1.5),
          ),
          if (retry != null)
            TextButton(onPressed: retry, child: Text(context.l10n.commonRetry)),
        ],
      ),
    );
  }
}

/// What a post's glass chip says: a question's answers, a tutorial's
/// "Start tutorial" (every tutorial is free), else its label.
String? _chip(BuildContext context, FeedItem item) {
  final l = context.l10n;
  return switch (item.kind) {
    FeedKind.question => l.homeAnswers(item.answers),
    FeedKind.tutorial => l.homeStartTutorial,
    FeedKind.announcement => item.label,
  };
}
