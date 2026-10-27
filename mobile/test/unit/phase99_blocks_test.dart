import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart';

import '../support/fixtures.dart';

/// 99.4 Answers `POST /forms/{slug}/{block_id}` with [status] and [body],
/// and records what the app sent.
class FormsServer implements HttpClientAdapter {
  int status = 202;
  Object? body;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      body == null ? '' : jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Map<String, dynamic> formJson({
  String sendTo = 'email',
  List<Map<String, dynamic>>? fields,
}) => {
  'id': 'f1',
  'type': 'form',
  'title': 'Book a visit',
  'send_to': sendTo,
  'submit_label': null,
  'success_text': 'Thanks, we will call you.',
  'fields':
      fields ??
      [
        {'id': 'name', 'kind': 'text', 'label': 'Name', 'required': true},
        {'id': 'email', 'kind': 'email', 'label': 'Email', 'required': false},
        {'id': 'phone', 'kind': 'phone', 'label': 'Phone', 'required': false},
        {
          'id': 'people',
          'kind': 'number',
          'label': 'People',
          'required': false,
        },
        {
          'id': 'day',
          'kind': 'choice',
          'label': 'Day',
          'required': false,
          'options': ['Saturday', 'Sunday'],
        },
        {
          'id': 'note',
          'kind': 'long_text',
          'label': 'Anything else',
          'required': false,
        },
      ],
};

PageBlock? block(Map<String, dynamic> json) => PageBlock.tryParse(json);

void main() {
  group('99.4 blocks', () {
    test('cards, gallery, map, divider and form parse', () {
      final page = AppPage.fromJson(
        appPageJson(
          blocks: [
            {
              'id': 'c1',
              'type': 'cards',
              'title': 'What we offer',
              'columns': 3,
              'cards': [
                {
                  'title': 'Yoga',
                  'text': 'Every morning',
                  'image_url': 'https://cdn.example.com/yoga.jpg',
                  'action': {'type': 'screen', 'screen': 'classes'},
                },
                {'title': 'Pilates'},
              ],
            },
            {
              'id': 'g1',
              'type': 'gallery',
              'images': [
                {
                  'image_url': 'https://cdn.example.com/1.jpg',
                  'caption': 'The hall',
                },
                {'image_url': 'https://cdn.example.com/2.jpg'},
              ],
            },
            {
              'id': 'm1',
              'type': 'map',
              'latitude': 40.98,
              'longitude': 29.03,
              'name': 'Moda branch',
              'address': 'Moda Cd. 1, Kadıköy',
              'label': null,
            },
            {'id': 'd1', 'type': 'divider', 'style': 'dots'},
            formJson(),
          ],
        ),
      );
      expect(page.blocks.map((b) => b.runtimeType.toString()), [
        'CardsBlock',
        'GalleryBlock',
        'MapBlock',
        'DividerBlock',
        'FormBlock',
      ]);
      final cards = page.blocks[0] as CardsBlock;
      expect(cards.columns, 3);
      expect(cards.cards.map((c) => c.title), ['Yoga', 'Pilates']);
      expect(cards.cards.first.action!.screen, BuiltInScreen.classes);
      expect(cards.cards.last.imageUrl, isNull);
      final gallery = page.blocks[1] as GalleryBlock;
      expect(gallery.columns, 3);
      expect(gallery.images.first.caption, 'The hall');
      final map = page.blocks[2] as MapBlock;
      expect((map.latitude, map.longitude), (40.98, 29.03));
      expect(map.name, 'Moda branch');
      expect(map.label, isNull);
      expect((page.blocks[3] as DividerBlock).style, DividerStyle.dots);
      final form = page.blocks[4] as FormBlock;
      expect(form.sendTo, FormSendTo.email);
      expect(form.fields.map((f) => f.kind), [
        FormFieldKind.text,
        FormFieldKind.email,
        FormFieldKind.phone,
        FormFieldKind.number,
        FormFieldKind.choice,
        FormFieldKind.longText,
      ]);
      expect(form.fields.first.required, isTrue);
      expect(form.fields[4].options, ['Saturday', 'Sunday']);
      expect(form.successText, 'Thanks, we will call you.');
    });

    test('entries the app cannot use are skipped; a block left with '
        'nothing is skipped', () {
      final cards =
          block({
                'id': 'c',
                'type': 'cards',
                'columns': 5,
                'cards': [
                  {'title': ' '},
                  {'text': 'No title'},
                  'not a card',
                  {'title': 'Kept'},
                ],
              })!
              as CardsBlock;
      expect(cards.cards.single.title, 'Kept');
      // An unknown number of columns: the default.
      expect(cards.columns, 2);
      final gallery =
          block({
                'id': 'g',
                'type': 'gallery',
                'columns': 2,
                'images': [
                  {'caption': 'No picture'},
                  {'image_url': 'https://cdn.example.com/1.jpg'},
                ],
              })!
              as GalleryBlock;
      expect(gallery.images, hasLength(1));
      expect(gallery.columns, 2);

      for (final json in [
        {'id': 'a', 'type': 'cards', 'cards': []},
        {'id': 'b', 'type': 'cards'},
        {
          'id': 'c',
          'type': 'gallery',
          'images': [
            {'caption': 'x'},
          ],
        },
        {'id': 'd', 'type': 'map', 'latitude': 41},
        {'id': 'e', 'type': 'map', 'latitude': 91, 'longitude': 29},
        {'id': 'f', 'type': 'map', 'latitude': 'NaN', 'longitude': 29},
        {'id': 'g', 'type': 'map', 'latitude': 41, 'longitude': -181},
        formJson(sendTo: 'fax'),
        formJson(fields: []),
        formJson(
          fields: [
            {'id': 'bad id!', 'kind': 'text', 'label': 'A', 'required': true},
            {'id': 'b', 'kind': 'signature', 'label': 'B', 'required': true},
            {'id': 'c', 'kind': 'text', 'label': ' ', 'required': true},
            {'id': 'd', 'kind': 'choice', 'label': 'D', 'options': []},
          ],
        ),
      ]) {
        expect(block(json), isNull, reason: '${json['id']}');
      }
      // Map coordinates may come as text; an unknown line style is a line.
      expect(
        block({
          'id': 'm',
          'type': 'map',
          'latitude': '41.0',
          'longitude': '29.0',
        }),
        isA<MapBlock>(),
      );
      expect(
        (block({'id': 'd', 'type': 'divider', 'style': 'wavy'})!
                as DividerBlock)
            .style,
        DividerStyle.line,
      );
    });

    test('a form keeps the fields it can read, once each', () {
      final form =
          block(
                formJson(
                  sendTo: 'chat',
                  fields: [
                    {
                      'id': 'name',
                      'kind': 'text',
                      'label': 'Name',
                      'required': true,
                    },
                    {'id': 'name', 'kind': 'email', 'label': 'Again'},
                    {'id': 'x', 'kind': 'hologram', 'label': 'X'},
                    {
                      'id': 'size',
                      'kind': 'choice',
                      'label': 'Size',
                      'options': ['S', '', 'M', 'S'],
                    },
                  ],
                ),
              )!
              as FormBlock;
      expect(form.sendTo, FormSendTo.chat);
      expect(form.fields.map((f) => f.id), ['name', 'size']);
      expect(form.fields.last.options, ['S', 'M']);
      expect(form.fields.last.required, isFalse);
    });
  });

  group('99.4 form rules', () {
    final form = block(formJson())! as FormBlock;
    PageFormField field(String id) => form.fields.firstWhere((f) => f.id == id);

    test('each kind is checked as the server checks it', () {
      expect(field('name').problem('  '), FormProblem.missing);
      expect(field('name').problem(' Ayşe '), isNull);
      expect(field('email').problem(''), isNull);
      expect(field('email').problem('ayse@example'), FormProblem.email);
      expect(field('email').problem('ayse example.com'), FormProblem.email);
      expect(field('email').problem('ayse@example.com'), isNull);
      expect(field('phone').problem('+90 (532) 123-45-67'), isNull);
      expect(field('phone').problem('12345'), FormProblem.phone);
      expect(field('phone').problem('call me 5321234567'), FormProblem.phone);
      expect(field('phone').problem('1' * 21), FormProblem.phone);
      expect(field('people').problem('4'), isNull);
      expect(field('people').problem('-2.5'), isNull);
      expect(field('people').problem('four'), FormProblem.number);
      expect(field('people').problem('Infinity'), FormProblem.number);
      expect(field('day').problem('Sunday'), isNull);
      expect(field('day').problem('Monday'), FormProblem.choice);
      expect(field('note').problem('Line one\nline two'), isNull);
    });

    test('the answers to send are trimmed; empty ones are left out', () {
      final check = form.check({
        'name': ' Ayşe ',
        'email': '',
        'people': '3',
        'day': 'Sunday',
      });
      expect(check.ok, isTrue);
      expect(check.answers, {'name': 'Ayşe', 'people': '3', 'day': 'Sunday'});

      final wrong = form.check({'email': 'nope', 'phone': '12'});
      expect(wrong.ok, isFalse);
      expect(wrong.problems, {
        'name': FormProblem.missing,
        'email': FormProblem.email,
        'phone': FormProblem.phone,
      });
    });

    test('a form with nothing filled in asks for its first field', () {
      final optional =
          block(
                formJson(
                  fields: [
                    {'id': 'a', 'kind': 'text', 'label': 'A'},
                    {'id': 'b', 'kind': 'text', 'label': 'B'},
                  ],
                ),
              )!
              as FormBlock;
      expect(optional.check({}).problems, {'a': FormProblem.missing});
      expect(optional.check({'b': 'x'}).ok, isTrue);
    });

    test('the chat message: the title, then a line per answer', () {
      expect(
        form.chatText({'name': 'Ayşe', 'day': 'Sunday'}),
        'Book a visit\nName: Ayşe\nDay: Sunday',
      );
    });

    test("the server's message for each field", () {
      expect(
        FormBlock.fieldErrors({
          'fields': {'email': 'Please enter a valid email address.', 'x': 3},
        }),
        {'email': 'Please enter a valid email address.'},
      );
      expect(FormBlock.fieldErrors(null), isEmpty);
      expect(FormBlock.fieldErrors({'fields': 'none'}), isEmpty);
    });
  });

  group('99.4 directions', () {
    const place = MapBlock(
      id: 'm',
      latitude: 40.98,
      longitude: 29.03,
      name: 'Moda branch',
    );

    test('Apple Maps on iPhone', () {
      expect(directionsLinks(place, ios: true), [
        'https://maps.apple.com/?daddr=40.98,29.03',
      ]);
    });

    test("elsewhere the phone's maps, then Google Maps on the web", () {
      expect(directionsLinks(place, ios: false), [
        'geo:40.98,29.03?q=40.98,29.03(Moda%20branch)',
        'https://www.google.com/maps/dir/?api=1&destination=40.98,29.03',
      ]);
      const unnamed = MapBlock(id: 'm', latitude: -33.5, longitude: 151);
      expect(
        directionsLinks(unnamed, ios: false).first,
        'geo:-33.5,151.0?q=-33.5,151.0',
      );
    });
  });

  group('POST /forms/{slug}/{block_id}', () {
    late FormsServer server;
    late HttpYallappApi api;

    setUp(() {
      server = FormsServer();
      final dio = createHttpClient(
        baseUrl: 'https://x.test/wp-json/yallapp/v1',
        tokens: TokenManager(
          store: MemoryTokenStore(null),
          refresh: (_) async => throw UnimplementedError(),
        ),
        adapter: server,
      );
      api = HttpYallappApi(
        dio: dio,
        refreshDio: Dio(),
        platform: DevicePlatform.android,
        appVersion: '1.0.0',
      );
    });

    test('sends the answers to the page and block', () async {
      await api.sendFormAnswers('contact-us', 'f1', {'name': 'Ayşe'});
      final request = server.requests.single;
      expect(request.method, 'POST');
      expect(request.uri.path, '/wp-json/yallapp/v1/forms/contact-us/f1');
      expect(request.data, {
        'answers': {'name': 'Ayşe'},
      });
    });

    test('invalid_answers carries a message for each field', () async {
      server
        ..status = 400
        ..body = {
          'code': 'invalid_answers',
          'message': 'Some answers need a change.',
          'details': {
            'fields': {'email': 'Please enter a valid email address.'},
          },
        };
      try {
        await api.sendFormAnswers('home', 'f1', {'email': 'x'});
        fail('expected an ApiException');
      } on ApiException catch (e) {
        expect(e.code, 'invalid_answers');
        expect(FormBlock.fieldErrors(e.details), {
          'email': 'Please enter a valid email address.',
        });
      }
    });
  });
}
