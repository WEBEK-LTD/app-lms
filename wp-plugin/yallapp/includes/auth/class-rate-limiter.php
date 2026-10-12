<?php
/**
 * Fixed-window rate limiting.
 *
 * @package Yallapp
 */

namespace Yallapp\Auth;

defined( 'ABSPATH' ) || exit;

/**
 * Counts hits per key in a fixed time window, stored in transients.
 */
class Rate_Limiter {

	/**
	 * Records a hit and reports whether it is within the limit.
	 *
	 * @param string $key    Bucket key (hashed before storage).
	 * @param int    $limit  Hits allowed per window.
	 * @param int    $window Window length in seconds.
	 * @return int 0 when allowed, otherwise seconds until the window resets.
	 */
	public static function hit( $key, $limit, $window ) {
		$name  = 'yallapp_rl_' . md5( $key );
		$now   = time();
		$state = get_transient( $name );
		if ( ! is_array( $state ) || $state['reset'] <= $now ) {
			$state = array(
				'count' => 0,
				'reset' => $now + $window,
			);
		}
		if ( $state['count'] >= $limit ) {
			return max( 1, $state['reset'] - $now );
		}
		++$state['count'];
		set_transient( $name, $state, max( 1, $state['reset'] - $now ) );
		return 0;
	}

	/**
	 * Clears a bucket.
	 *
	 * @param string $key Bucket key.
	 * @return void
	 */
	public static function clear( $key ) {
		delete_transient( 'yallapp_rl_' . md5( $key ) );
	}

	/**
	 * The client's IP address as seen by WordPress.
	 *
	 * @return string
	 */
	public static function client_ip() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		return (string) filter_var( $ip, FILTER_VALIDATE_IP );
	}
}
