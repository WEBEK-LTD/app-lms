<?php
/**
 * Courses and memberships bought in the app through Google Play and the App Store.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Billing\Access_Request;
use Yallapp\Billing\Handled_Grants;
use Yallapp\Billing\Store_Access;
use Yallapp\Billing\Store_Billing;

/**
 * 100.4 The app buys through the stores on Yallapp's hosted API (`Config.store_billing.base_url`).
 * People sign in on this site, so the app asks here for a token (`POST /billing/session`), which
 * the plugin gets from Yallapp for the signed-in person, like the chat's. Once Yallapp has
 * checked a purchase with Google or Apple it asks the site to give the access, or take it back
 * (`POST /billing/access`, signed with the license key).
 */
class Billing_Controller extends Controller {

	/**
	 * Registers the routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/billing/session',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'session' ),
				'permission_callback' => array( $this, 'require_user' ),
			)
		);
		$this->route(
			'/billing/access',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'access' ),
				// The signature is the permission: checked in the callback so errors keep the contract's shape.
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * The stored `LicenseStatus.store_billing` while the plan has the feature, or null.
	 *
	 * @param \Yallapp\Plugin $plugin Plugin.
	 * @return array|null
	 */
	public static function billing( $plugin ) {
		$license = $plugin->license();
		$billing = $license->status()['store_billing'] ?? null;
		return is_array( $billing ) && $license->has_feature( Store_Billing::FEATURE ) ? $billing : null;
	}

	/**
	 * `Config.store_billing` on a platform, or null when the app doesn't sell in the app there.
	 *
	 * @param \Yallapp\Plugin $plugin   Plugin.
	 * @param string          $platform android|ios.
	 * @return array|null
	 */
	public static function config( $plugin, $platform ) {
		return Store_Billing::config( self::billing( $plugin ), (string) $platform );
	}

	/**
	 * POST /billing/session: an hour's store billing token for the signed-in person.
	 *
	 * @return \WP_REST_Response
	 */
	public function session() {
		if ( ! self::billing( $this->plugin ) ) {
			return self::error( 'feature_disabled', __( 'This app doesn\'t sell in the app.', 'yallapp' ), 403 );
		}
		$user_id = get_current_user_id();
		$user    = get_userdata( $user_id );
		$name    = $user ? trim( html_entity_decode( (string) $user->display_name, ENT_QUOTES, 'UTF-8' ) ) : '';
		$email   = $user && is_email( $user->user_email ) ? (string) $user->user_email : '';
		$result  = $this->plugin->license()->billing_session( $user_id, '' !== $name ? mb_substr( $name, 0, 120 ) : __( 'Student', 'yallapp' ), strlen( $email ) <= 254 ? $email : '' );
		if ( is_wp_error( $result ) ) {
			$status = (int) ( $result->get_error_data()['status'] ?? 0 );
			if ( 403 === $status || 429 === $status ) {
				return self::from_wp_error( $result );
			}
			return self::unavailable();
		}
		if ( ! is_string( $result['token'] ?? null ) || ! is_string( $result['expires_at'] ?? null ) || ! is_string( $result['base_url'] ?? null ) ) {
			return self::unavailable();
		}
		return $this->ok(
			array(
				'token'      => $result['token'],
				'expires_at' => $result['expires_at'],
				'base_url'   => $result['base_url'],
			)
		);
	}

	/**
	 * POST /billing/access: Yallapp asks the site to give or take access bought in the app.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function access( WP_REST_Request $request ) {
		$key = (string) $this->plugin->settings()->get( 'license_key' );
		$raw = $request->get_body();
		if ( ! Access_Request::verify( $key, $request->get_header( 'yallapp_timestamp' ), $request->get_header( 'yallapp_signature' ), $raw, time() ) ) {
			return self::error( 'invalid_signature', __( 'This request is not signed for this site.', 'yallapp' ), 401 );
		}
		$change = Access_Request::parse( json_decode( (string) $raw, true ) );
		if ( null === $change ) {
			return self::error( 'invalid_request', __( 'The request is not a valid access change.', 'yallapp' ), 400 );
		}
		$answered = Handled_Grants::answered( $change['grant_id'] );
		if ( $answered ) {
			return $this->ok( $answered );
		}
		if ( ! Handled_Grants::lock( $change['grant_id'] ) ) {
			return self::error( 'conflict', __( 'This change is being made. Try again shortly.', 'yallapp' ), 409 );
		}
		// Yallapp may hang up on a slow site; the change still finishes and is kept.
		ignore_user_abort( true );
		$result = ( new Store_Access( $this->plugin ) )->apply( $change );
		if ( ! is_wp_error( $result ) ) {
			Handled_Grants::save( $change['grant_id'], $result['order_id'] );
		}
		Handled_Grants::unlock( $change['grant_id'] );
		return is_wp_error( $result ) ? self::from_wp_error( $result ) : $this->ok( $result );
	}

	/**
	 * Yallapp couldn't be reached.
	 *
	 * @return \WP_REST_Response
	 */
	private static function unavailable() {
		return self::error( 'store_unavailable', __( 'Purchases can\'t be made right now. Try again in a moment.', 'yallapp' ), 503 );
	}
}
