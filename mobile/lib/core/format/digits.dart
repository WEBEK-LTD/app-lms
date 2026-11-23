import 'package:flutter/services.dart';

/// 180.9 Arabic-Indic (٠–٩) and Persian (۰–۹) digits as Latin ones, and the
/// Arabic decimal and thousands marks (٫ ٬) as "." and ",": what an Arabic
/// keyboard types into a number field. The app shows Latin digits in every
/// language (dates.dart), and the servers read them.
String latinDigits(String text) => text
    .replaceAllMapped(RegExp('[٠-٩۰-۹]'), (m) {
      final c = m[0]!.codeUnitAt(0);
      return String.fromCharCode(
        0x30 + (c >= 0x06F0 ? c - 0x06F0 : c - 0x0660),
      );
    })
    .replaceAll('٫', '.')
    .replaceAll('٬', ',');

/// A number typed by a person ("1500", "1.500.000", "1,250.50", "250,5",
/// "١٥٠٠"), or null when it isn't one. A last "." or "," followed by one or
/// two digits is the decimal mark; every other one groups thousands.
double? parseTypedNumber(String text) {
  var t = latinDigits(text).trim().replaceAll(RegExp(r'[\s₺$€]'), '');
  if (!RegExp(r'^\d[\d.,]*$').hasMatch(t)) return null;
  final decimalAt = [
    t.lastIndexOf(','),
    t.lastIndexOf('.'),
  ].reduce((a, b) => a > b ? a : b);
  if (decimalAt >= 0 && t.length - decimalAt - 1 <= 2) {
    t =
        '${t.substring(0, decimalAt).replaceAll(RegExp('[.,]'), '')}.'
        '${t.substring(decimalAt + 1)}';
  } else {
    t = t.replaceAll(RegExp('[.,]'), '');
  }
  return double.tryParse(t);
}

/// Lets a number field take Arabic-Indic and Persian digits, shown as the
/// Latin ones they are; everything else typed is left as it is.
class TypedNumberFormatter extends TextInputFormatter {
  const TypedNumberFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = latinDigits(newValue.text);
    // One character for one: the cursor stays where it was.
    return text == newValue.text ? newValue : newValue.copyWith(text: text);
  }
}
