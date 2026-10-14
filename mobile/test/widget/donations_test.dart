import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/services/push_registration.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/core/web/web_page_screen.dart';
import 'package:yallapp/modules/donations/data/donations_providers.dart';
import 'package:yallapp/modules/shared/pages/page_actions.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi charityApi({
  String iosMode = 'browser',
  bool monthly = false,
  bool updatesPush = true,
}) => FakeApi(
  config: {
    ...configJson(lms: null),
    'vertical': 'charity',
    'donations': donationsConfigJson(
      iosMode: iosMode,
      monthly: monthly,
      updatesPush: updatesPush,
    ),
  },
);

TestApp charityApp(
  FakeApi api, {
  DevicePlatform platform = DevicePlatform.android,
  bool signedIn = false,
  AppTemplate template = AppTemplate.classic,
  Map<String, Object> preferences = const {},
  List<String>? opened,
  bool push = false,
}) => TestApp(
  api: api,
  appType: AppType.donations,
  platform: platform,
  signedIn: signedIn,
  guest: !signedIn,
  template: template,
  preferences: preferences,
  overrides: [
    if (opened != null)
      openExternalProvider.overrideWithValue((url) async {
        opened.add(url);
        return true;
      }),
    if (push) pushEnabledProvider.overrideWithValue(true),
  ],
);

