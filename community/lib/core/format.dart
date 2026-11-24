/// "2h", "3d", "now": how long ago, short (the design's "2h · Expert").
/// Western digits in every language.
String ago(DateTime? at, {DateTime? now, String lang = 'en'}) {
  if (at == null) return '';
  final d = (now ?? DateTime.now()).difference(at);
  final units = switch (lang) {
    'ar' => (now: 'الآن', m: 'د', h: 'س', d: 'ي', w: 'أ'),
    'tr' => (now: 'şimdi', m: 'dk', h: 'sa', d: 'g', w: 'h'),
    _ => (now: 'now', m: 'm', h: 'h', d: 'd', w: 'w'),
  };
  if (d.inMinutes < 1) return units.now;
  if (d.inHours < 1) return '${d.inMinutes}${units.m}';
  if (d.inDays < 1) return '${d.inHours}${units.h}';
  if (d.inDays < 7) return '${d.inDays}${units.d}';
  return '${d.inDays ~/ 7}${units.w}';
}

/// 1240 → "1,240"; 2400 → "2.4K" when [short].
String count(int n, {bool short = false}) {
  if (short && n >= 1000) {
    final k = n / 1000;
    return '${k >= 10 ? k.round() : (k * 10).round() / 10}K'.replaceAll(
      '.0K',
      'K',
    );
  }
  final s = '$n';
  final out = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) out.write(',');
    out.write(s[i]);
  }
  return out.toString();
}
