import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/format/digits.dart';

/// 180.9 Numbers typed on an Arabic or Turkish keyboard.
void main() {
  test('Arabic-Indic and Persian digits are read as Latin ones', () {
    expect(latinDigits('١٢٣٤٥٦٧٨٩٠'), '1234567890');
    expect(latinDigits('۱۵۰۰'), '1500');
    expect(latinDigits('١٬٢٥٠٫٥'), '1,250.5');
  });

  test('a typed number, whatever separates its thousands', () {
    expect(parseTypedNumber('1.500.000'), 1500000);
    expect(parseTypedNumber('1.500'), 1500);
    expect(parseTypedNumber('1,500,000'), 1500000);
    expect(parseTypedNumber('2.5'), 2.5);
    expect(parseTypedNumber('٢٥٠٠٠٠٠'), 2500000);
    expect(parseTypedNumber('0'), 0);
    expect(parseTypedNumber('abc'), isNull);
  });

  test('a donation typed in Arabic digits', () {
    expect(parseAmount('٢٥٠'), '250.00');
    expect(parseAmount('١٬٢٥٠٫٥'), '1250.50');
    // As before.
    expect(parseAmount('1.250,5'), '1250.50');
    expect(parseAmount('0'), isNull);
  });

  test('the field shows Latin digits as they are typed', () {
    const f = TypedNumberFormatter();
    final out = f.formatEditUpdate(
      TextEditingValue.empty,
      const TextEditingValue(
        text: '١٥٠٠',
        selection: TextSelection.collapsed(offset: 4),
      ),
    );
    expect(out.text, '1500');
    expect(out.selection.end, 4);
    expect(
      f
          .formatEditUpdate(
            TextEditingValue.empty,
            const TextEditingValue(
              text: '12a',
              selection: TextSelection.collapsed(offset: 3),
            ),
          )
          .text,
      '12a',
    );
  });
}
