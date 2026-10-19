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
    showMessage(context, context.l10n.enrollToOpen);
    return;
  }
  final String location;
  switch (item.type) {
    case CurriculumItemType.lesson:
      location = Paths.lesson(item.id);
    case CurriculumItemType.quiz:
      location = Paths.quiz(item.id);
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

/// Continues an enrolled course at its next item, or opens the course.
void continueCourse(BuildContext context, MyCourse course) {
  final next = course.nextItem;
  // 39 Earlier plugins could send an assignment here; it opens on the
  // website, so the course page is the better place to continue from.
  if (next != null && !next.locked && next.opensInApp) {
    openCurriculumItem(context, next, courseId: course.course.id);
  } else {
    openCourse(context, course.course.id);
  }
}
