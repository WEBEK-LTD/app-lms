<?php
/**
 * 222.3 (164.7) A Studio list of the shop's products is never an empty section in a WordPress app.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * The same rules as the hosted pages (platform/web/src/lib/hosted/pages/lists.ts, Phase 164), on
 * the page as the plugin serves it:
 *
 * - a list of products with nothing to show (featured products the shop hasn't marked, a category
 *   with none, products picked by hand that are gone) shows the shop's best sellers, else its
 *   newest; a list of products on sale has no stand-in (others under "Sale" would say what isn't so);
 * - a list's title (the element just before it, only words: a section's title and its "Shop all"),
 *   named as the list is or the list's one companion in a row or column, is marked `heads` so the
 *   app hides it while its list is hidden, and goes with a list the plugin leaves out; a row or
 *   column left empty by that goes too.
 *
 * Pure: the page is given.
 */
class List_Headings {

	/**
	 * Elements that only say something.
	 */
	const WORDS = array( 'text', 'icon', 'button', 'divider', 'spacer' );

	/**
	 * The queries to try when a products list has nothing: the best sellers, then the newest.
	 *
	 * @param array $query Normalized query (Block_Resolver::items()): ids, category_id, featured, on_sale, sort, limit.
	 * @return array[]
	 */
	public static function product_fallbacks( array $query ) {
		if ( ! empty( $query['on_sale'] ) ) {
			return array();
		}
		$all      = array_merge(
			$query,
			array(
				'featured'    => false,
				'category_id' => 0,
				'ids'         => array(),
			)
		);
		$narrowed = ! empty( $query['featured'] ) || ! empty( $query['category_id'] ) || ! empty( $query['ids'] );
		$sort     = $query['sort'] ?? 'newest';
		$tries    = array();
		if ( $narrowed || 'popular' !== $sort ) {
			$tries[] = array_merge( $all, array( 'sort' => 'popular' ) );
		}
		if ( $narrowed || 'newest' !== $sort ) {
			$tries[] = array_merge( $all, array( 'sort' => 'newest' ) );
		}
		return $tries;
	}

	/**
	 * Whether an element only says something: words, icons, buttons and the rows and columns of them.
	 *
	 * @param mixed $node Element.
	 * @return bool
	 */
	private static function title_only( $node ) {
		if ( ! is_array( $node ) ) {
			return false;
		}
		$type = $node['type'] ?? null;
		if ( in_array( $type, self::WORDS, true ) ) {
			return true;
		}
		if ( 'row' === $type || 'column' === $type ) {
			$kids = is_array( $node['children'] ?? null ) ? $node['children'] : array();
			if ( ! $kids ) {
				return false;
			}
			foreach ( $kids as $kid ) {
				if ( ! self::title_only( $kid ) ) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	/**
	 * Each list's title, the title's ID to the list's, read from the page as stored.
	 *
	 * @param array $root The page's own element, as stored.
	 * @return array<string, string>
	 */
	public static function of( array $root ) {
		$out     = array();
		$root_id = $root['id'] ?? null;
		$walk    = static function ( array $node ) use ( &$walk, &$out, $root_id ) {
			$kids = is_array( $node['children'] ?? null ) ? array_values( $node['children'] ) : array();
			foreach ( $kids as $i => $child ) {
				if ( ! is_array( $child ) || 'items' !== ( $child['type'] ?? null ) || 0 === $i ) {
					continue;
				}
				$before = $kids[ $i - 1 ];
				if ( ! is_array( $before ) || ! empty( $before['heads'] ) || ! self::title_only( $before ) ) {
					continue;
				}
				if ( ! is_string( $before['id'] ?? null ) || ! is_string( $child['id'] ?? null ) ) {
					continue;
				}
				$name  = $child['name'] ?? null;
				$named = is_string( $name ) && '' !== $name && ( $before['name'] ?? null ) === $name;
				$pair  = 2 === count( $kids ) && ( $node['id'] ?? null ) !== $root_id;
				if ( $named || $pair ) {
					$out[ $before['id'] ] = $child['id'];
				}
			}
			foreach ( $kids as $child ) {
				if ( is_array( $child ) ) {
					$walk( $child );
				}
			}
		};
		$walk( $root );
		return $out;
	}

	/**
	 * The served page with each list's title marked `heads`, and left out with a list the plugin
	 * left out; a row or column left empty by that goes too (never the page's own element).
	 *
	 * @param array                 $root     The page's own element, as served.
	 * @param array<string, string> $headings From of().
	 * @return array
	 */
	public static function apply( array $root, array $headings ) {
		if ( ! $headings ) {
			return $root;
		}
		$root_id = $root['id'] ?? null;
		$walk    = static function ( array $node ) use ( &$walk, $headings, $root_id ) {
			if ( ! isset( $node['children'] ) || ! is_array( $node['children'] ) ) {
				return $node;
			}
			$ids = array();
			foreach ( $node['children'] as $child ) {
				if ( is_array( $child ) && isset( $child['id'] ) ) {
					$ids[ (string) $child['id'] ] = true;
				}
			}
			$children = array();
			$dropped  = false;
			foreach ( $node['children'] as $child ) {
				$id   = is_array( $child ) && isset( $child['id'] ) ? (string) $child['id'] : '';
				$list = $headings[ $id ] ?? null;
				if ( null !== $list && ! isset( $ids[ $list ] ) ) {
					$dropped = true;
					continue;
				}
				$kept = is_array( $child ) ? $walk( $child ) : null;
				if ( null === $kept ) {
					$dropped = true;
					continue;
				}
				if ( null !== $list ) {
					$kept['heads'] = $list;
				}
				$children[] = $kept;
			}
			if ( $dropped && ! $children && ( $node['id'] ?? null ) !== $root_id ) {
				return null;
			}
			$node['children'] = $children;
			return $node;
		};
		$served  = $walk( $root );
		return null === $served ? $root : $served;
	}
}
