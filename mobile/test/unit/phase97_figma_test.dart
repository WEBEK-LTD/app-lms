import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/theme/app_look.dart';

import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 97.3 The Figma look: its main color and logo come with the look, over
/// the app's branding.
void main() {
  test('the Figma look\'s main color and logo win over the branding', () {
    final figma = {
      ...appearanceJson(),
      'primary_color': '#1F4E5F',
      'logo_url': 'https://yallapp.example/api/v1/assets/9f1c2b6e-1d2f-4a3b-8c4d-5e6f7a8b9c0d',
    };
    final config = AppConfig.fromJson(configJson(appearance: figma));
    expect(config.appearance!.primaryColor, '#1F4E5F');
    expect(
      config.appearance!.logoUrl,
      endsWith('/api/v1/assets/9f1c2b6e-1d2f-4a3b-8c4d-5e6f7a8b9c0d'),
    );
    expect(AppLook.resolve(testBuild, config).primary, const Color(0xFF1F4E5F));

    // The standard look: the branding's color.
    final standard = AppConfig.fromJson(
      configJson(appearance: appearanceJson()),
    );
    expect(standard.appearance!.primaryColor, isNull);
    expect(
      AppLook.resolve(testBuild, standard).primary,
      isNot(const Color(0xFF1F4E5F)),
    );
  });
}
