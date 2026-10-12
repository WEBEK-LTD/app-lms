<?php
/**
 * Removes Yallapp data when the plugin is deleted.
 *
 * Student accounts, enrollments and progress belong to the LMS and stay untouched.
 *
 * @package Yallapp
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

foreach ( array( 'yallapp_devices', 'yallapp_tokens' ) as $yallapp_table ) {
	$wpdb->query( 'DROP TABLE IF EXISTS ' . esc_sql( $wpdb->prefix . $yallapp_table ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Plugin tables.
}

foreach ( array( 'yallapp_settings', 'yallapp_secret', 'yallapp_license', 'yallapp_db_version', 'yallapp_seed_ids' ) as $yallapp_option ) {
	delete_option( $yallapp_option );
}

// Transients and per-user progress kept by the app.
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_yallapp\\_%' OR option_name LIKE '\\_transient\\_timeout\\_yallapp\\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'yallapp\\_position\\_%' OR meta_key LIKE 'yallapp\\_watched\\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( "DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_yallapp_render_mode', '_yallapp_embed_height')" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery

foreach ( array( 'yallapp_daily', 'yallapp_license_check', 'yallapp_push_send' ) as $yallapp_hook ) {
	wp_unschedule_hook( $yallapp_hook );
}
