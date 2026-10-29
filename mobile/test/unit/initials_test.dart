import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/widgets/common.dart';

/// 110 Initials skip a name's article, so an Arabic name with "ال" doesn't
/// turn into two alefs ("اا", which reads like a pause sign).
void main() {
  test('a word starts past its article', () {
    expect(nameInitial('العميل'), 'ع');
    expect(nameInitial('الطالب'), 'ط');
    expect(nameInitial('al-Masri'), 'M');
    expect(nameInitial('El-Sayed'), 'S');
    // Not an article: a short word, or one that only starts like one.
    expect(nameInitial('ال'), 'ا');
    expect(nameInitial('الم'), 'ا');
    expect(nameInitial('Alice'), 'A');
    expect(nameInitial('Deniz'), 'D');
    expect(nameInitial(''), '');
  });

  test("a person's initials", () {
    expect(InitialsAvatar.initialsOf('Deniz Kaya'), 'DK');
    expect(InitialsAvatar.initialsOf('Ayşe'), 'A');
    expect(InitialsAvatar.initialsOf('اسم العميل'), 'اع');
    expect(InitialsAvatar.initialsOf('محمد العلي'), 'مع');
    expect(InitialsAvatar.initialsOf('Omar al-Masri'), 'OM');
    expect(InitialsAvatar.initialsOf('  '), '?');
  });
}
