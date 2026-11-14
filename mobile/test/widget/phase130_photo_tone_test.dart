import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 130.61 A Studio photo in black and white (`tone` mono), as Monochrome
/// luxe draws its photos: a picture, a photo hero and a parallax banner
/// each under a grey colour filter; a photo without a tone (every page saved
/// before) in its colours, by day and by night.
void main() {
  Map<String, dynamic> home() => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {
            'id': 'cover',
            'type': 'photo_hero',
            'image_url': 'https://example.com/cover.jpg',
            'tone': 'mono',
            'height': 300,
            'children': [
              {'id': 'cover-title', 'type': 'text', 'text': 'Cover'},
            ],
          },
          {
            'id': 'picture',
            'type': 'image',
            'image_url': 'https://example.com/picture.jpg',
            'tone': 'mono',
            'height': 160,
          },
          {
            'id': 'banner',
            'type': 'parallax_banner',
            'image_url': 'https://example.com/banner.jpg',
            'tone': 'mono',
            'height': 220,
          },
          {
            'id': 'plain',
            'type': 'image',
            'image_url': 'https://example.com/plain.jpg',
            'height': 160,
          },
        ],
      },
    },
  };

  FakeApi api(String mode) =>
      FakeApi(
          config: configJson(
            languages: languagesJson(),
            appearance: appearanceJson(themeMode: mode),
          ),
        )
        ..navigation = navigationJson(
          tabs: [
            navTabJson('home', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('account', 'Account', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
        ..pages = {'home': home()};

  test('reads the tone: mono only, anything else in colour', () {
    StudioNode node(Object? tone) => StudioNode.tryParse({
      'id': 'a',
      'type': 'image',
      'image_url': 'https://example.com/a.jpg',
      'tone': ?tone,
    })!;
    expect(node('mono').monoTone, isTrue);
    expect(node('sepia').monoTone, isFalse);
    expect(node(null).monoTone, isFalse);
  });

  for (final mode in ['light', 'dark']) {
    testWidgets('draws the photos in black and white ($mode)', (tester) async {
      await TestApp(
        appType: AppType.lms,
        api: api(mode),
        signedIn: true,
      ).pump(tester);
      await TestApp.settle(tester, 20);
      for (final id in ['cover', 'picture', 'banner']) {
        expect(
          find.byKey(ValueKey('studio-tone-$id'), skipOffstage: false),
          findsOneWidget,
          reason: id,
        );
      }
      // A photo without a tone keeps its colours.
      expect(
        find.byKey(const ValueKey('studio-tone-plain'), skipOffstage: false),
        findsNothing,
      );
      final filter = tester.widget<ColorFiltered>(
        find.byKey(const ValueKey('studio-tone-cover'), skipOffstage: false),
      );
      expect(filter.colorFilter, isNotNull);
      expect(tester.takeException(), isNull);
    });
  }
}
