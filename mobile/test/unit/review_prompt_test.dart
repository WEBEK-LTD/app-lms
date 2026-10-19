import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/services/review_prompt.dart';

/// 46 The rating prompt: the store's own, after good moments, never too early
/// or too often, never in the preview, off when the owner says so.
void main() {
  final now = DateTime.utc(2026, 10, 19, 12);

  bool ask({
    bool allowed = true,
    bool preview = false,
    int sessions = 5,
    int days = 10,
    List<DateTime> asked = const [],
  }) => ReviewPromptRules.shouldAsk(
    allowed: allowed,
    preview: preview,
    sessions: sessions,
    firstOpened: now.subtract(Duration(days: days)),
    asked: asked,
    now: now,
  );

  test('the rules', () {
    expect(ask(), isTrue);
    expect(ask(allowed: false), isFalse, reason: "the owner's switch");
    expect(ask(preview: true), isFalse, reason: 'never in the preview');
    expect(ask(sessions: 2), isFalse, reason: 'not before the third run');
    expect(ask(days: 1), isFalse, reason: 'not before two days');
    expect(
      ask(asked: [now.subtract(const Duration(days: 30))]),
      isFalse,
      reason: 'not again within 120 days',
    );
    expect(ask(asked: [now.subtract(const Duration(days: 121))]), isTrue);
    expect(
      ask(
        asked: [
          for (final d in [130, 260, 360]) now.subtract(Duration(days: d)),
        ],
      ),
      isFalse,
      reason: 'at most three times a year',
    );
  });

  group('the prompter', () {
    late SharedPreferences prefs;
    late int requests;
    var available = true;
    var allowed = true;
    var clock = now;

    ReviewPrompter prompter({bool preview = false}) => ReviewPrompter(
      preferences: prefs,
      allowed: () => allowed,
      preview: preview,
      isAvailable: () async => available,
      request: () async => requests++,
      clock: () => clock,
    );

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
      requests = 0;
      available = true;
      allowed = true;
      clock = now;
    });

    test(
      'asks after a good moment once the app has been used a while',
      () async {
        final p = prompter();
        await p.recordSession();
        expect(await p.goodMoment(GoodMoment.lessonCompleted), isFalse);
        clock = now.add(const Duration(days: 3));
        await p.recordSession();
        await p.recordSession();
        await Future<void>.delayed(Duration.zero);
        // The third run is a good moment itself.
        expect(requests, 1);
        expect(await p.goodMoment(GoodMoment.orderPlaced), isFalse);
        clock = now.add(const Duration(days: 130));
        expect(await p.goodMoment(GoodMoment.bookingMade), isTrue);
        expect(requests, 2);
        expect(p.asked, hasLength(2));
      },
    );

    test('never when the owner turned it off, in the preview, or when the '
        "store can't show it", () async {
      prefs
        ..setInt('review.sessions', 9)
        ..setString('review.first_opened', '2026-01-01T00:00:00Z');
      allowed = false;
      expect(await prompter().goodMoment(GoodMoment.donationMade), isFalse);
      allowed = true;
      expect(
        await prompter(preview: true).goodMoment(GoodMoment.ticketBooked),
        isFalse,
      );
      await prompter(preview: true).recordSession();
      expect(prefs.getInt('review.sessions'), 9, reason: 'no runs counted');
      available = false;
      expect(await prompter().goodMoment(GoodMoment.lessonCompleted), isFalse);
      expect(requests, 0);
    });

    test('counts one run per start however often the config loads', () {
      final p = prompter()
        ..recordSessionOnce()
        ..recordSessionOnce();
      return Future<void>.delayed(Duration.zero, () => expect(p.sessions, 1));
    });
  });
}
