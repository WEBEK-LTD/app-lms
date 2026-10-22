<?php
/**
 * What the site looks like, for an app made from it (roadmap 81.2).
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * The site's title and tagline, logo and site icon, its theme's colours and
 * its menus, reported to the platform with the license check
 * (`SiteInfo.brand`, docs/api/platform.yaml). A draft app made from the site
 * (81.3) takes its brand and its menu as tabs and pages from here.
 */
class Site_Brand {

	/** Most colours reported. */
	const MAX_COLORS = 6;

	/** Most menus, top-level items and children per item reported. */
	const MAX_MENUS    = 3;
	const MAX_ITEMS    = 30;
	const MAX_CHILDREN = 15;

	/** Palette slugs that name the brand, in the order they're reported. */
	const BRAND_SLUGS = array( 'primary', 'brand', 'accent', 'secondary', 'tertiary', 'contrast', 'vivid' );

	/**
	 * The report, read from WordPress.
	 *
	 * @return array
	 */
	public static function report() {
		$logo_id = (int) get_theme_mod( 'custom_logo' );
		$logo    = $logo_id ? wp_get_attachment_image_url( $logo_id, 'full' ) : false;
		$icon    = function_exists( 'get_site_icon_url' ) ? get_site_icon_url( 512 ) : '';
		$palette = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings( array( 'color', 'palette' ) ) : array();
		$menus   = array();
		$located = function_exists( 'get_nav_menu_locations' ) ? get_nav_menu_locations() : array();
		foreach ( (array) $located as $location => $menu_id ) {
			if ( ! $menu_id || count( $menus ) >= self::MAX_MENUS ) {
				continue;
			}
			$items = wp_get_nav_menu_items( $menu_id );
			$tree  = self::menu_tree( is_array( $items ) ? $items : array() );
			if ( $tree ) {
				$menus[] = array(
					'location' => self::text( (string) $location, 64 ),
					'items'    => $tree,
				);
			}
		}
		return array(
			'name'     => self::text( wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES ), 120 ),
			'tagline'  => self::text( wp_specialchars_decode( (string) get_bloginfo( 'description' ), ENT_QUOTES ), 200 ),
			'logo_url' => self::url( $logo ? (string) $logo : '' ),
			'icon_url' => self::url( (string) $icon ),
			'colors'   => self::palette_colors( is_array( $palette ) ? $palette : array() ),
			'menus'    => $menus,
		);
	}

	/**
	 * The palette's colours, brand slugs first, then the theme's, then the rest; no greys
	 * repeated, at most MAX_COLORS.
	 *
	 * @param array $palette theme.json's color.palette: by origin (theme, custom, default) or a flat list of slug/color.
	 * @return string[]
	 */
	public static function palette_colors( array $palette ) {
		$entries = array();
		$origins = isset( $palette['theme'] ) || isset( $palette['custom'] ) || isset( $palette['default'] );
		if ( $origins ) {
			foreach ( array( 'custom', 'theme' ) as $origin ) {
				foreach ( (array) ( $palette[ $origin ] ?? array() ) as $entry ) {
					$entries[] = $entry;
				}
			}
		} else {
			$entries = $palette;
		}
		$ranked = array();
		foreach ( $entries as $index => $entry ) {
			$color = self::hex( is_array( $entry ) ? (string) ( $entry['color'] ?? '' ) : '' );
			if ( ! $color || ! self::is_brand_color( $color ) ) {
				continue;
			}
			$slug = strtolower( (string) ( $entry['slug'] ?? '' ) );
			$rank = count( self::BRAND_SLUGS );
			foreach ( self::BRAND_SLUGS as $i => $brand ) {
				if ( false !== strpos( $slug, $brand ) ) {
					$rank = $i;
					break;
				}
			}
			$ranked[] = array( $rank, $index, $color );
		}
		usort(
			$ranked,
			static function ( $a, $b ) {
				return $a[0] === $b[0] ? $a[1] - $b[1] : $a[0] - $b[0];
			}
		);
		return array_slice( array_values( array_unique( array_column( $ranked, 2 ) ) ), 0, self::MAX_COLORS );
	}

	/**
	 * A colour as "#rrggbb", or null.
	 *
	 * @param string $value CSS colour.
	 * @return string|null
	 */
	public static function hex( $value ) {
		$value = strtolower( trim( $value ) );
		if ( preg_match( '/^#([0-9a-f]{3})$/', $value, $m ) ) {
			return '#' . $m[1][0] . $m[1][0] . $m[1][1] . $m[1][1] . $m[1][2] . $m[1][2];
		}
		if ( preg_match( '/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/', $value, $m ) ) {
			return '#' . $m[1];
		}
		return null;
	}

	/**
	 * Whether a colour can carry a brand: not white, black or a grey.
	 *
	 * @param string $hex "#rrggbb".
	 * @return bool
	 */
	public static function is_brand_color( $hex ) {
		$r     = hexdec( substr( $hex, 1, 2 ) ) / 255;
		$g     = hexdec( substr( $hex, 3, 2 ) ) / 255;
		$b     = hexdec( substr( $hex, 5, 2 ) ) / 255;
		$max   = max( $r, $g, $b );
		$min   = min( $r, $g, $b );
		$light = ( $max + $min ) / 2;
		$delta = $max - $min;
		$range = 1 - abs( 2 * $light - 1 );
		$sat   = $delta <= 0 || $range <= 0 ? 0 : $delta / $range;
		return $sat >= 0.25 && $light >= 0.12 && $light <= 0.9;
	}

	/**
	 * A menu's items as a tree two levels deep: top-level items with their children (deeper
	 * items join their top-level item), each a title and an address.
	 *
	 * @param array $items Menu items (WP_Post objects or arrays) with ID, title, url and menu_item_parent.
	 * @return array
	 */
	public static function menu_tree( array $items ) {
		$top      = array();
		$parent   = array();
		$children = array();
		foreach ( $items as $item ) {
			$item  = (array) $item;
			$id    = (int) ( $item['ID'] ?? 0 );
			$up    = (int) ( $item['menu_item_parent'] ?? 0 );
			$entry = array(
				'title' => self::text( wp_strip_all_tags( (string) ( $item['title'] ?? '' ) ), 80 ),
				'url'   => self::url( (string) ( $item['url'] ?? '' ) ),
			);
			if ( '' === $entry['title'] || null === $entry['url'] ) {
				continue;
			}
			$parent[ $id ] = $up;
			if ( 0 === $up ) {
				$top[ $id ] = $entry;
			} else {
				$children[ $id ] = $entry;
			}
		}
		// Deeper items belong to their top-level ancestor.
		$tree = array();
		foreach ( $top as $id => $entry ) {
			$tree[ $id ] = $entry + array( 'children' => array() );
		}
		foreach ( $children as $id => $entry ) {
			$up   = $parent[ $id ];
			$seen = 0;
			while ( isset( $parent[ $up ] ) && 0 !== $parent[ $up ] && $seen++ < 10 ) {
				$up = $parent[ $up ];
			}
			if ( isset( $tree[ $up ] ) && count( $tree[ $up ]['children'] ) < self::MAX_CHILDREN ) {
				$tree[ $up ]['children'][] = $entry;
			}
		}
		return array_slice( array_values( $tree ), 0, self::MAX_ITEMS );
	}

	/**
	 * A single line of text, at most `$max` characters.
	 *
	 * @param string $text Text.
	 * @param int    $max  Most characters.
	 * @return string
	 */
	public static function text( $text, $max ) {
		$text = trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
		return function_exists( 'mb_substr' ) ? mb_substr( $text, 0, $max ) : substr( $text, 0, $max );
	}

	/**
	 * An http or https address of at most 500 characters, or null.
	 *
	 * @param string $url Address.
	 * @return string|null
	 */
	public static function url( $url ) {
		$url = trim( $url );
		return '' !== $url && strlen( $url ) <= 500 && preg_match( '#^https?://[^\s]+$#i', $url ) ? $url : null;
	}
}
