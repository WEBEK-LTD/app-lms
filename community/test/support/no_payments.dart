/// What no app string may show: a price, a buy button, a payment link, or
/// "unlock" wording (shared by test/no_payments_test.dart and area E's
/// academy test).
final bannedPayments = RegExp(
  [
    r'[$€£₺]\s?\d', r'\d\s?(?:[$€£₺]|usd|eur|try|tl)\b', // a price
    r'\bprices?\b',
    r'\bpricing\b',
    r'\bbuy\b',
    r'\bpurchase',
    r'\bcheckout\b',
    r'\bsubscribe\b', r'\bsubscription', r'\bpay(?:ment|wall|pal)?\b',
    r'\bbilling\b', r'\bcart\b', r'\bupgrade\b',
    // Every tutorial is free: nothing is unlocked (the owner, 24 November
    // 2026).
    r'\bunlock',
    r'fiyat', r'satın al', r'ödeme', r'abonelik', r'sepet', // Turkish
    r'سعر',
    r'أسعار',
    r'اشتر',
    r'شراء',
    r'الدفع',
    r'اشتراك',
    r'السلة', // Arabic
    r'/(?:pricing|checkout|billing|pay|cart|subscribe)\b', // a payment link
  ].join('|'),
  caseSensitive: false,
);
