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
	 * Language codes the app ships (Config.languages, LanguageCode).
	 */
	const CODES = array( 'en', 'ar', 'tr' );

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
	 * Languages shape, keeping only the codes the app knows.
	 *
	 * @param mixed $raw Languages from the layout, or null.
	 * @return array{default: string, available: string[]}
	 */
	public static function languages( $raw ) {
		$default   = is_array( $raw ) && isset( $raw['default'] ) && in_array( $raw['default'], self::CODES, true ) ? $raw['default'] : 'en';
		$available = array();
		if ( is_array( $raw ) && isset( $raw['available'] ) && is_array( $raw['available'] ) ) {
			foreach ( $raw['available'] as $code ) {
				if ( in_array( $code, self::CODES, true ) && ! in_array( $code, $available, true ) ) {
					$available[] = $code;
				}
			}
		}
		if ( ! in_array( $default, $available, true ) ) {
			array_unshift( $available, $default );
		}
		return array(
			'default'   => $default,
			'available' => $available,
		);
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
