import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/api/api_client.dart';
import 'package:yallapp_community/core/api/api_exception.dart';
import 'package:yallapp_community/core/api/community_api.dart';
import 'package:yallapp_community/core/api/models.dart';
import 'package:yallapp_community/features/badges/data/verification_api.dart';
import 'package:yallapp_community/features/notifications/data/notifications_api.dart';
import 'package:yallapp_community/features/qa/data/qa_api.dart';
import 'package:yallapp_community/features/qa/data/qa_models.dart';
import 'package:yallapp_community/features/search/data/search_api.dart';
import 'package:yallapp_community/features/tutorials/data/tutorials_api.dart';

/// 231 The app's real API clients (not the fakes) against a running
/// Community server: every call the app makes, and every model parsing the
/// server's real JSON.
///
/// Skipped unless `YC_CONTRACT_URL` names a server, e.g.:
///
///     YC_CONTRACT_URL=http://localhost:3310 flutter test test/contract
///
/// The server: the platform (base + Q&A + trust merged) with
/// `npx next dev -p 3310` on MySQL or MariaDB with the migrations applied
/// (`node scripts/migrate.mjs`). How to run it: test/contract/README.md.
final _server = Platform.environment['YC_CONTRACT_URL'] ?? '';

/// A community member with role admin on that server: a new member's posts
/// wait for a moderator, so the run approves them as one.
final _adminEmail = Platform.environment['YC_CONTRACT_ADMIN_EMAIL'] ?? '';
final _adminPassword = Platform.environment['YC_CONTRACT_ADMIN_PASSWORD'] ?? '';

/// A member of the run: their own client, signed in.
class _Member {
  _Member(String base) : client = ApiClient(baseUrl: base) {
    client.token = () => token;
    client.language = () => 'en';
  }

  final ApiClient client;
  String? token;
  late Profile me;

  CommunityApi get community => HttpCommunityApi(client);
  QaApi get qa => HttpQaApi(client);
  TutorialsApi get tutorials => HttpTutorialsApi(client);
  VerificationApi get verification => HttpVerificationApi(client);
  NotificationsApi get notifications => HttpNotificationsApi(client);
  SearchApi get search => HttpSearchApi(client);
}

