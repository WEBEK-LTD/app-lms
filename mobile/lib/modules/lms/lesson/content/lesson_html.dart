import 'package:html/dom.dart' as dom;
import 'package:html/parser.dart' as html_parser;

import '../../../../core/api/models/models.dart';

/// The tag that stands for an embed in prepared lesson HTML.
const embedTag = 'yallapp-embed';

/// Rewrites lesson HTML so every embed's placeholder becomes
/// `<yallapp-embed data-placeholder="...">`, which the renderer turns into an
/// inline web view.
///
/// The contract says `html` references embeds by `placeholder` without fixing
/// the markup, so these forms are recognised:
/// - an element whose `id`, `data-yallapp-embed` or `data-placeholder` is the
///   placeholder, or whose tag name is the placeholder;
/// - an HTML comment containing only the placeholder;
/// - the placeholder as text, optionally wrapped in `{{ }}` or `[ ]`
///   (a paragraph holding only the token is replaced as a whole).
///
/// Embeds not found in the HTML are appended at the end so nothing is lost.
String prepareLessonHtml(String html, List<Embed> embeds) {
  final fragment = html_parser.parseFragment(html);
  for (final embed in embeds) {
    if (!_replaceElement(fragment, embed.placeholder) &&
        !_replaceComment(fragment, embed.placeholder) &&
        !_replaceText(fragment, embed.placeholder)) {
      fragment.append(_embedNode(embed.placeholder));
    }
  }
  return fragment.outerHtml;
}

dom.Element _embedNode(String placeholder) =>
    dom.Element.tag(embedTag)..attributes['data-placeholder'] = placeholder;

bool _replaceElement(dom.DocumentFragment root, String placeholder) {
  for (final element in root.querySelectorAll('*')) {
    final a = element.attributes;
    if (a['id'] == placeholder ||
        a['data-yallapp-embed'] == placeholder ||
        a['data-placeholder'] == placeholder ||
        element.localName == placeholder.toLowerCase()) {
      if (element.localName == embedTag) continue;
      element.replaceWith(_embedNode(placeholder));
      return true;
    }
  }
  return false;
}

Iterable<dom.Node> _walk(dom.Node node) sync* {
  for (final child in node.nodes.toList()) {
    yield child;
    yield* _walk(child);
  }
}

bool _replaceComment(dom.DocumentFragment root, String placeholder) {
  for (final node in _walk(root)) {
    if (node is dom.Comment && node.data?.trim() == placeholder) {
      node.replaceWith(_embedNode(placeholder));
      return true;
    }
  }
  return false;
}

RegExp _tokenPattern(String placeholder) {
  final p = RegExp.escape(placeholder);
  return RegExp(
    '\\{\\{\\s*$p\\s*\\}\\}|\\[\\s*$p\\s*\\]|(?<![\\w-])$p(?![\\w-])',
  );
}

bool _replaceText(dom.DocumentFragment root, String placeholder) {
  final pattern = _tokenPattern(placeholder);
  for (final node in _walk(root)) {
    if (node is! dom.Text) continue;
    final text = node.data;
    final match = pattern.firstMatch(text);
    if (match == null) continue;
    final parent = node.parent;
    // A block holding only the token is replaced as a whole.
    if (parent is dom.Element &&
        parent.nodes.length == 1 &&
        text.trim() == match.group(0) &&
        const {'p', 'div', 'span', 'figure'}.contains(parent.localName)) {
      parent.replaceWith(_embedNode(placeholder));
      return true;
    }
    final before = text.substring(0, match.start);
    final after = text.substring(match.end);
    final replacement = <dom.Node>[
      if (before.isNotEmpty) dom.Text(before),
      _embedNode(placeholder),
      if (after.isNotEmpty) dom.Text(after),
    ];
    final container = node.parentNode!;
    final index = container.nodes.indexOf(node);
    node.remove();
    container.nodes.insertAll(index, replacement);
    return true;
  }
  return false;
}

/// Finds a code block's language from the common class conventions
/// (`language-python`, `lang-js`, `brush: php;`, `hljs python`, `data-lang`).
String? detectCodeLanguage(dom.Element pre) {
  final code = pre.querySelector('code');
  final candidates = <String>[
    ?pre.attributes['data-lang'],
    ?pre.attributes['data-language'],
    ?code?.attributes['data-lang'],
    ?code?.attributes['data-language'],
  ];
  if (candidates.isNotEmpty) return normalizeLanguage(candidates.first);

  final classes = '${code?.className ?? ''} ${pre.className}';
  final brush = RegExp(r'brush:\s*([\w+#-]+)').firstMatch(classes);
  if (brush != null) return normalizeLanguage(brush.group(1)!);
  for (final token in classes.split(RegExp(r'\s+'))) {
    final m = RegExp(r'^(?:language|lang)-([\w+#-]+)$').firstMatch(token);
    if (m != null) return normalizeLanguage(m.group(1)!);
  }
  for (final token in classes.split(RegExp(r'\s+'))) {
    final normalized = normalizeLanguage(token);
    if (normalized != null && knownLanguages.contains(normalized)) {
      return normalized;
    }
  }
  return null;
}

/// Languages the highlighter registers.
const knownLanguages = {
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'dart',
  'go',
  'java',
  'javascript',
  'json',
  'kotlin',
  'markdown',
  'php',
  'plaintext',
  'python',
  'ruby',
  'rust',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'xml',
  'yaml',
};

const _aliases = {
  'js': 'javascript',
  'jsx': 'javascript',
  'mjs': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'python3': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'zsh': 'bash',
  'console': 'shell',
  'html': 'xml',
  'htm': 'xml',
  'svg': 'xml',
  'vue': 'xml',
  'c++': 'cpp',
  'cc': 'cpp',
  'h': 'c',
  'cs': 'csharp',
  'c#': 'csharp',
  'kt': 'kotlin',
  'yml': 'yaml',
  'md': 'markdown',
  'text': 'plaintext',
  'txt': 'plaintext',
  'plain': 'plaintext',
  'golang': 'go',
  'rs': 'rust',
};

String? normalizeLanguage(String raw) {
  final value = raw.trim().toLowerCase();
  if (value.isEmpty) return null;
  return _aliases[value] ?? value;
}
