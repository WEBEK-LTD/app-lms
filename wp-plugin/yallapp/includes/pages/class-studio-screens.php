<?php
/**
 * A Yallapp Studio project's sign-in screen and account menu.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * 121 The sign-in screen's look and the account menu the owner designed in Yallapp Studio
 * (`LicenseStatus.screens`), served to the app as `Config.screens`. Only the known fields
 * with well-formed values are kept: the platform checked them, and the plugin keeps what it
 * stores and serves within the shape the app reads. Pure.
 */
class Studio_Screens {

	const SIGN_IN_STYLES = array( 'classic', 'photo', 'card', 'minimal', 'premium' );
	const HEADERS        = array( 'plain', 'card', 'cover', 'tiles', 'night', 'academy' );
	const LOOKS          = array(
		'catalog'    => 'explore',
		'my_courses' => 'premium',
		'lesson'     => 'premium',
		'code'       => 'premium',
		'cart'       => 'premium',
	);
	const ITEMS          = array( 'orders', 'points', 'certificates', 'memberships', 'quiz_results', 'live_classes', 'learning_paths', 'achievements', 'wishlist', 'downloads', 'my_courses', 'restaurant', 'teachers', 'teacher', 'teach', 'shipments', 'food_orders', 'rides', 'chat', 'notifications', 'settings', 'help', 'privacy', 'terms', 'link' );

	/**
	 * The screens from a license status, or null without any.
	 *
	 * @param array $result License status from the platform.
	 * @return array|null
	 */
	public static function of_status( array $result ) {
		$raw = $result['screens'] ?? null;
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$out     = array();
		$sign_in = is_array( $raw['sign_in'] ?? null ) ? self::sign_in( $raw['sign_in'] ) : null;
		if ( $sign_in ) {
			$out['sign_in'] = $sign_in;
		}
		$menu = is_array( $raw['account_menu'] ?? null ) ? self::menu( $raw['account_menu'] ) : null;
		if ( $menu ) {
			$out['account_menu'] = $menu;
		}
		// 122 The courses' card.
		$card = is_array( $raw['course_card'] ?? null ) ? self::course_card( $raw['course_card'] ) : null;
		if ( $card ) {
			$out['course_card'] = $card;
		}
		// 122 A course's page.
		$page = is_array( $raw['course_page'] ?? null ) ? self::course_page( $raw['course_page'] ) : null;
		if ( $page ) {
			$out['course_page'] = $page;
		}
		// 123 The screens drawn in a look of their own, each with its one look.
		$looks = array();
		$asked = is_array( $raw['looks'] ?? null ) ? $raw['looks'] : array();
		foreach ( self::LOOKS as $screen => $look ) {
			if ( isset( $asked[ $screen ] ) && $asked[ $screen ] === $look ) {
				$looks[ $screen ] = $look;
			}
		}
		if ( $looks ) {
			$out['looks'] = $looks;
		}
		return $out ? $out : null;
	}

	/**
	 * The sign-in screen's look, or null.
	 *
	 * @param array $raw The platform's.
	 * @return array|null
	 */
	private static function sign_in( array $raw ) {
		if ( ! in_array( $raw['style'] ?? null, self::SIGN_IN_STYLES, true ) ) {
			return null;
		}
		return array(
			'style'     => $raw['style'],
			'image_url' => self::url( $raw['image_url'] ?? null ),
			'title'     => self::texts( $raw['title'] ?? null, 60 ),
			'subtitle'  => self::texts( $raw['subtitle'] ?? null, 140 ),
			'show_logo' => false !== ( $raw['show_logo'] ?? true ),
		);
	}

