import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/external_links.dart';
import '../theme/palette.dart';

/// 135.10 The day's rates come from ExchangeRate-API's open access endpoint,
/// whose terms ask for its attribution where the rates are used: the cart's
/// price in the customer's currency and Settings › Currency. Its own words, in
/// English in every language (as on the dashboard and the payment page);
/// its site opens in the browser, outside the app.
const ratesAttributionText = 'Rates By Exchange Rate API';
const ratesAttributionUrl = 'https://www.exchangerate-api.com';

class RatesAttribution extends ConsumerWidget {
  const RatesAttribution({
    super.key,
    this.alignment = AlignmentDirectional.centerEnd,
  });

  final AlignmentGeometry alignment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return Align(
      alignment: alignment,
      child: Semantics(
        link: true,
        child: InkWell(
          key: const Key('rates-attribution'),
          borderRadius: BorderRadius.circular(6),
          onTap: () => ref.read(openExternalProvider)(ratesAttributionUrl),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
            child: Text(
              ratesAttributionText,
              textDirection: TextDirection.ltr,
              style: TextStyle(
                fontSize: 12,
                color: p.textSecondary,
                decoration: TextDecoration.underline,
                decorationColor: p.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
