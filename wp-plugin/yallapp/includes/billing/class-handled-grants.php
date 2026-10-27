<?php
/**
 * The access changes Yallapp asked for that the site already made.
 *
 * @package Yallapp
 */

namespace Yallapp\Billing;

defined( 'ABSPATH' ) || exit;

/**
 * 100.4 `grant_id` is the same on every try of one change (`POST /billing/access`): a repeat
 * answers as the first time did and changes nothing. The handled IDs and their answers are kept
 * in an option (not autoloaded) for 60 days, at most 2,000 of them; Yallapp tries a change again
 * for 24 hours at most. The list's rules are pure.
 */
class Handled_Grants {

	/**
	 * The option.
	 */
	const OPTION = 'yallapp_store_grants';

	/**
	 * How long a handled ID is kept, in seconds.
	 */
	const KEEP = 5184000;

	/**
	 * The most IDs kept.
	 */
	const MAX = 2000;

	/**
	 * How long a change being made holds its grant ID, in seconds.
	 */
	const LOCK_TTL = 120;

	/**
	 * The answer given to a grant ID, or null when it wasn't handled.
	 *
	 * @param array  $handled  grant ID => array( at, order_id ).
	 * @param string $grant_id Grant ID.
	 * @return array{ok: bool, order_id: int|null}|null
	 */
	public static function find( array $handled, $grant_id ) {
		$entry = $handled[ strtolower( (string) $grant_id ) ] ?? null;
		if ( ! is_array( $entry ) ) {
			return null;
		}
		return array(
			'ok'       => true,
			'order_id' => isset( $entry['order_id'] ) && (int) $entry['order_id'] > 0 ? (int) $entry['order_id'] : null,
		);
	}

	/**
	 * The list with a grant ID handled now, without IDs older than 60 days and the oldest
	 * beyond 2,000.
	 *
	 * @param array    $handled  grant ID => array( at, order_id ).
	 * @param string   $grant_id Grant ID.
	 * @param int|null $order_id The WooCommerce order recorded, if any.
	 * @param int      $now      Unix time.
	 * @return array
	 */
	public static function remember( array $handled, $grant_id, $order_id, $now ) {
		$handled = array_filter(
			$handled,
			static function ( $entry ) use ( $now ) {
				return is_array( $entry ) && (int) ( $entry['at'] ?? 0 ) > (int) $now - self::KEEP;
			}
		);
		unset( $handled[ strtolower( (string) $grant_id ) ] );
		$handled[ strtolower( (string) $grant_id ) ] = array(
			'at'       => (int) $now,
			'order_id' => null !== $order_id && (int) $order_id > 0 ? (int) $order_id : null,
		);
		if ( count( $handled ) > self::MAX ) {
			$handled = array_slice( $handled, -self::MAX, null, true );
		}
		return $handled;
	}

	/**
	 * The answer already given to a grant ID on this site, or null.
	 *
	 * @param string $grant_id Grant ID.
	 * @return array{ok: bool, order_id: int|null}|null
	 */
	public static function answered( $grant_id ) {
		$handled = get_option( self::OPTION, array() );
		return self::find( is_array( $handled ) ? $handled : array(), $grant_id );
	}

	/**
	 * Keeps a grant ID as handled.
	 *
	 * @param string   $grant_id Grant ID.
	 * @param int|null $order_id The WooCommerce order recorded, if any.
	 * @return void
	 */
	public static function save( $grant_id, $order_id ) {
		$handled = get_option( self::OPTION, array() );
		update_option( self::OPTION, self::remember( is_array( $handled ) ? $handled : array(), $grant_id, $order_id, time() ), false );
	}

	/**
	 * Holds a grant ID while its change is made, so a try that arrives meanwhile doesn't make it
	 * twice. False when another request holds it.
	 *
	 * @param string $grant_id Grant ID.
	 * @return bool
	 */
	public static function lock( $grant_id ) {
		$name = self::lock_name( $grant_id );
		if ( add_option( $name, time(), '', false ) ) {
			return true;
		}
		// A request that died while holding it lets go after two minutes.
		$since = (int) get_option( $name, 0 );
		if ( $since > 0 && time() - $since > self::LOCK_TTL ) {
			delete_option( $name );
			return add_option( $name, time(), '', false );
		}
		return false;
	}

	/**
	 * Lets go of a grant ID.
	 *
	 * @param string $grant_id Grant ID.
	 * @return void
	 */
	public static function unlock( $grant_id ) {
		delete_option( self::lock_name( $grant_id ) );
	}

	/**
	 * The lock's option.
	 *
	 * @param string $grant_id Grant ID.
	 * @return string
	 */
	private static function lock_name( $grant_id ) {
		return 'yallapp_grant_lock_' . md5( strtolower( (string) $grant_id ) );
	}
}
