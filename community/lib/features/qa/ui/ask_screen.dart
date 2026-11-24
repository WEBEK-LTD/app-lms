import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/sym.dart';
import '../data/qa_api.dart';
import '../data/qa_models.dart';
import '../state/questions_controller.dart';
import 'content_direction.dart';
import '../../../core/widgets/glass.dart';

/// Ask a question: its title (and, while it is typed, the questions that
/// look like it: "Already asked?"), its details, a section, up to five tags
/// and its language. A new member's first questions wait for a moderator.
class AskScreen extends ConsumerStatefulWidget {
  const AskScreen({super.key});

  @override
  ConsumerState<AskScreen> createState() => _AskScreenState();
}

class _AskScreenState extends ConsumerState<AskScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _tag = TextEditingController();
  String? _section;
  final _tags = <Tag>[];
  late String _language = ref.read(languageProvider);
  List<QuestionSummary> _similar = const [];
  List<Tag> _tagSuggestions = const [];
  Timer? _debounce;
  var _sending = false;
  String? _titleError;
  String? _bodyError;

  @override
  void initState() {
    super.initState();
    _title.addListener(_titleChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _title.dispose();
    _body.dispose();
    _tag.dispose();
    super.dispose();
  }

  void _titleChanged() {
    _debounce?.cancel();
    final text = _title.text.trim();
    if (text.length < 3) {
      if (_similar.isNotEmpty) setState(() => _similar = const []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      try {
        final found = await ref.read(qaApiProvider).similar(text);
        if (mounted && _title.text.trim() == text) {
          setState(() => _similar = found);
        }
      } on ApiException {
        // The list is a help, never a blocker.
      }
    });
  }

  Future<void> _tagChanged(String text) async {
    final q = text.trim();
    if (q.isEmpty) {
      setState(() => _tagSuggestions = const []);
      return;
    }
    final found = await ref.read(qaApiProvider).tags(query: q);
    if (mounted && _tag.text.trim() == q) {
      setState(
        () => _tagSuggestions = [
          for (final t in found)
            if (!_tags.any((x) => x.slug == t.slug)) t,
        ].take(5).toList(),
      );
    }
  }

  void _addTag(Tag t) {
    if (_tags.length >= 5 || _tags.any((x) => x.slug == t.slug)) return;
    setState(() {
      _tags.add(t);
      _tag.clear();
      _tagSuggestions = const [];
    });
  }

  Future<void> _send(List<SectionRef> sections) async {
    final l = context.l10n;
    final title = _title.text.trim();
    final body = _body.text.trim();
    final section = _section ?? (sections.isEmpty ? null : sections.first.slug);
    setState(() {
      _titleError = title.length < 10 ? l.qaTooShort(10) : null;
      _bodyError = body.length < 20 ? l.qaTooShort(20) : null;
    });
    if (_titleError != null || _bodyError != null || section == null) return;
    setState(() => _sending = true);
    try {
      final q = await ref
          .read(qaApiProvider)
          .ask(
            title: title,
            body: body,
            section: section,
            tags: [for (final t in _tags) t.slug],
            language: _language,
          );
      if (!mounted) return;
      ref.invalidate(questionsProvider);
      if (q.summary.status == ContentStatus.pending) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l.qaPending)));
      }
      context.replace(FeatureLinks.question(q.id));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      final fields = e.fieldErrors;
      setState(() {
        _titleError = fields['title'] ?? _titleError;
        _bodyError = fields['body'] ?? _bodyError;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message.isNotEmpty ? e.message : l.commonError),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final sections = ref.watch(qaSectionsProvider).value ?? const [];
    final section = _section ?? (sections.isEmpty ? null : sections.first.slug);
    Widget label(String text) => Padding(
      padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: p.ink,
        ),
      ),
    );
    return Scaffold(
      backgroundColor: p.screen,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 8),
              child: Row(
                children: [
                  IconBtn(
                    icon: Symbols.close,
                    label: l.commonClose,
                    onTap: () => context.pop(),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      l.qaAskQuestion,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: p.ink,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 24),
                children: [
                  label(l.qaAskTitleLabel),
                  TextField(
                    controller: _title,
                    maxLength: 200,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: l.qaAskTitleHint,
                      errorText: _titleError,
                      counterText: '',
                    ),
                  ),
                  if (_similar.isNotEmpty) _Similar(questions: _similar),
                  label(l.qaAskBodyLabel),
                  TextField(
                    controller: _body,
                    minLines: 5,
                    maxLines: 12,
                    maxLength: 20000,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: l.qaAskBodyHint,
                      errorText: _bodyError,
                      counterText: '',
                    ),
                  ),
                  label(l.qaAskSection),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final s in sections)
                        ChoiceChip(
                          label: Text(s.name),
                          selected: section == s.slug,
                          onSelected: (_) => setState(() => _section = s.slug),
                          selectedColor: Brand.orange,
                          labelStyle: TextStyle(
                            color: section == s.slug ? Colors.white : p.ink,
                            fontWeight: FontWeight.w600,
                          ),
                          showCheckmark: false,
                        ),
                    ],
                  ),
                  label(l.qaAskTags),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final t in _tags)
                        InputChip(
                          label: Text(t.name),
                          onDeleted: () => setState(() => _tags.remove(t)),
                        ),
                    ],
                  ),
                  if (_tags.length < 5)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: TextField(
                        controller: _tag,
                        onChanged: _tagChanged,
                        onSubmitted: (v) {
                          final text = v.trim();
                          if (text.isEmpty) return;
                          _addTag(
                            _tagSuggestions.isNotEmpty
                                ? _tagSuggestions.first
                                : Tag(slug: text, name: text),
                          );
                        },
                        decoration: const InputDecoration(
                          prefixIcon: Padding(
                            padding: EdgeInsetsDirectional.only(
                              start: 12,
                              end: 4,
                            ),
                            child: Sym(Symbols.sell, size: 20),
                          ),
                          prefixIconConstraints: BoxConstraints(minWidth: 36),
                        ),
                      ),
                    ),
                  if (_tagSuggestions.isNotEmpty)
                    Wrap(
                      spacing: 6,
                      children: [
                        for (final t in _tagSuggestions)
                          ActionChip(
                            label: Text(t.name),
                            onPressed: () => _addTag(t),
                          ),
                      ],
                    ),
                  label(l.qaAskLanguage),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'en', label: Text('English')),
                      ButtonSegment(value: 'ar', label: Text('العربية')),
                      ButtonSegment(value: 'tr', label: Text('Türkçe')),
                    ],
                    selected: {_language},
                    onSelectionChanged: (v) =>
                        setState(() => _language = v.first),
                    showSelectedIcon: false,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 54,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: Brand.signUp,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x73FF5A1F),
                            blurRadius: 26,
                            offset: Offset(0, 12),
                          ),
                        ],
                      ),
                      child: TextButton(
                        onPressed: _sending ? null : () => _send(sections),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: _sending
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                l.qaAskSend,
                                style: const TextStyle(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "Already asked?": the questions like the title being typed.
class _Similar extends StatelessWidget {
  const _Similar({required this.questions});

  final List<QuestionSummary> questions;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x14FFB23D) : const Color(0x14FF8A3D),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x40FF8A3D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Sym(Symbols.lightbulb, size: 18, color: Brand.orange),
              const SizedBox(width: 6),
              Text(
                l.qaSimilarTitle,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13.5,
                  color: p.ink,
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          Text(l.qaSimilarBody, style: TextStyle(fontSize: 12, color: p.muted)),
          for (final q in questions)
            InkWell(
              onTap: () => context.push(FeatureLinks.question(q.id)),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        q.title,
                        textDirection: contentDirection(q.title),
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: p.ink,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      l.qaAnswerCount(q.answerCount),
                      style: TextStyle(fontSize: 11.5, color: p.muted),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
