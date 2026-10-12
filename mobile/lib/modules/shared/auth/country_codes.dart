class CountryCode {
  const CountryCode(this.name, this.dialCode);
  final String name;
  final String dialCode;
}

/// Countries offered in the picker. The site's `default_country_code` is
/// preselected; any other code can be typed by choosing "Other".
const countryCodes = [
  CountryCode('Afghanistan', '+93'),
  CountryCode('Albania', '+355'),
  CountryCode('Algeria', '+213'),
  CountryCode('Argentina', '+54'),
  CountryCode('Australia', '+61'),
  CountryCode('Austria', '+43'),
  CountryCode('Azerbaijan', '+994'),
  CountryCode('Bahrain', '+973'),
  CountryCode('Bangladesh', '+880'),
  CountryCode('Belgium', '+32'),
  CountryCode('Bosnia and Herzegovina', '+387'),
  CountryCode('Brazil', '+55'),
  CountryCode('Bulgaria', '+359'),
  CountryCode('Canada', '+1'),
  CountryCode('China', '+86'),
  CountryCode('Croatia', '+385'),
  CountryCode('Cyprus', '+357'),
  CountryCode('Czechia', '+420'),
  CountryCode('Denmark', '+45'),
  CountryCode('Egypt', '+20'),
  CountryCode('Finland', '+358'),
  CountryCode('France', '+33'),
  CountryCode('Georgia', '+995'),
  CountryCode('Germany', '+49'),
  CountryCode('Greece', '+30'),
  CountryCode('Hungary', '+36'),
  CountryCode('India', '+91'),
  CountryCode('Indonesia', '+62'),
  CountryCode('Iran', '+98'),
  CountryCode('Iraq', '+964'),
  CountryCode('Ireland', '+353'),
  CountryCode('Italy', '+39'),
  CountryCode('Japan', '+81'),
  CountryCode('Jordan', '+962'),
  CountryCode('Kazakhstan', '+7'),
  CountryCode('Kenya', '+254'),
  CountryCode('Kosovo', '+383'),
  CountryCode('Kuwait', '+965'),
  CountryCode('Kyrgyzstan', '+996'),
  CountryCode('Lebanon', '+961'),
  CountryCode('Libya', '+218'),
  CountryCode('Malaysia', '+60'),
  CountryCode('Mexico', '+52'),
  CountryCode('Morocco', '+212'),
  CountryCode('Netherlands', '+31'),
  CountryCode('New Zealand', '+64'),
  CountryCode('Nigeria', '+234'),
  CountryCode('North Macedonia', '+389'),
  CountryCode('Norway', '+47'),
  CountryCode('Oman', '+968'),
  CountryCode('Pakistan', '+92'),
  CountryCode('Palestine', '+970'),
  CountryCode('Philippines', '+63'),
  CountryCode('Poland', '+48'),
  CountryCode('Portugal', '+351'),
  CountryCode('Qatar', '+974'),
  CountryCode('Romania', '+40'),
  CountryCode('Russia', '+7'),
  CountryCode('Saudi Arabia', '+966'),
  CountryCode('Serbia', '+381'),
  CountryCode('Singapore', '+65'),
  CountryCode('Somalia', '+252'),
  CountryCode('South Africa', '+27'),
  CountryCode('South Korea', '+82'),
  CountryCode('Spain', '+34'),
  CountryCode('Sudan', '+249'),
  CountryCode('Sweden', '+46'),
  CountryCode('Switzerland', '+41'),
  CountryCode('Syria', '+963'),
  CountryCode('Tunisia', '+216'),
  CountryCode('Turkey', '+90'),
  CountryCode('Turkmenistan', '+993'),
  CountryCode('Ukraine', '+380'),
  CountryCode('United Arab Emirates', '+971'),
  CountryCode('United Kingdom', '+44'),
  CountryCode('United States', '+1'),
  CountryCode('Uzbekistan', '+998'),
  CountryCode('Yemen', '+967'),
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
