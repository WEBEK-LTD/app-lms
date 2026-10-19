<?php
/**
 * Page texts in the language the student picked.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * Picks the language from Accept-Language and applies a layout's `translations`, falling
 * back to the default text. Has no WordPress dependencies, so it can be unit tested.
 */
class Translator {

	/**
	 * Language codes the app ships its own texts in.
	 */
	const CODES = array( 'en', 'ar', 'tr' );

	/**
	 * 43 Every language the app can show (LanguageCode: the languages of the app's system
	 * screens), the same list as the platform's (platform/web/src/lib/i18n/locales.ts).
	 */
	const LANGUAGES = 'af am ar as az be bg bn bo bs ca cs cy da de el en es et eu fa fi fil fr ga gl gsw gu he hi hr hu hy id is it ja ka kk km kn ko ky lo lt lv mk ml mn mr ms my nb ne nl no or pa pl ps pt ro ru si sk sl sq sr sv sw ta te th tl tr ug uk ur uz vi zh zu';

	/**
	 * Fields a translation may replace.
	 */
	const TEXT_FIELDS = array( 'title', 'label', 'heading', 'subheading', 'html', 'placeholder', 'text', 'ended_text', 'note', 'address' );

	/**
	 * 33 A block's lists whose entries carry their own `translations`, and the fields those may replace.
	 */
	const ENTRY_FIELDS = array(
		'slides'    => array( 'heading', 'subheading' ),
		'links'     => array( 'label' ),
		'quotes'    => array( 'text', 'name', 'role' ),
		'questions' => array( 'question', 'answer' ),
		'people'    => array( 'name', 'role', 'bio' ),
		'stats'     => array( 'value', 'label' ),
	);

	/**
	 * The language to answer in.
	 *
	 * @param string $header    Accept-Language, e.g. "ar-EG,ar;q=0.9,en;q=0.8".
	 * @param array  $languages Languages shape: default and available.
	 * @return string
	 */
	public static function pick( $header, array $languages ) {
		$wanted = array();
		foreach ( explode( ',', (string) $header ) as $order => $part ) {
			$bits = explode( ';', trim( $part ) );
			$code = strtolower( trim( (string) strtok( $bits[0], '-_' ) ) );
			$q    = 1.0;
			foreach ( array_slice( $bits, 1 ) as $param ) {
				if ( preg_match( '/^\s*q\s*=\s*([0-9.]+)\s*$/i', $param, $m ) ) {
					$q = (float) $m[1];
				}
			}
			if ( '' !== $code && $q > 0 ) {
				$wanted[] = array( $code, $q, $order );
			}
		}
		usort(
			$wanted,
			static function ( $a, $b ) {
				return $a[1] === $b[1] ? $a[2] - $b[2] : ( $a[1] < $b[1] ? 1 : -1 );
			}
		);
		foreach ( $wanted as $entry ) {
			if ( in_array( $entry[0], $languages['available'], true ) ) {
				return $entry[0];
			}
		}
		return $languages['default'];
	}

	/**
	 * Languages shape, keeping only valid codes, in the owner's order; 43 with `list` (each
	 * language's names, direction and string pack) passed on when the platform sent it.
	 *
	 * @param mixed $raw Languages from the layout, or null.
	 * @return array{default: string, available: string[], list?: array[]}
	 */
	public static function languages( $raw ) {
		$default   = is_array( $raw ) && isset( $raw['default'] ) && self::is_code( $raw['default'] ) ? $raw['default'] : 'en';
		$available = array();
		if ( is_array( $raw ) && isset( $raw['available'] ) && is_array( $raw['available'] ) ) {
			foreach ( $raw['available'] as $code ) {
				if ( self::is_code( $code ) && ! in_array( $code, $available, true ) ) {
					$available[] = $code;
				}
			}
		}
		if ( ! in_array( $default, $available, true ) ) {
			array_unshift( $available, $default );
		}
		$out  = array(
			'default'   => $default,
			'available' => $available,
		);
		$list = self::language_list( is_array( $raw ) && isset( $raw['list'] ) ? $raw['list'] : null, $available );
		if ( $list ) {
			$out['list'] = $list;
		}
		return $out;
	}

	/**
	 * Whether a value is a language code.
	 *
	 * @param mixed $code Value.
	 * @return bool
	 */
	public static function is_code( $code ) {
		return is_string( $code ) && in_array( $code, explode( ' ', self::LANGUAGES ), true );
	}

	/**
	 * 43 `AppLanguage` for each available language, from the platform's list: names, direction
	 * and where the app downloads the owner's strings. Null when the list doesn't cover them all.
	 *
	 * @param mixed    $raw       The platform's list.
	 * @param string[] $available Available codes.
	 * @return array[]|null
	 */
	private static function language_list( $raw, array $available ) {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$by_code = array();
		foreach ( $raw as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['code'] ) || ! self::is_code( $item['code'] ) ) {
				continue;
			}
			$strings = null;
			if ( isset( $item['strings']['url'], $item['strings']['version'] ) && is_string( $item['strings']['url'] ) && is_string( $item['strings']['version'] )
				&& 0 === strpos( $item['strings']['url'], 'https://' ) ) {
				$strings = array(
					'url'     => $item['strings']['url'],
					'version' => $item['strings']['version'],
				);
			}
			$by_code[ $item['code'] ] = array(
				'code'        => $item['code'],
				'name'        => isset( $item['name'] ) && is_string( $item['name'] ) ? $item['name'] : $item['code'],
				'native_name' => isset( $item['native_name'] ) && is_string( $item['native_name'] ) ? $item['native_name'] : $item['code'],
				'direction'   => isset( $item['direction'] ) && 'rtl' === $item['direction'] ? 'rtl' : 'ltr',
				'strings'     => $strings,
			);
		}
		$list = array();
		foreach ( $available as $code ) {
			if ( ! isset( $by_code[ $code ] ) ) {
				return null;
			}
			$list[] = $by_code[ $code ];
		}
		return $list;
	}

	/**
	 * A tab, page or block with its texts in a language. The `translations` key is removed.
	 *
	 * @param array  $entry    Entry from the layout.
	 * @param string $language Language code.
	 * @return array
	 */
	public static function apply( array $entry, $language ) {
		$entry = self::texts( $entry, $language, self::TEXT_FIELDS );
		// 33 The entries of a block's lists (slides, quotes, ...) have their own translations.
		foreach ( self::ENTRY_FIELDS as $list => $fields ) {
			if ( isset( $entry[ $list ] ) && is_array( $entry[ $list ] ) ) {
				foreach ( $entry[ $list ] as $i => $item ) {
					if ( is_array( $item ) ) {
						$entry[ $list ][ $i ] = self::texts( $item, $language, $fields );
					}
				}
			}
		}
		return $entry;
	}

	/**
	 * An entry with the given fields in a language, without its `translations`.
	 *
	 * @param array    $entry    Entry.
	 * @param string   $language Language code.
	 * @param string[] $fields   Fields a translation may replace.
	 * @return array
	 */
	private static function texts( array $entry, $language, array $fields ) {
		$texts = isset( $entry['translations'][ $language ] ) && is_array( $entry['translations'][ $language ] ) ? $entry['translations'][ $language ] : array();
		unset( $entry['translations'] );
		foreach ( $fields as $field ) {
			if ( isset( $texts[ $field ] ) && is_string( $texts[ $field ] ) && '' !== trim( $texts[ $field ] ) ) {
				$entry[ $field ] = $texts[ $field ];
			}
		}
		return $entry;
	}
}
