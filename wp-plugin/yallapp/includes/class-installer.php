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

	const DB_VERSION        = '2';
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
		wp_clear_scheduled_hook( 'yallapp_layout_refresh' );
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
	 * @return array{devices: string, tokens: string, notifications: string}
	 */
	public static function tables() {
		global $wpdb;
		return array(
			'devices'       => $wpdb->prefix . 'yallapp_devices',
			'tokens'        => $wpdb->prefix . 'yallapp_tokens',
			'notifications' => $wpdb->prefix . 'yallapp_notifications',
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
		// One row per notification sent, with its audience: everyone, one course's students or one student.
		dbDelta(
			"CREATE TABLE {$tables['notifications']} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				type varchar(20) NOT NULL,
				audience varchar(10) NOT NULL,
				target_id bigint(20) unsigned NOT NULL DEFAULT 0,
				title varchar(255) NOT NULL,
				body text NOT NULL,
				course_id bigint(20) unsigned NOT NULL DEFAULT 0,
				lesson_id bigint(20) unsigned NOT NULL DEFAULT 0,
				question_id bigint(20) unsigned NOT NULL DEFAULT 0,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				KEY audience_target (audience,target_id),
				KEY created_at (created_at)
			) $charset;"
		);
		update_option( self::DB_VERSION_OPTION, self::DB_VERSION, false );
	}
}
