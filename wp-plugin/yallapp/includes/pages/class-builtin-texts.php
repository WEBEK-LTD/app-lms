<?php
/**
 * Yallapp's Arabic and Turkish for the default pages' texts.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * 43 The tab names, page title and block titles the plugin writes into the default pages,
 * in the languages Yallapp ships besides English, the same words as the platform's
 * (platform/web/src/lib/i18n/builtin). The default layout carries them as `translations`,
 * so an app asking in Arabic or Turkish gets them, unless the site's own texts differ.
 * Has no WordPress dependencies, so it can be unit tested.
 */
class Builtin_Texts {

	/**
	 * English text, then Arabic and Turkish.
	 */
	const TEXTS = array(
		'Home'              => array( 'الرئيسية', 'Ana sayfa' ),
		'Courses'           => array( 'الدورات', 'Kurslar' ),
		'My courses'        => array( 'دوراتي', 'Kurslarım' ),
		'Shop'              => array( 'المتجر', 'Mağaza' ),
		'Cart'              => array( 'السلة', 'Sepet' ),
		'Book'              => array( 'احجز', 'Randevu al' ),
		'Appointments'      => array( 'المواعيد', 'Randevular' ),
		'Latest'            => array( 'الأحدث', 'En yeni' ),
		'Saved'             => array( 'المحفوظات', 'Kaydedilenler' ),
		'Account'           => array( 'الحساب', 'Hesap' ),
		'Search courses'    => array( 'ابحث في الدورات', 'Kurslarda ara' ),
		'Continue learning' => array( 'تابع التعلّم', 'Öğrenmeye devam et' ),
		'Categories'        => array( 'الفئات', 'Kategoriler' ),
		'Featured courses'  => array( 'دورات مميزة', 'Öne çıkan kurslar' ),
		'Latest courses'    => array( 'أحدث الدورات', 'En yeni kurslar' ),
		'Search articles'   => array( 'ابحث في المقالات', 'Makalelerde ara' ),
		'Top stories'       => array( 'أهم الأخبار', 'Manşetler' ),
		'Sections'          => array( 'الأقسام', 'Bölümler' ),
		'Search products'   => array( 'ابحث في المنتجات', 'Ürün ara' ),
		'Featured'          => array( 'مختارات', 'Öne çıkanlar' ),
		'New arrivals'      => array( 'وصل حديثًا', 'Yeni gelenler' ),
		'Best sellers'      => array( 'الأكثر مبيعًا', 'Çok satanlar' ),
		'Services'          => array( 'الخدمات', 'Hizmetler' ),
		'Latest posts'      => array( 'أحدث المقالات', 'Son yazılar' ),
	);

	/**
	 * The languages, in the order of TEXTS' values.
	 */
	const LANGUAGES = array( 'ar', 'tr' );

	/**
	 * Fields of tabs, pages and blocks that may carry them.
	 */
	const FIELDS = array( 'label', 'title', 'placeholder' );

	/**
	 * An entry with Yallapp's translations of its texts added, keeping any it already has.
	 *
	 * @param array $entry Tab, page or block.
	 * @return array
	 */
	public static function add( array $entry ) {
		foreach ( self::FIELDS as $field ) {
			if ( ! isset( $entry[ $field ] ) || ! is_string( $entry[ $field ] ) || ! isset( self::TEXTS[ $entry[ $field ] ] ) ) {
				continue;
			}
			foreach ( self::LANGUAGES as $i => $language ) {
				if ( empty( $entry['translations'][ $language ][ $field ] ) ) {
					$entry['translations'][ $language ][ $field ] = self::TEXTS[ $entry[ $field ] ][ $i ];
				}
			}
		}
		return $entry;
	}

	/**
	 * A default layout with Yallapp's translations on its tabs, pages and blocks.
	 *
	 * @param array $layout Layout shape.
	 * @return array
	 */
	public static function layout( array $layout ) {
		foreach ( array( 'tabs', 'pages' ) as $list ) {
			if ( ! isset( $layout[ $list ] ) || ! is_array( $layout[ $list ] ) ) {
				continue;
			}
			foreach ( $layout[ $list ] as $i => $entry ) {
				if ( ! is_array( $entry ) ) {
					continue;
				}
				$entry = self::add( $entry );
				if ( 'pages' === $list && isset( $entry['blocks'] ) && is_array( $entry['blocks'] ) ) {
					foreach ( $entry['blocks'] as $b => $block ) {
						if ( is_array( $block ) ) {
							$entry['blocks'][ $b ] = self::add( $block );
						}
					}
				}
				$layout[ $list ][ $i ] = $entry;
			}
		}
		return $layout;
	}
}
