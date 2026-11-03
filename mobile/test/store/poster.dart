// 104.8.6 Yallapp Courier's store screenshots as the stores show them, as
// Yallapp Business's (business/test/store/poster.dart): each screen inside a
// phone or tablet frame, under a short line that says what it does, in
// Yallapp's colors and fonts (docs/BRAND.md).
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

/// Yallapp's colors (docs/BRAND.md).
abstract final class Brand {
  static const midnight = Color(0xFF0E0D24);
  static const ivory = Color(0xFFF4EFE6);
  static const ember = Color(0xFFFF5A1F);
}

/// The fonts the app bundles: Latin, and Arabic letters.
const latinFont = 'Bricolage Grotesque';
const arabicFont = 'Readex Pro';

/// A screen's headline and the line under it.
typedef Caption = ({String title, String line});

/// What each screenshot says, by screen and language. Marketing text of the
/// listing, not interface strings: no "AI" wording (docs/BRAND.md).
const captions = <String, Map<String, Caption>>{
  'companies': {
    'en': (
      title: 'One app for every company',
      line: 'Sign in once and pick the company you deliver for.',
    ),
    'ar': (
      title: 'تطبيق واحد لكل الشركات',
      line: 'سجّل الدخول مرة واحدة واختر الشركة التي توصّل لها.',
    ),
    'tr': (
      title: 'Her şirket için tek uygulama',
      line: 'Bir kez giriş yapın, teslimat yaptığınız şirketi seçin.',
    ),
  },
  'jobs': {
    'en': (
      title: 'Your jobs, ready to go',
      line: 'On duty with one switch, your jobs in order.',
    ),
    'ar': (
      title: 'مهامك جاهزة للانطلاق',
      line: 'في الخدمة بلمسة واحدة، ومهامك مرتبة أمامك.',
    ),
    'tr': (
      title: 'İşleriniz hazır',
      line: 'Tek dokunuşla görevde, işleriniz sırayla önünüzde.',
    ),
  },
  'job': {
    'en': (
      title: 'Every step of the delivery',
      line: 'Picked up, on the way, delivered, with the cash to collect.',
    ),
    'ar': (
      title: 'كل خطوة في التوصيل',
      line: 'الاستلام والطريق والتسليم، مع المبلغ المطلوب تحصيله.',
    ),
    'tr': (
      title: 'Teslimatın her adımı',
      line: 'Teslim alındı, yolda, teslim edildi; tahsil edilecek nakitle.',
    ),
  },
  'waiting': {
    'en': (
      title: 'Take the jobs waiting',
      line: 'New jobs near you, as soon as they come in.',
    ),
    'ar': (
      title: 'خذ المهام المنتظرة',
      line: 'مهام جديدة بالقرب منك، لحظة وصولها.',
    ),
    'tr': (
      title: 'Bekleyen işleri alın',
      line: 'Yakınınızdaki yeni işler, gelir gelmez.',
    ),
  },
  'account': {
    'en': (
      title: 'Switch company any time',
      line: 'Each company keeps its own jobs and sign-in.',
    ),
    'ar': (
      title: 'بدّل الشركة متى شئت',
      line: 'لكل شركة مهامها وتسجيل دخولها.',
    ),
    'tr': (
      title: 'Şirketi istediğiniz an değiştirin',
      line: 'Her şirketin kendi işleri ve girişi var.',
    ),
  },
};

/// The finished screenshot: [caption] over [screen] (the app's own
/// screenshot, [screenSize] logical pixels with [bars] as its system bars)
/// in a phone or [tablet] frame, on Midnight or ([dark] false) Ivory.
class StorePoster extends StatelessWidget {
  const StorePoster({
    super.key,
    required this.screen,
    required this.screenSize,
    required this.bars,
    required this.caption,
    required this.language,
    required this.tablet,
    required this.dark,
    required this.darkScreen,
  });

  final ui.Image screen;
  final Size screenSize;
  final EdgeInsets bars;
  final Caption caption;
  final String language;
  final bool tablet;
  final bool dark;

  /// The screen itself is dark (the door scanner): light status bar icons.
  final bool darkScreen;

