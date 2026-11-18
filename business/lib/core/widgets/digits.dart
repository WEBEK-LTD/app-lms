/// 175 Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits as 0-9, and the
/// Arabic decimal and thousands separators (٫ ٬) as "." and ",": an amount
/// typed on an Arabic keyboard ("٤٥٠٫٥٠") is sent as "450.50".
String latinDigits(String text) {
  final out = StringBuffer();
  for (final rune in text.runes) {
    if (rune >= 0x0660 && rune <= 0x0669) {
      out.writeCharCode(0x30 + rune - 0x0660);
    } else if (rune >= 0x06F0 && rune <= 0x06F9) {
      out.writeCharCode(0x30 + rune - 0x06F0);
    } else if (rune == 0x066B) {
      out.write('.');
    } else if (rune == 0x066C) {
      out.write(',');
    } else {
      out.writeCharCode(rune);
    }
  }
  return out.toString();
}

/// An amount as typed, for the API: Latin digits, a decimal point.
String typedAmount(String text) =>
    latinDigits(text).trim().replaceAll(',', '.');
