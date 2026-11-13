import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;
import 'package:yallapp/modules/taxi/data/taxi_providers.dart';
import 'package:yallapp/core/api/models/models.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_fixtures.dart';
import '../support/parent_fixtures.dart';
import '../support/test_app.dart';
import 'phase105_2_test.dart' show FakeLocator;
import 'phase105_4_test.dart' show schoolApi;

/// 128.10 Review fixes to the Studio demos' new elements: existing pages
/// keep their look (a transparent header over anything but a cover, a
/// colour over an element without a picture outside a cover, a row of
/// texts, a list ending above a floating bar), and the live elements show
/// nothing of the person's signed out or with nothing to show.
void main() {
  Map<String, dynamic> text(
    String id,
    String value, [
    Map<String, dynamic> extra = const {},
  ]) => {'id': id, 'type': 'text', 'text': value, ...extra};

  Map<String, dynamic> studio(
    List<Map<String, dynamic>> children, {
    Map<String, dynamic>? header,
  }) => {
    ...appPageJson(blocks: []),
    'studio': {
      'header': ?header,
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  FakeApi api(
    List<Map<String, dynamic>> children, {
    Map<String, dynamic>? header,
    Map<String, dynamic>? tabBar,
  }) => FakeApi(config: configJson())
    ..navigation = {
      ...navigationJson(
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
      ),
      'tab_bar': ?tabBar,
    }
    ..pages = {'home': studio(children, header: header)};

  /// A phone with a 40 px status bar.
  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2
      ..padding = const FakeViewPadding(top: 80, bottom: 68)
      ..viewPadding = const FakeViewPadding(top: 80, bottom: 68);
    addTearDown(tester.view.reset);
  }

  Future<void> open(
    WidgetTester tester,
    FakeApi fake, {
    AppType type = AppType.lms,
    bool signedIn = true,
    List<Object> overrides = const [],
  }) async {
    await TestApp(
      appType: type,
      api: fake,
      signedIn: signedIn,
      guest: !signedIn,
      overrides: [
        pageClockProvider.overrideWithValue(() => DateTime(2026, 11, 2, 8, 10)),
        ...overrides.cast(),
      ],
    ).pump(tester);
    await TestApp.settle(tester, 20);
  }

  bool markShown(WidgetTester tester) {
    final header = find.byKey(const ValueKey('studio-header-transparent'));
    expect(header, findsOneWidget);
    return find
            .descendant(
              of: header,
              matching: find.byKey(const ValueKey('studio-header-logo')),
            )
            .evaluate()
            .isNotEmpty ||
        find
            .descendant(of: header, matching: find.byType(Text))
            .evaluate()
            .isNotEmpty;
  }

  const transparent = {
    'type': 'transparent',
    'buttons': ['notifications'],
  };

  group('A transparent header', () {
    testWidgets('over anything but a cover: the page below the status bar, '
        'the buttons alone, as before', (tester) async {
      phone(tester);
      await open(
        tester,
        api([text('first', 'Welcome back')], header: transparent),
      );
      expect(tester.getRect(find.text('Welcome back')).top, 40);
      expect(markShown(tester), isFalse);
    });

    testWidgets(
      'over a cover: the cover under the status bar, the name on it',
      (tester) async {
        phone(tester);
        await open(
          tester,
          api([
            {
              'id': 'hero',
              'type': 'photo_hero',
              'height': 240,
              'children': [text('on', 'Real teachers.')],
            },
          ], header: transparent),
        );
        expect(
          tester.getRect(find.byKey(const ValueKey('studio-cover-hero'))).top,
          0,
        );
        expect(markShown(tester), isTrue);
      },
    );

    testWidgets('over a photo with a scrim (Rawaq, Nakhla): the same', (
      tester,
    ) async {
      phone(tester);
      await open(
        tester,
        api([
          {
            'id': 'photo',
            'type': 'stack',
            'height': 240,
            'image_background_url': 'https://cdn.test/library.jpg',
            'scrim': {'color': '#0E221B', 'from': 0.2, 'to': 0.9},
            'children': [text('on', 'Real teachers.')],
          },
        ], header: transparent),
      );
      expect(
        tester.getRect(find.byKey(const ValueKey('studio-node-photo'))).top,
        0,
      );
      expect(markShown(tester), isTrue);
    });
  });

  group('A colour over an element without a picture', () {
    Iterable<Color> colours(WidgetTester tester, String id) => tester
        .widgetList<DecoratedBox>(
          find.descendant(
            of: find.byKey(ValueKey('studio-node-$id')),
            matching: find.byType(DecoratedBox),
          ),
        )
        .map((b) => b.decoration)
        .whereType<BoxDecoration>()
        .map((d) => d.color)
        .whereType<Color>();

    testWidgets('is its see-through background inside a cover only', (
      tester,
    ) async {
      Map<String, dynamic> frosted(String id) => {
        'id': id,
        'type': 'row',
        'width': 40,
        'height': 40,
        'radius': 20,
        'overlay': {'color': '#FFFFFF', 'opacity': 0.18},
        'children': <Object>[],
      };
      await open(
        tester,
        api([
          frosted('outside'),
          {
            'id': 'hero',
            'type': 'photo_hero',
            'height': 200,
            'children': [frosted('inside')],
          },
        ]),
      );
      expect(colours(tester, 'outside'), isEmpty);
      expect(
        colours(tester, 'inside').map((c) => c.a),
        contains(closeTo(0.18, 0.01)),
      );
    });
  });

  group('A row of texts', () {
    const long =
        'A teacher with a name long enough to fill the whole row twice';

    testWidgets('its one text cut to its lines gives way to what follows', (
      tester,
    ) async {
      await open(
        tester,
        api([
          {
            'id': 'row',
            'type': 'row',
            'children': [
              text('teacher', long, {'max_lines': 1}),
              text('rating', '· 4.8'),
            ],
          },
        ]),
      );
      expect(tester.takeException(), isNull);
      expect(
        find.ancestor(of: find.text(long), matching: find.byType(Flexible)),
        findsOneWidget,
      );
      final row = tester.getRect(find.byKey(const ValueKey('studio-node-row')));
      expect(
        tester.getRect(find.text('· 4.8')).right,
        lessThanOrEqualTo(row.right),
      );
    });

    testWidgets('two such texts: neither gives way (each as before)', (
      tester,
    ) async {
      await open(
        tester,
        api([
          {
            'id': 'row',
            'type': 'row',
            'children': [
              text('a', 'Omar', {'max_lines': 1}),
              text('b', 'Farouk', {'max_lines': 1}),
            ],
          },
        ]),
      );
      expect(
        find.ancestor(of: find.text('Omar'), matching: find.byType(Flexible)),
        findsNothing,
      );
      expect(
        find.ancestor(of: find.text('Farouk'), matching: find.byType(Flexible)),
        findsNothing,
      );
    });

    testWidgets('a row inside another row, and in a grid, lays out', (
      tester,
    ) async {
      Map<String, dynamic> inner(String id) => {
        'id': id,
        'type': 'row',
        'children': [
          text('$id-name', 'Omar Farouk', {'max_lines': 1}),
          text('$id-rate', '· 4.8'),
        ],
      };
      await open(
        tester,
        api([
          {
            'id': 'outer',
            'type': 'row',
            'children': [inner('nested'), text('after', 'Next')],
          },
          {
            'id': 'grid',
            'type': 'grid',
            'columns': 2,
            'children': [inner('cell-a'), inner('cell-b')],
          },
        ]),
      );
      expect(tester.takeException(), isNull);
      // In the row of unbounded width, at its own width: nothing cut.
      expect(find.text('Omar Farouk'), findsNWidgets(3));
      final name = tester.getSize(
        find.byKey(const ValueKey('studio-node-nested-name')),
      );
      expect(name.width, greaterThan(40));
    });
  });

  group('A floating bar', () {
    double listEnd(WidgetTester tester) => tester
        .widget<ListView>(find.byKey(const ValueKey('studio-home')))
        .padding!
        .resolve(TextDirection.ltr)
        .bottom;

    testWidgets('the page ends above it', (tester) async {
      await open(
        tester,
        api([text('a', 'Last line')], tabBar: {'design': 'float'}),
      );
      final bar = tester.getRect(find.byKey(const ValueKey('nav-0-float')));
      // The bar's own height and its margin under the list's end.
      expect(listEnd(tester), greaterThanOrEqualTo(16 + bar.height + 12));
    });

    testWidgets('a bar across the bottom: the page as before', (tester) async {
      await open(
        tester,
        api([text('a', 'Last line')], tabBar: {'design': 'classic'}),
      );
      expect(listEnd(tester), 16);
    });
  });

  group('The live elements', () {
    testWidgets('signed out, the phone is not asked where it is (no taxis)', (
      tester,
    ) async {
      final locator = FakeLocator();
      await open(
        tester,
        api([
          {
            'id': 'map',
            'type': 'map_header',
            'height': 300,
            'map_drawing': {'live': true, 'me': true},
            'children': <Object>[],
          },
        ]),
        type: AppType.rides,
        signedIn: false,
        overrides: [
          locatorProvider.overrideWithValue(locator),
          taxiConfigProvider.overrideWithValue(
            const TaxiConfig(
              map: TaxiMap(tilesUrl: 'https://tiles.example.com/{z}/{x}/{y}'),
              live: TaxiLive(
                databaseUrl: 'https://live.example.com',
                root: 'r',
              ),
            ),
          ),
        ],
      );
      expect(find.byKey(const ValueKey('studio-map-map')), findsOneWidget);
      expect(locator.reads, 0);
      expect(find.byKey(const ValueKey('studio-map-marker-0')), findsNothing);
    });

    testWidgets("a school day with nothing on it: no empty card; a child's "
        'chip without a name', (tester) async {
      final fake = schoolApi()
        ..navigation = navigationJson(
          tabs: [
            navTabJson('home', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('account', 'Me', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
        ..pages = {
          'home': studio([
            {
              'id': 'children',
              'type': 'school',
              'school': {'section': 'children'},
            },
            {
              'id': 'today',
              'type': 'school',
              'school': {'section': 'today'},
              'background': '#FFFFFF',
            },
          ]),
        }
        ..parentMe = {
          ...parentMeJson(),
          'children': [
            {...schoolStudentJson(name: '  '), 'slips_waiting': 0},
          ],
        }
        ..childDay = {
          ...childDayJson(),
          'checkin': null,
          'lessons': <Object>[],
          'bus': <Object>[],
        };
      await open(tester, fake, type: AppType.school);
      expect(tester.takeException(), isNull);
      expect(find.byKey(const ValueKey('studio-school-children')), findsOne);
      expect(find.byKey(const ValueKey('studio-node-today')), findsNothing);
    });
  });

  group('A cover with an element over its foot', () {
    Map<String, dynamic> hero(List<Map<String, dynamic>> children) => {
      'id': 'hero',
      'type': 'photo_hero',
      'height': 200,
      'overlap': 60,
      'children': children,
    };

    testWidgets('its last element hidden from this person: none hangs', (
      tester,
    ) async {
      await open(
        tester,
        api([
          hero([
            text('words', 'Over the photo'),
            {...text('card', 'For visitors'), 'visibility': 'signed_out'},
          ]),
          text('after', 'Next'),
        ]),
      );
      final cover = tester.getRect(
        find.byKey(const ValueKey('studio-cover-hero')),
      );
      // The words stay over the photo, not pulled over its foot.
      expect(tester.getRect(find.text('Over the photo')).top, lessThan(100));
      expect(find.text('For visitors'), findsNothing);
      expect(tester.getRect(find.text('Next')).top, cover.bottom);
    });

    testWidgets('an element shorter than how far it hangs: the cover whole', (
      tester,
    ) async {
      await open(
        tester,
        api([
          hero([
            text('words', 'Over the photo'),
            {'id': 'chip', 'type': 'row', 'height': 20, 'children': <Object>[]},
          ]),
          text('after', 'Next'),
        ]),
      );
      final cover = tester.getRect(
        find.byKey(const ValueKey('studio-cover-hero')),
      );
      expect(cover.height, 200);
      expect(tester.getRect(find.text('Next')).top, cover.bottom);
    });
  });

  group("The marketplace's address bar", () {
    Widget bar(Brightness brightness) => ProviderScope(
      overrides: [
        ...marketSampleOverrides,
        authControllerProvider.overrideWith(() => _Auth(const SignedOut())),
        appGateProvider.overrideWith(_Gate.new),
      ],
      child: MaterialApp(
        theme: buildAppTheme(
          primary: const Color(0xFF1E6B52),
          secondary: const Color(0xFFF2A93B),
          brightness: brightness,
          template: AppTemplate.bold,
          fontFamily: 'Manrope',
        ),
        supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(
          body: StudioPageView(
            pageSlug: 'home',
            page: StudioPage.tryParse({
              'body': {
                'id': 'root',
                'type': 'column',
                'children': [
                  {
                    'id': 'bar',
                    'type': 'market',
                    'market': {'section': 'address', 'style': 'bar'},
                    'color': '#1E6B52',
                  },
                ],
              },
            })!,
          ),
        ),
      ),
    );

    Color field(WidgetTester tester) =>
        (tester
                    .widget<Container>(
                      find.descendant(
                        of: find.byKey(const ValueKey('market-bar-search')),
                        matching: find.byType(Container),
                      ),
                    )
                    .decoration!
                as BoxDecoration)
            .color!;

    testWidgets('by night its search field in the theme, not white', (
      tester,
    ) async {
      await tester.pumpWidget(bar(Brightness.light));
      await tester.pump(const Duration(milliseconds: 300));
      expect(field(tester), Colors.white);
      await tester.pumpWidget(bar(Brightness.dark));
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull);
      expect(field(tester), isNot(Colors.white));
      expect(field(tester).computeLuminance(), lessThan(0.2));
    });
  });
}

/// The app's start, never reached here.
class _Gate extends AppGate {
  @override
  GateState build() => const GateLoading();
}

class _Auth extends AuthController {
  _Auth(this.start);

  final AuthState start;

  @override
  AuthState build() => start;
}
