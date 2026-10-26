// 74 The store screenshots as the stores show them: each screen inside a
// phone or tablet frame, under a short line that says what it does, in
// Yallapp's colors and fonts (docs/BRAND.md).
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp_business/core/theme/theme.dart';

/// A screen's headline and the line under it.
typedef Caption = ({String title, String line});

/// What each screenshot says, by screen and language. Marketing text of the
/// listing, not interface strings: no "AI" wording (docs/BRAND.md).
const captions = <String, Map<String, Caption>>{
  'today': {
    'en': (
      title: 'Your whole business at a glance',
      line: 'Sales, orders and new customers as they happen.',
    ),
    'ar': (
      title: 'نشاطك كله في نظرة واحدة',
      line: 'المبيعات والطلبات والعملاء الجدد لحظة بلحظة.',
    ),
    'tr': (
      title: 'Tüm işletmeniz tek bakışta',
      line: 'Satışlar, siparişler ve yeni müşteriler anında önünüzde.',
    ),
  },
  'orders': {
    'en': (
      title: 'Accept orders in one tap',
      line: 'From new to ready, wherever you are.',
    ),
    'ar': (
      title: 'اقبل الطلبات بلمسة واحدة',
      line: 'من الطلب الجديد حتى التسليم، أينما كنت.',
    ),
    'tr': (
      title: 'Siparişleri tek dokunuşla kabul edin',
      line: 'Yeni siparişten teslimata, nerede olursanız olun.',
    ),
  },
  'scanner': {
    'en': (
      title: 'Check tickets right at the door',
      line: 'Scan, welcome your guests and count who came.',
    ),
    'ar': (
      title: 'افحص التذاكر عند الباب مباشرة',
      line: 'امسح التذكرة، رحّب بضيوفك واعرف من حضر.',
    ),
    'tr': (
      title: 'Biletleri kapıda kontrol edin',
      line: 'Okutun, misafirlerinizi karşılayın, kimin geldiğini görün.',
    ),
  },
  'notify': {
    'en': (
      title: 'Reach every customer in seconds',
      line: 'Send offers and news straight to their phones.',
    ),
    'ar': (
      title: 'أرسل لعملائك في ثوانٍ',
      line: 'العروض والأخبار تصل إلى هواتفهم مباشرة.',
    ),
    'tr': (
      title: 'Tüm müşterilerinize saniyeler içinde ulaşın',
      line: 'Kampanyaları ve haberleri doğrudan telefonlarına gönderin.',
    ),
  },
  'stats': {
    'en': (
      title: 'Watch your app grow',
      line: 'Installs, active users and sessions, day by day.',
    ),
    'ar': (
      title: 'تابع نمو تطبيقك',
      line: 'التثبيتات والمستخدمون النشطون والجلسات يومًا بيوم.',
    ),
    'tr': (
      title: 'Uygulamanızın büyümesini izleyin',
      line: 'Kurulumlar, aktif kullanıcılar ve oturumlar gün gün.',
    ),
  },
  'chat': {
    'en': (
      title: 'Answer customers as they write',
      line: 'Every conversation from your app, in one inbox.',
    ),
    'ar': (
      title: 'ردّ على عملائك فور مراسلتهم',
      line: 'كل محادثات تطبيقك في صندوق واحد.',
    ),
    'tr': (
      title: 'Müşterilere anında yanıt verin',
      line: 'Uygulamanızdaki tüm sohbetler tek bir kutuda.',
    ),
  },
  'appointments': {
    'en': (
      title: 'Every appointment in your pocket',
      line: 'Confirm, move or cancel with one tap.',
    ),
    'ar': (
      title: 'كل مواعيدك في جيبك',
      line: 'أكّد أو انقل أو ألغِ الموعد بلمسة واحدة.',
    ),
    'tr': (
      title: 'Tüm randevularınız cebinizde',
      line: 'Tek dokunuşla onaylayın, taşıyın veya iptal edin.',
    ),
  },
  'catalog': {
    'en': (
      title: 'Update your menu in seconds',
      line: 'Prices, photos and what is sold out, live in the app.',
    ),
    'ar': (
      title: 'حدّث قائمتك في ثوانٍ',
      line: 'الأسعار والصور وما نفد، مباشرة في التطبيق.',
    ),
    'tr': (
      title: 'Menünüzü saniyeler içinde güncelleyin',
      line: 'Fiyatlar, fotoğraflar ve tükenenler anında uygulamada.',
    ),
  },
  'kitchen': {
    'en': (
      title: 'A kitchen screen that keeps up',
      line: 'New orders sound and show at once.',
    ),
    'ar': (
      title: 'شاشة مطبخ تواكب كل طلب',
      line: 'الطلبات الجديدة تُسمع وتظهر فورًا.',
    ),
    'tr': (
      title: 'Hıza ayak uyduran mutfak ekranı',
      line: 'Yeni siparişler anında duyulur ve görünür.',
    ),
  },
  'media': {
    'en': (
      title: 'Your photos and videos in one place',
      line: 'Upload from your phone and use them in your app.',
    ),
    'ar': (
      title: 'صورك وفيديوهاتك في مكان واحد',
      line: 'ارفعها من هاتفك واستخدمها في تطبيقك.',
    ),
    'tr': (
      title: 'Fotoğraflarınız ve videolarınız tek yerde',
      line: 'Telefonunuzdan yükleyin, uygulamanızda kullanın.',
    ),
  },
};

