import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/routing/paths.dart';
import '../../core/widgets/common.dart';
import '../../core/l10n/l10n.dart';

void openCourse(BuildContext context, int courseId) =>
    context.push(Paths.course(courseId));

/// Opens a lesson or quiz from a curriculum, "continue" card or next item.
void openCurriculumItem(
  BuildContext context,
  CurriculumItem item, {
  int? courseId,
  bool replace = false,
}) {
  if (item.locked) {
    // 112.5 Why it's locked, when the server says.
    showMessage(context, switch (item.lockedReason) {
      LockedReason.previousNotDone => context.l10n.lockedPreviousNotDone,
      LockedReason.accessEnded => context.l10n.lockedAccessEnded,
      _ => context.l10n.enrollToOpen,
    });
    return;
  }
  final String location;
  switch (item.type) {
    case CurriculumItemType.lesson:
      location = Paths.lesson(item.id);
    case CurriculumItemType.quiz:
      location = Paths.quiz(item.id);
    // 112.5 Courses managed in Yallapp open them in the app; others are on the website.
    case CurriculumItemType.assignment when item.inApp:
      location = Paths.assignment(item.id);
    case CurriculumItemType.live when item.inApp:
      location = Paths.liveSession(item.id);
    case CurriculumItemType.assignment:
    case CurriculumItemType.live:
      showMessage(context, context.l10n.assignmentsOnWebsite);
      return;
  }
  if (replace) {
    context.pushReplacement(location);
  } else {
    context.push(location);
  }
}

/// Opens an enrolled course from My courses, a "continue" card or a page
/// block: always on its course page (50), the same for every LMS and for
/// academies without a website. The student sees the course, its topics and
/// where they are, and "Continue learning" there opens the next lesson.
void continueCourse(BuildContext context, MyCourse course) =>
    openCourse(context, course.course.id);
