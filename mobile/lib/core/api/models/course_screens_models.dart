import 'dart:ui' show Color;

/// 130.52 Studio's course screens (`Config.screens.courses`): one premium
/// look for the academy's course card, a course's page, the lesson and My
/// courses, each screen with its own options; an option the owner didn't
/// set (or a value this app doesn't know) is the look's own. The platform
/// (platform/web/src/lib/studio/course-screens.ts) and the WordPress plugin
/// keep the same table of each look's choices.
enum CourseLook { cinema, ring, faculty, onAir }

enum CourseCardLayout { poster, ticket, glass, row }

enum CourseCardRatio { wide, tall, square }

enum CourseCardPart { teacher, rating, lessons, price, progress }

enum CoursePageHero { cinema, framed, split }

enum CourseEnrolBar { glass, solid, floating }

enum CoursePagePart { teacher, learn, curriculum, reviews, about }

enum LessonPlayer { cinema, framed }

enum LessonProgress { bar, segments, ring }

enum LessonPart { progress, notes, resources, upNext }

enum MyCoursesLayout { grid, list }

enum MyCoursesProgress { rings, bars }

enum MyCoursesPart { continueLearning, completed, week }

T? _pick<T extends Enum>(List<T> values, Object? wire, [String Function(T)? name]) {
  for (final v in values) {
    if ((name?.call(v) ?? _snake(v.name)) == wire) return v;
  }
  return null;
}

String _snake(String name) =>
    name.replaceAllMapped(RegExp('[A-Z]'), (m) => '_${m[0]!.toLowerCase()}');

Set<T> _parts<T extends Enum>(
  List<T> values,
  Object? wire, [
  String Function(T)? name,
]) => {
  if (wire is List)
    for (final w in wire) ?_pick(values, w, name),
};

Map<String, String> _words(Object? value) => {
  if (value is Map)
    for (final MapEntry(:key, value: text) in value.entries)
      if (key is String && text is String && text.trim().isNotEmpty)
        key: text.trim(),
};

int? _number(Object? value, int max) =>
    value is num && value >= 0 && value <= max ? value.round() : null;

String _mineWire(MyCoursesPart p) =>
    p == MyCoursesPart.continueLearning ? 'continue' : p.name;

class CourseCardDesign {
  const CourseCardDesign({
    required this.layout,
    required this.ratio,
    required this.scrim,
    required this.radius,
    this.hide = const {},
  });

  final CourseCardLayout layout;
  final CourseCardRatio ratio;

  /// How dark the photo's shade is under the words, 0 to 0.9.
  final double scrim;
  final double radius;
  final Set<CourseCardPart> hide;

  bool shows(CourseCardPart part) => !hide.contains(part);

  /// The photo's width over its height.
  double get aspect => switch (ratio) {
    CourseCardRatio.wide => 16 / 9,
    CourseCardRatio.tall => 4 / 3,
    CourseCardRatio.square => 1,
  };
}

class CoursePageDesign {
  const CoursePageDesign({
    required this.hero,
    required this.bar,
    this.hide = const {},
    this.cta = const {},
  });

  final CoursePageHero hero;
  final CourseEnrolBar bar;
  final Set<CoursePagePart> hide;

  /// The enrol button's words per language; empty, the app's own.
  final Map<String, String> cta;

  bool shows(CoursePagePart part) => !hide.contains(part);
}

class LessonDesign {
  const LessonDesign({
    required this.player,
    required this.progress,
    this.hide = const {},
  });

  final LessonPlayer player;
  final LessonProgress progress;
  final Set<LessonPart> hide;

  bool shows(LessonPart part) => !hide.contains(part);
}

class MyCoursesDesign {
  const MyCoursesDesign({
    required this.layout,
    required this.progress,
    this.hide = const {},
    this.headline = const {},
  });

  final MyCoursesLayout layout;
  final MyCoursesProgress progress;
  final Set<MyCoursesPart> hide;

  /// A line under the title per language; empty, none.
  final Map<String, String> headline;

  bool shows(MyCoursesPart part) => !hide.contains(part);
}

/// `Config.screens.courses`, every option decided.
class CourseScreensLook {
  const CourseScreensLook({
    required this.look,
    required this.card,
    required this.page,
    required this.lesson,
    required this.myCourses,
    this.accent,
  });

