import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/offline_cache.dart';
import 'package:yallapp/core/format/money.dart';
import 'package:yallapp/core/l10n/currency.dart';
import 'package:yallapp/modules/donations/data/donations_providers.dart';

/// 133 Every currency in the app: its digits, a code it doesn't know, the
/// phone's region's currency and the header that asks for it.
void main() {
  group('133.2 money in any currency', () {
    test('is written with its own digits', () {
      expect(currencyDigits('JPY'), 0);
      expect(currencyDigits('KRW'), 0);
      expect(currencyDigits('KWD'), 3);
      expect(currencyDigits('bhd'), 3);
      expect(currencyDigits('EGP'), 2);
      expect(formatMoney(125, 'KWD'), 'KWD 1.250');
      expect(formatMoney(125, 'OMR'), 'OMR 1.250');
      expect(formatMoney(125000, 'JPY'), '¥1,250');
      expect(formatMoney(45000, 'TRY'), '₺450.00');
      expect(formatMoney(1240, 'USD'), r'$12.40');
    });

    test('never fails on a code it doesn\'t know', () {
      expect(formatMoney(1000, 'XCG'), contains('10.00'));
      expect(formatMoney(1000, 'ZZZ'), contains('10.00'));
      expect(formatAmount('2.5', 'KWD'), 'KWD 2.500');
      expect(formatAmount('1250', 'JPY'), 'JPY 1,250');
    });

    test('keeps Latin digits in Arabic, as the server writes them', () {
      final before = Intl.defaultLocale;
      Intl.defaultLocale = 'ar';
      addTearDown(() => Intl.defaultLocale = before);
      expect(formatMoney(125, 'KWD'), 'KWD 1.250');
      expect(formatMoney(60000, 'SAR'), contains('600.00'));
    });
  });

  group('133.5 the customer\'s currency', () {
    test('comes from the phone\'s region, never its location', () {
      expect(regionCurrency('KW'), 'KWD');
      expect(regionCurrency('eg'), 'EGP');
      expect(regionCurrency('JP'), 'JPY');
      expect(regionCurrency('TR'), 'TRY');
      expect(regionCurrency('DE'), 'EUR');
      expect(regionCurrency(null), isNull);
      expect(regionCurrency('ZZ'), isNull);
      expect(regionCurrency('KWT'), isNull);
    });

    test('is sent as X-Currency, and cached pages are kept per currency', () {
      final options = RequestOptions(path: '/store/products');
      CurrencyInterceptor(() => 'KWD')
          .onRequest(options, RequestInterceptorHandler());
      expect(options.headers['X-Currency'], 'KWD');
      final none = RequestOptions(path: '/store/products');
      CurrencyInterceptor(() => null)
          .onRequest(none, RequestInterceptorHandler());
      expect(none.headers.containsKey('X-Currency'), isFalse);
      expect(OfflineCache.keyFor(options), isNot(OfflineCache.keyFor(none)));
    });

    test('reads prices, carts and orders in it, and older answers without it', () {
      final price = ProductPrice.fromJson({
        'amount': '600.00',
        'currency': 'EGP',
        'formatted': 'E£600.00',
        'on_sale': false,
        'range': false,
        'display': {
          'currency': 'USD',
          'amount': '12.37',
          'formatted': r'$12.37',
          'rate': 0.0206,
          'rate_date': '2026-11-16',
        },
      });
      expect(price.display?.formatted, r'$12.37');
      expect(price.display?.rate, 0.0206);
      expect(price.display?.rateDate, '2026-11-16');
      final old = ProductPrice.fromJson({
        'amount': '600.00',
        'currency': 'EGP',
        'formatted': 'E£600.00',
      });
      expect(old.display, isNull);
      final quote = CartQuote.fromJson({
        'lines': <Object>[],
        'item_count': 1,
        'subtotal': 'E£600.00',
        'subtotal_amount': '600.00',
        'currency': 'EGP',
        'total': 'E£600.00',
        'display': {
          'currency': 'KWD',
          'total': 'KWD 3.790',
          'total_amount': '3.790',
          'rate': 0.0063,
          'rate_date': '2026-11-16',
        },
        'charge': {
          'currency': 'EGP',
          'total': 'E£600.00',
          'total_amount': '600.00',
          'in_customer_currency': false,
          'reason': null,
          'display': null,
        },
      });
      expect(quote.display?.total, 'KWD 3.790');
      expect(quote.charge?.inCustomerCurrency, isFalse);
      // A menu's quote writes its amounts plain and its texts as `_formatted`.
      final food = DisplayMoney.fromJson({
        'currency': 'USD',
        'total': '13.40',
        'total_formatted': r'$13.40',
        'rate': 0.02,
      });
      expect(food.total, r'$13.40');
      expect(DisplayMoney.tryParse('nope'), isNull);
      expect(
        CurrencyList.fromJson({'rate_date': null, 'items': <Object>[]}).items,
        isEmpty,
      );
    });
  });
}
