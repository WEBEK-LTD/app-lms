import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import '../navigation.dart';
import '../widgets/course_cards.dart';

/// Home, in the template chosen by the build config (designs: Home,
/// HomeBold, HomeMinimal). Sections come from `GET /home` in the order set
/// in the plugin.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, this.template});

  /// Defaults to the build config's template.
  final AppTemplate? template;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = template ?? ref.watch(appLookProvider).template;
    final sections = ref.watch(homeSectionsProvider);
    Future<void> refresh() => ref.refresh(homeSectionsProvider.future);

    Widget body(List<HomeSection> data) => switch (t) {
      AppTemplate.classic => _ClassicHome(sections: data),
      AppTemplate.bold => _BoldHome(sections: data),
      AppTemplate.minimal => _MinimalHome(sections: data),
    };

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: refresh,
        child: switch (sections) {
          AsyncData(:final value) => body(value),
          AsyncError(:final error) => ListView(
            children: [
              SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.8,
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
          _ => const LoadingView(label: 'Loading home'),
        },
      ),
    );
  }
}

String greeting(DateTime now) {
  final h = now.hour;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/// The student's first name, or the site's name for guests.
String _displayName(WidgetRef ref) {
  final user = ref.watch(authControllerProvider).user;
  if (user != null && user.name.trim().isNotEmpty) {
    return user.name.trim().split(RegExp(r'\s+')).first;
  }
  return ref.watch(appConfigProvider).site.name;
}

void _openSearch(BuildContext context) => context.go(
  Uri(path: Paths.courses, queryParameters: {'focus': '1'}).toString(),
);

void _openBanner(BuildContext context, HomeBanner banner) {
  final id = banner.linkCourseId;
  if (id != null) openCourse(context, id);
}

String _sectionTitle(HomeSection s) {
  final title = s.title?.trim();
  if (title != null && title.isNotEmpty) return title;
  return switch (s.type) {
    HomeSectionType.continueLearning => 'Continue learning',
    HomeSectionType.categories => 'Categories',
    HomeSectionType.featuredCourses => 'Featured courses',
    HomeSectionType.latestCourses => 'Latest courses',
    HomeSectionType.banner || HomeSectionType.unknown => '',
  };
}

void _seeAll(BuildContext context, HomeSection s) => context.go(
  s.type == HomeSectionType.latestCourses
      ? Uri(path: Paths.courses, queryParameters: {'sort': 'newest'}).toString()
      : Paths.courses,
);

class _NotificationsButton extends ConsumerWidget {
  const _NotificationsButton({this.style = _ButtonStyle.classic});

  final _ButtonStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    if (!signedIn) return const SizedBox.shrink();
    final unread = ref.watch(unreadNotificationsProvider).value ?? 0;
    final p = context.palette;
    return SquareIconButton(
      icon: AppIcons.notifications,
      label: unread > 0 ? 'Notifications, $unread unread' : 'Notifications',
      badge: unread > 0,
      onPressed: () => context.push(Paths.notifications),
      background: switch (style) {
        _ButtonStyle.classic => p.surface,
        _ButtonStyle.onPrimary => p.primarySoft,
        _ButtonStyle.plain => Colors.transparent,
      },
      foreground: style == _ButtonStyle.onPrimary ? p.onPrimarySoft : p.text,
      bordered: style == _ButtonStyle.classic,
      radius: style == _ButtonStyle.onPrimary ? 22 : 12,
    );
  }
}

