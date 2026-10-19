import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';

CurriculumItem _item(
  int id,
  CurriculumItemType type, {
  bool completed = false,
  bool locked = false,
}) => CurriculumItem(
  id: id,
  type: type,
  title: 'Item $id',
  locked: locked,
  completed: completed,
);

Topic _topic(List<CurriculumItem> items) =>
    Topic(id: 1, title: 'Module 1', items: items);

void main() {
  // 39 A Tutor LMS course sold with WooCommerce: lesson, assignment, lesson, quiz.
  test('continue skips an assignment to the next lesson', () {
    final topics = [
      _topic([
        _item(1, CurriculumItemType.lesson, completed: true),
        _item(2, CurriculumItemType.assignment),
        _item(3, CurriculumItemType.lesson),
        _item(4, CurriculumItemType.quiz),
      ]),
    ];
    expect(nextItemToOpen(topics)?.id, 3);
  });

  test('live classes are skipped and quizzes count', () {
    final topics = [
      _topic([_item(1, CurriculumItemType.live)]),
      _topic([_item(2, CurriculumItemType.quiz)]),
    ];
    expect(nextItemToOpen(topics)?.id, 2);
  });

  test('everything done: the first lesson again; nothing open: null', () {
    expect(
      nextItemToOpen([
        _topic([
          _item(1, CurriculumItemType.assignment),
          _item(2, CurriculumItemType.lesson, completed: true),
        ]),
      ])?.id,
      2,
    );
    expect(
      nextItemToOpen([
        _topic([
          _item(1, CurriculumItemType.lesson, locked: true),
          _item(2, CurriculumItemType.assignment),
        ]),
      ]),
      isNull,
    );
    expect(nextItemToOpen(const []), isNull);
  });

  test('only lessons and quizzes open in the app', () {
    expect(_item(1, CurriculumItemType.lesson).opensInApp, isTrue);
    expect(_item(1, CurriculumItemType.quiz).opensInApp, isTrue);
    expect(_item(1, CurriculumItemType.assignment).opensInApp, isFalse);
    expect(_item(1, CurriculumItemType.live).opensInApp, isFalse);
  });
}
