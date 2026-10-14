import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/config/build_config_json.dart';
import 'package:yallapp/core/preview/preview.dart';

const _token =
    'p1.11111111-2222-4333-8444-555555555555.1792000000.0.abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ';

/// Answers like the platform's `GET /api/preview/{token}/config`, or the
/// app API for [HttpYallappApi], and records what was asked.
class _Server implements HttpClientAdapter {
  _Server(this.status, this.body);

  final int status;
  final Object body;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Map<String, dynamic> _previewJson({
  String source = 'hosted',
  Map<String, dynamic>? config,
}) => {
  'config':
      config ??
      {
        'schema_version': 1,
        'app_type': 'store',
        'app_name': 'Lale Flowers',
        'short_name': 'Lale',
        'site_url': 'https://yallapp.com.tr',
        'api_base_url': 'https://yallapp.com.tr/api/app/11111111-2222-4333-8444-555555555555',
        'android_package': 'com.example.preview',
        'ios_bundle_id': 'com.example.preview',
        'version_name': '1.0.0',
        'version_code': 1,
        'branding': {
          'primary_color': '#B0325A',
          'splash_color': '#FFF5F7',
          'template': 'bold',
          'font': 'Outfit',
          'icon_url': 'https://yallapp.com.tr/api/v1/assets/icon-1',
        },
      },
  'preview': {
    'app_id': '11111111-2222-4333-8444-555555555555',
    'expires_at': '2026-10-14T10:00:00.000Z',
    'content_source': source,
    'draft': true,
    'api_token': source == 'hosted' ? _token : null,
    'placeholders': ['android_package', 'ios_bundle_id'],
    'missing_steps': [
      {'step': 'listing', 'label': 'Store listing'},
    ],
  },
};

void main() {
  group('preview link', () {
    test('reads the token, the look and the language from the address', () {
      final launch = PreviewLaunch.fromUri(
        Uri.parse(
          'https://yallapp.com.tr/preview-app/index.html?token=$_token&theme=dark&lang=ar&r=2',
        ),
      )!;
      expect(launch.token, _token);
      expect(launch.themeMode, ThemeMode.dark);
      expect(launch.language, 'ar');

      final plain = PreviewLaunch.fromUri(Uri.parse('/x?token=$_token'))!;
      expect(plain.themeMode, isNull);
      expect(plain.language, isNull);
    });

    test('is missing without a usable token', () {
      expect(PreviewLaunch.fromUri(Uri.parse('/preview-app/')), isNull);
      expect(PreviewLaunch.fromUri(Uri.parse('/x?token=short')), isNull);
      expect(PreviewLaunch.fromUri(Uri.parse('/x?token=a%20b%3Cc')), isNull);
      final odd = PreviewLaunch.fromUri(
        Uri.parse('/x?token=$_token&theme=pink&lang=english'),
      )!;
      expect(odd.themeMode, isNull);
      expect(odd.language, isNull);
    });
  });

  group('build config at run time', () {
    test('reads the schema shape like the compiled config', () {
      final build = buildConfigFromJson(
        _previewJson()['config'] as Map<String, dynamic>,
      );
      expect(build.appType, AppType.store);
      expect(build.appName, 'Lale Flowers');
      expect(build.shortName, 'Lale');
      expect(build.primaryColor, 0xFFB0325A);
      expect(build.splashColor, 0xFFFFF5F7);
      expect(build.template, AppTemplate.bold);
      expect(build.font, 'Outfit');
      expect(build.iconUrl, 'https://yallapp.com.tr/api/v1/assets/icon-1');
      expect(
        apiUrlOf(build),
        'https://yallapp.com.tr/api/app/11111111-2222-4333-8444-555555555555',
      );
      expect(build.firebaseAndroid, isNull);
    });

    test('falls back to the defaults for what an unfinished setup lacks', () {
      final build = buildConfigFromJson({
        'app_type': 'real_estate',
        'site_url': 'https://academy.test/',
        'branding': {'primary_color': 'red', 'font': 'Comic Sans'},
      });
      expect(build.appType, AppType.realEstate);
      expect(build.appName, 'Your app');
      expect(build.shortName, 'Your app');
      expect(build.siteUrl, 'https://academy.test');
      expect(apiUrlOf(build), 'https://academy.test/wp-json/yallapp/v1');
      expect(build.primaryColor, 0xFF0E0D24);
      expect(build.font, 'Bricolage Grotesque');
      expect(build.template, AppTemplate.classic);
    });
  });

  group('preview config', () {
    test(
      'starts with the platform\'s config and the preview session',
      () async {
        final server = _Server(200, _previewJson());
        final start = await fetchPreview(
          PreviewLaunch(token: _token, themeMode: ThemeMode.light),
          platformUrl: 'https://yallapp.com.tr',
          http: Dio()..httpClientAdapter = server,
        );
        expect(
          server.requests.single.uri.toString(),
          'https://yallapp.com.tr/api/preview/$_token/config',
        );
        expect(start.build.appName, 'Lale Flowers');
        expect(start.session.contentSource, PreviewContentSource.hosted);
        expect(start.session.apiToken, _token);
        expect(start.session.draft, isTrue);
        expect(start.session.themeMode, ThemeMode.light);
        expect(start.session.platformUrl, 'https://yallapp.com.tr');
      },
    );

    test('says when the link expired, is broken or can\'t be read', () async {
      Future<PreviewProblem?> problem(int status, Object body) async {
        try {
          await fetchPreview(
            const PreviewLaunch(token: _token),
            platformUrl: 'https://yallapp.com.tr',
            http: Dio()..httpClientAdapter = _Server(status, body),
          );
          return null;
        } on PreviewException catch (e) {
          return e.problem;
        }
      }

      final error = {'code': 'x', 'message': 'x'};
      expect(await problem(410, error), PreviewProblem.expired);
      expect(await problem(403, error), PreviewProblem.invalid);
      expect(await problem(404, error), PreviewProblem.invalid);
      expect(await problem(429, error), PreviewProblem.unreachable);
      expect(
        await problem(200, ['not', 'a', 'config']),
        PreviewProblem.unreachable,
      );
    });

    test('knows apps without content yet', () {
      final start = previewStartFromJson(
        _previewJson(source: 'none'),
        platformUrl: 'https://yallapp.com.tr',
      );
      expect(start.session.contentSource, PreviewContentSource.none);
      expect(start.session.apiToken, isNull);
    });
  });

  group('the API in the preview', () {
    HttpYallappApi api(_Server server) => HttpYallappApi(
      dio: Dio(BaseOptions(baseUrl: 'https://site.test/wp-json/yallapp/v1'))
        ..httpClientAdapter = server,
      refreshDio: Dio(),
      platform: DevicePlatform.android,
      appVersion: '1.0.0',
      preview: true,
    );

    test('asks for a sign-in code with preview: true', () async {
      final server = _Server(200, {
        'request_id': 'r1',
        'code_length': 6,
        'resend_after_seconds': 60,
        'expires_in_seconds': 300,
      });
      await api(server).requestOtp(countryCode: '+90', phone: '5550001122');
      expect(server.requests.single.data, {
        'country_code': '+90',
        'phone': '5550001122',
        'preview': true,
      });
    });

    test('never opens a checkout', () async {
      final server = _Server(200, {'url': 'https://site.test/pay'});
      final preview = api(server);
      await expectLater(
        preview.createCheckoutLink(7),
        throwsA(
          isA<ApiException>().having(
            (e) => e.code,
            'code',
            ApiException.previewUnavailable,
          ),
        ),
      );
      await expectLater(
        preview.createStoreCheckoutLink(const []),
        throwsA(isA<ApiException>()),
      );
      expect(server.requests, isEmpty);
    });
  });
}
