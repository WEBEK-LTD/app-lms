import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/routing/paths.dart';
import '../../core/widgets/common.dart';

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
    showMessage(context, 'Enroll in this course to open this item.');
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
      showMessage(
        context,
        'Assignments and live classes are on the website for now.',
      );
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
  if (next != null && !next.locked) {
    openCurriculumItem(context, next, courseId: course.course.id);
  } else {
    openCourse(context, course.course.id);
  }
}