void main() {
  final skip = _server.isEmpty || _adminEmail.isEmpty
      ? 'Set YC_CONTRACT_URL (a running Community server) and '
            'YC_CONTRACT_ADMIN_EMAIL/_PASSWORD (a member with role admin).'
      : null;
  final base = '${_server.replaceAll(RegExp(r'/+$'), '')}/api/community/v1';
  final run = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  late _Member admin;
  late _Member asker;
  late _Member answerer;
  late SectionRef section;
  late Question question;
  late Answer answer;

  setUpAll(() {
    // flutter_test answers every HTTP request with 400; this test talks to
    // a real server.
    HttpOverrides.global = null;
  });

  Future<_Member> signUp(String name) async {
    final m = _Member(base);
    final signed = await m.community.signUpWithEmail(
      name: name,
      email: 'yc-contract-$name-$run@example.test'.toLowerCase(),
      password: 'Contract-test-$run!',
      language: 'en',
    );
    m.token = signed.session.accessToken;
    m.me = signed.me;
    expect(signed.session.accessToken, isNotEmpty);
    expect(signed.me.member.id, isNotEmpty);
    return m;
  }

  /// Approves what waits in the moderation queue (a new member's posts).
  Future<int> approveAll() async {
    final queue = await admin.client.get(
      '/admin/moderation',
      query: {'status': 'open'},
    );
    var n = 0;
    for (final item in (queue['items'] as List).cast<Map<String, dynamic>>()) {
      await admin.client.post(
        '/admin/moderation/${item['id']}',
        body: {'decision': 'approve', 'note': 'contract test'},
      );
      n++;
    }
    return n;
  }

  group('231 contract: the app against the real server', skip: skip, () {
    test('log in by email (the admin)', () async {
      admin = _Member(base);
      final signed = await admin.community.logInWithEmail(
        email: _adminEmail,
        password: _adminPassword,
      );
      admin.token = signed.session.accessToken;
      admin.me = signed.me;
      expect(admin.me.member.id, isNotEmpty);
    });

    test('sign up by email (two members), /me and /config', () async {
      asker = await signUp('Asker');
      answerer = await signUp('Answerer');
      final me = await asker.community.me();
      expect(me.member.id, asker.me.member.id);
      expect(me.member.name, 'Asker');
      final config = await asker.community.config();
      expect(config, isNotNull);
    });

    test('follow', () async {
      final r = await asker.community.follow(answerer.me.member.id);
      expect(r.following, isTrue);
      final followers = await answerer.community.followers(
        answerer.me.member.id,
      );
      expect(followers.items.map((m) => m.id), contains(asker.me.member.id));
    });

    test(
      'sections, tags, ask (a new member\'s first posts wait), similar',
      () async {
        final sections = await asker.qa.sections();
        expect(sections, isNotEmpty);
        section = sections.first;
        await asker.qa.tags();
        // A new member's first posts wait for a moderator.
        final asked = await asker.qa.ask(
          title: 'Contract question about product pages $run',
          body: 'How do I give each template its own product page? Run $run.',
          section: section.slug,
          language: 'en',
        );
        expect(asked.summary.status, ContentStatus.pending);
        expect(await approveAll(), greaterThanOrEqualTo(1));
        question = await asker.qa.question(asked.id, countView: false);
        expect(question.summary.status, ContentStatus.published);
        expect(question.summary.title, contains('Contract question'));
        expect(question.summary.section.slug, section.slug);
        expect(question.summary.author.member.id, asker.me.member.id);
        expect(question.canAccept, isTrue);
        final read = await answerer.qa.question(question.id);
        expect(read.id, question.id);
        final similar = await answerer.qa.similar('product pages $run');
        expect(similar, isA<List<QuestionSummary>>());
        final list = await answerer.qa.questions();
        expect(list.items, isNotEmpty);
      },
    );

    test('answer, vote, accept, replies', () async {
      // The answerer's first posts wait too.
      answer = await answerer.qa.answer(
        question.id,
        'Open Pages, then Product, then pick From template. ($run)',
      );
      expect(answer.status, ContentStatus.pending);
      await approveAll();
      expect(answer.questionId, question.id);
      expect(answer.author.member.id, answerer.me.member.id);
      final voted = await asker.qa.voteAnswer(answer.id, 1);
      expect(voted.myVote, 1);
      expect(voted.score, 1);
      await expectLater(
        answerer.qa.voteAnswer(answer.id, 1),
        throwsA(isA<ApiException>()),
        reason: 'a vote on one\'s own post is refused',
      );
      final qVote = await answerer.qa.voteQuestion(question.id, 1);
      expect(qVote.myVote, 1);
      final accepted = await asker.qa.accept(question.id, answer.id);
      expect(
        accepted.answers.firstWhere((a) => a.id == answer.id).accepted,
        isTrue,
      );
      final reply = await asker.qa.reply(answer.id, 'Thanks, it worked.');
      expect(reply.body, 'Thanks, it worked.');
      final replies = await asker.qa.replies(answer.id);
      expect(replies.map((r) => r.id), contains(reply.id));
      // The asker is still new: their reply waits too, and counts once shown.
      await approveAll();
      final again = await asker.qa.question(question.id, countView: false);
      final a = again.answers.firstWhere((x) => x.id == answer.id);
      expect(a.replyCount, greaterThanOrEqualTo(1));
    });

    test(
      'an official answer and a tutorial from the team (the admin)',
      () async {
        final official = await admin.client.post(
          '/qa/questions/${question.id}/answers',
          body: {
            'body': 'From the team: pick From template in Pages. ($run)',
            'official': true,
          },
        );
        final a = Answer.fromJson(official);
        expect(a.official, isTrue);
        expect(a.author.member.team, isTrue);
        final read = await asker.qa.question(question.id, countView: false);
        final shown = read.answers.firstWhere((x) => x.id == a.id);
        expect(shown.official, isTrue);
        // The accepted answer first, then official ones.
        expect(read.answers.first.accepted, isTrue);
        await admin.client.post(
          '/tutorials',
          body: {
            'title': 'Contract tutorial on product pages $run',
            'summary': 'Give every template its own product page.',
            'kind': 'video',
            'section': (await asker.tutorials.sections()).first.slug,
            'level': 'beginner',
            'language': 'en',
            'body': 'Pages, Product, From template.',
            'video_url': 'https://yallapp.com.tr/community/videos/contract',
            'duration_seconds': 504,
            'tags': ['product-page'],
          },
        );
      },
    );

    test('every model reads the server\'s own fields', () async {
      // The member (the shell's Profile) and a member in a list.
      final rawMe = await asker.client.get('/me');
      final me = await asker.community.me();
      final counts = rawMe['counts'] as Map;
      expect(me.member.id, rawMe['id']);
      expect(me.member.name, rawMe['display_name']);
      expect(me.member.username, rawMe['username']);
      expect(me.member.team, rawMe['team']);
      expect(me.points, rawMe['points']);
      expect(me.followers, counts['followers']);
      expect(me.following, counts['following']);
      expect(me.answers, counts['answers']);
      expect(me.questions, counts['questions']);
      expect(me.yallappLinked, rawMe['yallapp_linked']);
      expect(me.account?.unreadNotifications, rawMe['unread_notifications']);
      final rawFollowers = await answerer.client.get(
        '/members/${answerer.me.member.id}/followers',
      );
      final follower = (rawFollowers['items'] as List).first as Map;
      final followers = await answerer.community.followers(
        answerer.me.member.id,
      );
      expect(followers.items.first.id, follower['id']);
      expect(followers.items.first.name, follower['display_name']);
      // A question with its answers: what the app parses equals the JSON.
      final raw = await asker.client.get(
        '/qa/questions/${question.id}',
        query: {'view': 0},
      );
      final q = Question.fromJson(raw);
      expect(q.summary.title, raw['title']);
      expect(q.summary.excerpt, raw['excerpt']);
      expect(q.summary.section.slug, (raw['section'] as Map)['slug']);
      expect(q.summary.section.name, (raw['section'] as Map)['name']);
      expect(q.summary.score, raw['score']);
      expect(q.summary.answerCount, raw['answer_count']);
      expect(q.summary.viewCount, raw['view_count']);
      expect(q.summary.accepted, raw['accepted']);
      expect(q.summary.hasOfficialAnswer, raw['has_official_answer']);
      expect(q.summary.bookmarked, raw['bookmarked']);
      expect(q.summary.status.name, raw['status']);
      expect(q.body, raw['body']);
      expect(q.myVote, raw['my_vote']);
      expect(q.canAccept, raw['can_accept']);
      expect(q.canEdit, raw['can_edit']);
      final author = raw['author'] as Map;
      expect(q.summary.author.member.id, author['id']);
      expect(q.summary.author.member.name, author['display_name']);
      expect(q.summary.author.member.username, author['username']);
      expect(q.summary.author.rank?.name, author['rank']);
      expect(q.summary.author.rankLabel, author['rank_label']);
      final rawAnswers = (raw['answers'] as List).cast<Map<String, dynamic>>();
      expect(q.answers.length, rawAnswers.length);
      for (final (i, ra) in rawAnswers.indexed) {
        final a = q.answers[i];
        expect(a.id, ra['id']);
        expect(a.body, ra['body']);
        expect(a.official, ra['official']);
        expect(a.accepted, ra['accepted']);
        expect(a.score, ra['score']);
        expect(a.myVote, ra['my_vote']);
        expect(a.replyCount, ra['reply_count']);
        expect(a.replies.length, (ra['replies'] as List).length);
        expect(a.status.name, ra['status']);
        expect(a.author.member.team, (ra['author'] as Map)['team']);
      }
      // A question in a list.
      final rawList = await asker.client.get('/qa/questions');
      final first = (rawList['items'] as List).first as Map<String, dynamic>;
      final summary = QuestionSummary.fromJson(first);
      expect(summary.id, first['id']);
      expect(summary.tags.map((t) => t.slug).toList(), [
        for (final t in first['tags'] as List) t is Map ? t['slug'] : t,
      ]);
      // A tutorial, in its list and alone.
      final rawTutorials = await asker.client.get('/tutorials');
      final items = (rawTutorials['items'] as List)
          .cast<Map<String, dynamic>>();
      expect(items, isNotEmpty);
      final page = await asker.tutorials.tutorials();
      final t = page.items.first;
      final rt = items.first;
      expect(t.id, rt['id']);
      expect(t.title, rt['title']);
      expect(t.kind.name, rt['kind']);
      expect(t.level.name, rt['level']);
      expect(t.language, rt['language']);
      expect(t.durationSeconds, rt['duration_seconds']);
      expect(t.durationMinutes, rt['duration_minutes']);
      expect(t.locked, rt['locked']);
      expect(t.viewCount, rt['view_count']);
      expect(t.bookmarked, rt['bookmarked']);
      expect(t.section.slug, (rt['section'] as Map)['slug']);
      final detail = await asker.tutorials.tutorial(t.id);
      final rd = await asker.client.get('/tutorials/${t.id}');
      expect(detail.body, rd['body']);
      expect(detail.videoUrl, rd['video_url']);
      // Notifications.
      final rawN = await answerer.client.get('/notifications');
      final n = await answerer.notifications.list();
      expect(n.unreadCount, rawN['unread_count']);
      final rawItems = (rawN['items'] as List).cast<Map<String, dynamic>>();
      expect(n.items.length, rawItems.length);
      for (final (i, rn) in rawItems.indexed) {
        expect(n.items[i].kind, rn['kind']);
        expect(n.items[i].text, rn['text']);
        expect(n.items[i].read, rn['read']);
        expect(n.items[i].targetType, rn['target_type']);
        expect(n.items[i].targetId, rn['target_id']);
        expect(n.items[i].actor?.id, (rn['actor'] as Map?)?['id']);
      }
      expect(rawItems.map((x) => x['kind']), contains('follow'));
      // The Gold badge's state.
      final rawV = await asker.client.get('/badges/verification');
      final v = VerificationState.fromJson(rawV);
      expect(v.hasGold, rawV['has_gold']);
      expect(v.appCount, rawV['app_count']);
      expect(v.requiredApps, rawV['required_apps']);
      expect(v.yallappLinked, rawV['yallapp_linked']);
      expect(v.canApply, rawV['can_apply']);
    });

    test('bookmark, Saved, search', () async {
      await asker.qa.bookmark(question.id, saved: true);
      final read = await asker.qa.question(question.id, countView: false);
      expect(read.summary.bookmarked, isTrue);
      final saved = await asker.search.saved();
      expect(saved.questions.map((q) => q.id), contains(question.id));
      final found = await asker.search.search('Contract question');
      expect(found, isNotNull);
    });

    test('tutorials', () async {
      final page = await asker.tutorials.tutorials();
      expect(page.items, isA<List>());
      await asker.tutorials.sections();
      if (page.items.isNotEmpty) {
        final t = await asker.tutorials.tutorial(page.items.first.id);
        expect(t.id, page.items.first.id);
      }
    });

    test('notifications (followed, answered, accepted)', () async {
      final forAnswerer = await answerer.notifications.list();
      expect(forAnswerer.items, isA<List<CommunityNotification>>());
      final forAsker = await asker.notifications.list();
      expect(forAsker.items, isA<List<CommunityNotification>>());
      await answerer.notifications.markRead();
      final after = await answerer.notifications.list();
      expect(after.unreadCount, 0);
      final email = await asker.notifications.emailSettings();
      expect(email, isA<Map<String, bool>>());
    });

    test('the Gold badge\'s eligibility', () async {
      final state = await asker.verification.state();
      expect(state.requiredApps, 5);
      expect(state.yallappLinked, isFalse);
      expect(state.canApply, isFalse);
      expect(state.hasGold, isFalse);
    });

    test('report', () async {
      await answerer.community.report(
        targetType: 'question',
        targetId: question.id,
        reason: ReportReason.spam,
      );
    });

    test('log out', () async {
      await asker.community.signOut();
      await expectLater(
        asker.community.me(),
        throwsA(isA<ApiException>()),
        reason: 'the token no longer works',
      );
    });
  });
}
