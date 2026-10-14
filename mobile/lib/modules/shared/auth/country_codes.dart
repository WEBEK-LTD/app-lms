import '../../../core/l10n/l10n.dart';

class CountryCode {
  const CountryCode(this.iso, this.dialCode);

  /// ISO 3166 code, for the name in the app's language.
  final String iso;
  final String dialCode;

  String name(AppLocalizations l10n) => l10n.countryName(iso);
}

/// Countries offered in the picker. The site's `default_country_code` is
/// preselected; any other code can be typed by choosing "Other".
const countryCodes = [
  CountryCode('AF', '+93'),
  CountryCode('AL', '+355'),
  CountryCode('DZ', '+213'),
  CountryCode('AR', '+54'),
  CountryCode('AU', '+61'),
  CountryCode('AT', '+43'),
  CountryCode('AZ', '+994'),
  CountryCode('BH', '+973'),
  CountryCode('BD', '+880'),
  CountryCode('BE', '+32'),
  CountryCode('BA', '+387'),
  CountryCode('BR', '+55'),
  CountryCode('BG', '+359'),
  CountryCode('CA', '+1'),
  CountryCode('CN', '+86'),
  CountryCode('HR', '+385'),
  CountryCode('CY', '+357'),
  CountryCode('CZ', '+420'),
  CountryCode('DK', '+45'),
  CountryCode('EG', '+20'),
  CountryCode('FI', '+358'),
  CountryCode('FR', '+33'),
  CountryCode('GE', '+995'),
  CountryCode('DE', '+49'),
  CountryCode('GR', '+30'),
  CountryCode('HU', '+36'),
  CountryCode('IN', '+91'),
  CountryCode('ID', '+62'),
  CountryCode('IR', '+98'),
  CountryCode('IQ', '+964'),
  CountryCode('IE', '+353'),
  CountryCode('IT', '+39'),
  CountryCode('JP', '+81'),
  CountryCode('JO', '+962'),
  CountryCode('KZ', '+7'),
  CountryCode('KE', '+254'),
  CountryCode('XK', '+383'),
  CountryCode('KW', '+965'),
  CountryCode('KG', '+996'),
  CountryCode('LB', '+961'),
  CountryCode('LY', '+218'),
  CountryCode('MY', '+60'),
  CountryCode('MX', '+52'),
  CountryCode('MA', '+212'),
  CountryCode('NL', '+31'),
  CountryCode('NZ', '+64'),
  CountryCode('NG', '+234'),
  CountryCode('MK', '+389'),
  CountryCode('NO', '+47'),
  CountryCode('OM', '+968'),
  CountryCode('PK', '+92'),
  CountryCode('PS', '+970'),
  CountryCode('PH', '+63'),
  CountryCode('PL', '+48'),
  CountryCode('PT', '+351'),
  CountryCode('QA', '+974'),
  CountryCode('RO', '+40'),
  CountryCode('RU', '+7'),
  CountryCode('SA', '+966'),
  CountryCode('RS', '+381'),
  CountryCode('SG', '+65'),
  CountryCode('SO', '+252'),
  CountryCode('ZA', '+27'),
  CountryCode('KR', '+82'),
  CountryCode('ES', '+34'),
  CountryCode('SD', '+249'),
  CountryCode('SE', '+46'),
  CountryCode('CH', '+41'),
  CountryCode('SY', '+963'),
  CountryCode('TN', '+216'),
  CountryCode('TR', '+90'),
  CountryCode('TM', '+993'),
  CountryCode('UA', '+380'),
  CountryCode('AE', '+971'),
  CountryCode('GB', '+44'),
  CountryCode('US', '+1'),
  CountryCode('UZ', '+998'),
  CountryCode('YE', '+967'),
];

/// Normalises a code like "90" or "+90" to "+90"; null when invalid.
String? normalizeDialCode(String input) {
  final digits = input.replaceAll(RegExp(r'[^0-9]'), '');
  if (digits.isEmpty || digits.length > 4) return null;
  return '+$digits';
}

/// The national number to send: digits only, without a leading trunk 0
/// (Italy keeps it, as its numbers start with 0).
String nationalNumber(String input, String dialCode) {
  var digits = input.replaceAll(RegExp(r'[^0-9]'), '');
  if (dialCode != '+39') {
    while (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
  }
  return digits;
}