	/**
	 * The account menu, or null.
	 *
	 * @param array $raw The platform's.
	 * @return array|null
	 */
	private static function menu( array $raw ) {
		if ( ! in_array( $raw['header'] ?? null, self::HEADERS, true ) ) {
			return null;
		}
		$items = array();
		foreach ( is_array( $raw['items'] ?? null ) ? $raw['items'] : array() as $item ) {
			if ( ! is_array( $item ) || ! in_array( $item['key'] ?? null, self::ITEMS, true ) || count( $items ) >= 40 ) {
				continue;
			}
			$entry = array(
				'key'    => $item['key'],
				'hidden' => true === ( $item['hidden'] ?? false ),
				'label'  => self::texts( $item['label'] ?? null, 40 ),
				'icon'   => isset( $item['icon'] ) && is_string( $item['icon'] ) && preg_match( '/^[a-z0-9_]{1,40}$/', $item['icon'] ) ? $item['icon'] : null,
			);
			if ( 'link' === $item['key'] ) {
				$entry['url']       = self::url( $item['url'] ?? null );
				$entry['page_slug'] = isset( $item['page_slug'] ) && is_string( $item['page_slug'] ) && preg_match( '/^[a-z0-9][a-z0-9-]{0,79}$/', $item['page_slug'] ) ? $item['page_slug'] : null;
				if ( null === $entry['url'] && null === $entry['page_slug'] ) {
					continue;
				}
			}
			$items[] = $entry;
		}
		$menu = array(
			'header' => $raw['header'],
			'items'  => $items,
		);
		if ( isset( $raw['accent'] ) && is_string( $raw['accent'] ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $raw['accent'] ) ) {
			$menu['accent'] = strtoupper( $raw['accent'] );
		}
		return $menu;
	}

	/**
	 * 122 The courses' card: its look, corners and the facts it leaves out; null when unknown.
	 *
	 * @param array $raw The platform's.
	 * @return array|null
	 */
	private static function course_card( array $raw ) {
		if ( ! in_array( $raw['style'] ?? null, array( 'classic', 'rich', 'cover', 'tile', 'premium' ), true ) ) {
			return null;
		}
		$card = array(
			'style' => $raw['style'],
			'hide'  => array_values( array_unique( array_intersect( is_array( $raw['hide'] ?? null ) ? $raw['hide'] : array(), array( 'teacher', 'rating', 'price', 'lessons' ) ) ) ),
		);
		if ( isset( $raw['radius'] ) && is_int( $raw['radius'] ) && $raw['radius'] >= 0 && $raw['radius'] <= 32 ) {
			$card['radius'] = $raw['radius'];
		}
		return $card;
	}

	/**
	 * 122 A course's page: its top, its purchase bar, the tab it opens on and what it leaves out.
	 *
	 * @param array $raw The platform's.
	 * @return array
	 */
	private static function course_page( array $raw ) {
		$page = array(
			'cover' => in_array( $raw['cover'] ?? null, array( 'classic', 'full' ), true ) ? $raw['cover'] : 'classic',
			'bar'   => in_array( $raw['bar'] ?? null, array( 'classic', 'glass' ), true ) ? $raw['bar'] : 'classic',
			'hide'  => array_values( array_unique( array_intersect( is_array( $raw['hide'] ?? null ) ? $raw['hide'] : array(), array( 'students', 'level', 'duration', 'certificate', 'reviews' ) ) ) ),
		);
		if ( in_array( $raw['first_tab'] ?? null, array( 'overview', 'curriculum' ), true ) ) {
			$page['first_tab'] = $raw['first_tab'];
		}
		// 123 The premium academy's page.
		if ( 'premium' === ( $raw['look'] ?? null ) ) {
			$page['look'] = 'premium';
		}
		return $page;
	}

	/**
	 * Texts per language code, each trimmed and at most `$max` characters.
	 *
	 * @param mixed $raw The platform's.
	 * @param int   $max Characters.
	 * @return array<string, string>|object An empty object when there are none, as the app reads it.
	 */
	private static function texts( $raw, $max ) {
		$out = array();
		foreach ( is_array( $raw ) ? $raw : array() as $lang => $text ) {
			if ( ! is_string( $lang ) || ! preg_match( '/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/', $lang ) || ! is_string( $text ) ) {
				continue;
			}
			$text = trim( wp_strip_all_tags( $text ) );
			if ( '' !== $text ) {
				$out[ $lang ] = function_exists( 'mb_substr' ) ? mb_substr( $text, 0, $max ) : substr( $text, 0, $max );
			}
		}
		return $out ? $out : new \stdClass();
	}

	/**
	 * An https address, or null.
	 *
	 * @param mixed $raw The platform's.
	 * @return string|null
	 */
	private static function url( $raw ) {
		if ( ! is_string( $raw ) || ! preg_match( '#^https://[^\s<>"]+$#', $raw ) ) {
			return null;
		}
		return esc_url_raw( $raw );
	}
}
