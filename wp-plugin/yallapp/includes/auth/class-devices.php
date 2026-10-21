<?php
/**
 * Signed-in devices.
 *
 * @package Yallapp
 */

namespace Yallapp\Auth;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\Installer;
use Yallapp\Settings;

/**
 * Records each student's devices and applies the per-account device limit.
 */
class Devices {

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Registers (or refreshes) a device for a user, applying the device limit.
	 *
	 * @param int   $user_id        User ID.
	 * @param array $device         DeviceInput from the API: id, platform, name, app_version.
	 * @param bool  $replace_oldest At the limit, sign out the oldest devices instead of refusing
	 *                              (the store review account: reviewers and previews sign in on new devices).
	 * @return int|WP_Error Device row ID.
	 */
	public function register( $user_id, array $device, $replace_oldest = false ) {
		global $wpdb;
		$table     = Installer::tables()['devices'];
		$device_id = substr( sanitize_text_field( (string) ( $device['id'] ?? '' ) ), 0, 64 );
		$platform  = in_array( $device['platform'] ?? '', array( 'android', 'ios' ), true ) ? $device['platform'] : '';
		if ( '' === $device_id || '' === $platform ) {
			return new WP_Error( 'invalid_device', __( 'Device details are missing.', 'yallapp' ), array( 'status' => 400 ) );
		}
		$now  = current_time( 'mysql', true );
		$data = array(
			'platform'     => $platform,
			'name'         => substr( sanitize_text_field( (string) ( $device['name'] ?? '' ) ), 0, 100 ),
			'app_version'  => substr( sanitize_text_field( (string) ( $device['app_version'] ?? '' ) ), 0, 20 ),
			'last_seen_at' => $now,
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		$existing = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE user_id = %d AND device_id = %s", $user_id, $device_id ) );
		if ( $existing ) {
			$wpdb->update( $table, $data, array( 'id' => (int) $existing ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			return (int) $existing;
		}

		$limit = (int) $this->settings->get( 'device_limit' );
		if ( $limit > 0 ) {
			$others = $this->for_user( $user_id );
			if ( count( $others ) >= $limit ) {
				if ( ! $replace_oldest && 'replace_oldest' !== $this->settings->get( 'device_limit_action' ) ) {
					return new WP_Error(
						'device_limit_reached',
						__( 'This account is already signed in on the maximum number of devices. Sign out on another device or contact support.', 'yallapp' ),
						array( 'status' => 403 )
					);
				}
				usort(
					$others,
					static function ( $a, $b ) {
						return strcmp( $a->last_seen_at, $b->last_seen_at );
					}
				);
				$excess = count( $others ) - $limit + 1;
				foreach ( array_slice( $others, 0, $excess ) as $old ) {
					$this->remove( $user_id, (int) $old->id );
				}
			}
		}

		$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$table,
			array_merge(
				$data,
				array(
					'user_id'    => $user_id,
					'device_id'  => $device_id,
					'created_at' => $now,
				)
			)
		);
		return (int) $wpdb->insert_id;
	}

	/**
	 * A user's devices, newest first.
	 *
	 * @param int $user_id User ID.
	 * @return object[]
	 */
	public function for_user( $user_id ) {
		global $wpdb;
		$table = Installer::tables()['devices'];
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		return (array) $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE user_id = %d ORDER BY last_seen_at DESC", $user_id ) );
	}

	/**
	 * One device row.
	 *
	 * @param int $row_id Row ID.
	 * @return object|null
	 */
	public function get( $row_id ) {
		global $wpdb;
		$table = Installer::tables()['devices'];
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $row_id ) );
		return $row ? $row : null;
	}

	/**
	 * Finds a user's device by the app's device ID.
	 *
	 * @param int    $user_id   User ID.
	 * @param string $device_id App device ID.
	 * @return object|null
	 */
	public function find( $user_id, $device_id ) {
		foreach ( $this->for_user( $user_id ) as $row ) {
			if ( $row->device_id === $device_id ) {
				return $row;
			}
		}
		return null;
	}

