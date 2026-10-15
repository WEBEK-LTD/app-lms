<?php
/**
 * The platform's "check your license now" request.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\License\Refresh_Signature;

/**
 * 31 `POST /license/refresh` (docs/api/openapi.yaml, refreshLicense). The platform sends it
 * when the app's owner saves something the license status carries or publishes the app's
 * pages; the plugin then runs its normal license check and layout fetch against the platform.
 * Signed with the license key, at most one check every 30 seconds.
 */
class License_Controller extends Controller {

	/**
	 * Seconds between two checks a nudge may start.
	 */
	const INTERVAL = 30;

	/**
	 * Transient holding when the last nudged check ran.
	 */
	const LAST = 'yallapp_license_nudged';

	/**
	 * Registers the route.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/license/refresh',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'refresh' ),
				// The signature is the permission: checked in the callback so errors keep the contract's shape.
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * POST /license/refresh.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function refresh( WP_REST_Request $request ) {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) || ! isset( $body['timestamp'], $body['signature'] ) ) {
			return self::error( 'invalid_request', __( 'Send timestamp and signature.', 'yallapp' ), 400 );
		}
		$license = $this->plugin->license();
		$key     = (string) $this->plugin->settings()->get( 'license_key' );
		if ( ! Refresh_Signature::verify( $key, $body['timestamp'], $body['signature'], time() ) ) {
			return self::error( 'invalid_signature', __( 'This request is not signed for this site.', 'yallapp' ), 401 );
		}
		$now  = time();
		$last = (int) get_transient( self::LAST );
		if ( $last > 0 && $now - $last < self::INTERVAL ) {
			// The last change still arrives: one check when the 30 seconds are over.
			if ( ! wp_next_scheduled( $license::REFRESH_HOOK ) ) {
				wp_schedule_single_event( $last + self::INTERVAL, $license::REFRESH_HOOK );
			}
			$wait = self::INTERVAL - ( $now - $last );
			return self::error( 'rate_limited', __( 'The license was checked moments ago. It is checked again shortly.', 'yallapp' ), 429, array( 'retry_after_seconds' => max( 1, $wait ) ) );
		}
		set_transient( self::LAST, $now, self::INTERVAL );
		// The platform hangs up after a few seconds; the check still finishes.
		ignore_user_abort( true );
		$result = $license->refresh_now();
		// A key the platform doesn't know is saved as invalid; other failures keep the last status.
		$status = is_wp_error( $result ) && 'license_not_found' !== $result->get_error_code() ? 'unreachable' : (string) $license->status()['status'];
		return $this->ok( array( 'status' => $status ), 202 );
	}
}
