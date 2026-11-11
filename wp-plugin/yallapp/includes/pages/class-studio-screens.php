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

	const SIGN_IN_STYLES = array( 'classic', 'photo', 'card', 'minimal' );
	const HEADERS        = array( 'plain', 'card', 'cover', 'tiles', 'night' );
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