	/**
	 * Removes a device and signs it out.
	 *
	 * @param int $user_id User ID.
	 * @param int $row_id  Device row ID.
	 * @return bool Whether a device was removed.
	 */
	public function remove( $user_id, $row_id ) {
		global $wpdb;
		$tables  = Installer::tables();
		$deleted = $wpdb->delete( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$tables['devices'],
			array(
				'id'      => $row_id,
				'user_id' => $user_id,
			)
		);
		$wpdb->delete( $tables['tokens'], array( 'device_row_id' => $row_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return (bool) $deleted;
	}

	/**
	 * Removes all of a user's devices.
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public function remove_all( $user_id ) {
		foreach ( $this->for_user( $user_id ) as $row ) {
			$this->remove( $user_id, (int) $row->id );
		}
	}

	/**
	 * Updates last-seen time.
	 *
	 * @param int $row_id Device row ID.
	 * @return void
	 */
	public function touch( $row_id ) {
		global $wpdb;
		$wpdb->update( Installer::tables()['devices'], array( 'last_seen_at' => current_time( 'mysql', true ) ), array( 'id' => $row_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}

	/**
	 * Saves the device's push token, where it's from and the notification preferences.
	 *
	 * @param int    $row_id      Device row ID.
	 * @param string $token       Push token.
	 * @param array  $preferences Notification preferences.
	 * @param string $provider    36 "fcm" (Firebase) or "hms" (Huawei Push Kit).
	 * @return void
	 */
	public function set_push( $row_id, $token, array $preferences, $provider = 'fcm' ) {
		global $wpdb;
		$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			Installer::tables()['devices'],
			array(
				'push_token'    => $token,
				'push_provider' => self::provider( $provider ),
				'push_prefs'    => wp_json_encode( $preferences ),
			),
			array( 'id' => $row_id )
		);
	}

	/**
	 * 36 A push provider as stored: "hms" for Huawei Push Kit, else "fcm". Pure.
	 *
	 * @param mixed $provider Provider from the app.
	 * @return string
	 */
	public static function provider( $provider ) {
		return 'hms' === $provider ? 'hms' : 'fcm';
	}

	/**
	 * Users with at least one device registered for notifications.
	 *
	 * @return int[]
	 */
	public function push_user_ids() {
		global $wpdb;
		$table = Installer::tables()['devices'];
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		return array_map( 'intval', (array) $wpdb->get_col( "SELECT DISTINCT user_id FROM {$table} WHERE push_token IS NOT NULL AND push_token <> ''" ) );
	}

	/**
	 * Clears a push token Firebase or Huawei Push Kit reported as no longer registered.
	 *
	 * @param string $token Push token.
	 * @return void
	 */
	public function forget_push_token( $token ) {
		global $wpdb;
		$wpdb->update( Installer::tables()['devices'], array( 'push_token' => null ), array( 'push_token' => $token ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}

	/**
	 * Push tokens for users, honoring each device's preference for the notification kind.
	 *
	 * @param int[]  $user_ids User IDs.
	 * @param string $kind     Preference key: new_lessons, announcements, daily_reminder or news. Empty for always.
	 * @return string[]
	 */
	public function push_tokens( array $user_ids, $kind = '' ) {
		return array_values( array_unique( array_column( $this->push_targets( $user_ids, $kind ), 'token' ) ) );
	}

	/**
	 * 36 Push tokens for users with the service each one is from ("fcm" or "hms"),
	 * honoring each device's preference for the notification kind.
	 *
	 * @param int[]  $user_ids User IDs.
	 * @param string $kind     Preference key, or empty for always.
	 * @return array<int, array{token: string, provider: string}>
	 */
	public function push_targets( array $user_ids, $kind = '' ) {
		global $wpdb;
		$user_ids = array_filter( array_map( 'absint', $user_ids ) );
		if ( ! $user_ids ) {
			return array();
		}
		$table        = Installer::tables()['devices'];
		$placeholders = implode( ',', array_fill( 0, count( $user_ids ), '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table, placeholders built above.
		$rows    = $wpdb->get_results( $wpdb->prepare( "SELECT push_token, push_provider, push_prefs FROM {$table} WHERE push_token IS NOT NULL AND push_token <> '' AND user_id IN ({$placeholders})", $user_ids ) );
		$targets = array();
		foreach ( (array) $rows as $row ) {
			$prefs = json_decode( (string) $row->push_prefs, true );
			if ( '' === $kind || ! is_array( $prefs ) || ! array_key_exists( $kind, $prefs ) || $prefs[ $kind ] ) {
				$targets[ (string) $row->push_token ] = array(
					'token'    => (string) $row->push_token,
					'provider' => self::provider( $row->push_provider ?? 'fcm' ),
				);
			}
		}
		return array_values( $targets );
	}

	/**
	 * API shape of a device.
	 *
	 * @param object $row            Device row.
	 * @param int    $current_row_id Device making the request.
	 * @return array
	 */
	public static function to_api( $row, $current_row_id ) {
		return array(
			'id'           => (string) $row->device_id,
			'platform'     => (string) $row->platform,
			'name'         => (string) $row->name,
			'last_seen_at' => mysql2date( 'c', $row->last_seen_at . ' UTC', false ),
			'current'      => (int) $row->id === (int) $current_row_id,
		);
	}
}
