import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/config/build_config_json.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/l10n/vertical_wording.dart';

import '../../tool/src/build_config_tool.dart';
import '../support/fixtures.dart';

Map<String, dynamic> example() =>
    jsonDecode(File('config/example.json').readAsStringSync())
        as Map<String, dynamic>;

void main() {
  // Roadmap 20: the kind of business on top of the app type.
  group('vertical', () {
    test('reads known values; anything else is none', () {
      expect(AppVertical.fromWire('restaurant'), AppVertical.restaurant);
      expect(AppVertical.fromWire('charity'), AppVertical.charity);
      expect(AppVertical.fromWire('salon'), isNull);
      expect(AppVertical.fromWire(null), isNull);
      expect(AppVertical.fromWire(3), isNull);
    });

    test('matches the build config schema', () {
      final schema = jsonDecode(
        File('../docs/build-config.schema.json').readAsStringSync(),
      ) as Map<String, dynamic>;
      final property =
          (schema['properties'] as Map<String, dynamic>)['vertical']
              as Map<String, dynamic>;
      expect(property['enum'], verticals);
      expect(AppVertical.values.map((v) => v.name), verticals);
    });

    test('comes from Config, null on older servers', () {
      expect(AppConfig.fromJson(configJson()).vertical, isNull);
      final json = configJson()..['vertical'] = 'clinic';
      expect(AppConfig.fromJson(json).vertical, AppVertical.clinic);
      json['vertical'] = 'news';
      expect(AppConfig.fromJson(json).vertical, isNull);
    });

    test('comes from the build config, and Config wins', () {
      final plain = buildConfigFromJson({'app_type': 'store'});
      expect(plain.vertical, isNull);
      final built = buildConfigFromJson({
        'app_type': 'store',
        'vertical': 'restaurant',
      });
      expect(built.appType, AppType.store);
      expect(built.vertical, AppVertical.restaurant);
      expect(
        built.copyWith(siteUrl: 'https://x.test').vertical,
        AppVertical.restaurant,
      );
      expect(appVerticalOf(built, null), AppVertical.restaurant);
      final config = AppConfig.fromJson(configJson()..['vertical'] = 'fitness');
      expect(appVerticalOf(built, config), AppVertical.fitness);
      expect(appVerticalOf(plain, AppConfig.fromJson(configJson())), isNull);
    });

    test('the build tool checks and renders it', () {
      expect(
        validateBuildConfig(example()..['vertical'] = 'clinic').isValid,
        isTrue,
      );
      expect(
        validateBuildConfig(example()..['vertical'] = 'salon').errors.join(),
        contains('"vertical" must be one of restaurant, clinic, fitness'),
      );
      expect(renderDartConfig(example()), contains('vertical: null,'));
      expect(
        renderDartConfig(example()..['vertical'] = 'charity'),
        contains('vertical: AppVertical.charity,'),
      );
    });

    test('clinics have their own words, every other kind the default', () {
      for (final code in ['en', 'ar', 'tr']) {
        final l10n = lookupAppLocalizations(Locale(code));
        for (final vertical in [null, ...AppVertical.values]) {
          final wording = VerticalWording(l10n, vertical);
          final clinic = vertical == AppVertical.clinic;
          expect(wording.isClinic, clinic);
          expect(
            wording.business,
            clinic ? l10n.wordingClinic : l10n.wordingBusiness,
          );
          expect(
            wording.customer,
            clinic ? l10n.wordingPatient : l10n.wordingCustomer,
          );
          expect(
            wording.appointments,
            clinic ? l10n.clinicVisits : l10n.tabAppointments,
          );
          expect(
            wording.bookAppointment,
            clinic ? l10n.clinicBookVisit : l10n.bookAppointment,
          );
          expect(
            wording.ourTeam,
            clinic ? l10n.clinicOurDoctors : l10n.ourTeam,
          );
        }
      }
      final clinic = VerticalWording(
        lookupAppLocalizations(const Locale('en')),
        AppVertical.clinic,
      );
      expect(clinic.customer, 'Patient');
      expect(clinic.appointments, 'Visits');
      expect(clinic.nextAppointment, 'Your next visit');
      expect(clinic.anyone, 'Any doctor');
      expect(clinic.staffHeading, 'Doctor');
      final tr = VerticalWording(
        lookupAppLocalizations(const Locale('tr')),
        AppVertical.clinic,
      );
      expect(tr.customer, 'Hasta');
      final ar = VerticalWording(
        lookupAppLocalizations(const Locale('ar')),
        AppVertical.clinic,
      );
      expect(ar.appointments, 'الزيارات');
      final en = VerticalWording(
        lookupAppLocalizations(const Locale('en')),
        null,
      );
      expect(en.business, 'Business');
      expect(en.customer, 'Customer');
    });
  });
}