enum _ButtonStyle { classic, onPrimary, plain }

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.label, this.pill = false});

  final String label;
  final bool pill;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        shape: pill
            ? const StadiumBorder()
            : RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(context.shapes.r(14)),
                side: BorderSide(color: p.border),
              ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _openSearch(context),
          child: SizedBox(
            height: 50,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: pill ? 18 : 16),
              child: Row(
                children: [
                  AppIcon(AppIcons.search, size: 20, color: p.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(fontSize: 15, color: p.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BannerCard extends StatelessWidget {
  const _BannerCard({
    required this.banner,
    required this.title,
    this.radius = 18,
  });

  final HomeBanner banner;
  final String? title;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final tappable = banner.linkCourseId != null;
    return Semantics(
      button: tappable,
      label: title?.isNotEmpty == true ? title : 'Announcement',
      image: true,
      excludeSemantics: true,
      child: Material(
        color: p.placeholderFor(0),
        borderRadius: BorderRadius.circular(context.shapes.r(radius)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: tappable ? () => _openBanner(context, banner) : null,
          child: AspectRatio(
            aspectRatio: 16 / 7,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(url: banner.imageUrl),
                if (title != null && title!.isNotEmpty)
                  Align(
                    alignment: Alignment.bottomLeft,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
                      // A flat scrim keeps the title readable on any image.
                      color: const Color(0xA60E0D24),
                      child: Text(
                        title!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({required this.categories});

  final List<Category> categories;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          PillChip(
            label: 'All',
            selected: true,
            onTap: () => context.go(Paths.courses),
          ),
          for (final c in categories) ...[
            const SizedBox(width: 8),
            PillChip(
              label: c.name,
              selected: false,
              onTap: () => context.go(Paths.coursesFiltered(category: c.id)),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Classic

class _ClassicHome extends ConsumerWidget {
  const _ClassicHome({required this.sections});

  final List<HomeSection> sections;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return ListView(
      padding: EdgeInsets.fromLTRB(
        20,
        MediaQuery.paddingOf(context).top + 24,
        20,
        24,
      ),
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    greeting(DateTime.now()),
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Semantics(
                    header: true,
                    child: Text(
                      _displayName(ref),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const _NotificationsButton(),
          ],
        ),
        const SizedBox(height: 24),
        const _SearchBar(label: 'Search for a course'),
        for (final section in sections) ..._classicSection(context, section),
      ],
    );
  }

  List<Widget> _classicSection(BuildContext context, HomeSection s) {
    final title = _sectionTitle(s);
    final List<Widget> content;
    switch (s.type) {
      case HomeSectionType.banner:
        if (s.banner == null) return const [];
        content = [_BannerCard(banner: s.banner!, title: s.title)];
      case HomeSectionType.continueLearning:
        if (s.course == null) return const [];
        content = [
          SectionHeader(title: title),
          const SizedBox(height: 12),
          ContinueCardClassic(
            course: s.course!,
            onTap: () => continueCourse(context, s.course!),
          ),
        ];
      case HomeSectionType.categories:
        if (s.categories.isEmpty) return const [];
        content = [
          SectionHeader(title: title),
          const SizedBox(height: 12),
          _CategoryChips(categories: s.categories),
        ];
      case HomeSectionType.featuredCourses:
      case HomeSectionType.latestCourses:
        if (s.courses.isEmpty) return const [];
        content = [
          SectionHeader(title: title, onSeeAll: () => _seeAll(context, s)),
          const SizedBox(height: 12),
          SizedBox(
            height: 262,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: s.courses.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => Align(
                alignment: Alignment.topCenter,
                child: CourseTileCard(
                  course: s.courses[i],
                  onTap: () => openCourse(context, s.courses[i].id),
                ),
              ),
            ),
          ),
        ];
      case HomeSectionType.unknown:
        return const [];
    }
    return [const SizedBox(height: 24), ...content];
  }
}

// ------------------------------------------------------------------- Bold

class _BoldHome extends ConsumerWidget {
  const _BoldHome({required this.sections});

  final List<HomeSection> sections;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Container(
          decoration: BoxDecoration(
            color: p.primary,
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(28),
            ),
          ),
          padding: EdgeInsets.fromLTRB(
            20,
            MediaQuery.paddingOf(context).top + 24,
            20,
            26,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back,',
                          style: TextStyle(
                            fontSize: 14,
                            color: p.onPrimary.withValues(alpha: 0.78),
                          ),
                        ),
                        Semantics(
                          header: true,
                          child: Text(
                            _displayName(ref),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: p.onPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const _NotificationsButton(style: _ButtonStyle.onPrimary),
                ],
              ),
              const SizedBox(height: 18),
              const _SearchBar(label: 'What do you want to learn?', pill: true),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final section in sections) ..._boldSection(context, section),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _boldSection(BuildContext context, HomeSection s) {
    final title = _sectionTitle(s);
    final List<Widget> content;
    switch (s.type) {
      case HomeSectionType.banner:
        if (s.banner == null) return const [];
        content = [_BannerCard(banner: s.banner!, title: s.title, radius: 22)];
      case HomeSectionType.continueLearning:
        if (s.course == null) return const [];
        content = [
          ContinueCardBold(
            course: s.course!,
            onTap: () => continueCourse(context, s.course!),
          ),
        ];
      case HomeSectionType.categories:
        if (s.categories.isEmpty) return const [];
        content = [
          SectionHeader(title: title, size: 20, weight: FontWeight.w800),
          const SizedBox(height: 12),
          _CategoryChips(categories: s.categories),
        ];
      case HomeSectionType.featuredCourses:
      case HomeSectionType.latestCourses:
        if (s.courses.isEmpty) return const [];
        content = [
          SectionHeader(
            title: title,
            size: 20,
            weight: FontWeight.w800,
            onSeeAll: () => _seeAll(context, s),
          ),
          const SizedBox(height: 12),
          for (final (i, course) in s.courses.take(3).indexed) ...[
            if (i > 0) const SizedBox(height: 14),
            CourseFeatureCard(
              course: course,
              onTap: () => openCourse(context, course.id),
            ),
          ],
        ];
      case HomeSectionType.unknown:
        return const [];
    }
    return [const SizedBox(height: 22), ...content];
  }
}

// ---------------------------------------------------------------- Minimal

enum _MinimalTab { forYou, latest, free, categories }

class _MinimalHome extends ConsumerStatefulWidget {
  const _MinimalHome({required this.sections});

  final List<HomeSection> sections;

  @override
  ConsumerState<_MinimalHome> createState() => _MinimalHomeState();
}

class _MinimalHomeState extends ConsumerState<_MinimalHome> {
  _MinimalTab _tab = _MinimalTab.forYou;

  static const _labels = {
    _MinimalTab.forYou: 'For you',
    _MinimalTab.latest: 'New',
    _MinimalTab.free: 'Free',
    _MinimalTab.categories: 'Categories',
  };

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ListView(
      padding: EdgeInsets.fromLTRB(
        24,
        MediaQuery.paddingOf(context).top + 28,
        24,
        24,
      ),
      children: [
        Row(
          children: [
            Expanded(
              child: Semantics(
                header: true,
                child: Text(
                  'Learn',
                  style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1,
                    color: p.text,
                  ),
                ),
              ),
            ),
            SquareIconButton(
              icon: AppIcons.search,
              label: 'Search courses',
              background: Colors.transparent,
              bordered: false,
              onPressed: () => _openSearch(context),
            ),
            const _NotificationsButton(style: _ButtonStyle.plain),
          ],
        ),
        const SizedBox(height: 18),
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: p.divider)),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final tab in _MinimalTab.values)
                  Padding(
                    padding: const EdgeInsets.only(right: 22),
                    child: Semantics(
                      selected: tab == _tab,
                      button: true,
                      child: InkWell(
                        onTap: () => setState(() => _tab = tab),
                        child: Container(
                          height: 44,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: tab == _tab
                                    ? p.text
                                    : Colors.transparent,
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            _labels[tab]!,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: tab == _tab
                                  ? FontWeight.w800
                                  : FontWeight.w400,
                              color: tab == _tab ? p.text : p.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        ...switch (_tab) {
          _MinimalTab.forYou => _forYou(context),
          _MinimalTab.latest => [
            const _CourseQueryList(query: CourseQuery(perPage: 10)),
          ],
          _MinimalTab.free => [
            const _CourseQueryList(
              query: CourseQuery(perPage: 10, price: PriceFilter.free),
            ),
          ],
          _MinimalTab.categories => [const _CategoryRows()],
        },
      ],
    );
  }

  List<Widget> _forYou(BuildContext context) {
    final children = <Widget>[];
    for (final s in widget.sections) {
      switch (s.type) {
        case HomeSectionType.continueLearning when s.course != null:
          children
            ..add(
              ContinueCardMinimal(
                course: s.course!,
                onTap: () => continueCourse(context, s.course!),
              ),
            )
            ..add(const SizedBox(height: 22));
        case HomeSectionType.banner when s.banner != null:
          children
            ..add(_BannerCard(banner: s.banner!, title: s.title, radius: 14))
            ..add(const SizedBox(height: 22));
        case HomeSectionType.featuredCourses || HomeSectionType.latestCourses
            when s.courses.isNotEmpty:
          for (final (i, course) in s.courses.indexed) {
            children.add(
              CourseRow(
                course: course,
                showDivider: i < s.courses.length - 1,
                onTap: () => openCourse(context, course.id),
              ),
            );
          }
          children.add(const SizedBox(height: 22));
        default:
          break;
      }
    }
    if (children.isEmpty) {
      children.add(
        const MessageView(
          compact: true,
          icon: AppIcons.courses,
          title: 'Nothing here yet',
          message: 'New courses will show up here.',
        ),
      );
    }
    return children;
  }
}

class _CourseQueryList extends ConsumerWidget {
  const _CourseQueryList({required this.query});

  final CourseQuery query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(coursesProvider(query));
    if (state.isInitialLoading) return const LoadingView();
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(
        error: state.error!,
        onRetry: ref.read(coursesProvider(query).notifier).retry,
      );
    }
    if (state.items.isEmpty) {
      return const MessageView(
        compact: true,
        icon: AppIcons.courses,
        title: 'No courses yet',
      );
    }
    return Column(
      children: [
        for (final (i, course) in state.items.indexed)
          CourseRow(
            course: course,
            showDivider: i < state.items.length - 1,
            onTap: () => openCourse(context, course.id),
          ),
      ],
    );
  }
}

class _CategoryRows extends ConsumerWidget {
  const _CategoryRows();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return switch (ref.watch(categoriesProvider)) {
      AsyncData(:final value) => Column(
        children: [
          for (final c in value)
            Semantics(
              button: true,
              label: '${c.name}, ${plural(c.count, 'course')}',
              excludeSemantics: true,
              child: InkWell(
                onTap: () => context.go(Paths.coursesFiltered(category: c.id)),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 54),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: p.divider)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          c.name,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                      Text(
                        plural(c.count, 'course'),
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                      const SizedBox(width: 4),
                      AppIcon(
                        AppIcons.forward,
                        size: 18,
                        color: p.textTertiary,
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(categoriesProvider),
      ),
      _ => const LoadingView(),
    };
  }
}
