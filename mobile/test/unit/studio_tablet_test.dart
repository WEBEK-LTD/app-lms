import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/page_models.dart';

void main() {
  group('Editor audit 3.3: changes for tablets', () {
    final page = StudioPage.tryParse({
      'body': {
        'id': 'root',
        'type': 'column',
        'gap': 8,
        'children': [
          {
            'id': 'title',
            'type': 'text',
            'text': 'Hello',
            'font': {'size': 20, 'weight': 800, 'family': 'Cairo'},
            'tablet': {
              'font': {'size': 32},
              'text_align': 'center',
            },
          },
          {
            'id': 'grid',
            'type': 'grid',
            'columns': 2,
            'tablet': {'columns': 4, 'gap': 24},
            'children': [
              {'id': 'a', 'type': 'text', 'text': 'A'},
            ],
          },
        ],
      },
    })!;

    test('phones read the element as it is', () {
      final body = page.bodyFor(390);
      expect(body.children[0].font?.size, 20);
      expect(body.children[0].textAlign, StudioTextAlign.start);
      expect(body.children[1].columns, 2);
      expect(body.children[1].gap, 0);
    });

    test('tablets read the changes over it, the font field by field', () {
      final body = page.bodyFor(820);
      final title = body.children[0];
      expect(title.font?.size, 32);
      expect(title.font?.weight, 800);
      expect(title.font?.family, 'Cairo');
      expect(title.textAlign, StudioTextAlign.center);
      expect(body.children[1].columns, 4);
      expect(body.children[1].gap, 24);
      expect(body.children[1].children.single.text, 'A');
      expect(body.gap, 8);
    });

    test('a page without tablet changes is read once', () {
      final plain = StudioPage.tryParse({
        'body': {'id': 'root', 'type': 'column', 'children': []},
      })!;
      expect(plain.tabletBody, isNull);
      expect(plain.bodyFor(1024), same(plain.body));
    });
  });
}
