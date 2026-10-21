<?php
/**
 * Access and refresh tokens.
 *
 * @package Yallapp
 */

namespace Yallapp\Auth;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\Crypto;
use Yallapp\Installer;
use Yallapp\Settings;

/**
 * Issues short-lived access tokens (JWT) and rotating, device-bound refresh tokens.
 */
class Tokens {

	const ACCESS_TTL = 900;
	const AUDIENCE   = 'yallapp-app';

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Devices.
	 *
	 * @var Devices
	 */
	private $devices;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings.
	 * @param Devices  $devices  Devices.
	 */
	public function __construct( Settings $settings, Devices $devices ) {
		$this->settings = $settings;
		$this->devices  = $devices;
	}

	/**
	 * Issues a new token pair for a user's device.
	 *
	 * @param int $user_id       User ID.
	 * @param int $device_row_id Device row ID.
	 * @return array{access_token: string, refresh_token: string, expires_in: int}
	 */
	public function issue( $user_id, $device_row_id ) {
		global $wpdb;
		$now     = time();
		$refresh = Crypto::token( 48 );
		$days    = max( 1, (int) $this->settings->get( 'session_days' ) );

		$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			Installer::tables()['tokens'],
			array(
				'user_id'       => $user_id,
				'device_row_id' => $device_row_id,
				'token_hash'    => Crypto::hash( $refresh ),
				'expires_at'    => gmdate( 'Y-m-d H:i:s', $now + $days * DAY_IN_SECONDS ),
				'created_at'    => gmdate( 'Y-m-d H:i:s', $now ),
			)
		);

		return array(
			'access_token'  => Jwt::encode(
				array(
					'iss' => home_url(),
					'aud' => self::AUDIENCE,
					'sub' => (int) $user_id,
					'did' => (int) $device_row_id,
					'iat' => $now,
					'exp' => $now + self::ACCESS_TTL,
				),
				Crypto::secret()
			),
			'refresh_token' => $refresh,
			'expires_in'    => self::ACCESS_TTL,
		);
	}

	/**
	 * Exchanges a refresh token for a new pair. The old refresh token stops working.
	 *
	 * @param string $refresh_token Refresh token.
	 * @return array|WP_Error
	 */
	public function rotate( $refresh_token ) {
		global $wpdb;
		$table = Installer::tables()['tokens'];
		$hash  = Crypto::hash( (string) $refresh_token );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE token_hash = %s", $hash ) );
		if ( ! $row ) {
			return self::invalid();
		}
		// Single use: delete before issuing, so a replayed token never works twice.
		$deleted = $wpdb->delete( $table, array( 'id' => (int) $row->id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		if ( ! $deleted || strtotime( $row->expires_at . ' UTC' ) <= time() ) {
			return self::invalid();
		}
		$device = $this->devices->get( (int) $row->device_row_id );
		$user   = get_userdata( (int) $row->user_id );
		if ( ! $device || ! $user || (int) $device->user_id !== (int) $user->ID ) {
			return self::invalid();
		}
		$this->devices->touch( (int) $device->id );
		return $this->issue( (int) $user->ID, (int) $device->id );
	}

	/**
	 * Validates an access token.
	 *
	 * @param string $token Access token.
	 * @return array{user_id: int, device_row_id: int}|null
	 */
	public function validate_access( $token ) {
		$claims = Jwt::decode( $token, Crypto::secret(), time() );
		if ( ! $claims || ( $claims['aud'] ?? '' ) !== self::AUDIENCE || empty( $claims['sub'] ) || empty( $claims['did'] ) ) {
			return null;
		}
		$device = $this->devices->get( (int) $claims['did'] );
		if ( ! $device || (int) $device->user_id !== (int) $claims['sub'] ) {
			return null;
		}
		return array(
			'user_id'       => (int) $claims['sub'],
			'device_row_id' => (int) $claims['did'],
		);
	}

	/**
	 * Deletes expired refresh tokens.
	 *
	 * @return void
	 */
	public function purge_expired() {
		global $wpdb;
		$table = Installer::tables()['tokens'];
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE expires_at < %s", gmdate( 'Y-m-d H:i:s' ) ) );
	}

	/**
	 * Error for an unusable refresh token.
	 *
	 * @return WP_Error
	 */
	private static function invalid() {
		return new WP_Error( 'invalid_token', __( 'Your session has ended. Please sign in again.', 'yallapp' ), array( 'status' => 401 ) );
	}
}
