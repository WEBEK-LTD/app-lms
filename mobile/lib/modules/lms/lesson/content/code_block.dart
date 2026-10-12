import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:re_highlight/languages/bash.dart';
import 'package:re_highlight/languages/c.dart';
import 'package:re_highlight/languages/cpp.dart';
import 'package:re_highlight/languages/csharp.dart';
import 'package:re_highlight/languages/css.dart';
import 'package:re_highlight/languages/dart.dart';
import 'package:re_highlight/languages/go.dart';
import 'package:re_highlight/languages/java.dart';
import 'package:re_highlight/languages/javascript.dart';
import 'package:re_highlight/languages/json.dart';
import 'package:re_highlight/languages/kotlin.dart';
import 'package:re_highlight/languages/markdown.dart';
import 'package:re_highlight/languages/php.dart';
import 'package:re_highlight/languages/plaintext.dart';
import 'package:re_highlight/languages/python.dart';
import 'package:re_highlight/languages/ruby.dart';
import 'package:re_highlight/languages/rust.dart';
import 'package:re_highlight/languages/scss.dart';
import 'package:re_highlight/languages/shell.dart';
import 'package:re_highlight/languages/sql.dart';
import 'package:re_highlight/languages/swift.dart';
import 'package:re_highlight/languages/typescript.dart';
import 'package:re_highlight/languages/xml.dart';
import 'package:re_highlight/languages/yaml.dart';
import 'package:re_highlight/re_highlight.dart';
import 'package:re_highlight/styles/github-dark.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/common.dart';

final Highlight _highlight = Highlight()
  ..registerLanguages({
    'bash': langBash,
    'c': langC,
    'cpp': langCpp,
    'csharp': langCsharp,
    'css': langCss,
    'dart': langDart,
    'go': langGo,
    'java': langJava,
    'javascript': langJavascript,
    'json': langJson,
    'kotlin': langKotlin,
    'markdown': langMarkdown,
    'php': langPhp,
    'plaintext': langPlaintext,
    'python': langPython,
    'ruby': langRuby,
    'rust': langRust,
    'scss': langScss,
    'shell': langShell,
    'sql': langSql,
    'swift': langSwift,
    'typescript': langTypescript,
    'xml': langXml,
    'yaml': langYaml,
  });

const _registered = {
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

/// Code colors from the TextLesson design (GitHub dark).
const _codeText = Color(0xFFC9D1D9);
const _codeBackground = Color(0xFF0D1117);
const _codeHeader = Color(0xFF161B22);
const _codeMuted = Color(0xFF8B949E);
const _codeBorder = Color(0xFF30363D);

/// Highlights [code] as [language]. Returns null when highlighting fails or
/// the language isn't registered.
TextSpan? highlightCode(String code, String? language, TextStyle base) {
  if (language == null || !_registered.contains(language)) return null;
  try {
    final result = _highlight.highlight(code: code, language: language);
    final renderer = TextSpanRenderer(base, githubDarkTheme);
    result.render(renderer);
    return renderer.span;
  } on Object {
    return null;
  }
}

/// A dark code block with the language, a Copy button and horizontal
/// scrolling (design: TextLesson).
class CodeBlock extends StatelessWidget {
  const CodeBlock({
    super.key,
    required this.code,
    this.language,
    this.highlight = true,
  });

  final String code;
  final String? language;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final text = code.replaceAll(RegExp(r'\s+$'), '');
    const base = TextStyle(
      fontFamily: codeFontFamily,
      fontSize: 13,
      height: 1.7,
      color: _codeText,
    );
    final span = highlight ? highlightCode(text, language, base) : null;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: _codeBackground,
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: _codeHeader,
            padding: const EdgeInsets.fromLTRB(12, 6, 6, 6),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    language ?? 'code',
                    style: const TextStyle(fontSize: 12, color: _codeMuted),
                  ),
                ),
                _CopyButton(text: text),
              ],
            ),
          ),
          Semantics(
            label: 'Code${language == null ? '' : ' in $language'}',
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(14),
              child: SelectableText.rich(
                span ?? TextSpan(text: text, style: base),
                style: base,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CopyButton extends StatelessWidget {
  const _CopyButton({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: 'Copy code',
    excludeSemantics: true,
    child: InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: () async {
        await Clipboard.setData(ClipboardData(text: text));
        if (context.mounted) showMessage(context, 'Code copied');
      },
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
        child: Center(
          widthFactor: 1,
          child: Container(
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              border: Border.all(color: _codeBorder),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppIcon(AppIcons.copy, size: 14, color: _codeText),
                SizedBox(width: 6),
                Text('Copy', style: TextStyle(fontSize: 12, color: _codeText)),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
