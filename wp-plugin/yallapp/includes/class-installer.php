<?php
/**
 * Database tables and upgrades.
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and upgrades the plugin's tables.
 */
class Installer {

	const DB_VERSION        = '1';
	const DB_VERSION_OPTION = 'yallapp_db_version';

	/**
	 * Runs on plugin activation.
	 *
	 * @return void
	 */
	public static function activate() {
		self::create_tables();
		Crypto::secret();
		if ( ! wp_next_scheduled( 'yallapp_daily' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'yallapp_daily' );
		}
	}

	/**
	 * Runs on plugin deactivation.
	 *
	 * @return void
	 */
	public static function deactivate() {
		wp_clear_scheduled_hook( 'yallapp_daily' );
		wp_clear_scheduled_hook( 'yallapp_license_check' );
		wp_unschedule_hook( 'yallapp_push_send' );
	}

	/**
	 * Creates or upgrades tables when the stored version is older.
	 *
	 * @return void
	 */
	public static function maybe_upgrade() {
		if ( get_option( self::DB_VERSION_OPTION ) !== self::DB_VERSION ) {
			self::create_tables();
		}
	}

	/**
	 * Table names.
	 *
	 * @return array{devices: string, tokens: string}
	 */
	public static function tables() {
		global $wpdb;
		return array(
			'devices' => $wpdb->prefix . 'yallapp_devices',
			'tokens'  => $wpdb->prefix . 'yallapp_tokens',
		);
	}

	/**
	 * Creates the tables with dbDelta.
	 *
	 * @return void
	 */
	private static function create_tables() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$tables  = self::tables();
		$charset = $wpdb->get_charset_collate();

		dbDelta(
			"CREATE TABLE {$tables['devices']} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				user_id bigint(20) unsigned NOT NULL,
				device_id varchar(64) NOT NULL,
				platform varchar(10) NOT NULL,
				name varchar(100) NOT NULL DEFAULT '',
				app_version varchar(20) NOT NULL DEFAULT '',
				push_token text,
				push_prefs text,
				created_at datetime NOT NULL,
				last_seen_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY user_device (user_id,device_id),
				KEY user_id (user_id)
			) $charset;"
		);
		dbDelta(
			"CREATE TABLE {$tables['tokens']} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				user_id bigint(20) unsigned NOT NULL,
				device_row_id bigint(20) unsigned NOT NULL,
				token_hash char(64) NOT NULL,
				expires_at datetime NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY token_hash (token_hash),
				KEY device_row_id (device_row_id)
			) $charset;"
		);
		update_option( self::DB_VERSION_OPTION, self::DB_VERSION, false );
	}
}
