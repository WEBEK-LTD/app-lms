import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/qa_api.dart';
import '../data/qa_models.dart';

/// A question with its answers, and what the member does on it: vote,
/// accept, answer, save. Votes show at once and roll back when the server
/// says no.
class QuestionController extends AsyncNotifier<Question> {
  QuestionController(this.id);

  final String id;

  QaApi get _api => ref.read(qaApiProvider);

  @override
  Future<Question> build() => ref.read(qaApiProvider).question(id);

  Question? get _q => state.value;

  Future<void> voteQuestion(int value) async {
    final q = _q;
    if (q == null) return;
    final before = q;
    state = AsyncData(
      q.copyWith(myVote: value, score: q.summary.score - q.myVote + value),
    );
    try {
      final r = await _api.voteQuestion(id, value);
      state = AsyncData(_q!.copyWith(myVote: r.myVote, score: r.score));
    } catch (_) {
      state = AsyncData(before);
      rethrow;
    }
  }

  Future<void> voteAnswer(String answerId, int value) async {
    final q = _q;
    if (q == null) return;
    final i = q.answers.indexWhere((a) => a.id == answerId);
    if (i < 0) return;
    final a = q.answers[i];
    state = AsyncData(
      q.copyWith(
        answers: [...q.answers]
          ..[i] = a.copyWith(score: a.score - a.myVote + value, myVote: value),
      ),
    );
    try {
      final r = await _api.voteAnswer(answerId, value);
      final now = _q!;
      final j = now.answers.indexWhere((x) => x.id == answerId);
      state = AsyncData(
        now.copyWith(
          answers: [...now.answers]
            ..[j] = now.answers[j].copyWith(score: r.score, myVote: r.myVote),
        ),
      );
    } catch (_) {
      state = AsyncData(q);
      rethrow;
    }
  }

  Future<void> accept(String answerId, {required bool accept}) async {
    final q = await _api.accept(id, answerId, accept: accept);
    state = AsyncData(q);
  }

  Future<Answer> answer(String body) async {
    final a = await _api.answer(id, body);
    final q = _q;
    if (q != null) state = AsyncData(q.copyWith(answers: [...q.answers, a]));
    return a;
  }

  Future<void> bookmark({required bool saved}) async {
    final q = _q;
    if (q == null) return;
    state = AsyncData(q.copyWith(bookmarked: saved));
    try {
      await _api.bookmark(id, saved: saved);
    } catch (_) {
      state = AsyncData(q);
      rethrow;
    }
  }

  /// A reply was posted under an answer: count it.
  void replied(String answerId) {
    final q = _q;
    if (q == null) return;
    final i = q.answers.indexWhere((a) => a.id == answerId);
    if (i < 0) return;
    final a = q.answers[i];
    state = AsyncData(
      q.copyWith(
        answers: [...q.answers]..[i] = a.copyWith(replyCount: a.replyCount + 1),
      ),
    );
  }
}

final questionProvider =
    AsyncNotifierProvider.family<QuestionController, Question, String>(
      QuestionController.new,
    );