/// The wide artwork's words, by language: the listing's name and subtitle.
const bannerWords = <String, Caption>{
  'en': (
    title: 'Run your app from your phone',
    line: 'Orders, customers, notifications and stats, wherever you are.',
  ),
  'ar': (
    title: 'أدر تطبيقك من هاتفك',
    line: 'الطلبات والعملاء والإشعارات والإحصاءات، أينما كنت.',
  ),
  'tr': (
    title: 'Uygulamanızı telefonda yönetin',
    line: 'Siparişler, müşteriler, bildirimler ve istatistikler her yerde.',
  ),
};

/// The wide artwork the App Store asks for beside the screenshots: the name
/// and a line on Midnight, with three of the app's screens in phones.
class StoreBanner extends StatelessWidget {
  const StoreBanner({
    super.key,
    required this.screens,
    required this.screenSize,
    required this.bars,
    required this.icon,
    required this.language,
  });

  final List<ui.Image> screens;
  final Size screenSize;
  final EdgeInsets bars;
  final ui.Image icon;
  final String language;

  @override
  Widget build(BuildContext context) {
    final arabic = language == 'ar';
    final words = bannerWords[language]!;
    return Directionality(
      textDirection: arabic ? TextDirection.rtl : TextDirection.ltr,
      child: ColoredBox(
        color: Brand.midnight,
        child: LayoutBuilder(
          builder: (context, box) {
            final w = box.maxWidth;
            final h = box.maxHeight;
            // The text scales with the shorter side, so very wide art stays legible.
            final size = (h * 0.075).clamp(0.0, w * 0.045);
            TextStyle style(
              double fontSize,
              FontWeight weight,
              double height,
            ) => TextStyle(
              fontFamily: arabic ? arabicFont : latinFont,
              fontFamilyFallback: const [arabicFont],
              fontSize: fontSize,
              fontWeight: weight,
              height: arabic ? height + 0.2 : height,
              letterSpacing: arabic ? 0 : fontSize * -0.02,
              color: Brand.ivory,
            );
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: w * 0.06),
              child: Row(
                children: [
                  Expanded(
                    flex: 9,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(size * 0.5),
                              child: SizedBox.square(
                                dimension: size * 2,
                                child: RawImage(
                                  image: icon,
                                  fit: BoxFit.cover,
                                  filterQuality: FilterQuality.high,
                                ),
                              ),
                            ),
                            SizedBox(width: size * 0.5),
                            Flexible(
                              child: Text(
                                'Yallapp Business',
                                maxLines: 1,
                                style: TextStyle(
                                  fontFamily: latinFont,
                                  fontSize: size * 0.8,
                                  fontWeight: FontWeight.w700,
                                  color: Brand.ivory,
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: size * 0.9),
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
                          words.title,
                          maxLines: 2,
                          style: style(size * 1.05, FontWeight.w700, 1.1),
                        ),
                        SizedBox(height: size * 0.45),
                        Text(
                          words.line,
                          maxLines: 2,
                          style: style(size * 0.6, FontWeight.w400, 1.35)
                              .copyWith(
                                color: Brand.ivory.withValues(alpha: 0.72),
                              ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: w * 0.03),
                  Expanded(
                    flex: 11,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: h * 0.08),
                      child: FittedBox(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            for (final (i, screen) in screens.indexed) ...[
                              if (i > 0)
                                SizedBox(width: screenSize.width * 0.12),
                              Transform.translate(
                                // The middle phone a little higher.
                                offset: Offset(
                                  0,
                                  i == 1
                                      ? -screenSize.height * 0.05
                                      : screenSize.height * 0.03,
                                ),
                                child: _Device(
                                  screen: screen,
                                  size: screenSize,
                                  bars: bars,
                                  tablet: false,
                                  onDark: true,
                                  darkScreen: false,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

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