  @override
  Widget build(BuildContext context) {
    final arabic = language == 'ar';
    final background = dark ? Brand.midnight : Brand.ivory;
    final ink = dark ? Brand.ivory : Brand.midnight;
    return Directionality(
      textDirection: arabic ? TextDirection.rtl : TextDirection.ltr,
      child: ColoredBox(
        color: background,
        child: LayoutBuilder(
          builder: (context, box) {
            final w = box.maxWidth;
            final h = box.maxHeight;
            final side = w * 0.08;
            final size = w * (tablet ? 0.07 : 0.084);
            TextStyle style(
              double fontSize,
              FontWeight weight,
              double height,
              double spacing,
            ) => TextStyle(
              fontFamily: arabic ? arabicFont : latinFont,
              fontFamilyFallback: const [arabicFont],
              fontSize: fontSize,
              fontWeight: weight,
              height: arabic ? height + 0.2 : height,
              letterSpacing: arabic ? 0 : fontSize * spacing,
              color: ink,
            );
            return Column(
              children: [
                SizedBox(height: h * 0.055),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: side),
                  child: Column(
                    children: [
                      // Ember as a small accent only (docs/BRAND.md).
                      Container(
                        width: size * 1.1,
                        height: size * 0.16,
                        decoration: BoxDecoration(
                          color: Brand.ember,
                          borderRadius: BorderRadius.circular(size),
                        ),
                      ),
                      SizedBox(height: size * 0.5),
                      Text(
                        caption.title,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        style: style(size, FontWeight.w700, 1.08, -0.022),
                      ),
                      SizedBox(height: size * 0.35),
                      Text(
                        caption.line,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        style: style(
                          size * 0.46,
                          FontWeight.w400,
                          1.35,
                          -0.004,
                        ).copyWith(color: ink.withValues(alpha: 0.72)),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: h * 0.035),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                      side * 0.75,
                      0,
                      side * 0.75,
                      h * 0.04,
                    ),
                    child: FittedBox(
                      alignment: Alignment.topCenter,
                      child: _Device(
                        screen: screen,
                        size: screenSize,
                        bars: bars,
                        tablet: tablet,
                        onDark: dark,
                        darkScreen: darkScreen,
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// A thin, plain device: the screen, a bezel, a camera and a status bar.
class _Device extends StatelessWidget {
  const _Device({
    required this.screen,
    required this.size,
    required this.bars,
    required this.tablet,
    required this.onDark,
    required this.darkScreen,
  });

  final ui.Image screen;
  final Size size;
  final EdgeInsets bars;
  final bool tablet;
  final bool onDark;
  final bool darkScreen;

  @override
  Widget build(BuildContext context) {
    final bezel = size.width * (tablet ? 0.028 : 0.034);
    final outer = size.width * (tablet ? 0.06 : 0.135);
    final inner = outer - bezel;
    final camera = bezel * (tablet ? 0.45 : 0.62);
    final island = !tablet && bars.top >= 44;
    final barInk = darkScreen ? Brand.ivory : Brand.midnight;
    final barText = TextStyle(
      fontFamily: latinFont,
      // As on the phone: about 12 points on Android, 15 beside the island.
      fontSize: island ? 15 : bars.top * 0.52,
      fontWeight: FontWeight.w600,
      color: barInk,
    );
    return Container(
      padding: EdgeInsets.all(bezel),
      decoration: BoxDecoration(
        color: onDark ? const Color(0xFF24233D) : Brand.midnight,
        borderRadius: BorderRadius.circular(outer),
        border: Border.all(
          color: onDark ? const Color(0xFF3B3A58) : const Color(0xFF2C2B47),
          width: bezel * 0.18,
        ),
        boxShadow: onDark
            ? null
            : [
                BoxShadow(
                  color: Brand.midnight.withValues(alpha: 0.18),
                  blurRadius: size.width * 0.08,
                  offset: Offset(0, size.width * 0.03),
                ),
              ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(inner),
        child: SizedBox.fromSize(
          size: size,
          child: Stack(
            children: [
              Positioned.fill(
                child: RawImage(
                  image: screen,
                  fit: BoxFit.fill,
                  filterQuality: FilterQuality.high,
                ),
              ),
              // The status bar, as on a phone at rest.
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                height: bars.top,
                child: Directionality(
                  textDirection: TextDirection.ltr,
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: tablet
                          ? bars.top
                          : size.width * (island ? 0.1 : 0.07),
                    ),
                    child: Row(
                      children: [
                        Text('9:41', style: barText),
                        const Spacer(),
                        for (final icon in const [
                          Symbols.signal_cellular_alt_rounded,
                          Symbols.wifi_rounded,
                          Symbols.battery_full_rounded,
                        ])
                          Padding(
                            padding: const EdgeInsets.only(left: 3),
                            child: Icon(
                              icon,
                              size: island ? 16 : bars.top * 0.6,
                              color: barInk,
                              fill: 1,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              // An iPhone's island, an Android phone's camera hole; a
              // tablet's camera sits in its bezel, out of sight.
              if (island)
                Positioned(
                  top: bars.top * 0.19,
                  left: (size.width - size.width * 0.29) / 2,
                  child: Container(
                    width: size.width * 0.29,
                    height: bars.top * 0.62,
                    decoration: BoxDecoration(
                      color: const Color(0xFF07061A),
                      borderRadius: BorderRadius.circular(bars.top),
                    ),
                  ),
                )
              else if (!tablet)
                Positioned(
                  top: (bars.top - camera) / 2,
                  left: (size.width - camera) / 2,
                  child: Container(
                    width: camera,
                    height: camera,
                    decoration: const BoxDecoration(
                      color: Color(0xFF07061A),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