  /// Null without a look this app knows: the screens stay as before.
  static CourseScreensLook? tryParse(Object? value) {
    if (value is! Map) return null;
    final look = _pick(
      CourseLook.values,
      value['look'],
      (l) => switch (l) {
        CourseLook.onAir => 'on_air',
        CourseLook.faculty => 'index',
        _ => l.name,
      },
    );
    if (look == null) return null;
    Map<Object?, Object?> part(String key) =>
        value[key] is Map ? value[key] as Map : const {};
    final c = part('card');
    final p = part('page');
    final l = part('lesson');
    final m = part('my_courses');
    final d = defaults(look);
    final accent = value['accent'];
    return CourseScreensLook(
      look: look,
      accent:
          accent is String && RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(accent)
          ? Color(int.parse('FF${accent.substring(1)}', radix: 16))
          : null,
      card: CourseCardDesign(
        layout: _pick(CourseCardLayout.values, c['layout']) ?? d.card.layout,
        ratio: _pick(CourseCardRatio.values, c['ratio']) ?? d.card.ratio,
        scrim: (_number(c['scrim'], 90) ?? (d.card.scrim * 100).round()) / 100,
        radius: (_number(c['radius'], 32) ?? d.card.radius.round()).toDouble(),
        hide: _parts(CourseCardPart.values, c['hide']),
      ),
      page: CoursePageDesign(
        hero: _pick(CoursePageHero.values, p['hero']) ?? d.page.hero,
        bar: _pick(CourseEnrolBar.values, p['bar']) ?? d.page.bar,
        hide: _parts(CoursePagePart.values, p['hide']),
        cta: _words(p['cta']),
      ),
      lesson: LessonDesign(
        player: _pick(LessonPlayer.values, l['player']) ?? d.lesson.player,
        progress:
            _pick(LessonProgress.values, l['progress']) ?? d.lesson.progress,
        hide: _parts(LessonPart.values, l['hide']),
      ),
      myCourses: MyCoursesDesign(
        layout: _pick(MyCoursesLayout.values, m['layout']) ?? d.myCourses.layout,
        progress:
            _pick(MyCoursesProgress.values, m['progress']) ??
            d.myCourses.progress,
        hide: _parts(MyCoursesPart.values, m['hide'], _mineWire),
        headline: _words(m['headline']),
      ),
    );
  }

  /// Each look's own choices (R2-Ufuq-A Night cinema, R2-Ufuq-B Gold
  /// ring, R2-Rawaq-A Faculty index, R2-Rawaq-B On air).
  static CourseScreensLook defaults(CourseLook look) => switch (look) {
    CourseLook.cinema => const CourseScreensLook(
      look: CourseLook.cinema,
      card: CourseCardDesign(
        layout: CourseCardLayout.poster,
        ratio: CourseCardRatio.tall,
        scrim: 0.7,
        radius: 24,
      ),
      page: CoursePageDesign(
        hero: CoursePageHero.cinema,
        bar: CourseEnrolBar.glass,
      ),
      lesson: LessonDesign(
        player: LessonPlayer.cinema,
        progress: LessonProgress.segments,
      ),
      myCourses: MyCoursesDesign(
        layout: MyCoursesLayout.list,
        progress: MyCoursesProgress.bars,
      ),
    ),
    CourseLook.ring => const CourseScreensLook(
      look: CourseLook.ring,
      card: CourseCardDesign(
        layout: CourseCardLayout.row,
        ratio: CourseCardRatio.square,
        scrim: 0,
        radius: 20,
      ),
      page: CoursePageDesign(
        hero: CoursePageHero.framed,
        bar: CourseEnrolBar.floating,
      ),
      lesson: LessonDesign(
        player: LessonPlayer.framed,
        progress: LessonProgress.ring,
      ),
      myCourses: MyCoursesDesign(
        layout: MyCoursesLayout.grid,
        progress: MyCoursesProgress.rings,
      ),
    ),
    CourseLook.faculty => const CourseScreensLook(
      look: CourseLook.faculty,
      card: CourseCardDesign(
        layout: CourseCardLayout.ticket,
        ratio: CourseCardRatio.wide,
        scrim: 0,
        radius: 16,
      ),
      page: CoursePageDesign(
        hero: CoursePageHero.split,
        bar: CourseEnrolBar.solid,
      ),
      lesson: LessonDesign(
        player: LessonPlayer.framed,
        progress: LessonProgress.bar,
      ),
      myCourses: MyCoursesDesign(
        layout: MyCoursesLayout.list,
        progress: MyCoursesProgress.bars,
      ),
    ),
    CourseLook.onAir => const CourseScreensLook(
      look: CourseLook.onAir,
      card: CourseCardDesign(
        layout: CourseCardLayout.glass,
        ratio: CourseCardRatio.wide,
        scrim: 0.4,
        radius: 26,
      ),
      page: CoursePageDesign(
        hero: CoursePageHero.cinema,
        bar: CourseEnrolBar.floating,
      ),
      lesson: LessonDesign(
        player: LessonPlayer.cinema,
        progress: LessonProgress.bar,
      ),
      myCourses: MyCoursesDesign(
        layout: MyCoursesLayout.grid,
        progress: MyCoursesProgress.rings,
      ),
    ),
  };

  final CourseLook look;

  /// The look's accent; null, the app's second colour.
  final Color? accent;
  final CourseCardDesign card;
  final CoursePageDesign page;
  final LessonDesign lesson;
  final MyCoursesDesign myCourses;
}
