<?php
/**
 * 131 Gift add-ons in the app: their rules, without WordPress, for the tests.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

/**
 * A gift add-on (chocolates, a card, a vase) is a WooCommerce product the owner ticked "Sell
 * only as an add-on in the app": the app never lists it on its own (product lists, search, the
 * home's sections, related products, the flash sale's list), never sells it alone, and offers
 * it as "Add a little more" with the products the owner chose (all of them, some categories'
 * or some products). On the website it stays a normal product unless the owner hides it there.
 */
class Addon_Rules {

	const META_ADDON      = '_yallapp_addon';
	const META_OFFER      = '_yallapp_addon_offer';
	const META_CATEGORIES = '_yallapp_addon_categories';
	const META_PRODUCTS   = '_yallapp_addon_products';
	/** The order line's meta: the product of the line it went with. */
	const META_ADDON_OF = '_yallapp_addon_of';
	/** How many add-ons a product's page offers. */
	const OFFERED = 12;

	/**
	 * Product or category IDs from a comma- or space-separated list, unique, at most 100.
	 *
	 * @param mixed $text The list.
	 * @return int[]
	 */
	public static function ids( $text ) {
		$parts = is_array( $text ) ? $text : preg_split( '/[\s,]+/', (string) $text );
		$ids   = array();
		foreach ( (array) $parts as $part ) {
			$id = (int) $part;
			if ( $id > 0 && ! in_array( $id, $ids, true ) ) {
				$ids[] = $id;
			}
		}
		return array_slice( $ids, 0, 100 );
	}

	/**
	 * What an add-on is offered with, as saved on the product.
	 *
	 * @param string $offer      all, categories or products.
	 * @param mixed  $categories Category IDs.
	 * @param mixed  $products   Product IDs.
	 * @return array{offer_with: string, category_ids: int[], product_ids: int[]}
	 */
	public static function rule( $offer, $categories, $products ) {
		$offer = in_array( $offer, array( 'categories', 'products' ), true ) ? $offer : 'all';
		$rule  = array(
			'offer_with'   => $offer,
			'category_ids' => 'categories' === $offer ? self::ids( $categories ) : array(),
			'product_ids'  => 'products' === $offer ? self::ids( $products ) : array(),
		);
		// Nothing chosen: with every product.
		if ( ( 'categories' === $offer && ! $rule['category_ids'] ) || ( 'products' === $offer && ! $rule['product_ids'] ) ) {
			$rule['offer_with'] = 'all';
		}
		return $rule;
	}

	/**
	 * Whether an add-on goes with a product.
	 *
	 * @param array $rule       The add-on's rule.
	 * @param int   $main_id    The product.
	 * @param int[] $categories The product's categories.
	 * @return bool
	 */
	public static function offered_with( array $rule, $main_id, array $categories ) {
		switch ( $rule['offer_with'] ?? 'all' ) {
			case 'categories':
				return (bool) array_intersect( array_map( 'intval', $categories ), (array) $rule['category_ids'] );
			case 'products':
				return in_array( (int) $main_id, (array) $rule['product_ids'], true );
			default:
				return true;
		}
	}

	/**
	 * A cart's add-on lines checked: `needs_item` when nothing in it is a main item; else each
	 * add-on line's problem by its index (its main line missing, or one it doesn't go with).
	 *
	 * @param array    $lines    Each: product_id, addon (bool), addon_of (int|null).
	 * @param callable $offered  fn( int $index, int $main_id ): bool.
	 * @param string[] $messages needs_item and not_offered, translated.
	 * @return array{needs_item: bool, problems: array<int, string>}
	 */
	public static function check_lines( array $lines, $offered, array $messages ) {
		$mains = array();
		$any   = false;
		foreach ( $lines as $line ) {
			if ( empty( $line['addon'] ) ) {
				$mains[] = (int) $line['product_id'];
			} else {
				$any = true;
			}
		}
		$out = array(
			'needs_item' => $any && ! $mains,
			'problems'   => array(),
		);
		if ( $out['needs_item'] ) {
			return $out;
		}
		foreach ( $lines as $i => $line ) {
			if ( empty( $line['addon'] ) ) {
				continue;
			}
			$of         = (int) ( $line['addon_of'] ?? 0 );
			$candidates = $of > 0 ? array_values( array_intersect( $mains, array( $of ) ) ) : $mains;
			if ( ! $candidates ) {
				$out['problems'][ $i ] = $messages['needs_item'];
				continue;
			}
			$fits = false;
			foreach ( $candidates as $main ) {
				if ( call_user_func( $offered, $i, $main ) ) {
					$fits = true;
					break;
				}
			}
			if ( ! $fits ) {
				$out['problems'][ $i ] = $messages['not_offered'];
			}
		}
		return $out;
	}

	/**
	 * `StoreConfig.titles` from the license status's `store_titles`: per language, trimmed, at
	 * most 40 characters; null for none.
	 *
	 * @param mixed $raw The license status's store_titles.
	 * @return array{addons: array|null, gift_card: array|null, delivery: array|null}
	 */
	public static function titles( $raw ) {
		$out = array();
		foreach ( array( 'addons', 'gift_card', 'delivery' ) as $key ) {
			$out[ $key ] = self::lang_text( is_array( $raw ) ? ( $raw[ $key ] ?? null ) : null );
		}
		return $out;
	}

	/**
	 * Words per language: language code => text, trimmed, at most 40 characters; null for none.
	 *
	 * @param mixed $raw Code => text.
	 * @return array|null
	 */
	public static function lang_text( $raw ) {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$out = array();
		foreach ( $raw as $code => $text ) {
			if ( ! is_string( $code ) || ! preg_match( '/^[a-z]{2,3}$/', $code ) || ! is_string( $text ) ) {
				continue;
			}
			$clean = trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
			if ( '' !== $clean ) {
				$out[ $code ] = function_exists( 'mb_substr' ) ? mb_substr( $clean, 0, 40 ) : substr( $clean, 0, 40 );
			}
		}
		return $out ? $out : null;
	}

	/**
	 * A title in other languages from the settings' lines ("ar: عرض خاطف").
	 *
	 * @param string $text One "code: words" a line.
	 * @return array|null
	 */
	public static function lang_lines( $text ) {
		$raw = array();
		foreach ( preg_split( '/[\r\n]+/', (string) $text ) as $line ) {
			if ( preg_match( '/^\s*([a-z]{2,3})\s*:\s*(.+)$/u', $line, $m ) ) {
				$raw[ $m[1] ] = $m[2];
			}
		}
		return self::lang_text( $raw );
	}
}