void usePhone(WidgetTester tester, [Size size = const Size(390, 844)]) {
  final view = tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> openCampaign(
  TestApp app,
  WidgetTester tester, [
  int id = 1,
]) async {
  app.container.read(appRouterProvider).push(Paths.campaign(id));
  await TestApp.settle(tester);
}

Future<void> tapDonate(WidgetTester tester) async {
  final button = find.byKey(const ValueKey('donate-button'));
  await tester.ensureVisible(button);
  await TestApp.settle(tester);
  await tester.tap(button);
  await TestApp.settle(tester);
}

void main() {
  const sizes = {
    'small phone': Size(320, 568),
    'phone': Size(390, 844),
    'tablet': Size(768, 1024),
  };

  // Every Charity & donations screen on each size, template and theme: any
  // overflow or build error fails.
  for (final size in sizes.entries) {
    for (final template in AppTemplate.values) {
      for (final dark in [false, true]) {
        final name =
            'charity screens: ${size.key}, ${template.name}, '
            '${dark ? 'dark' : 'light'}';
        testWidgets(name, (tester) async {
          usePhone(tester, size.value);
          final app = charityApp(
            charityApi(),
            signedIn: true,
            template: template,
            preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
          );
          void clean(String step) =>
              expect(tester.takeException(), isNull, reason: step);

          await app.pump(tester);
          clean('campaigns');
          expect(find.text('Campaigns'), findsWidgets);
          expect(find.text('Winter food parcels'), findsOneWidget);
          expect(find.text('₺168,450.00 of ₺250,000.00'), findsOneWidget);
          expect(find.text('412 donors'), findsOneWidget);

          await openCampaign(app, tester);
          clean('campaign');
          expect(find.text('Choose an amount'), findsOneWidget);
          expect(find.text('₺300'), findsOneWidget);
          await tester.scrollUntilVisible(
            find.text('Recent donations'),
            300,
            scrollable: find.byType(Scrollable).first,
          );
          clean('campaign end');
          expect(find.text('Anonymous'), findsOneWidget);
          app.container.read(appRouterProvider).pop();
          await TestApp.settle(tester);

          await tester.tap(find.bySemanticsLabel('My donations').last);
          await TestApp.settle(tester);
          clean('my donations');
          expect(find.text('₺300.00'), findsOneWidget);
          expect(find.text('Receipt'), findsOneWidget);
        });
      }
    }
  }

  testWidgets('on iPhone the donation page always opens in the browser', (
    tester,
  ) async {
    usePhone(tester);
    final api = charityApi()..donationOpenIn = 'browser';
    final opened = <String>[];
    final app = charityApp(api, platform: DevicePlatform.ios, opened: opened);
    await app.pump(tester);
    await openCampaign(app, tester);
    expect(find.text('Donate on our website'), findsOneWidget);
    expect(find.textContaining('in your browser'), findsOneWidget);
    await tapDonate(tester);
    expect(opened, ['https://yallapp.com.tr/give/token-1']);
    expect(find.byType(WebPageScreen), findsNothing);
    expect(app.webViews.requests, isEmpty);
    expect(api.donationRequests.single.toJson(), {
      'campaign_id': 1,
      'amount': '300.00',
      'recurring': 'none',
      'anonymous': false,
    });

    // Even when a server says otherwise, an iPhone never opens it in the app.
    api.donationOpenIn = 'in_app';
    await tapDonate(tester);
    expect(opened, hasLength(2));
    expect(find.byType(WebPageScreen), findsNothing);
    expect(app.webViews.requests, isEmpty);
  });

  testWidgets('an iPhone app set to take no donations shows no button', (
    tester,
  ) async {
    usePhone(tester);
    final app = charityApp(
      charityApi(iosMode: 'off'),
      platform: DevicePlatform.ios,
    );
    await app.pump(tester);
    await openCampaign(app, tester);
    expect(find.byKey(const ValueKey('donate-button')), findsNothing);
    expect(find.text('Donate on our website'), findsNothing);
    expect(find.text('Winter food parcels'), findsOneWidget);
  });

  testWidgets('on Android the donation page opens in the app', (tester) async {
    usePhone(tester);
    final api = charityApi();
    final opened = <String>[];
    final app = charityApp(api, opened: opened);
    await app.pump(tester);
    await openCampaign(app, tester);
    // A chosen amount, anonymous, with a message.
    await tester.tap(find.text('₺600'));
    await tester.pump();
    final anonymous = find.text('Give anonymously');
    await tester.scrollUntilVisible(
      anonymous,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(anonymous);
    await tester.enterText(
      find.byKey(const ValueKey('donation-message')),
      'For the winter',
    );
    await tester.pump();
    expect(find.text('Donate ₺600'), findsOneWidget);
    await tapDonate(tester);
    expect(api.donationRequests.single.toJson(), {
      'campaign_id': 1,
      'amount': '600.00',
      'recurring': 'none',
      'anonymous': true,
      'message': 'For the winter',
    });
    expect(find.byType(WebPageScreen), findsOneWidget);
    expect(
      app.webViews.requests.map((r) => r.url.toString()),
      contains('https://yallapp.com.tr/give/token-1'),
    );
    expect(opened, isEmpty);
  });

  testWidgets('a browser link from the server opens the browser on Android', (
    tester,
  ) async {
    usePhone(tester);
    final api = charityApi()..donationOpenIn = 'browser';
    final opened = <String>[];
    final app = charityApp(api, opened: opened);
    await app.pump(tester);
    await openCampaign(app, tester);
    await tapDonate(tester);
    expect(opened, ['https://yallapp.com.tr/give/token-1']);
    expect(find.byType(WebPageScreen), findsNothing);
  });

  testWidgets('checks the amount before asking for a link', (tester) async {
    usePhone(tester);
    final api = charityApi();
    final app = charityApp(api);
    await app.pump(tester);
    await openCampaign(app, tester);
    await tester.enterText(find.byKey(const ValueKey('donation-amount')), '20');
    await tester.pump();
    await tapDonate(tester);
    expect(find.text('The smallest donation is ₺50.'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('donation-amount')), 'x');
    await tester.pump();
    await tapDonate(tester);
    expect(find.text('Enter an amount, like 250.'), findsOneWidget);
    expect(api.count('createDonationLink'), 0);

    await tester.enterText(
      find.byKey(const ValueKey('donation-amount')),
      '1.250,50',
    );
    await tester.pump();
    expect(find.text('Donate ₺1,250.50'), findsOneWidget);
    await tapDonate(tester);
    expect(api.donationRequests.single.amount, '1250.50');
  });

  testWidgets('an ended campaign takes no donations', (tester) async {
    usePhone(tester);
    final api = charityApi()..campaign = campaignJson(status: 'closed');
    final app = charityApp(api);
    await app.pump(tester);
    await openCampaign(app, tester);
    expect(
      find.text('This campaign has ended. Thank you for your support.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('donate-button')), findsNothing);
  });

  testWidgets('My donations asks signed-out users to sign in', (tester) async {
    usePhone(tester);
    final app = charityApp(charityApi());
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('My donations').last);
    await TestApp.settle(tester);
    expect(
      find.text('Sign in to see your donations and their receipts.'),
      findsOneWidget,
    );
    expect(app.api.count('listMyDonations'), 0);
  });

  testWidgets('opens a donation\'s receipt in the browser', (tester) async {
    usePhone(tester);
    final opened = <String>[];
    final app = charityApp(charityApi(), signedIn: true, opened: opened);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('My donations').last);
    await TestApp.settle(tester);
    expect(find.textContaining('D-1042'), findsOneWidget);
    await tester.tap(find.text('Receipt'));
    await TestApp.settle(tester);
    expect(opened, [
      'https://yallapp.com.tr/receipts/abc123abc123abc123abc123',
    ]);
  });

  testWidgets('Settings offers campaign updates, off until turned on', (
    tester,
  ) async {
    usePhone(tester);
    final app = charityApp(charityApi(), signedIn: true, push: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.text('Campaign updates'), findsOneWidget);
    expect(
      app.container.read(localSettingsProvider).notifications.donations,
      isFalse,
    );
    await tester.tap(find.text('Campaign updates'));
    await TestApp.settle(tester);
    expect(
      app.container.read(localSettingsProvider).notifications.donations,
      isTrue,
    );
    await tester.pump(const Duration(seconds: 2));
  });

  testWidgets('no campaign updates switch when the charity doesn\'t push', (
    tester,
  ) async {
    usePhone(tester);
    final quiet = charityApp(
      charityApi(updatesPush: false),
      signedIn: true,
      push: true,
    );
    await quiet.pump(tester);
    quiet.container.read(appRouterProvider).push(Paths.settings);
    await TestApp.settle(tester);
    expect(find.text('Campaign updates'), findsNothing);
    await tester.pump(const Duration(seconds: 2));
  });

  test('reads donation models, links and amounts', () {
    final config = DonationsConfig.fromJson(donationsConfigJson());
    expect(config.iosMode, IosDonationMode.browser);
    expect(config.monthly, isFalse);
    expect(
      DonationsConfig.fromJson(donationsConfigJson(iosMode: 'off')).iosMode,
      IosDonationMode.off,
    );
    final campaign = Campaign.fromJson(campaignJson());
    expect(campaign.presetAmounts, ['150.00', '300.00', '600.00', '1200.00']);
    expect(campaign.recentDonations.last.name, isNull);
    expect(campaign.progress, closeTo(0.6738, 0.0001));
    expect(
      CampaignSummary.fromJson(campaignSummaryJson(goal: null)).progress,
      isNull,
    );
    final donation = Donation.fromJson(donationJson());
    expect(donation.reference, 'D-1042');
    expect(parseAmount('250'), '250.00');
    expect(parseAmount('1.250,5'), '1250.50');
    expect(parseAmount('1,250'), '1250.00');
    expect(parseAmount('0'), isNull);
    expect(parseAmount('abc'), isNull);
    expect(centsOf('75.50'), 7550);
    expect(formatAmount('1200.00', 'TRY'), '₺1,200');
    expect(formatAmount('75.5', 'EUR'), '€75.50');
    expect(
      isDonationDone(Uri.parse('https://yallapp.com.tr/give/abc/thank-you')),
      isTrue,
    );
    expect(
      isDonationDone(Uri.parse('https://yallapp.com.tr/give/abc')),
      isFalse,
    );

    expect(
      pushTargetLocation({'type': 'campaign_update', 'campaign_id': '3'}),
      '/campaign/3',
    );
    final inbox = InboxNotification.fromJson({
      'id': 4,
      'title': 'We reached our goal',
      'body': 'Thank you!',
      'type': 'campaign_update',
      'campaign_id': 3,
      'created_at': '2026-10-13T08:00:00Z',
      'read': false,
    });
    expect(inbox.type, NotificationType.campaignUpdate);
    expect(pushTargetLocation(inbox.target), '/campaign/3');
    expect(const NotificationPreferences().toJson()['donations'], isFalse);
    expect(
      itemLocation(
        const ItemRef(source: ItemSource.campaigns, id: '3'),
        AppType.donations,
      ),
      '/campaign/3',
    );
    expect(
      itemLocation(
        const ItemRef(source: ItemSource.campaigns, id: '3'),
        AppType.news,
      ),
      isNull,
    );
  });
}
