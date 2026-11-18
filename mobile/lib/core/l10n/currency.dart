import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../gate/app_gate.dart';
import '../storage/local_settings.dart';
import 'language.dart';

/// 135.5 The customer's currency: prices also show in it, at the day's
/// rate (the server converts; the shop's prices stay). The customer's pick
/// in Settings, else the currency of the phone's region (never where the
/// phone is: no location is read); null when the region has none we know.
/// Sent as `X-Currency` on every request. 149 Null too when the owner
/// turned prices in the customer's currency off for the app, or left this
/// one out of the app's currencies: the shop's prices only.
final appCurrencyProvider = Provider<String?>((ref) {
  final saved = ref.watch(localSettingsProvider.select((s) => s.currency));
  final code = saved != null && saved.isNotEmpty
      ? saved
      : regionCurrency(
          ref.watch(deviceLocalesProvider).firstOrNull?.countryCode,
        );
  if (code == null) return null;
  final rule = ref.watch(customerCurrencyRuleProvider);
  return rule.rule.allows(code, shop: rule.shop) ? code : null;
});

/// 149 The owner's rule for customers' currencies in this app, with the
/// shop's own currency (always allowed); before the config is in, or from
/// an older server: on, any currency.
final customerCurrencyRuleProvider =
    Provider<({CustomerCurrencyRule rule, String? shop})>(
      (ref) => ref.watch(
        appGateProvider.select(
          (gate) => gate is GateReady
              ? (
                  rule: gate.config.customerCurrency,
                  shop: gate.config.shopCurrency,
                )
              : (rule: CustomerCurrencyRule.any, shop: null),
        ),
      ),
    );

/// 135.5 The currency of a region (ISO 3166 alpha-2, "EG", "KW"); null for
/// none or one we don't know.
String? regionCurrency(String? region) {
  if (region == null || region.length != 2) return null;
  return _byRegion[region.toUpperCase()];
}

/// Each region's currency (ISO 3166-1 alpha-2 to ISO 4217).
final Map<String, String> _byRegion = {
  for (final pair in _regions.split(' '))
    if (pair.length == 6) pair.substring(0, 2): pair.substring(3),
};

const _regions =
    'AD:EUR AE:AED AF:AFN AG:XCD AI:XCD AL:ALL AM:AMD AO:AOA AR:ARS AS:USD '
    'AT:EUR AU:AUD AW:AWG AX:EUR AZ:AZN BA:BAM BB:BBD BD:BDT BE:EUR BF:XOF '
    'BG:EUR BH:BHD BI:BIF BJ:XOF BL:EUR BM:BMD BN:BND BO:BOB BQ:USD BR:BRL '
    'BS:BSD BT:BTN BW:BWP BY:BYN BZ:BZD CA:CAD CD:CDF CF:XAF CG:XAF CH:CHF '
    'CI:XOF CK:NZD CL:CLP CM:XAF CN:CNY CO:COP CR:CRC CU:CUP CV:CVE CW:XCG '
    'CY:EUR CZ:CZK DE:EUR DJ:DJF DK:DKK DM:XCD DO:DOP DZ:DZD EC:USD EE:EUR '
    'EG:EGP EH:MAD ER:ERN ES:EUR ET:ETB FI:EUR FJ:FJD FK:FKP FM:USD FO:DKK '
    'FR:EUR GA:XAF GB:GBP GD:XCD GE:GEL GF:EUR GG:GBP GH:GHS GI:GIP GL:DKK '
    'GM:GMD GN:GNF GP:EUR GQ:XAF GR:EUR GT:GTQ GU:USD GW:XOF GY:GYD HK:HKD '
    'HN:HNL HR:EUR HT:HTG HU:HUF ID:IDR IE:EUR IL:ILS IM:GBP IN:INR IO:USD '
    'IQ:IQD IR:IRR IS:ISK IT:EUR JE:GBP JM:JMD JO:JOD JP:JPY KE:KES KG:KGS '
    'KH:KHR KI:AUD KM:KMF KN:XCD KP:KPW KR:KRW KW:KWD KY:KYD KZ:KZT LA:LAK '
    'LB:LBP LC:XCD LI:CHF LK:LKR LR:LRD LS:LSL LT:EUR LU:EUR LV:EUR LY:LYD '
    'MA:MAD MC:EUR MD:MDL ME:EUR MF:EUR MG:MGA MH:USD MK:MKD ML:XOF MM:MMK '
    'MN:MNT MO:MOP MP:USD MQ:EUR MR:MRU MS:XCD MT:EUR MU:MUR MV:MVR MW:MWK '
    'MX:MXN MY:MYR MZ:MZN NA:NAD NC:XPF NE:XOF NF:AUD NG:NGN NI:NIO NL:EUR '
    'NO:NOK NP:NPR NR:AUD NU:NZD NZ:NZD OM:OMR PA:PAB PE:PEN PF:XPF PG:PGK '
    'PH:PHP PK:PKR PL:PLN PM:EUR PN:NZD PR:USD PS:ILS PT:EUR PW:USD PY:PYG '
    'QA:QAR RE:EUR RO:RON RS:RSD RU:RUB RW:RWF SA:SAR SB:SBD SC:SCR SD:SDG '
    'SE:SEK SG:SGD SH:SHP SI:EUR SK:EUR SL:SLE SM:EUR SN:XOF SO:SOS SR:SRD '
    'SS:SSP ST:STN SV:USD SX:XCG SY:SYP SZ:SZL TC:USD TD:XAF TG:XOF TH:THB '
    'TJ:TJS TK:NZD TL:USD TM:TMT TN:TND TO:TOP TR:TRY TT:TTD TV:AUD TW:TWD '
    'TZ:TZS UA:UAH UG:UGX UM:USD US:USD UY:UYU UZ:UZS VA:EUR VC:XCD VE:VES '
    'VG:USD VI:USD VN:VND VU:VUV WF:XPF WS:WST XK:EUR YE:YER YT:EUR ZA:ZAR '
    'ZM:ZMW ZW:ZWG';

/// 135.5 Saves the customer's pick (null: back to the phone's region); the
/// content reloads with prices in it.
void changeCurrency(WidgetRef ref, String? code) {
  ref.read(localSettingsProvider.notifier).setCurrency(code);
}
